import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ClubMessage {
  id: string;
  club_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system' | 'voice_note';
  reply_to_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender_name?: string;
  sender_email?: string;
  sender_blood_group?: string;
  sender_avatar_url?: string;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system' | 'voice_note';
  reply_to_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender_name?: string;
  sender_email?: string;
  sender_avatar_url?: string;
  is_read?: boolean;
}

export interface Conversation {
  conversation_id: string;
  participant_name: string;
  participant_email: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface TypingIndicator {
  user_id: string;
  user_name: string;
  timestamp: number;
}

export interface PresenceState {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  is_typing: boolean;
  typing_in_channel?: string;
}

class ChatService {
  private channels: Map<string, RealtimeChannel> = new Map();

  // Club Messages
  async getClubMessages(
    clubId: string,
    limit = 50,
    offset = 0
  ): Promise<ClubMessage[]> {
    const { data, error } = await supabase
      .from('club_messages')
      .select(
        `
        *,
        sender:user_profiles!club_messages_sender_id_fkey(name, email, blood_group, avatar_url)
      `
      )
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (data || []).reverse().map((msg) => ({
      ...msg,
      sender_name: msg.sender?.name,
      sender_email: msg.sender?.email,
      sender_blood_group: msg.sender?.blood_group,
      sender_avatar_url: msg.sender?.avatar_url,
    }));
  }

  async sendClubMessage(
    clubId: string,
    senderId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'voice_note' = 'text',
    replyToId?: string,
    fileData?: { url: string; name: string; size: number }
  ): Promise<ClubMessage> {
    const messageData: any = {
      club_id: clubId,
      sender_id: senderId,
      content,
      message_type: messageType,
      reply_to_id: replyToId,
    };

    if (fileData) {
      messageData.file_url = fileData.url;
      messageData.file_name = fileData.name;
      messageData.file_size = fileData.size;
    }

    const { data, error } = await supabase
      .from('club_messages')
      .insert(messageData)
      .select(
        `
        *,
        sender:user_profiles!club_messages_sender_id_fkey(name, email, blood_group, avatar_url)
      `
      )
      .single();

    if (error) throw error;

    return {
      ...data,
      sender_name: data.sender?.name,
      sender_email: data.sender?.email,
      sender_blood_group: data.sender?.blood_group,
    };
  }

