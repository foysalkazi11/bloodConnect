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
  Image,
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
import { getAvatarUrl } from '@/utils/avatarUtils';
import {
  chatService,
  DirectMessage,
  Conversation,
} from '@/services/chatService';
import { supabase } from '@/lib/supabase';
import useProgressivePermissions from '@/hooks/useProgressivePermissions';
import ContextualPermissionRequest from '@/components/ContextualPermissionRequest';

interface DirectMessageUI extends DirectMessage {
  is_own: boolean;
}

export default function DirectMessageScreen() {
  const { id, userId } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();
  const {
    currentRequest,
    isVisible,
    triggerPermissionRequest,
    handleAccept,
    handleDecline,
    handleSkip,
    handleCustomize,
  } = useProgressivePermissions();

  const [messages, setMessages] = useState<DirectMessageUI[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!userId || !user?.id) return;

    initializeConversation();
    loadRecipientInfo();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      chatService.unsubscribeAll();
    };
  }, [userId, user?.id]);

  const initializeConversation = async () => {
    if (!userId || !user?.id) return;

    try {
      // Get or create conversation
      const conv = await chatService.getOrCreateConversation(
        user.id,
        userId as string
      );

      setConversation(conv);
      setRecipientName(conv.participant_name);
      setRecipientEmail(conv.participant_email);

      // Load messages for this conversation
      await loadMessages(conv.conversation_id);

      // Set up real-time subscription
      setupRealtimeSubscription(conv.conversation_id);

      // Mark messages as read
      await chatService.markMessagesAsRead(conv.conversation_id, user.id);
    } catch (error) {
      console.error('Error initializing conversation:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load conversation',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecipientInfo = async () => {
    if (!userId) return;

    try {
      const { data: recipientData, error } = await supabase
        .from('user_profiles')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setRecipientName(recipientData.name);
      setRecipientEmail(recipientData.email);
    } catch (error) {
      console.error('Error loading recipient info:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const directMessages = await chatService.getDirectMessages(
        conversationId
      );
      const messagesWithOwnership = directMessages.map((msg) => ({
        ...msg,
        is_own: msg.sender_id === user?.id,
      }));
      setMessages(messagesWithOwnership);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const setupRealtimeSubscription = (conversationId: string) => {
    if (!user?.id) return;

    chatService.subscribeToDirectMessages(
      conversationId,
      (newMessage) => {
        const messageWithOwnership = {
          ...newMessage,
          is_own: newMessage.sender_id === user.id,
        };
        setMessages((prev) => [...prev, messageWithOwnership]);

        // Scroll to bottom when new message arrives
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Show popup notification for messages from others (only when on chat page)
        if (newMessage.sender_id !== user.id) {
          showNotification(
            {
              type: 'info',
              title: 'New Message',
              message: `${newMessage.sender_name}: ${newMessage.content}`,
              duration: 3000,
            },
            true
          ); // Force show popup since we're on direct message page
        }

        // Mark message as read if it's not from current user
        if (newMessage.sender_id !== user.id) {
          chatService.markMessagesAsRead(conversationId, user.id);
        }
      },
      (updatedMessage) => {
        const messageWithOwnership = {
          ...updatedMessage,
          is_own: updatedMessage.sender_id === user.id,
        };
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === updatedMessage.id ? messageWithOwnership : msg
          )
        );
      },
      (deletedMessageId) => {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== deletedMessageId)
        );
      }
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || !user?.id || !userId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      await chatService.sendDirectMessage(
        conversation.conversation_id,
        user.id,
        userId as string,
        messageContent
      );

      // Trigger permission request for direct messages (only for first message in conversation)
      if (messages.filter((msg) => msg.is_own).length === 0) {
        triggerPermissionRequest({
          trigger: 'first_message',
          userId: userId as string,
          metadata: {
            recipientName: recipientName,
            conversationId: conversation.conversation_id,
          },
        });
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to send message',
        duration: 4000,
      });
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
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

  const renderMessage = (message: DirectMessageUI, index: number) => {
    const isConsecutive =
      index > 0 &&
      messages[index - 1].sender_id === message.sender_id &&
      new Date(message.created_at).getTime() -
        new Date(messages[index - 1].created_at).getTime() <
        5 * 60 * 1000;

    if (message.is_own) {
      // Own message (right side, red)
      return (
        <View
          key={message.id}
          style={[styles.messageContainer, styles.ownMessageContainer]}
        >
          <View style={styles.ownMessageBubble}>
            <Text style={styles.ownMessageText}>{message.content}</Text>
            {message.is_edited && (
              <Text style={styles.editedText}>(edited)</Text>
            )}
          </View>
          <View style={styles.ownMessageFooter}>
            <Text style={styles.ownMessageTime}>
              {formatMessageTime(message.created_at)}
            </Text>
            {message.is_read && <Text style={styles.readStatus}>Read</Text>}
          </View>
        </View>
      );
    } else {
      // Other user's message (left side)
      return (
        <View
          key={message.id}
          style={[
            styles.messageContainer,
            styles.otherMessageContainer,
            isConsecutive && styles.consecutiveMessage,
          ]}
        >
          <View style={styles.otherMessageRow}>
            {!isConsecutive &&
              (message.sender_avatar_url ? (
                <Image
                  source={{
                    uri: getAvatarUrl(
                      {
                        avatar_url: message.sender_avatar_url,
                        id: message.sender_id,
                      },
                      36
                    ),
                  }}
                  style={styles.messageAvatar}
                />
              ) : (
                <TextAvatar name={message.sender_name || 'Unknown'} size={36} />
              ))}
            {isConsecutive && <View style={styles.avatarSpacer} />}

            <View style={styles.otherMessageContent}>
              {!isConsecutive && (
                <View style={styles.otherMessageHeader}>
                  <Text style={styles.senderName}>{message.sender_name}</Text>
                  <Text style={styles.otherMessageTime}>
                    {formatMessageTime(message.created_at)}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.otherMessageBubble,
                  isConsecutive && styles.consecutiveMessageBubble,
                ]}
              >
                <Text style={styles.otherMessageText}>{message.content}</Text>
                {message.is_edited && (
                  <Text style={styles.editedText}>(edited)</Text>
                )}
              </View>

              {isConsecutive && (
                <Text style={styles.consecutiveMessageTime}>
                  {formatMessageTime(message.created_at)}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading conversation...</Text>
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
          <Text style={styles.headerTitle}>{recipientName}</Text>
          <Text style={styles.headerSubtitle}>{recipientEmail}</Text>
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
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Start your conversation with {recipientName}
              </Text>
            </View>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
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
              placeholder={`Message ${recipientName}...`}
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

      {/* Progressive Permission Request Modal */}
      <ContextualPermissionRequest
        visible={isVisible}
        request={currentRequest}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onSkip={handleSkip}
        onCustomize={handleCustomize}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  consecutiveMessage: {
    marginBottom: 6,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  otherMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '85%',
  },
  avatarSpacer: {
    width: 36,
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  otherMessageContent: {
    flex: 0,
    maxWidth: '75%',
    minWidth: 100,
  },
  otherMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  otherMessageTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#9CA3AF',
  },
  consecutiveMessageTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    marginLeft: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '80%',
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  otherMessageBubble: {
    backgroundColor: '#F8F9FA',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  consecutiveMessageBubble: {
    borderTopLeftRadius: 18,
    marginTop: 2,
    backgroundColor: '#F8F9FA',
  },
  messageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  otherMessageText: {
    color: '#374151',
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 20,
  },
  editedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 3,
    opacity: 0.8,
  },
  ownMessageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    marginRight: 4,
    gap: 8,
  },
  ownMessageTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#9CA3AF',
  },
  readStatus: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#10B981',
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
