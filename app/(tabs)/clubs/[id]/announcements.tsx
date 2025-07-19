import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  Pin,
  Bell,
  Calendar,
  Users,
  MessageCircle,
  Heart,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';
import { TextAvatar } from '@/components/TextAvatar';
import { ValidatedInput } from '@/components/ValidatedInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';

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
  location?: string;
  target_audience?: 'all' | 'admins' | 'moderators' | 'members';
  attachment_url?: string;
}

export default function ClubAnnouncementsScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    event_date: '',
    tags: [] as string[],
    location: '',
    target_audience: 'all' as 'all' | 'admins' | 'moderators' | 'members',
    attachment_url: '',
  });

  // Tag management state
  const [currentTag, setCurrentTag] = useState('');
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {}
  );

  // Permission and role state
  const [userRole, setUserRole] = useState<
    'owner' | 'admin' | 'moderator' | 'member' | null
  >(null);
  const [canCreateAnnouncement, setCanCreateAnnouncement] = useState(false);
  const [canEditAnnouncement, setCanEditAnnouncement] = useState(false);
  const [canDeleteAnnouncement, setCanDeleteAnnouncement] = useState(false);
  const [clubData, setClubData] = useState<any>(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventDate, setEventDate] = useState<Date | null>(null);

  useEffect(() => {
    checkUserPermissions();
  }, [id, user]);

  useEffect(() => {
    if (userRole !== null) {
      loadAnnouncements();
    }
  }, [userRole]);

  const checkUserPermissions = async () => {
    try {
      if (!user) {
        setUserRole(null);
        setCanCreateAnnouncement(false);
        return;
      }

      // Check if user is the club owner
      const { data: clubData, error: clubError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .eq('user_type', 'club')
        .single();

      if (clubError || !clubData) {
        console.error('Error loading club:', clubError);
        return;
      }

      setClubData(clubData);

      // Check if user is the club owner
      if (user.id === id) {
        setUserRole('owner');
        setCanCreateAnnouncement(true);
        setCanEditAnnouncement(true);
        setCanDeleteAnnouncement(true);
        return;
      }

      // Check club membership and role
      const { data: memberData, error: memberError } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', id)
        .eq('member_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError && !memberError.message.includes('PGRST116')) {
        console.error('Error checking membership:', memberError);
        setUserRole(null);
        setCanCreateAnnouncement(false);
        return;
      }

      if (!memberData) {
        setUserRole(null);
        setCanCreateAnnouncement(false);
        return;
      }

      setUserRole(memberData.role);
      // Set permissions based on role
      setCanCreateAnnouncement(memberData.role === 'admin');
      setCanEditAnnouncement(
        memberData.role === 'admin' || memberData.role === 'moderator'
      );
      setCanDeleteAnnouncement(memberData.role === 'admin');
    } catch (error) {
      console.error('Error checking permissions:', error);
      setUserRole(null);
      setCanCreateAnnouncement(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);

      // Load announcements from Supabase
      const { data: announcementsData, error } = await supabase
        .from('club_announcements')
        .select(
          `
          *,
          author:user_profiles!author_id(name)
        `
        )
        .eq('club_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading announcements:', error);
        throw error;
      }

      // Transform data to match interface
      const transformedAnnouncements: Announcement[] = (
        announcementsData || []
      ).map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        author_id: announcement.author_id,
        author_name: announcement.author?.name || 'Unknown',
        created_at: announcement.created_at,
        is_pinned: announcement.is_pinned,
        priority: announcement.priority,
        event_date: announcement.event_date,
        likes_count: 0, // TODO: Implement likes system
        comments_count: 0, // TODO: Implement comments system
        is_liked: false, // TODO: Implement likes system
        tags: announcement.tags || [],
        location: announcement.location,
        target_audience: announcement.target_audience || 'all',
        attachment_url: announcement.attachment_url,
      }));

      setAnnouncements(transformedAnnouncements);
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
    if (!canCreateAnnouncement) {
      showNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only club owners and admins can create announcements',
        duration: 4000,
      });
      return;
    }

    // Mark all fields as touched before validation
    setTouchedFields({
      title: true,
      content: true,
      location: true,
      attachment_url: true,
    });

    // Validate form
    if (!validateForm()) {
      const firstError = Object.values(validationErrors)[0];
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: firstError || 'Please fix the errors and try again',
        duration: 4000,
      });
      return;
    }

    try {
      const announcementData = {
        club_id: id,
        author_id: user?.id,
        title: newAnnouncement.title.trim(),
        content: newAnnouncement.content.trim(),
        priority: newAnnouncement.priority,
        event_date: eventDate ? eventDate.toISOString() : null,
        tags: newAnnouncement.tags,
        location: newAnnouncement.location.trim() || null,
        target_audience: newAnnouncement.target_audience,
        attachment_url: newAnnouncement.attachment_url.trim() || null,
      };

      const { data, error } = await supabase
        .from('club_announcements')
        .insert([announcementData])
        .select(
          `
          *,
          author:user_profiles!author_id(name)
        `
        )
        .single();

      if (error) {
        console.error('Error creating announcement:', error);
        throw error;
      }

      // Add the new announcement to the list
      const newAnnouncementItem: Announcement = {
        id: data.id,
        title: data.title,
        content: data.content,
        author_id: data.author_id,
        author_name: data.author?.name || profile?.name || 'You',
        created_at: data.created_at,
        is_pinned: data.is_pinned,
        priority: data.priority,
        event_date: data.event_date,
        likes_count: 0,
        comments_count: 0,
        is_liked: false,
        tags: data.tags || [],
      };

      setAnnouncements([newAnnouncementItem, ...announcements]);

      // Reset form
      setNewAnnouncement({
        title: '',
        content: '',
        priority: 'medium',
        event_date: '',
        tags: [],
        location: '',
        target_audience: 'all',
        attachment_url: '',
      });
      setCurrentTag('');
      setValidationErrors({});
      setTouchedFields({});
      setEventDate(null);
      setShowCreateModal(false);

      showNotification({
        type: 'success',
        title: 'Announcement Created',
        message: 'Your announcement has been posted to the club',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create announcement',
        duration: 4000,
      });
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setNewAnnouncement({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      event_date: announcement.event_date || '',
      tags: announcement.tags || [],
      location: announcement.location || '',
      target_audience: announcement.target_audience || 'all',
      attachment_url: announcement.attachment_url || '',
    });
    if (announcement.event_date) {
      setEventDate(new Date(announcement.event_date));
    } else {
      setEventDate(null);
    }
    setShowEditModal(true);
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAnnouncement(announcementId),
        },
      ]
    );
  };

  const deleteAnnouncement = async (announcementId: string) => {
    try {
      const { error } = await supabase
        .from('club_announcements')
        .delete()
        .eq('id', announcementId);

      if (error) {
        console.error('Error deleting announcement:', error);
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to delete announcement',
          duration: 4000,
        });
        return;
      }

      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Announcement deleted successfully',
        duration: 3000,
      });

      // Reload announcements
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete announcement',
        duration: 4000,
      });
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;

    // Mark all fields as touched before validation
    setTouchedFields({
      title: true,
      content: true,
      location: true,
      attachment_url: true,
    });

    // Validate form
    if (!validateForm()) {
      const firstError = Object.values(validationErrors)[0];
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: firstError || 'Please fix the errors and try again',
        duration: 4000,
      });
      return;
    }

    try {
      const updateData = {
        title: newAnnouncement.title.trim(),
        content: newAnnouncement.content.trim(),
        priority: newAnnouncement.priority,
        event_date: eventDate ? eventDate.toISOString() : null,
        tags: newAnnouncement.tags,
        location: newAnnouncement.location.trim() || null,
        target_audience: newAnnouncement.target_audience,
        attachment_url: newAnnouncement.attachment_url.trim() || null,
      };

      const { error } = await supabase
        .from('club_announcements')
        .update(updateData)
        .eq('id', editingAnnouncement.id);

      if (error) {
        console.error('Error updating announcement:', error);
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to update announcement',
          duration: 4000,
        });
        return;
      }

      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Announcement updated successfully',
        duration: 3000,
      });

      // Reset form and close modal
      setShowEditModal(false);
      setEditingAnnouncement(null);
      setNewAnnouncement({
        title: '',
        content: '',
        priority: 'medium',
        event_date: '',
        tags: [],
        location: '',
        target_audience: 'all',
        attachment_url: '',
      });
      setCurrentTag('');
      setValidationErrors({});
      setTouchedFields({});
      setEventDate(null);

      // Reload announcements
      loadAnnouncements();
    } catch (error) {
      console.error('Error updating announcement:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update announcement',
        duration: 4000,
      });
    }
  };

  const handleLikeAnnouncement = (announcementId: string) => {
    setAnnouncements(
      announcements.map((announcement) => {
        if (announcement.id === announcementId) {
          return {
            ...announcement,
            is_liked: !announcement.is_liked,
            likes_count: announcement.is_liked
              ? announcement.likes_count - 1
              : announcement.likes_count + 1,
          };
        }
        return announcement;
      })
    );
  };

  // Date picker functions
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (eventDate) {
        // Preserve the time if it was already set
        newDate.setHours(eventDate.getHours(), eventDate.getMinutes());
      }
      setEventDate(newDate);
      setSelectedDate(newDate);

      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
        setShowTimePicker(true);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedTime && eventDate) {
      const newDate = new Date(eventDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setEventDate(newDate);
    }
  };

  // Web-specific date handler
  const handleWebDateChange = (event: any) => {
    const value = event.target.value; // Format: YYYY-MM-DDTHH:mm
    if (value) {
      const newDate = new Date(value);
      setEventDate(newDate);
      setSelectedDate(newDate);
    }
  };

  // Format date for web input (YYYY-MM-DDTHH:mm)
  const formatDateForWeb = (date: Date | null) => {
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const clearEventDate = () => {
    setEventDate(null);
  };

  const formatEventDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper function to handle field touches
  const handleFieldTouch = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setNewAnnouncement((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (validationErrors[fieldName]) {
      setValidationErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  // Validation functions
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Title validation
    if (!newAnnouncement.title.trim()) {
      errors.title = 'Title is required';
    } else if (newAnnouncement.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (newAnnouncement.title.trim().length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    // Content validation
    if (!newAnnouncement.content.trim()) {
      errors.content = 'Content is required';
    } else if (newAnnouncement.content.trim().length < 10) {
      errors.content = 'Content must be at least 10 characters';
    } else if (newAnnouncement.content.trim().length > 1000) {
      errors.content = 'Content must be less than 1000 characters';
    }

    // Location validation (if provided)
    if (newAnnouncement.location && newAnnouncement.location.length > 200) {
      errors.location = 'Location must be less than 200 characters';
    }

    // Attachment URL validation (if provided)
    if (newAnnouncement.attachment_url) {
      const urlPattern =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(newAnnouncement.attachment_url)) {
        errors.attachment_url = 'Please enter a valid URL';
      }
    }

    // Tags validation
    if (newAnnouncement.tags.length > 5) {
      errors.tags = 'Maximum 5 tags allowed';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Tag management functions
  const addTag = () => {
    const tag = currentTag.trim().toLowerCase();
    if (!tag) return;

    if (tag.length > 20) {
      setValidationErrors({
        ...validationErrors,
        tag: 'Tag must be less than 20 characters',
      });
      return;
    }

    if (newAnnouncement.tags.includes(tag)) {
      setValidationErrors({ ...validationErrors, tag: 'Tag already exists' });
      return;
    }

    if (newAnnouncement.tags.length >= 5) {
      setValidationErrors({
        ...validationErrors,
        tag: 'Maximum 5 tags allowed',
      });
      return;
    }

    setNewAnnouncement({
      ...newAnnouncement,
      tags: [...newAnnouncement.tags, tag],
    });
    setCurrentTag('');
    setValidationErrors({ ...validationErrors, tag: '' });
  };

  const removeTag = (tagToRemove: string) => {
    setNewAnnouncement({
      ...newAnnouncement,
      tags: newAnnouncement.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleTagKeyPress = (event: any) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'URGENT';
      case 'high':
        return 'HIGH';
      case 'medium':
        return 'MEDIUM';
      case 'low':
        return 'LOW';
      default:
        return 'NORMAL';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

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

  const canEditAnnouncementItem = (announcement: Announcement) => {
    if (!user) return false;
    if (user.id === id) return true; // Club owner can edit all
    if (user.id === announcement.author_id) return canEditAnnouncement; // Author can edit if they have permission
    return false;
  };

  const canDeleteAnnouncementItem = (announcement: Announcement) => {
    if (!user) return false;
    if (user.id === id) return true; // Club owner can delete all
    if (user.id === announcement.author_id) return true; // Author can always delete their own announcements
    return canDeleteAnnouncement; // Admins can delete any announcement
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        {canCreateAnnouncement ? (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholderButton} />
        )}
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
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: getPriorityColor(announcement.priority),
                    },
                  ]}
                >
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
                <Text style={styles.authorName}>
                  {announcement.author_name}
                </Text>
                <Text style={styles.postTime}>
                  {formatTimeAgo(announcement.created_at)}
                </Text>
              </View>
            </View>

            {/* Content */}
            <Text style={styles.announcementTitle}>{announcement.title}</Text>
            <Text style={styles.announcementContent}>
              {announcement.content}
            </Text>

            {/* Event Date */}
            {announcement.event_date && (
              <View style={styles.eventDateContainer}>
                <Calendar size={16} color="#DC2626" />
                <Text style={styles.eventDateText}>
                  {formatEventDate(announcement.event_date)}
                </Text>
              </View>
            )}

            {/* Location */}
            {announcement.location && (
              <View style={styles.locationContainer}>
                <Pin size={16} color="#10B981" />
                <Text style={styles.locationText}>{announcement.location}</Text>
              </View>
            )}

            {/* Attachment */}
            {announcement.attachment_url && (
              <TouchableOpacity style={styles.attachmentContainer}>
                <Calendar size={16} color="#3B82F6" />
                <Text style={styles.attachmentText}>View Attachment</Text>
              </TouchableOpacity>
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

            {/* Edit/Delete Actions */}
            {(canEditAnnouncementItem(announcement) ||
              canDeleteAnnouncementItem(announcement)) && (
              <View style={styles.announcementActions}>
                {canEditAnnouncementItem(announcement) && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditAnnouncement(announcement)}
                  >
                    <Edit size={20} color="#3B82F6" />
                    <Text style={[styles.actionText, { color: '#3B82F6' }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                )}

                {canDeleteAnnouncementItem(announcement) && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteAnnouncement(announcement.id)}
                  >
                    <Trash2 size={20} color="#EF4444" />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
              disabled={
                !newAnnouncement.title.trim() || !newAnnouncement.content.trim()
              }
            >
              <Text
                style={[
                  styles.modalPostText,
                  (!newAnnouncement.title.trim() ||
                    !newAnnouncement.content.trim()) &&
                    styles.modalPostTextDisabled,
                ]}
              >
                Post
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <ValidatedInput
              label="Title"
              value={newAnnouncement.title}
              onChangeText={(text) => handleFieldChange('title', text)}
              onBlur={() => handleFieldTouch('title')}
              error={validationErrors.title}
              touched={touchedFields.title}
              placeholder="Enter announcement title"
              maxLength={100}
              required
            />

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.prioritySelector}>
                {['low', 'medium', 'high', 'urgent'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      newAnnouncement.priority === priority &&
                        styles.priorityOptionActive,
                      { borderColor: getPriorityColor(priority) },
                    ]}
                    onPress={() =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        priority: priority as any,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        newAnnouncement.priority === priority && {
                          color: getPriorityColor(priority),
                        },
                      ]}
                    >
                      {getPriorityLabel(priority)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <ValidatedInput
              label="Content"
              value={newAnnouncement.content}
              onChangeText={(text) => handleFieldChange('content', text)}
              onBlur={() => handleFieldTouch('content')}
              error={validationErrors.content}
              touched={touchedFields.content}
              placeholder="Write your announcement..."
              multiline
              maxLength={1000}
              helpText={`${newAnnouncement.content.length}/1000 characters`}
              required
              style={{ minHeight: 100 }}
            />

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Event Date (Optional)</Text>

              {Platform.OS === 'web' ? (
                // Web: HTML5 datetime-local input
                <View style={styles.webDateContainer}>
                  <input
                    type="datetime-local"
                    value={formatDateForWeb(eventDate)}
                    onChange={handleWebDateChange}
                    min={formatDateForWeb(new Date())}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB',
                      fontSize: '16px',
                      fontFamily: 'Inter-Regular',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                  {eventDate && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={clearEventDate}
                    >
                      <Text style={styles.clearDateText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // Mobile: Native date/time pickers
                <>
                  {eventDate ? (
                    <View style={styles.dateDisplayContainer}>
                      <Text style={styles.dateDisplayText}>
                        {formatEventDateTime(eventDate)}
                      </Text>
                      <TouchableOpacity
                        style={styles.clearDateButton}
                        onPress={clearEventDate}
                      >
                        <Text style={styles.clearDateText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.datePickerButtonText}>
                        Select Event Date
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Update existing date */}
                  {eventDate && (
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.updateDateButton]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Calendar size={20} color="#DC2626" />
                      <Text
                        style={[
                          styles.datePickerButtonText,
                          { color: '#DC2626' },
                        ]}
                      >
                        Change Date/Time
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Date Picker */}
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}

                  {/* Time Picker */}
                  {showTimePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleTimeChange}
                    />
                  )}
                </>
              )}
            </View>

            {/* Tags Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Tags (Optional)</Text>
              <View style={styles.tagInputContainer}>
                <TextInput
                  style={[
                    styles.tagInput,
                    validationErrors.tag && styles.inputError,
                  ]}
                  placeholder="Add a tag and press Enter"
                  placeholderTextColor="#9CA3AF"
                  value={currentTag}
                  onChangeText={(text) => {
                    setCurrentTag(text);
                    if (validationErrors.tag) {
                      setValidationErrors({ ...validationErrors, tag: '' });
                    }
                  }}
                  onKeyPress={handleTagKeyPress}
                  maxLength={20}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.addTagButton}
                  onPress={addTag}
                  disabled={!currentTag.trim()}
                >
                  <Text
                    style={[
                      styles.addTagText,
                      !currentTag.trim() && styles.addTagTextDisabled,
                    ]}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
              {validationErrors.tag && (
                <Text style={styles.errorText}>{validationErrors.tag}</Text>
              )}
              {newAnnouncement.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {newAnnouncement.tags.map((tag, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.tagChip}
                      onPress={() => removeTag(tag)}
                    >
                      <Text style={styles.tagChipText}>#{tag}</Text>
                      <Text style={styles.tagChipRemove}>×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.helperText}>
                Press Enter or comma to add tags. Tap tags to remove. Max 5
                tags.
              </Text>
            </View>

            {/* Location Section */}
            <ValidatedInput
              label="Location"
              value={newAnnouncement.location}
              onChangeText={(text) => handleFieldChange('location', text)}
              onBlur={() => handleFieldTouch('location')}
              error={validationErrors.location}
              touched={touchedFields.location}
              placeholder="Event or announcement location"
              maxLength={200}
              helpText="Optional - Specify where the event or announcement relates to"
            />

            {/* Target Audience Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Target Audience</Text>
              <View style={styles.audienceSelector}>
                {[
                  { key: 'all', label: 'All Members' },
                  { key: 'admins', label: 'Admins Only' },
                  { key: 'moderators', label: 'Moderators+' },
                  { key: 'members', label: 'Members Only' },
                ].map((audience) => (
                  <TouchableOpacity
                    key={audience.key}
                    style={[
                      styles.audienceOption,
                      newAnnouncement.target_audience === audience.key &&
                        styles.audienceOptionActive,
                    ]}
                    onPress={() =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        target_audience: audience.key as any,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.audienceOptionText,
                        newAnnouncement.target_audience === audience.key &&
                          styles.audienceOptionTextActive,
                      ]}
                    >
                      {audience.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Attachment URL Section */}
            <ValidatedInput
              label="Attachment URL"
              value={newAnnouncement.attachment_url}
              onChangeText={(text) => handleFieldChange('attachment_url', text)}
              onBlur={() => handleFieldTouch('attachment_url')}
              error={validationErrors.attachment_url}
              touched={touchedFields.attachment_url}
              placeholder="https://example.com/document.pdf"
              keyboardType="url"
              autoCapitalize="none"
              helpText="Optional - Link to documents, images, or additional resources"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Announcement Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Announcement</Text>
            <TouchableOpacity
              onPress={handleUpdateAnnouncement}
              disabled={
                !newAnnouncement.title.trim() || !newAnnouncement.content.trim()
              }
            >
              <Text
                style={[
                  styles.modalPostText,
                  (!newAnnouncement.title.trim() ||
                    !newAnnouncement.content.trim()) &&
                    styles.modalPostTextDisabled,
                ]}
              >
                Update
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <ValidatedInput
              label="Title"
              value={newAnnouncement.title}
              onChangeText={(text) => handleFieldChange('title', text)}
              onBlur={() => handleFieldTouch('title')}
              error={validationErrors.title}
              touched={touchedFields.title}
              placeholder="Enter announcement title"
              maxLength={100}
              required
            />

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.prioritySelector}>
                {['low', 'medium', 'high', 'urgent'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      newAnnouncement.priority === priority &&
                        styles.priorityOptionActive,
                      { borderColor: getPriorityColor(priority) },
                    ]}
                    onPress={() =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        priority: priority as any,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        newAnnouncement.priority === priority && {
                          color: getPriorityColor(priority),
                        },
                      ]}
                    >
                      {getPriorityLabel(priority)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <ValidatedInput
              label="Content"
              value={newAnnouncement.content}
              onChangeText={(text) => handleFieldChange('content', text)}
              onBlur={() => handleFieldTouch('content')}
              error={validationErrors.content}
              touched={touchedFields.content}
              placeholder="Write your announcement..."
              multiline
              maxLength={1000}
              helpText={`${newAnnouncement.content.length}/1000 characters`}
              required
              style={{ minHeight: 100 }}
            />

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Event Date (Optional)</Text>

              {Platform.OS === 'web' ? (
                // Web: HTML5 datetime-local input
                <View style={styles.webDateContainer}>
                  <input
                    type="datetime-local"
                    value={formatDateForWeb(eventDate)}
                    onChange={handleWebDateChange}
                    min={formatDateForWeb(new Date())}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB',
                      fontSize: '16px',
                      fontFamily: 'Inter-Regular',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                  {eventDate && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={clearEventDate}
                    >
                      <Text style={styles.clearDateText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // Mobile: Native date/time pickers
                <>
                  {eventDate ? (
                    <View style={styles.dateDisplayContainer}>
                      <Text style={styles.dateDisplayText}>
                        {formatEventDateTime(eventDate)}
                      </Text>
                      <TouchableOpacity
                        style={styles.clearDateButton}
                        onPress={clearEventDate}
                      >
                        <Text style={styles.clearDateText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.datePickerButtonText}>
                        Select Event Date
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Update existing date */}
                  {eventDate && (
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.updateDateButton]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Calendar size={20} color="#DC2626" />
                      <Text
                        style={[
                          styles.datePickerButtonText,
                          { color: '#DC2626' },
                        ]}
                      >
                        Change Date/Time
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Date Picker */}
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}

                  {/* Time Picker */}
                  {showTimePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleTimeChange}
                    />
                  )}
                </>
              )}
            </View>

            {/* Tags Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Tags (Optional)</Text>
              <View style={styles.tagInputContainer}>
                <TextInput
                  style={[
                    styles.tagInput,
                    validationErrors.tag && styles.inputError,
                  ]}
                  placeholder="Add a tag and press Enter"
                  placeholderTextColor="#9CA3AF"
                  value={currentTag}
                  onChangeText={(text) => {
                    setCurrentTag(text);
                    if (validationErrors.tag) {
                      setValidationErrors({ ...validationErrors, tag: '' });
                    }
                  }}
                  onKeyPress={handleTagKeyPress}
                  maxLength={20}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.addTagButton}
                  onPress={addTag}
                  disabled={!currentTag.trim()}
                >
                  <Text
                    style={[
                      styles.addTagText,
                      !currentTag.trim() && styles.addTagTextDisabled,
                    ]}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
              {validationErrors.tag && (
                <Text style={styles.errorText}>{validationErrors.tag}</Text>
              )}
              {newAnnouncement.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {newAnnouncement.tags.map((tag, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.tagChip}
                      onPress={() => removeTag(tag)}
                    >
                      <Text style={styles.tagChipText}>#{tag}</Text>
                      <Text style={styles.tagChipRemove}>×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.helperText}>
                Press Enter or comma to add tags. Tap tags to remove. Max 5
                tags.
              </Text>
            </View>

            {/* Location Section */}
            <ValidatedInput
              label="Location"
              value={newAnnouncement.location}
              onChangeText={(text) => handleFieldChange('location', text)}
              onBlur={() => handleFieldTouch('location')}
              error={validationErrors.location}
              touched={touchedFields.location}
              placeholder="Event or announcement location"
              maxLength={200}
            />

            {/* Target Audience Section */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Target Audience</Text>
              <View style={styles.audienceSelector}>
                {['all', 'admins', 'moderators', 'members'].map((audience) => (
                  <TouchableOpacity
                    key={audience}
                    style={[
                      styles.audienceOption,
                      newAnnouncement.target_audience === audience &&
                        styles.audienceOptionActive,
                    ]}
                    onPress={() =>
                      setNewAnnouncement({
                        ...newAnnouncement,
                        target_audience: audience as any,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.audienceOptionText,
                        newAnnouncement.target_audience === audience &&
                          styles.audienceOptionTextActive,
                      ]}
                    >
                      {audience.charAt(0).toUpperCase() + audience.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Attachment URL Section */}
            <ValidatedInput
              label="Attachment URL"
              value={newAnnouncement.attachment_url}
              onChangeText={(text) => handleFieldChange('attachment_url', text)}
              onBlur={() => handleFieldTouch('attachment_url')}
              error={validationErrors.attachment_url}
              touched={touchedFields.attachment_url}
              placeholder="https://example.com/document.pdf"
              maxLength={500}
            />
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
  placeholderButton: {
    width: 40,
    height: 40,
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
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateDisplayText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  clearDateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  clearDateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  datePickerButtonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  updateDateButton: {
    marginTop: 8,
    borderColor: '#DC2626',
  },
  webDateContainer: {
    position: 'relative',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  helperText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  addTagButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addTagText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  addTagTextDisabled: {
    color: '#9CA3AF',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#2563EB',
    marginRight: 4,
  },
  tagChipRemove: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#6B7280',
  },
  audienceSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  audienceOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  audienceOptionActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  audienceOptionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#6B7280',
  },
  audienceOptionTextActive: {
    color: '#FFFFFF',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  locationText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#10B981',
  },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  attachmentText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#3B82F6',
  },
});
