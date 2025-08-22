import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart,
  MessageCircle,
  Share,
  Plus,
  Camera,
  ArrowLeft,
  X,
  Upload,
  MapPin,
  Send,
} from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useNotification } from '@/components/NotificationSystem';
import { SmartBottomBanner } from '@/components/ads/SmartBottomBanner';
import { useProgressivePermissions } from '@/hooks/useProgressivePermissions';
import { TextAvatar } from '@/components/TextAvatar';
import { getProfileImageUrl, getAvatarUrl } from '@/utils/avatarUtils';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

interface GalleryPost {
  id: string;
  author: string;
  authorId: string;
  authorAvatar?: string;
  bloodGroup?: string;
  image: string;
  caption: string;
  location: string;
  timeAgo: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  created_at: string;
}

export default function GalleryScreen() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();
  const { triggerPermissionRequest } = useProgressivePermissions();

  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({
    caption: '',
    location: '',
    image: null as string | null,
  });
  const [uploading, setUploading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<GalleryPost | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPosts();
  }, [user]);

  const loadPosts = async () => {
    try {
      setLoading(true);

      // Fetch posts from Supabase
      const { data, error } = await supabase
        .from('gallery_posts')
        .select(
          `
          id,
          user_id,
          caption,
          location,
          image_url,
          created_at,
          user_profiles:user_id (
            name,
            blood_group
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Get likes for each post
        const postIds = data.map((post) => post.id);

        // Get all likes for these posts
        const { data: likesData } = await supabase
          .from('gallery_post_likes')
          .select('post_id')
          .in('post_id', postIds);

        // Count likes per post
        const likesCount: Record<string, number> = {};
        if (likesData) {
          likesData.forEach((like) => {
            likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
          });
        }

        // Check if user liked each post
        const userLikes: Record<string, boolean> = {};

        // Only fetch user likes if user is logged in
        if (user?.id) {
          const { data: userLikesData } = await supabase
            .from('gallery_post_likes')
            .select('post_id')
            .in('post_id', postIds)
            .eq('user_id', user.id);

          if (userLikesData) {
            userLikesData.forEach((item) => {
              userLikes[item.post_id] = true;
            });
          }
        }

        // Get all comments for these posts
        const { data: commentsData } = await supabase
          .from('gallery_post_comments')
          .select('post_id')
          .in('post_id', postIds);

        // Count comments per post
        const commentsCount: Record<string, number> = {};
        if (commentsData) {
          commentsData.forEach((comment) => {
            commentsCount[comment.post_id] =
              (commentsCount[comment.post_id] || 0) + 1;
          });
        }

        // Format posts with null safety
        const formattedPosts: GalleryPost[] = data.map((post) => ({
          id: post.id,
          author: post.user_profiles?.name || 'Unknown User',
          authorId: post.user_id,
          bloodGroup: post.user_profiles?.blood_group || undefined,
          image: post.image_url,
          caption: post.caption,
          location: post.location,
          timeAgo: formatTimeAgo(post.created_at),
          likes: likesCount[post.id] || 0,
          comments: commentsCount[post.id] || 0,
          isLiked: userLikes[post.id] || false,
          created_at: post.created_at,
        }));

        setPosts(formattedPosts);
      }
    } catch (error) {
      console.error('Error loading gallery posts:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load gallery posts',
        duration: 4000,
      });

      // Use mock data as fallback
      const mockPosts: GalleryPost[] = [
        {
          id: '1',
          author: 'Ahmed Rahman',
          authorId: '1',
          bloodGroup: 'B+',
          image:
            'https://images.pexels.com/photos/1170979/pexels-photo-1170979.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
          caption:
            'Proud to donate blood again! Every drop counts. #BloodDonation #SaveLives',
          location: 'Dhaka Medical College Hospital',
          timeAgo: '2 hours ago',
          likes: 24,
          comments: 8,
          isLiked: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          author: 'Fatima Khatun',
          authorId: '2',
          bloodGroup: 'A+',
          image:
            'https://images.pexels.com/photos/6823566/pexels-photo-6823566.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
          caption:
            'Regular blood donation keeps us healthy and helps save lives. Encouraging everyone to donate! 🩸❤️',
          location: 'Square Hospital, Dhaka',
          timeAgo: '5 hours ago',
          likes: 31,
          comments: 12,
          isLiked: true,
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          author: 'Dr. Mohammad Ali',
          authorId: '3',
          bloodGroup: 'O-',
          image:
            'https://images.pexels.com/photos/6823568/pexels-photo-6823568.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
          caption:
            'Our blood donation camp was a huge success! Thank you to all the volunteers and donors.',
          location: 'Community Center, Chittagong',
          timeAgo: '1 day ago',
          likes: 67,
          comments: 23,
          isLiked: false,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      setPosts(mockPosts);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      showNotification({
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in to like posts',
        duration: 3000,
      });
      return;
    }

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      // Check if this is user's first social interaction - request permissions
      if (!post.isLiked && post.authorId !== user.id) {
        await triggerPermissionRequest({
          trigger: 'manual',
          metadata: { action: 'gallery_like' },
        });
      }

      if (post.isLiked) {
        // Unlike post
        const { error } = await supabase
          .from('gallery_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like post
        const { error } = await supabase.from('gallery_post_likes').insert({
          post_id: postId,
          user_id: user.id,
        });

        if (error) throw error;
      }

      // Update local state
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes - 1 : post.likes + 1,
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error liking post:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update like',
        duration: 3000,
      });
    }
  };

  const handleShowComments = async (post: GalleryPost) => {
    setSelectedPost(post);

    try {
      // Fetch comments from Supabase
      const { data, error } = await supabase
        .from('gallery_post_comments')
        .select(
          `
          id,
          content,
          created_at,
          user_id,
          user_profiles:user_id (
            name,
            blood_group,
            avatar_url
          )
        `
        )
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedComments = data.map((comment: any) => ({
          id: comment.id,
          author: comment.user_profiles?.name || 'Unknown User',
          authorId: comment.user_id,
          content: comment.content,
          timeAgo: formatTimeAgo(comment.created_at),
          bloodGroup: comment.user_profiles?.blood_group || undefined,
          authorAvatar: comment.user_profiles?.avatar_url || undefined,
        }));

        setComments(formattedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);

      // Use mock data as fallback
      const mockComments = [
        {
          id: '1',
          author: 'Fatima Khan',
          authorId: '2',
          content: "Thank you for donating! You're saving lives.",
          timeAgo: '30m ago',
          bloodGroup: 'A+',
        },
        {
          id: '2',
          author: 'Mohammad Ali',
          authorId: '3',
          content: 'Great job! Keep up the good work.',
          timeAgo: '1h ago',
          bloodGroup: 'O-',
        },
      ];
      setComments(mockComments);
    }

    setShowCommentsModal(true);
  };

  const handleAddComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) return;

    try {
      setSubmittingComment(true);

      // Check if this is user's first comment - request permissions
      if (selectedPost.authorId !== user.id) {
        await triggerPermissionRequest({
          trigger: 'manual',
          metadata: { action: 'gallery_comment' },
        });
      }

      // Add comment to Supabase
      const { data, error } = await supabase
        .from('gallery_post_comments')
        .insert({
          post_id: selectedPost.id,
          user_id: user.id,
          content: newComment,
        })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        // Add new comment to state
        const newCommentObj = {
          id: data[0].id,
          author: profile?.name || 'You',
          authorId: user.id,
          content: newComment,
          timeAgo: 'Just now',
          bloodGroup: profile?.blood_group,
        };

        setComments([...comments, newCommentObj]);
        setNewComment('');

        // Update post comment count
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === selectedPost.id
              ? { ...post, comments: post.comments + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to add comment',
        duration: 3000,
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        showNotification({
          type: 'error',
          title: 'Permission Denied',
          message: 'We need camera roll permissions to upload images',
          duration: 4000,
        });
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewPost({
          ...newPost,
          image: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to pick image',
        duration: 3000,
      });
    }
  };

  const handleCreatePost = async () => {
    if (!user) {
      showNotification({
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in to create posts',
        duration: 3000,
      });
      return;
    }

    if (!newPost.caption.trim() || !newPost.location.trim() || !newPost.image) {
      showNotification({
        type: 'error',
        title: 'Incomplete Form',
        message: 'Please fill in all fields and select an image',
        duration: 3000,
      });
      return;
    }

    try {
      setUploading(true);

      // 1. Upload image to Supabase Storage
      const fileExt = newPost.image.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `gallery/${user.id}/${fileName}`;

      // For web, we need to fetch the image first
      let file;
      if (Platform.OS === 'web') {
        const response = await fetch(newPost.image);
        const blob = await response.blob();
        file = blob;
      } else {
        // For native, we can use the URI directly
        file = { uri: newPost.image, name: fileName, type: `image/${fileExt}` };
      }

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // 3. Create post in database
      const { data, error } = await supabase
        .from('gallery_posts')
        .insert({
          user_id: user.id,
          caption: newPost.caption,
          location: newPost.location,
          image_url: imageUrl,
        })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        // Add new post to state
        const newGalleryPost: GalleryPost = {
          id: data[0].id,
          author: profile?.name || 'You',
          authorId: user.id,
          bloodGroup: profile?.blood_group,
          image: imageUrl,
          caption: newPost.caption,
          location: newPost.location,
          timeAgo: 'Just now',
          likes: 0,
          comments: 0,
          isLiked: false,
          created_at: new Date().toISOString(),
        };

        setPosts([newGalleryPost, ...posts]);
      }

      // Reset form
      setNewPost({
        caption: '',
        location: '',
        image: null,
      });

      setShowCreateModal(false);

      showNotification({
        type: 'success',
        title: 'Post Created',
        message: 'Your gallery post has been created successfully',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error creating post:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create post',
        duration: 4000,
      });
    } finally {
      setUploading(false);
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

  const handleAddPost = () => {
    if (!user) {
      showNotification({
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in to create posts',
        duration: 3000,
      });
      return;
    }

    setShowCreateModal(true);
  };

  const renderPost = ({ item }: { item: GalleryPost }) => (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        {item.authorAvatar ? (
          <Image
            source={{
              uri: getAvatarUrl(
                { avatar_url: item.authorAvatar, id: item.authorId },
                40
              ),
            }}
            style={styles.authorAvatar}
            onError={() => {}}
          />
        ) : (
          <TextAvatar name={item.author} size={40} />
        )}
        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName}>{item.author}</Text>
            {item.bloodGroup && (
              <View style={styles.bloodGroupBadge}>
                <Text style={styles.bloodGroupText}>{item.bloodGroup}</Text>
              </View>
            )}
          </View>
          <Text style={styles.postLocation}>{item.location}</Text>
          <Text style={styles.postTime}>{item.timeAgo}</Text>
        </View>
      </View>

      {/* Post Image */}
      <Image
        source={{ uri: item.image }}
        style={styles.postImage}
        resizeMode="cover"
      />

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <Heart
            size={24}
            color={item.isLiked ? '#DC2626' : '#6B7280'}
            fill={item.isLiked ? '#DC2626' : 'none'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleShowComments(item)}
        >
          <MessageCircle size={24} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Share size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Post Stats */}
      <View style={styles.postStats}>
        <Text style={styles.likesText}>
          {item.likes} {t('gallery.likes')}
        </Text>
        <Text style={styles.commentsText}>{item.comments} comments</Text>
      </View>

      {/* Post Caption */}
      <View style={styles.postCaption}>
        <Text style={styles.captionText}>
          <Text style={styles.authorNameInCaption}>{item.author}</Text>{' '}
          {item.caption}
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('gallery.title')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPost}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Camera size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>{t('gallery.noStories')}</Text>
          <Text style={styles.emptyStateSubtitle}>
            Share your blood donation experience to inspire others
          </Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleAddPost}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>
              {t('gallery.shareStory')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.postsContainer}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
      )}

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => {
          if (uploading) {
            showNotification({
              type: 'info',
              title: 'Upload in Progress',
              message: 'Please wait for the upload to complete',
              duration: 3000,
            });
            return;
          }
          setShowCreateModal(false);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => {
                if (uploading) {
                  showNotification({
                    type: 'info',
                    title: 'Upload in Progress',
                    message: 'Please wait for the upload to complete',
                    duration: 3000,
                  });
                  return;
                }
                setShowCreateModal(false);
                setNewPost({
                  caption: '',
                  location: '',
                  image: null,
                });
              }}
              disabled={uploading}
            >
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share Your Story</Text>
            <TouchableOpacity
              onPress={handleCreatePost}
              disabled={
                !newPost.caption.trim() ||
                !newPost.location.trim() ||
                !newPost.image ||
                uploading
              }
            >
              <Text
                style={[
                  styles.modalPostText,
                  (!newPost.caption.trim() ||
                    !newPost.location.trim() ||
                    !newPost.image ||
                    uploading) &&
                    styles.modalPostTextDisabled,
                ]}
              >
                Post
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Image Preview/Selector */}
            <View style={styles.imageContainer}>
              {newPost.image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: newPost.image }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={handlePickImage}
                    disabled={uploading}
                  >
                    <Text style={styles.changeImageText}>Change Image</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={handlePickImage}
                  disabled={uploading}
                >
                  <Camera size={48} color="#9CA3AF" />
                  <Text style={styles.imagePickerText}>
                    Tap to select an image
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Caption Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Caption</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor="#9CA3AF"
                value={newPost.caption}
                onChangeText={(text) =>
                  setNewPost({ ...newPost, caption: text })
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!uploading}
              />
            </View>

            {/* Location Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Location</Text>
              <View style={styles.locationInputContainer}>
                <MapPin size={20} color="#6B7280" />
                <TextInput
                  style={styles.locationInput}
                  placeholder="Add location"
                  placeholderTextColor="#9CA3AF"
                  value={newPost.location}
                  onChangeText={(text) =>
                    setNewPost({ ...newPost, location: text })
                  }
                  editable={!uploading}
                />
              </View>
            </View>

            {/* Create Post Button */}
            <TouchableOpacity
              style={[
                styles.createPostButton,
                (!newPost.caption.trim() ||
                  !newPost.location.trim() ||
                  !newPost.image ||
                  uploading) &&
                  styles.createPostButtonDisabled,
              ]}
              onPress={handleCreatePost}
              disabled={
                !newPost.caption.trim() ||
                !newPost.location.trim() ||
                !newPost.image ||
                uploading
              }
            >
              {uploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.createPostButtonText}>Uploading...</Text>
                </View>
              ) : (
                <>
                  <Upload size={20} color="#FFFFFF" />
                  <Text style={styles.createPostButtonText}>Share Story</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCommentsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCommentsModal(false)}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Comments</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.commentsContainer}
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <MessageCircle size={48} color="#D1D5DB" />
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>
                  Be the first to comment
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                {item.authorAvatar ? (
                  <Image
                    source={{
                      uri: getAvatarUrl(
                        { avatar_url: item.authorAvatar, id: item.authorId },
                        40
                      ),
                    }}
                    style={styles.commentItemAvatar}
                    onError={() => {}}
                  />
                ) : (
                  <TextAvatar name={item.author} size={40} />
                )}
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{item.author}</Text>
                    {item.bloodGroup && (
                      <View style={styles.commentBloodGroup}>
                        <Text style={styles.commentBloodGroupText}>
                          {item.bloodGroup}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.commentText}>{item.content}</Text>
                  <Text style={styles.commentTime}>{item.timeAgo}</Text>
                </View>
              </View>
            )}
          />

          {user && (
            <View style={styles.addCommentContainer}>
              <Image
                source={{ uri: getProfileImageUrl(user, profile, 40) }}
                style={styles.commentAvatar}
                onError={() => {}}
              />
              <View style={styles.commentInputWrapper}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#9CA3AF"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.sendCommentButton,
                    (!newComment.trim() || submittingComment) &&
                      styles.sendCommentButtonDisabled,
                  ]}
                  onPress={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Smart Bottom Banner */}
      <SmartBottomBanner scrollY={scrollY} enabled={posts.length > 0} />
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
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#DC2626',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyStateTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  shareButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  shareButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  postsContainer: {
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  bloodGroupBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bloodGroupText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  postLocation: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  postTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  likesText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  commentsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  postCaption: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  captionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  authorNameInCaption: {
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
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
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 20,
  },
  imageContainer: {
    marginBottom: 20,
  },
  imagePicker: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  imagePickerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    height: 200,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeImageText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
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
  captionInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  locationInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
  },
  createPostButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  createPostButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createPostButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentsContainer: {
    padding: 20,
    flexGrow: 1,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyCommentsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
  },
  emptyCommentsSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    borderTopLeftRadius: 0,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentAuthor: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  commentBloodGroup: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commentBloodGroupText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  commentText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
    alignSelf: 'flex-end',
  },
  addCommentContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    alignItems: 'flex-end',
  },
  commentInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 48,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
  },
  sendCommentButton: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: '#DC2626',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCommentButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  commentItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
