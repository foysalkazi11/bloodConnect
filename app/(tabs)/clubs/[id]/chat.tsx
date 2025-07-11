import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoveVertical as MoreVertical,
} from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';
import { TextAvatar } from '@/components/TextAvatar';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  created_at: string;
  is_own: boolean;
}

interface TypingUser {
  user_id: string;
  user_name: string;
  timestamp: number;
}

export default function ClubChatScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadMessages();
    setupRealtimeSubscription();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [id]);

  const loadMessages = async () => {
    try {
      // Mock messages for now - replace with actual Supabase query
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          sender_id: 'user1',
          sender_name: 'Ahmed Rahman',
          content: 'Welcome everyone to our club chat! 🩸',
          message_type: 'text',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_own: false,
        },
        {
          id: '2',
          sender_id: 'user2',
          sender_name: 'Fatima Khan',
          content:
            'Thanks for setting this up! This will make coordination much easier.',
          message_type: 'text',
          created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          is_own: false,
        },
        {
          id: '3',
          sender_id: user?.id || 'current_user',
          sender_name: profile?.name || 'You',
          content: 'Excited to be part of this community!',
          message_type: 'text',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          is_own: true,
        },
      ];

      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load messages',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`club_chat_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'club_messages',
          filter: `club_id=eq.${id}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              id: newMessage.id,
              sender_id: newMessage.sender_id,
              sender_name: newMessage.sender_name,
              content: newMessage.content,
              message_type: newMessage.message_type,
              created_at: newMessage.created_at,
              is_own: newMessage.sender_id === user?.id,
            },
          ]);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        // Handle user presence
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handle user joining
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Handle user leaving
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const tempMessage: ChatMessage = {
      id: Date.now().toString(),
      sender_id: user?.id || 'current_user',
      sender_name: profile?.name || 'You',
      content: newMessage,
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_own: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      //Send message to Supabase
      const { error } = await supabase.from('club_messages').insert({
        club_id: id,
        sender_id: user?.id,
        content: newMessage,
        message_type: 'text',
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to send message',
        duration: 4000,
      });

      // Remove the temp message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);

    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      // Send typing indicator
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // Send stop typing indicator
    }, 1000);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    return date.toLocaleDateString();
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isConsecutive =
      index > 0 &&
      messages[index - 1].sender_id === message.sender_id &&
      new Date(message.created_at).getTime() -
        new Date(messages[index - 1].created_at).getTime() <
        5 * 60 * 1000;

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          message.is_own
            ? styles.ownMessageContainer
            : styles.otherMessageContainer,
          isConsecutive && styles.consecutiveMessage,
        ]}
      >
        {!message.is_own && !isConsecutive && (
          <View style={styles.messageHeader}>
            <TextAvatar name={message.sender_name} size={32} />
            <Text style={styles.senderName}>{message.sender_name}</Text>
            <Text style={styles.messageTime}>
              {formatMessageTime(message.created_at)}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            message.is_own
              ? styles.ownMessageBubble
              : styles.otherMessageBubble,
            !message.is_own && isConsecutive && styles.consecutiveMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              message.is_own ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {message.content}
          </Text>
        </View>

        {message.is_own && (
          <Text style={styles.ownMessageTime}>
            {formatMessageTime(message.created_at)}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Club Chat</Text>
          <Text style={styles.headerSubtitle}>12 members online</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Phone size={20} color="#DC2626" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <Video size={20} color="#DC2626" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <MoreVertical size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((message, index) => renderMessage(message, index))}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
              <Text style={styles.typingText}>
                {typingUsers.map((u) => u.user_name).join(', ')}{' '}
                {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Paperclip size={20} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={handleTyping}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Smile size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              newMessage.trim()
                ? styles.sendButtonActive
                : styles.sendButtonInactive,
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Send size={20} color={newMessage.trim() ? '#FFFFFF' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  consecutiveMessage: {
    marginBottom: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  senderName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  messageTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  ownMessageBubble: {
    backgroundColor: '#DC2626',
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  consecutiveMessageBubble: {
    marginLeft: 40,
  },
  messageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#111827',
  },
  ownMessageTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    marginRight: 8,
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginTop: 8,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginLeft: 40,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  typingDot1: {
    // Animation would be added here
  },
  typingDot2: {
    // Animation would be added here
  },
  typingDot3: {
    // Animation would be added here
  },
  typingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
    textAlignVertical: 'top',
  },
  emojiButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#DC2626',
  },
  sendButtonInactive: {
    backgroundColor: '#F3F4F6',
  },
});
