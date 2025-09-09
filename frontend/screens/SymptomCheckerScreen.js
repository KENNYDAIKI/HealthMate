// screens/SymptomCheckerScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Share,
  useWindowDimensions,
  Animated,
  Easing,
  SectionList, // ✅ Sectioned list for clean scanning
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ---- API base (kept your URL) ----
const API_URL = "http://172.20.10.4:8001";

const theme = {
  primary: "#2563eb",
  primaryLight: "#dbeafe",
  danger: "#b91c1c",
  gray: "#6b7280",
  border: "#e5e7eb",
  bg: "#ffffff",
  chipBg: "#ffffff",
  chipActiveBg: "#dbeafe",
  chipBorderActive: "#2563eb",
};

// helpers
const norm = (s = "") => s.trim().toLowerCase().replace(/[\s-]+/g, "_");
const human = (s = "") => s.replace(/_/g, " ");
const titleCase = (s = "") => human(s).replace(/\b\w/g, (m) => m.toUpperCase());

const SEVERITIES = ["mild", "moderate", "severe"];
const nextSeverity = (cur) => SEVERITIES[(SEVERITIES.indexOf(cur || "moderate") + 1) % SEVERITIES.length];
const severityLabel = (s) => (s === "severe" ? "Severe" : s === "mild" ? "Mild" : "Moderate");

// ---- Symptom chip ----
const Chip = React.memo(({ s, onPress, active }) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityLabel={`Select symptom ${human(s)}`}
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    style={{
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.2,
      borderColor: active ? theme.chipBorderActive : theme.border,
      backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
    }}
  >
    <Text style={{ fontSize: 16 }} numberOfLines={2}>
      {titleCase(s)}
    </Text>
  </TouchableOpacity>
));

// ---- Selected chip ----
const SelectedChip = ({ s, onRemove, severity, onCycleSeverity }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 18,
      marginRight: 8,
      backgroundColor: "#eef2ff",
      borderWidth: 1,
      borderColor: "#c7d2fe",
      height: 36,
    }}
  >
    <Text style={{ marginRight: 8 }}>{titleCase(s)}</Text>
    <TouchableOpacity
      onPress={onCycleSeverity}
      accessibilityLabel={`Set severity for ${human(s)}`}
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: "#e0e7ff",
        borderWidth: 1,
        borderColor: "#c7d2fe",
        marginRight: 8,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "600" }}>{severityLabel(severity)}</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={onRemove} accessibilityLabel={`Remove ${human(s)}`}>
      <Text style={{ fontSize: 18 }}>×</Text>
    </TouchableOpacity>
  </View>
);

// ---- Triage & Next steps ----
const TriageBanner = ({ triage, big = false }) => {
  if (!triage?.level) return null;
  const lvl = triage.level;
  const bg = lvl === "Red" ? "#fee2e2" : lvl === "Amber" ? "#fef9c3" : "#dcfce7";
  const bd = lvl === "Red" ? "#ef4444" : lvl === "Amber" ? "#f59e0b" : "#16a34a";
  const icon = lvl === "Red" ? "🔴" : lvl === "Amber" ? "🟠" : "🟢";
  const reasons = Array.isArray(triage.reasons) ? triage.reasons.map(titleCase).join(", ") : "";
  return (
    <View style={{ padding: big ? 18 : 14, borderRadius: 12, backgroundColor: bg, borderWidth: 1.5, borderColor: bd }}>
      <Text style={{ fontWeight: "800", fontSize: big ? 20 : 16 }}>
        {icon} Triage Level: {lvl}
      </Text>
      {!!reasons && (
        <Text style={{ marginTop: 6, color: "#374151", fontSize: big ? 16 : 14 }}>
          Reasons: {reasons}
        </Text>
      )}
    </View>
  );
};

const NextSteps = ({ level }) => {
  if (!level) return null;
  let advice = "Monitor symptoms and follow self-care advice.";
  if (level === "Amber") advice = "Book an appointment with a clinician within 24–48 hours.";
  if (level === "Red") advice = "Emergency signs present. Go to the ER immediately or call local emergency services.";
  return (
    <View style={{ marginTop: 14, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: "#fff" }}>
      <Text style={{ fontWeight: "800", fontSize: 18 }}>What To Do Next</Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 22 }}>{advice}</Text>
    </View>
  );
};

