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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatbotScreen = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const flatListRef = useRef(null);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('@chat_history');
      if (stored) setMessages(JSON.parse(stored));
    })();
  }, []);

  // Save to AsyncStorage on change
  useEffect(() => {
    AsyncStorage.setItem('@chat_history', JSON.stringify(messages));
  }, [messages]);

  // Show full history in modal
  const openHistory = async () => {
    const stored = await AsyncStorage.getItem('@chat_history');
    if (stored) setChatHistory(JSON.parse(stored));
    setModalVisible(true);
  };

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
      const response = await fetch('http://172.20.10.11:8080/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: data.reply || 'Sorry, I couldn’t find an answer.',
        sender: 'bot',
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 2).toString(),
        text: 'An error occurred while contacting HealthMate.',
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Bar with Hamburger Icon */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openHistory}>
          <Text style={styles.hamburger}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Empty screen message */}
      {messages.length === 0 && (
        <View style={styles.centerMessageContainer}>
          <Text style={styles.centerMessage}>How can I help you?</Text>
        </View>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={
            typing
              ? [...messages, { id: 'typing', text: 'HealthMate is typing...', sender: 'bot' }]
              : messages
          }
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatContainer}
        />
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your message..."
          value={input}
          onChangeText={setInput}
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* History Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Chat History</Text>
          <FlatList
            data={chatHistory}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Text style={styles.historyItem}>
                {item.sender === 'user' ? '🧑‍💬' : '🤖'} {item.text}
              </Text>
            )}
          />
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
            <Text style={styles.sendText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 10,
    paddingLeft: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'flex-start',
  },
  hamburger: {
    fontSize: 24,
    color: '#007AFF',
  },
  centerMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerMessage: {
    fontSize: 18,
    color: '#444',
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  botBubble: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
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
  sendButton: {
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  sendText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  historyItem: {
    fontSize: 16,
    marginVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
  },
  closeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
});

export default ChatbotScreen;
