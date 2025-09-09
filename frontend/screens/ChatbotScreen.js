import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  Image,
  Animated, // ← for hero fade animation
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ChatbotScreen = () => {
  const insets = useSafeAreaInsets();

  // ---------------- State ----------------
  const [messages, setMessages] = useState([]);        // current chat messages
  const [input, setInput] = useState('');              // input text
  const [typing, setTyping] = useState(false);         // typing indicator
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);  // list of past chats

  // Hero visibility + animation (fade out on first message)
  const [showHero, setShowHero] = useState(true);
  const introOpacity = useRef(new Animated.Value(1)).current;

  const flatListRef = useRef(null);

  // --------------- Load latest session on mount ---------------
  useEffect(() => {
    (async () => {
      const history = await AsyncStorage.getItem('@chat_sessions');
      if (history) {
        const sessions = JSON.parse(history);
        if (sessions.length > 0) {
          const last = sessions[sessions.length - 1].messages || [];
          setMessages(last);
          // If there are already messages, hide hero immediately
          if (last.length > 0) {
            introOpacity.setValue(0);
            setShowHero(false);
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------- Persist messages to the latest session ---------------
  useEffect(() => {
    if (messages.length === 0) return;
    (async () => {
      const stored = await AsyncStorage.getItem('@chat_sessions');
      let sessions = stored ? JSON.parse(stored) : [];
      if (sessions.length > 0) {
        sessions[sessions.length - 1].messages = messages;
      } else {
        sessions.push({ id: Date.now(), messages });
      }
      await AsyncStorage.setItem('@chat_sessions', JSON.stringify(sessions));
    })();
  }, [messages]);

  // --------------- Fade hero out when first message appears ---------------
  useEffect(() => {
    if (messages.length > 0 && showHero) {
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(() => setShowHero(false));
    }
  }, [messages.length, showHero, introOpacity]);

  // --------------- Sidebar helpers ---------------
  const openSidebar = async () => {
    const stored = await AsyncStorage.getItem('@chat_sessions');
    const sessions = stored ? JSON.parse(stored) : [];
    setChatHistory(sessions);
    setSidebarVisible(true);
  };

  // --------------- Send message ---------------
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setTyping(true);

    try {
      // send last 10 turns as context
      const contextMessages = [...messages, userMessage].slice(-10).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const response = await fetch('http://172.20.10.4:8080/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          history: contextMessages,
        }),
      });

      const data = await response.json();
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: data.reply || "Sorry, I couldn’t find an answer.",
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          text: 'An error occurred while contacting HealthMate.',
          sender: 'bot',
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  // --------------- New chat / Clear history ---------------
  const startNewChat = async () => {
    const stored = await AsyncStorage.getItem('@chat_sessions');
    const sessions = stored ? JSON.parse(stored) : [];
    if (messages.length > 0) {
      sessions.push({ id: Date.now(), messages });
      await AsyncStorage.setItem('@chat_sessions', JSON.stringify(sessions));
    }
    // reset messages and re-show hero
    setMessages([]);
    introOpacity.setValue(1);
    setShowHero(true);
    setSidebarVisible(false);
  };

  const clearChatHistory = async () => {
    await AsyncStorage.removeItem('@chat_sessions');
    setMessages([]);
    setChatHistory([]);
    // re-show hero on clear
    introOpacity.setValue(1);
    setShowHero(true);
    setSidebarVisible(false);
  };

  // --------------- Auto scroll to bottom on updates ---------------
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, typing]);

  // --------------- Render a message bubble ---------------
  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.sender === 'user' ? styles.userText : styles.botText,
        ]}
      >
        {item.text}
      </Text>
    </View>
  );

  // ========================= UI =========================
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header w/ hamburger – safe below notch */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={openSidebar}>
          <Text style={styles.hamburger}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Main area (fills space between header and input) */}
      <View style={{ flex: 1 }}>
        {showHero ? (
          // --------- HERO (visible only before first message) ----------
          <Animated.View
            style={[
              styles.heroContainer,
              { opacity: introOpacity, paddingTop: 8 },
            ]}
          >
            {/* Change this path/name to your image */}
            <Image
              source={require('../assets/chat_hero.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
            <Text style={styles.heroTitle}>HealthMate Chat</Text>
            <Text style={styles.heroSubtitle}>
              Ask anything about your health.
            </Text>
          </Animated.View>
        ) : (
          // --------- CHAT MESSAGES ----------
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.chatContainer, { paddingBottom: 120 }]}
            ListFooterComponent={
              typing ? (
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <Text style={[styles.messageText, styles.botText]}>
                    HealthMate is typing...
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Input bar – always above the bottom safe area */}
      <View style={[styles.inputContainer, { paddingBottom: 10 + insets.bottom }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your message..."
          value={input}
          onChangeText={setInput}
          placeholderTextColor="#999"
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Sidebar (chat history) */}
      <Modal visible={sidebarVisible} animationType="slide" transparent>
        <View style={styles.sidebarOverlay}>
          <View style={[styles.sidebar, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={startNewChat} style={styles.sidebarButtonTop}>
              <Text style={styles.sidebarButtonText}>+ New Chat</Text>
            </TouchableOpacity>

            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>Chat History</Text>
              <FlatList
                data={chatHistory}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setMessages(item.messages);
                      setSidebarVisible(false);
                      introOpacity.setValue(0);
                      setShowHero(false);
                    }}
                  >
                    <Text style={styles.historyItem}>
                      {item.messages?.[0]?.text?.slice(0, 40) || 'Untitled Chat'}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity onPress={clearChatHistory} style={styles.sidebarButton}>
                <Text style={styles.sidebarButtonText}>🗑️ Clear History</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSidebarVisible(false)} style={styles.sidebarButton}>
                <Text style={styles.sidebarButtonText}>✖ Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ---------------- Layout & styles ----------------
const sidebarWidth = Dimensions.get('window').width * 0.75;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
  },
  hamburger: { fontSize: 24, color: '#007AFF' },

  // Hero section (no absolute positioning; never overlaps input)
  heroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroImage: {
    width: '78%',
    height: 200,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Chat bubbles
  chatContainer: { padding: 16 },
  messageBubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '80%' },
  userBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  botBubble: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start' },
  messageText: { fontSize: 16 },
  userText: { color: '#fff' },
  botText: { color: '#000' },

  // Input bar
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    color: '#000',
  },
  sendButton: { justifyContent: 'center', paddingHorizontal: 15 },
  sendText: { color: '#007AFF', fontWeight: 'bold' },

  // Sidebar
  sidebarOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)' },
  sidebar: { width: sidebarWidth, backgroundColor: '#fff', paddingHorizontal: 20, justifyContent: 'space-between' },
  sidebarButtonTop: { marginBottom: 20 },
  sidebarButton: { paddingVertical: 10 },
  sidebarButtonText: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  historyContainer: { flex: 1 },
  historyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  historyItem: { fontSize: 15, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sidebarFooter: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
});

export default ChatbotScreen;
