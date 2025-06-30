import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Pin, Bell, Calendar, Users, MessageCircle, Heart } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';
import { TextAvatar } from '@/components/TextAvatar';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
  is_pinned: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  event_date?: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  tags: string[];
}

export default function ClubAnnouncementsScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    event_date: '',
    tags: [] as string[],
  });

  useEffect(() => {
    loadAnnouncements();
  }, [id]);

  const loadAnnouncements = async () => {
    try {
      // Mock announcements - replace with actual Supabase query
      const mockAnnouncements: Announcement[] = [
        {
          id: '1',
          title: 'Emergency Blood Drive - Tomorrow!',
          content: '🚨 URGENT: We need O+ and AB- blood donors for an emergency case at Dhaka Medical College Hospital. Please come tomorrow between 9 AM - 5 PM. Every donation can save up to 3 lives!',
          author_id: 'admin1',
          author_name: 'Ahmed Rahman',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_pinned: true,
          priority: 'urgent',
          event_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          likes_count: 45,
          comments_count: 12,
          is_liked: false,
          tags: ['emergency', 'blood-drive', 'urgent'],
        },
        {
          id: '2',
          title: 'Monthly Club Meeting - This Saturday',
          content: 'Join us for our monthly club meeting this Saturday at 3 PM. We\'ll discuss upcoming events, new member orientations, and plan our next awareness campaign. Light refreshments will be provided.',
          author_id: 'admin2',
          author_name: 'Fatima Khan',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          is_pinned: false,
          priority: 'medium',
          event_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          likes_count: 28,
          comments_count: 7,
          is_liked: true,
          tags: ['meeting', 'monthly'],
        },
        {
          id: '3',
          title: 'New Volunteer Training Program',
          content: 'We\'re launching a comprehensive training program for new volunteers! Learn about blood donation processes, donor care, and emergency procedures. Registration is now open.',
          author_id: 'admin1',
          author_name: 'Ahmed Rahman',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          is_pinned: false,
          priority: 'high',
          likes_count: 67,
          comments_count: 23,
          is_liked: false,
          tags: ['training', 'volunteers', 'education'],
        },
      ];
      
      setAnnouncements(mockAnnouncements);
    } catch (error) {
      console.error('Error loading announcements:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load announcements',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in title and content',
        duration: 4000,
      });
      return;
    }

    try {
      const announcement: Announcement = {
        id: Date.now().toString(),
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        author_id: user?.id || 'current_user',
        author_name: profile?.name || 'You',
        created_at: new Date().toISOString(),
        is_pinned: false,
        priority: newAnnouncement.priority,
        event_date: newAnnouncement.event_date || undefined,
        likes_count: 0,
        comments_count: 0,
        is_liked: false,
        tags: newAnnouncement.tags,
      };

      setAnnouncements([announcement, ...announcements]);
      setNewAnnouncement({
        title: '',
        content: '',
        priority: 'medium',
        event_date: '',
        tags: [],
      });
      setShowCreateModal(false);
      
      showNotification({
        type: 'success',
        title: 'Announcement Created',
        message: 'Your announcement has been posted to the club',
        duration: 3000,
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create announcement',
        duration: 4000,
      });
    }
  };

  const handleLikeAnnouncement = (announcementId: string) => {
    setAnnouncements(announcements.map(announcement => {
      if (announcement.id === announcementId) {
        return {
          ...announcement,
          is_liked: !announcement.is_liked,
          likes_count: announcement.is_liked ? announcement.likes_count - 1 : announcement.likes_count + 1,
        };
      }
      return announcement;
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'URGENT';
      case 'high': return 'HIGH';
      case 'medium': return 'MEDIUM';
      case 'low': return 'LOW';
      default: return 'NORMAL';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Announcements List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {announcements.map((announcement) => (
          <View key={announcement.id} style={styles.announcementCard}>
            {/* Priority and Pin Indicators */}
            <View style={styles.announcementHeader}>
              <View style={styles.headerLeft}>
                {announcement.is_pinned && (
                  <View style={styles.pinnedBadge}>
                    <Pin size={12} color="#DC2626" />
                    <Text style={styles.pinnedText}>Pinned</Text>
                  </View>
                )}
                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(announcement.priority) }
                ]}>
                  <Text style={styles.priorityText}>
                    {getPriorityLabel(announcement.priority)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.notificationButton}>
                <Bell size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Author Info */}
            <View style={styles.authorInfo}>
              <TextAvatar name={announcement.author_name} size={40} />
              <View style={styles.authorDetails}>
                <Text style={styles.authorName}>{announcement.author_name}</Text>
                <Text style={styles.postTime}>{formatTimeAgo(announcement.created_at)}</Text>
              </View>
            </View>

            {/* Content */}
            <Text style={styles.announcementTitle}>{announcement.title}</Text>
            <Text style={styles.announcementContent}>{announcement.content}</Text>

            {/* Event Date */}
            {announcement.event_date && (
              <View style={styles.eventDateContainer}>
                <Calendar size={16} color="#DC2626" />
                <Text style={styles.eventDateText}>
                  {formatEventDate(announcement.event_date)}
                </Text>
              </View>
            )}

            {/* Tags */}
            {announcement.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {announcement.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.announcementActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLikeAnnouncement(announcement.id)}
              >
                <Heart
                  size={20}
                  color={announcement.is_liked ? '#DC2626' : '#6B7280'}
                  fill={announcement.is_liked ? '#DC2626' : 'none'}
                />
                <Text style={styles.actionText}>{announcement.likes_count}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <MessageCircle size={20} color="#6B7280" />
                <Text style={styles.actionText}>{announcement.comments_count}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Users size={20} color="#6B7280" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Create Announcement Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TouchableOpacity 
              onPress={handleCreateAnnouncement}
              disabled={!newAnnouncement.title.trim() || !newAnnouncement.content.trim()}
            >
              <Text style={[
                styles.modalPostText,
                (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) && styles.modalPostTextDisabled
              ]}>
                Post
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Enter announcement title"
                placeholderTextColor="#9CA3AF"
                value={newAnnouncement.title}
                onChangeText={(text) => setNewAnnouncement({...newAnnouncement, title: text})}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.prioritySelector}>
                {['low', 'medium', 'high', 'urgent'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      newAnnouncement.priority === priority && styles.priorityOptionActive,
                      { borderColor: getPriorityColor(priority) }
                    ]}
                    onPress={() => setNewAnnouncement({...newAnnouncement, priority: priority as any})}
                  >
                    <Text style={[
                      styles.priorityOptionText,
                      newAnnouncement.priority === priority && { color: getPriorityColor(priority) }
                    ]}>
                      {getPriorityLabel(priority)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Content *</Text>
              <TextInput
                style={styles.contentInput}
                placeholder="Write your announcement..."
                placeholderTextColor="#9CA3AF"
                value={newAnnouncement.content}
                onChangeText={(text) => setNewAnnouncement({...newAnnouncement, content: text})}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Event Date (Optional)</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor="#9CA3AF"
                value={newAnnouncement.event_date}
                onChangeText={(text) => setNewAnnouncement({...newAnnouncement, event_date: text})}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  createButton: {
    backgroundColor: '#DC2626',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  announcementCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  pinnedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#DC2626',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  postTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  announcementTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 8,
  },
  announcementContent: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  eventDateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#DC2626',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#2563EB',
  },
  announcementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCancelText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
  },
  modalPostText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
  modalPostTextDisabled: {
    color: '#9CA3AF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
  },
  priorityOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  priorityOptionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#6B7280',
  },
  contentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
  },
});