  async updateClubMessage(messageId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('club_messages')
      .update({
        content,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  }

  async deleteClubMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('club_messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  }

  // Direct Messages
  async getDirectMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<DirectMessage[]> {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(
        `
        *,
        sender:user_profiles!direct_messages_sender_id_fkey(name, email, avatar_url),
        message_read_status(read_at)
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (data || []).reverse().map((msg) => ({
      ...msg,
      sender_name: msg.sender?.name,
      sender_email: msg.sender?.email,
      sender_avatar_url: msg.sender?.avatar_url,
      is_read: msg.message_read_status && msg.message_read_status.length > 0,
    }));
  }

  async sendDirectMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'voice_note' = 'text',
    replyToId?: string,
    fileData?: { url: string; name: string; size: number }
  ): Promise<DirectMessage> {
    const messageData: any = {
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      message_type: messageType,
      reply_to_id: replyToId,
    };

    if (fileData) {
      messageData.file_url = fileData.url;
      messageData.file_name = fileData.name;
      messageData.file_size = fileData.size;
    }

    const { data, error } = await supabase
      .from('direct_messages')
      .insert(messageData)
      .select(
        `
        *,
        sender:user_profiles!direct_messages_sender_id_fkey(name, email)
      `
      )
      .single();

    if (error) throw error;

    return {
      ...data,
      sender_name: data.sender?.name,
      sender_email: data.sender?.email,
    };
  }

  async getOrCreateConversation(
    userId1: string,
    userId2: string
  ): Promise<Conversation> {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      user1_id: userId1,
      user2_id: userId2,
    });

    if (error) throw error;
    return data[0] || null;
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    // Get all conversation IDs for the user
    const { data: userConversations, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    const conversations: Conversation[] = [];

    for (const conv of userConversations || []) {
      // Get the other participant in this conversation
      const { data: otherParticipant } = await supabase
        .from('conversation_participants')
        .select(
          `
          user_id,
          user:user_profiles!conversation_participants_user_id_fkey(name, email)
        `
        )
        .eq('conversation_id', conv.conversation_id)
        .neq('user_id', userId)
        .eq('is_active', true)
        .single();

      // Get last message
      const { data: lastMessage } = await supabase
        .from('direct_messages')
        .select('content, created_at')
        .eq('conversation_id', conv.conversation_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conv.conversation_id)
        .eq('receiver_id', userId)
        .is('message_read_status.read_at', null);

      conversations.push({
        conversation_id: conv.conversation_id,
        participant_name: (otherParticipant?.user as any)?.name || 'Unknown',
        participant_email: (otherParticipant?.user as any)?.email || '',
        last_message: lastMessage?.content || '',
        last_message_at: lastMessage?.created_at || '',
        unread_count: unreadCount || 0,
      });
    }

    return conversations.sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() -
        new Date(a.last_message_at).getTime()
    );
  }

  async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase.rpc('mark_messages_read', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    if (error) throw error;
  }

  // Presence and Typing
  async updateMemberPresence(
    clubId: string,
    userId: string,
    status: 'online' | 'away' | 'busy' | 'offline' = 'online'
  ): Promise<void> {
    const { error } = await supabase.rpc('update_member_presence', {
      p_club_id: clubId,
      p_user_id: userId,
      p_status: status,
    });

    if (error) throw error;
  }

  async setTypingStatus(
    clubId: string,
    userId: string,
    isTyping: boolean,
    channel: string = 'general'
  ): Promise<void> {
    const { error } = await supabase.rpc('set_typing_status', {
      p_club_id: clubId,
      p_user_id: userId,
      p_is_typing: isTyping,
      p_channel: channel,
    });

    if (error) throw error;
  }

  async getOnlineMembers(clubId: string): Promise<PresenceState[]> {
    const { data, error } = await supabase
      .from('club_member_presence')
      .select(
        `
        user_id,
        status,
        last_seen,
        is_typing,
        typing_in_channel,
        user:user_profiles!club_member_presence_user_id_fkey(name)
      `
      )
      .eq('club_id', clubId)
      .in('status', ['online', 'away', 'busy']);

    if (error) throw error;

    return (data || []).map((presence) => ({
      user_id: presence.user_id,
      status: presence.status,
      last_seen: presence.last_seen,
      is_typing: presence.is_typing,
      typing_in_channel: presence.typing_in_channel,
    }));
  }

  // Real-time Subscriptions
  subscribeToClubMessages(
    clubId: string,
    onNewMessage: (message: ClubMessage) => void,
    onMessageUpdate: (message: ClubMessage) => void,
    onMessageDelete: (messageId: string) => void
  ): RealtimeChannel {
    const channelId = `club_${clubId}_messages`;

    if (this.channels.has(channelId)) {
      this.unsubscribe(channelId);
    }

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'club_messages',
          filter: `club_id=eq.${clubId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Fetch sender details
          const { data: sender } = await supabase
            .from('user_profiles')
            .select('name, email, blood_group')
            .eq('id', newMessage.sender_id)
            .single();

          onNewMessage({
            ...newMessage,
            sender_name: sender?.name,
            sender_email: sender?.email,
            sender_blood_group: sender?.blood_group,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'club_messages',
          filter: `club_id=eq.${clubId}`,
        },
        async (payload) => {
          const updatedMessage = payload.new as any;

          const { data: sender } = await supabase
            .from('user_profiles')
            .select('name, email, blood_group')
            .eq('id', updatedMessage.sender_id)
            .single();

          onMessageUpdate({
            ...updatedMessage,
            sender_name: sender?.name,
            sender_email: sender?.email,
            sender_blood_group: sender?.blood_group,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'club_messages',
          filter: `club_id=eq.${clubId}`,
        },
        (payload) => {
          onMessageDelete(payload.old.id);
        }
      )
      .subscribe();

    this.channels.set(channelId, channel);
    return channel;
  }

  subscribeToDirectMessages(
    conversationId: string,
    onNewMessage: (message: DirectMessage) => void,
    onMessageUpdate: (message: DirectMessage) => void,
    onMessageDelete: (messageId: string) => void
  ): RealtimeChannel {
    const channelId = `conversation_${conversationId}_messages`;

    if (this.channels.has(channelId)) {
      this.unsubscribe(channelId);
    }

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;

          const { data: sender } = await supabase
            .from('user_profiles')
            .select('name, email')
            .eq('id', newMessage.sender_id)
            .single();

          onNewMessage({
            ...newMessage,
            sender_name: sender?.name,
            sender_email: sender?.email,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const updatedMessage = payload.new as any;

          const { data: sender } = await supabase
            .from('user_profiles')
            .select('name, email')
            .eq('id', updatedMessage.sender_id)
            .single();

          onMessageUpdate({
            ...updatedMessage,
            sender_name: sender?.name,
            sender_email: sender?.email,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessageDelete(payload.old.id);
        }
      )
      .subscribe();

    this.channels.set(channelId, channel);
    return channel;
  }

  subscribeToPresence(
    clubId: string,
    onPresenceUpdate: (presence: PresenceState[]) => void,
    onTypingUpdate: (typingUsers: TypingIndicator[]) => void
  ): RealtimeChannel {
    const channelId = `club_${clubId}_presence`;

    if (this.channels.has(channelId)) {
      this.unsubscribe(channelId);
    }

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'club_member_presence',
          filter: `club_id=eq.${clubId}`,
        },
        async () => {
          // Fetch updated presence data
          const presence = await this.getOnlineMembers(clubId);
          onPresenceUpdate(presence);

          // Extract typing users
          const typingUsers: TypingIndicator[] = presence
            .filter((p) => p.is_typing)
            .map((p) => ({
              user_id: p.user_id,
              user_name: 'User', // Will be fetched separately
              timestamp: Date.now(),
            }));

          onTypingUpdate(typingUsers);
        }
      )
      .subscribe();

    this.channels.set(channelId, channel);
    return channel;
  }

  unsubscribe(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelId);
    }
  }

  unsubscribeAll(): void {
    this.channels.forEach((channel, channelId) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  // Notifications
  async createChatNotification(
    clubId: string,
    userId: string,
    type: 'new_message' | 'new_direct_message',
    title: string,
    message: string
  ): Promise<void> {
    const { error } = await supabase.from('club_notifications').insert({
      club_id: clubId,
      user_id: userId,
      type,
      title,
      message,
      is_read: false,
    });

    if (error) throw error;
  }
}

export const chatService = new ChatService();