// ---- Build A–Z sections, then chunk each section into rows (2–3 chips per row) ----
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};
const buildSectionsGrid = (items = [], columns = 2) => {
  const byLetter = new Map();
  items.forEach((s) => {
    const label = titleCase(s);
    const letter = (label[0] || "#").toUpperCase();
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter).push(s);
  });
  const letters = Array.from(byLetter.keys()).sort();
  return letters.map((L) => {
    const sorted = byLetter.get(L).sort((a, b) => titleCase(a).localeCompare(titleCase(b)));
    return { title: L, data: chunk(sorted, columns) }; // data = array of rows
  });
};

export default function SymptomCheckerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [allSymptoms, setAllSymptoms] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [severityMap, setSeverityMap] = useState({});
  const [other, setOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Results overlay slide-in
  const [showResults, setShowResults] = useState(false);
  const slideX = useRef(new Animated.Value(width)).current;
  useEffect(() => {
    Animated.timing(slideX, {
      toValue: showResults ? 0 : width,
      duration: showResults ? 280 : 240,
      easing: showResults ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showResults, width, slideX]);

  // Sticky header height
  const [headerH, setHeaderH] = useState(0);
  const ACTIONBAR_H = 64;
  const TABBAR_H = 56;

  // ---- Load symptoms (cache + network) ----
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem("@symptom_vocab_cache_v1");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setAllSymptoms(parsed.map(norm));
        }
        await fetch(`${API_URL}/`, { method: "GET" }).catch(() => {});
        const r = await fetch(`${API_URL}/symptoms`);
        const j = await r.json();
        const feats = Array.isArray(j.symptoms) ? j.symptoms.map(norm) : [];
        setAllSymptoms(feats);
        await AsyncStorage.setItem("@symptom_vocab_cache_v1", JSON.stringify(feats));
      } catch (e) {
        if (!allSymptoms.length) setError("Failed to load symptoms. Check your API URL / network.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Filtering & sectioning ----
  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return allSymptoms;
    return allSymptoms.filter((s) => s.includes(q));
  }, [allSymptoms, query]);

  const columns = width >= 420 ? 3 : 2; // ✅ 2–3 columns depending on width
  const sections = useMemo(() => buildSectionsGrid(filtered, columns), [filtered, columns]);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // ---- Suggestions for "Other" box ----
  const suggestions = useMemo(() => {
    const q = norm(other);
    if (!q) return [];
    const starts = allSymptoms.filter((s) => s.startsWith(q));
    const contains = allSymptoms.filter((s) => s.includes(q) && !starts.includes(s));
    return [...starts, ...contains].slice(0, 6);
  }, [other, allSymptoms]);

  // ---- Selection logic ----
  const toggle = useCallback((sym) => {
    setSelected((prev) => {
      if (prev.includes(sym)) {
        const next = prev.filter((x) => x !== sym);
        setSeverityMap((m) => {
          const mm = { ...m };
          delete mm[sym];
          return mm;
        });
        return next;
      } else {
        setSeverityMap((m) => ({ ...m, [sym]: m[sym] || "moderate" }));
        return [...prev, sym];
      }
    });
  }, []);

  const cycleSeverity = useCallback((sym) => {
    setSeverityMap((m) => ({ ...m, [sym]: nextSeverity(m[sym]) }));
  }, []);

  const clearAll = useCallback(() => {
    setSelected([]);
    setSeverityMap({});
    setResult(null);
    setError("");
    setQuery("");
  }, []);

  const newCheck = useCallback(() => {
    setShowResults(false);
    clearAll();
    setOther("");
  }, [clearAll]);

  // ---- Submit → POST /predict (handles 422 unknown) ----
  const submit = useCallback(async () => {
    setError("");
    if (selected.length === 0 && !other.trim()) {
      setError("Pick at least one symptom.");
      return;
    }
    setLoading(true);
    try {
      const otherList = other.split(",").map((s) => norm(s)).filter(Boolean);
      const symptoms = Array.from(new Set([...selected, ...otherList]));
      const r = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, topk: 3 }),
      });
      const raw = await r.text();
      let j = {};
      try { j = JSON.parse(raw); } catch {}
      if (r.status === 422 && j?.code === "no_known_symptoms") {
        const unknownList = Array.isArray(j.unknown_symptoms) && j.unknown_symptoms.length
          ? j.unknown_symptoms.join(", ")
          : "your inputs";
        setError(`Sorry, I don't have information on ${unknownList} in the provided context.`);
        setResult(null);
        setShowResults(false);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${raw}`);
      const top = Array.isArray(j.results)
        ? j.results.map((d) => ({
            name: d.disease,
            probability: typeof d.probability === "number" ? d.probability / 100 : undefined,
            description: d.description || "",
            precautions: Array.isArray(d.precautions) ? d.precautions : [],
          }))
        : [];
      setResult({ ...j, top: top.slice(0, 3) });
      setShowResults(true);
    } catch (e) {
      setError(`Request failed. ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  }, [other, selected]);

  // ---- Share ----
  const shareResults = useCallback(async () => {
    if (!result) return;
    const triage = result?.triage?.level ? `Triage: ${result.triage.level}\n` : "";
    const top = Array.isArray(result?.top)
      ? result.top
          .map((d) => `• ${titleCase(d.name || "")}${typeof d.probability === "number" ? ` (${(d.probability * 100).toFixed(1)}%)` : ""}`)
          .join("\n")
      : "";
    const text =
      `HealthMate Check\n\n` +
      (selected.length ? `Symptoms: ${selected.map(titleCase).join(", ")}\n` : "") +
      (triage || "") +
      (top ? `Possible conditions:\n${top}\n\n` : "") +
      `— Generated by HealthMate (not a medical diagnosis).`;
    try {
      await Share.share({ message: text });
    } catch {}
  }, [result, selected]);

  // ---- SectionList ref + A–Z jump ----
  const sectionListRef = useRef(null);
  const jumpToLetter = useCallback((L) => {
    const idx = sections.findIndex((s) => s.title === L);
    if (idx >= 0 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true, viewPosition: 0 });
    }
  }, [sections]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Loader overlay */}
      <Modal visible={loading} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 12, color: "#fff" }}>Checking symptoms…</Text>
        </View>
      </Modal>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        {/* ===== Sticky header (hero + selected + search) stays visible ===== */}
        <View
          onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.bg,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            zIndex: 10,
            paddingTop: insets.top + 8,
          }}
        >
          <View style={{ padding: 16, paddingTop: 8 }}>
            {/* Hero */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Image source={require("../assets/hero.jpg")} style={{ width: "100%", height: 180, resizeMode: "cover", borderRadius: 12 }} />
              <Text style={{ fontSize: 22, fontWeight: "700", marginTop: 12 }}>Symptom Checker</Text>
              <Text style={{ textAlign: "center", marginTop: 4, color: theme.gray }}>
                Pick your symptoms to see possible conditions and triage guidance.
              </Text>
            </View>

            {/* Selected (horizontal, concise) */}
            <View style={{ padding: 12, borderRadius: 10, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: theme.border, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontWeight: "700" }}>Selected ({selected.length})</Text>
                {selected.length > 0 && (
                  <TouchableOpacity onPress={clearAll} accessibilityLabel="Clear all selected symptoms">
                    <Text style={{ color: theme.primary, fontWeight: "600" }}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>

              {selected.length === 0 ? (
                <Text style={{ color: theme.gray }}>No symptoms selected yet</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                  {selected.map((s) => (
                    <SelectedChip key={s} s={s} onRemove={() => toggle(s)} severity={severityMap[s]} onCycleSeverity={() => cycleSeverity(s)} />
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Search (stays pinned) */}
            <TextInput
              placeholder="Search symptoms… (e.g., chest pain)"
              value={query}
              onChangeText={setQuery}
              accessibilityLabel="Search symptoms"
              autoCorrect={false}
              style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12 }}
            />
          </View>
        </View>

        {/* ===== Scrollable content (starts below sticky header) ===== */}
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(row, idx) => row.join("|") + "-" + idx} // row is an array of symptoms
          initialNumToRender={40}
          windowSize={10}
          stickySectionHeadersEnabled
          contentContainerStyle={{
            paddingTop: headerH,
            paddingBottom: ACTIONBAR_H + TABBAR_H + insets.bottom + 24,
            paddingHorizontal: 12,
          }}
          // ---- "Other symptoms" lives here and scrolls naturally ----
          ListHeaderComponent={
            <View style={{ marginTop: 12 }}>
              <Text style={{ marginBottom: 6, fontWeight: "600" }}>Other symptoms (comma separated)</Text>
              <TextInput
                placeholder="e.g., body ache, chills"
                value={other}
                onChangeText={setOther}
                accessibilityLabel="Other symptoms input"
                autoCorrect={false}
                style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12 }}
              />
              {!!other && suggestions.length > 0 && (
                <View style={{ marginTop: 6, borderWidth: 1, borderColor: theme.border, borderRadius: 10 }}>
                  {suggestions.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => {
                        if (!selected.includes(s)) {
                          setSelected((prev) => [...prev, s]);
                          setSeverityMap((m) => ({ ...m, [s]: m[s] || "moderate" }));
                        }
                        setOther("");
                      }}
                      style={{ padding: 10 }}
                    >
                      <Text>{titleCase(s)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          }
          renderSectionHeader={({ section: { title } }) => (
            <View
              style={{
                backgroundColor: "#f8fafc",
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                paddingVertical: 6,
                paddingHorizontal: 8,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                marginTop: 12,
              }}
            >
              <Text style={{ fontWeight: "800", color: "#111827" }}>{title}</Text>
            </View>
          )}
          // ---- Each item is a "row" containing 2–3 chips ----
          renderItem={({ item: row }) => (
            <View style={{ flexDirection: "row", gap: 10, paddingVertical: 6 }}>
              {row.map((sym) => (
                <View key={sym} style={{ flex: 1 }}>
                  <Chip s={sym} active={selected.includes(sym)} onPress={() => toggle(sym)} />
                </View>
              ))}
              {/* Fillers to keep last row aligned if not full */}
              {row.length < columns &&
                Array.from({ length: columns - row.length }).map((_, i) => <View key={`f${i}`} style={{ flex: 1 }} />)}
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.gray }}>
                No symptom list loaded. You can still type in the “Other symptoms” box above.
              </Text>
            </View>
          }
        />

        {/* A–Z side index for fast jumps */}
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: 4,
            top: headerH + 8,
            bottom: ACTIONBAR_H + TABBAR_H + insets.bottom + 24,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 4,
          }}
        >
          <View style={{ backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 4 }}>
            {letters.map((L) => (
              <TouchableOpacity key={L} onPress={() => jumpToLetter(L)} style={{ paddingVertical: 2, paddingHorizontal: 2 }}>
                <Text style={{ fontSize: 11, color: "#374151" }}>{L}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Fixed Bottom Action Bar */}
      {!showResults && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: 12,
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <TouchableOpacity
            onPress={submit}
            disabled={loading || (selected.length === 0 && !other.trim())}
            accessibilityLabel="Check symptoms"
            style={{
              backgroundColor: loading || (selected.length === 0 && !other.trim()) ? "#93c5fd" : theme.primary,
              padding: 14,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
              {loading ? "Checking…" : "Check Symptoms"}
            </Text>
          </TouchableOpacity>
          <View style={{ height: insets.bottom ? insets.bottom / 2 : 8 }} />
        </View>
      )}

      {/* RESULTS SLIDE-IN OVERLAY */}
      <Animated.View
        pointerEvents={showResults ? "auto" : "none"}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.bg,
          transform: [{ translateX: slideX }],
          zIndex: 20,
          paddingTop: insets.top + 8,
        }}
      >
        {/* Results header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <TouchableOpacity onPress={() => setShowResults(false)}>
            <Text style={{ fontSize: 16, color: theme.primary }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>Results</Text>
          <TouchableOpacity onPress={shareResults}>
            <Text style={{ fontSize: 16, color: theme.primary }}>Share</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          <TriageBanner triage={result?.triage} big />
          <NextSteps level={result?.triage?.level} />

          {selected.length > 0 && (
            <View style={{ marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: "#fff" }}>
              <Text style={{ fontWeight: "800", fontSize: 18 }}>You Reported</Text>
              <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 22 }}>
                {selected.map((s) => `${titleCase(s)} (${severityLabel(severityMap[s] || "moderate")})`).join(", ")}
              </Text>
            </View>
          )}

          {Array.isArray(result?.top) && result.top.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontWeight: "800", fontSize: 18 }}>Possible Conditions</Text>
              {result.top.map((d, i) => (
                <View
                  key={i}
                  style={{
                    marginTop: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    backgroundColor: "#fff",
                  }}
                >
                  <Text style={{ fontWeight: "800", fontSize: 17 }}>{titleCase(d.name || "")}</Text>
                  {typeof d.probability === "number" && (
                    <Text style={{ opacity: 0.75, marginTop: 4, fontSize: 14 }}>
                      Probability: {(d.probability * 100).toFixed(1)}%
                    </Text>
                  )}
                  {d.description ? <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 22 }}>{d.description}</Text> : null}
                  {!!d.precautions?.length && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ fontWeight: "700", fontSize: 15 }}>Precautions</Text>
                      {d.precautions.map((p, idx) => (
                        <Text key={idx} style={{ marginTop: 4, fontSize: 14 }}>• {p}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <Text style={{ marginTop: 18, color: theme.gray, fontSize: 12 }}>
            ⚠️ This app is for educational purposes and not a substitute for medical advice. If symptoms are severe, call emergency services.
          </Text>

          <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
            <TouchableOpacity onPress={newCheck} style={{ flex: 1, backgroundColor: theme.primary, padding: 14, borderRadius: 12 }}>
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Start Over</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
