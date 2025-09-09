from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
from joblib import load
import pandas as pd
import numpy as np
import json, re

ROOT = Path(__file__).resolve().parent
PROC = ROOT / "data" / "processed"
MODELS = ROOT / "models"

app = Flask(__name__)
CORS(app)  # allow all origins

# ---- Load artifacts once on startup ----
pipe = load(MODELS / "ann_pipeline.joblib")
le = load(MODELS / "label_encoder.joblib")
vocab = pd.read_csv(PROC / "symptom_vocab.csv")["symptom"].tolist()
sev_df = pd.read_csv(PROC / "severity_weights.csv")
sev = dict(zip(sev_df["symptom"], sev_df["weight"]))
with open(PROC / "disease_info.json", "r", encoding="utf-8") as f:
    info = json.load(f)

idx = {s: i for i, s in enumerate(vocab)}

def norm_text(s: str) -> str:
    s = s.strip().lower().replace(" ", "").replace("-", "_")
    s = re.sub(r"__+", "_", s)
    return s.strip("_")

def vectorize(symptoms: list[str]) -> np.ndarray:
    v = np.zeros(len(vocab), dtype=float)
    for s in symptoms:
        s2 = norm_text(s)
        if s2 in idx:
            v[idx[s2]] = float(sev.get(s2, 1.0))
    return v.reshape(1, -1)

@app.get("/")
def root():
    return jsonify(ok=True, message="ANN Symptom Classifier (Flask)")

@app.get("/labels")
def labels():
    return jsonify(num_classes=len(le.classes_), classes=le.classes_.tolist())

# NEW: expose the model vocabulary so the app can list symptoms
@app.get("/symptoms")
def symptoms():
    return jsonify(symptoms=vocab)

@app.post("/predict")
def predict():
    data = request.get_json(silent=True) or {}
    symptoms = data.get("symptoms")
    topk = int(data.get("topk", 3))

    # Allow a comma-separated string fallback
    if isinstance(symptoms, str):
        symptoms = [s.strip() for s in symptoms.split(",") if s.strip()]

    if not isinstance(symptoms, list) or not symptoms:
        return jsonify(error="Provide 'symptoms' as a non-empty list or comma-separated string."), 400

    # Known vs unknown (relative to vocab)
    normed = [norm_text(s) for s in symptoms]
    known_tokens = [t for t in normed if t in idx]
    unknown_originals = [symptoms[i] for i, t in enumerate(normed) if t not in idx]

    # If none of the inputs match the dataset, return 422 with a friendly message
    if not known_tokens:
        return jsonify(
            error="I don't have information on the provided symptoms in my dataset.",
            code="no_known_symptoms",
            unknown_symptoms=unknown_originals
        ), 422

    # Predict
    X = vectorize(symptoms)
    probs = pipe.predict_proba(X)[0]
    order = np.argsort(probs)[::-1][:topk]

    results = []
    for i in order:
        disease = le.classes_[i]
        p = float(probs[i]) * 100.0  # percent
        results.append({
            "disease": disease,
            "probability": round(p, 1),   # e.g., 96.5
            "description": info["description"].get(disease, ""),
            "precautions": info["precautions"].get(disease, []),
        })

    # Simple triage based on summed severity weights of matched symptoms
    score = float(sum(sev.get(t, 1.0) for t in known_tokens))
    if score >= 6.0:
        level = "Red"
    elif score >= 3.0:
        level = "Amber"
    else:
        level = "Green"

    reasons = sorted(known_tokens, key=lambda t: sev.get(t, 1.0), reverse=True)[:3]
    reasons_human = [r.replace("_", " ").title() for r in reasons]
    triage = {"level": level, "reasons": reasons_human, "score": score}

    return jsonify(
        input_symptoms=symptoms,
        results=results,
        triage=triage,
        unknown_symptoms=unknown_originals
    )

if __name__ == "__main__":
    # Run development server
    app.run(host="0.0.0.0", port=8001, debug=True)
