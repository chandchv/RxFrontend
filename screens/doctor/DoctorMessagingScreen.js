import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DoctorMessagingScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/users/api/doctor/messages/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setThreads(data.threads || []);

    } catch (error) {
      console.error('Error fetching threads:', error);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/messages/${threadId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessages(data.messages || []);

    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/messages/send/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: selectedThread.id,
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNewMessage('');
      fetchMessages(selectedThread.id); // Refresh messages
      fetchThreads(); // Refresh threads

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const markAsRead = async (threadId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/doctor/messages/${threadId}/mark-read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchThreads(); // Refresh threads
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const filteredThreads = threads.filter(thread =>
    thread.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderThreadItem = ({ item: thread }) => (
    <TouchableOpacity
      style={[styles.threadItem, selectedThread?.id === thread.id && styles.selectedThread]}
      onPress={() => {
        setSelectedThread(thread);
        fetchMessages(thread.id);
        markAsRead(thread.id);
      }}
    >
      <View style={styles.threadHeader}>
        <View style={styles.threadInfo}>
          <Text style={styles.threadPatient}>Patient: {thread.patient_name}</Text>
          <Text style={styles.threadSubject}>{thread.subject}</Text>
        </View>
        <View style={styles.threadMeta}>
          <Text style={styles.threadDate}>{thread.last_message_date}</Text>
          {thread.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{thread.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.threadPreview} numberOfLines={2}>
        {thread.last_message}
      </Text>
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item: message }) => (
    <View
      style={[
        styles.messageItem,
        message.sender_type === 'doctor' ? styles.doctorMessage : styles.patientMessage
      ]}
    >
      <View style={styles.messageHeader}>
        <Text style={styles.messageSender}>
          {message.sender_type === 'doctor' ? 'You' : `Patient: ${message.patient_name}`}
        </Text>
        <Text style={styles.messageDate}>{message.created_at}</Text>
      </View>
      <Text style={styles.messageContent}>{message.content}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Threads List */}
      <View style={styles.threadsContainer}>
        <View style={styles.threadsHeader}>
          <Text style={styles.threadsTitle}>Patient Conversations</Text>
          <TouchableOpacity style={styles.newThreadButton}>
            <Icon name="add" size={20} color="#0066cc" />
            <Text style={styles.newThreadText}>New</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={filteredThreads}
          renderItem={renderThreadItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.threadsList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Messages Area */}
      <View style={styles.messagesContainer}>
        {selectedThread ? (
          <>
            <View style={styles.messagesHeader}>
              <Text style={styles.messagesTitle}>
                {selectedThread.subject} - {selectedThread.patient_name}
              </Text>
            </View>
            <FlatList
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.messagesList}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type your message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <Icon name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.noSelectionContainer}>
            <Icon name="message" size={64} color="#ccc" />
            <Text style={styles.noSelectionText}>Select a conversation to view messages</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  threadsContainer: {
    width: '40%',
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  threadsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  threadsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  newThreadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
  },
  newThreadText: {
    marginLeft: 4,
    color: '#0066cc',
    fontWeight: '500',
  },
  threadsList: {
    flex: 1,
  },
  threadItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedThread: {
    backgroundColor: '#f0f8ff',
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  threadInfo: {
    flex: 1,
  },
  threadPatient: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  threadSubject: {
    fontSize: 14,
    color: '#666',
  },
  threadMeta: {
    alignItems: 'flex-end',
  },
  threadDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#0066cc',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  threadPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  messagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesList: {
    flex: 1,
    padding: 15,
  },
  messageItem: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  doctorMessage: {
    alignSelf: 'flex-end',
  },
  patientMessage: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#0066cc',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSelectionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSelectionText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default DoctorMessagingScreen;
