import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Users, MessageCircle, Heart, Send, Plus, MoveVertical as MoreVertical, Pin, Bell, BellOff, Calendar, Megaphone, UserPlus, Phone, Mail, Settings, Zap, Radio, Mic, MicOff } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';
import { TextAvatar } from '@/components/TextAvatar';
import { supabase } from '@/lib/supabase';

interface Club {
  id: string;
  name: string;
  description?: string;
  total_members: number;
  total_donations: number;
  founded_year?: number;
  is_member: boolean;
  is_admin: boolean;
  is_pending?: boolean;
  email?: string;
  phone?: string;
  location?: string;
  online_members: number;
  unread_messages: number;
  voice_channel_active: boolean;
  voice_participants: number;
}

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();
  
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    loadClubData();
  }, [id, user]);

  useEffect(() => {
    if (club?.is_admin) {
      loadJoinRequests();
    }
  }, [club?.is_admin]);

  const loadClubData = async () => {
    try {
      setLoading(true);
      
      // Fetch club profile
      const { data: clubData, error: clubError } = await supabase
        .from('user_profiles')
        .select('id, name, email, phone, description, website, country, district, police_station, state, city')
        .eq('id', id)
        .eq('user_type', 'club')
        .single();
      
      if (clubError) throw clubError;
      
      // Fetch club stats
      const { data: statsData, error: statsError } = await supabase
        .from('clubs')
        .select('total_members, total_donations, founded_year')
        .eq('id', id)
        .single();
      
      // Check if user is a member
      let isMember = false;
      let isAdmin = false;
      let isPending = false;
      
      if (user) {
        // Check membership
        const { data: memberData, error: memberError } = await supabase
          .from('club_members')
          .select('role')
          .eq('club_id', id)
          .eq('member_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (!memberError && memberData) {
          isMember = true;
          isAdmin = ['admin', 'moderator'].includes(memberData.role);
        }
        
        // Check pending requests
        if (!isMember) {
          const { data: requestData, error: requestError } = await supabase
            .from('club_join_requests')
            .select('status')
            .eq('club_id', id)
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .single();
          
          if (!requestError && requestData) {
            isPending = true;
          }
        }
      }
      
      // Format location
      let location = '';
      if (clubData.country === 'BANGLADESH') {
        location = [clubData.police_station, clubData.district].filter(Boolean).join(', ');
      } else {
        location = [clubData.city, clubData.state].filter(Boolean).join(', ');
      }
      
      // Combine data
      const clubInfo: Club = {
        id: clubData.id,
        name: clubData.name,
        description: clubData.description,
        total_members: statsData?.total_members || 0,
        total_donations: statsData?.total_donations || 0,
        founded_year: statsData?.founded_year || new Date().getFullYear(),
        is_member: isMember,
        is_admin: isAdmin,
        is_pending: isPending,
        email: clubData.email,
        phone: clubData.phone,
        location,
        online_members: Math.floor(Math.random() * 10) + 1, // Random for demo
        unread_messages: Math.floor(Math.random() * 5), // Random for demo
        voice_channel_active: Math.random() > 0.5, // Random for demo
        voice_participants: Math.floor(Math.random() * 5) + 1, // Random for demo
      };
      
      setClub(clubInfo);
    } catch (error) {
      console.error('Error loading club data:', error);
      
      // Fallback to mock data
      const mockClub: Club = {
        id: id as string,
        name: 'Blood Donation Club',
        description: 'Help people to get blood',
        total_members: 12,
        total_donations: 0,
        founded_year: 2024,
        is_member: false,
        is_admin: false,
        email: 'club@example.com',
        phone: '1234567890',
        location: 'DHAKA, BANGLADESH',
        online_members: 5,
        unread_messages: 3,
        voice_channel_active: true,
        voice_participants: 3,
      };
      
      setClub(mockClub);
      
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load club data. Using demo data instead.',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    try {
      setRequestsLoading(true);
      
      // Fetch pending join requests
      const { data, error } = await supabase
        .from('club_join_requests')
        .select(`
          id,
          user_id,
          message,
          created_at,
          user_profiles:user_id(
            name,
            email,
            blood_group
          )
        `)
        .eq('club_id', id)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      // Format request data
      const formattedRequests = data.map(request => ({
        id: request.id,
        user_id: request.user_id,
        user_name: request.user_profiles.name,
        user_email: request.user_profiles.email,
        blood_group: request.user_profiles.blood_group,
        message: request.message,
        created_at: request.created_at,
      }));
      
      setJoinRequests(formattedRequests);
      console.log('Loaded join requests:', formattedRequests.length);
    } catch (error) {
      console.error('Error loading join requests:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load join requests',
        duration: 4000,
      });
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleJoinClub = () => {
    if (!user) {
      showNotification({
        type: 'info',
        title: 'Authentication Required',
        message: 'Please sign in to join clubs',
        duration: 4000,
      });
      router.push('/auth');
      return;
    }
    
    if (!profile) {
      showNotification({
        type: 'info',
        title: 'Profile Required',
        message: 'Please complete your profile to join clubs',
        duration: 4000,
      });
      router.push('/complete-profile');
      return;
    }
    
    // Check if user is a club (clubs can't join other clubs)
    if (profile.user_type === 'club') {
      showNotification({
        type: 'info',
        title: 'Not Available',
        message: 'Clubs cannot join other clubs',
        duration: 4000,
      });
      return;
    }
    
    // Show join request modal
    setShowJoinRequestModal(true);
  };
  
  const handleJoinRequest = async (requestId: string, userId: string, approved: boolean) => {
    if (processingRequestId) return;
    
    try {
      setProcessingRequestId(requestId);
      
      // Update request status
      const { error } = await supabase
        .from('club_join_requests')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      // Update local state
      setJoinRequests(joinRequests.filter(request => request.id !== requestId));
      
      showNotification({
        type: 'success',
        title: approved ? 'Request Approved' : 'Request Rejected',
        message: approved ? 'User has been added to the club' : 'Join request has been rejected',
        duration: 3000,
      });
      
      // Reload club data to update member count if approved
      if (approved) {
        loadClubData();
      }
    } catch (error) {
      console.error('Error handling join request:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to process join request',
        duration: 4000,
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const submitJoinRequest = async () => {
    if (!club || !user) return;
    
    try {
      setJoinLoading(true);
      
      // Create join request
      const { error } = await supabase
        .from('club_join_requests')
        .insert({
          club_id: club.id,
          user_id: user.id,
          message: joinMessage || `I would like to join ${club.name}. My blood group is ${profile?.blood_group || 'not specified'}.`,
          status: 'pending'
        });
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          showNotification({
            type: 'info',
            title: 'Already Requested',
            message: 'You have already requested to join this club',
            duration: 4000,
          });
        } else {
          throw error;
        }
      } else {
        // Update local state
        setClub({
          ...club,
          is_pending: true
        });
        
        showNotification({
          type: 'success',
          title: 'Request Sent',
          message: 'Your request to join the club has been sent',
          duration: 3000,
        });
        
        setShowJoinRequestModal(false);
        setJoinMessage('');
      }
    } catch (error) {
      console.error('Error joining club:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to send join request',
        duration: 4000,
      });
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveClub = () => {
    if (!club) return;

    Alert.alert(
      'Leave Club',
      `Are you sure you want to leave ${club.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setJoinLoading(true);
              
              // Set member as inactive
              const { error } = await supabase
                .from('club_members')
                .update({ is_active: false })
                .eq('club_id', club.id)
                .eq('member_id', user?.id);
              
              if (error) throw error;
              
              // Update local state
              setClub({
                ...club,
                is_member: false,
                is_admin: false,
                total_members: Math.max(0, club.total_members - 1)
              });
              
              showNotification({
                type: 'success',
                title: 'Left Club',
                message: `You have left ${club.name}`,
                duration: 3000,
              });
            } catch (error) {
              console.error('Error leaving club:', error);
              showNotification({
                type: 'error',
                title: 'Error',
                message: 'Failed to leave club',
                duration: 4000,
              });
            } finally {
              setJoinLoading(false);
            }
          },
        },
      ]
    );
  };

  const navigateToSection = (section: string) => {
    router.push(`/(tabs)/clubs/${id}/${section}`);
  };

  const handleCommunicationAction = (action: string) => {
    if (!club) return;
    
    switch (action) {
      case 'chat':
        navigateToSection('chat');
        break;
      case 'voice':
        if (club.voice_channel_active) {
          showNotification({
            type: 'success',
            title: 'Joining Voice Channel',
            message: `Connecting to voice channel with ${club.voice_participants} participants...`,
            duration: 3000,
          });
        } else {
          showNotification({
            type: 'info',
            title: 'Start Voice Channel',
            message: 'Starting a new voice channel for the club...',
            duration: 3000,
          });
        }
        break;
      case 'call':
        if (club.phone) {
          Alert.alert('Call Club', `Call ${club.name} at ${club.phone}?`);
        } else {
          showNotification({
            type: 'info',
            title: 'No Phone Number',
            message: 'This club has not provided a phone number',
            duration: 3000,
          });
        }
        break;
      case 'video':
        showNotification({
          type: 'info',
          title: 'Video Call',
          message: 'Starting video conference for club members...',
          duration: 3000,
        });
        break;
      case 'email':
        if (club.email) {
          Alert.alert('Email Club', `Send email to ${club.email}?`);
        } else {
          showNotification({
            type: 'info',
            title: 'No Email',
            message: 'This club has not provided an email address',
            duration: 3000,
          });
        }
        break;
      case 'announcements':
        navigateToSection('announcements');
        break;
      case 'events':
        navigateToSection('events');
        break;
      case 'members':
        navigateToSection('members');
        break;
    }
    
    setShowCommunicationModal(false);
  };

  if (loading || !club) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading club...</Text>
        </View>
      </SafeAreaView>
    );
  },
  noRequests: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noRequestsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
  },
  requestCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  requestEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  bloodGroupBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bloodGroupText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  requestMessage: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  requestMessageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  requestTime: {
    marginBottom: 12,
  },
  requestTimeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#EF4444',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{club.name}</Text>
        <TouchableOpacity 
          style={styles.emailButton}
          onPress={() => handleCommunicationAction('email')}
        >
          <Mail size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Club Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <TextAvatar name={club.name} size={80} />
            <View style={styles.clubBadge}>
              <Text style={styles.clubBadgeText}>Club</Text>
            </View>
          </View>
          
          <Text style={styles.clubName}>{club.name}</Text>
          
          <View style={styles.contactInfo}>
            {club.email && (
              <View style={styles.contactRow}>
                <Mail size={16} color="#6B7280" />
                <Text style={styles.contactText}>{club.email}</Text>
              </View>
            )}
            {club.phone && (
              <View style={styles.contactRow}>
                <Phone size={16} color="#6B7280" />
                <Text style={styles.contactText}>{club.phone}</Text>
              </View>
            )}
            {club.location && (
              <View style={styles.contactRow}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.contactText}>{club.location}</Text>
              </View>
            )}
          </View>

          {/* Join/Leave Button */}
          {!club.is_member && !club.is_pending && (
            <TouchableOpacity 
              style={[styles.joinButton, joinLoading && styles.joinButtonLoading]}
              onPress={handleJoinClub}
              disabled={joinLoading}
            >
              {joinLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={16} color="#FFFFFF" />
                  <Text style={styles.joinButtonText}>Join Club</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {club.is_pending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Join Request Pending</Text>
            </View>
          )}
          
          {club.is_member && (
            <TouchableOpacity 
              style={[styles.leaveButton, joinLoading && styles.joinButtonLoading]}
              onPress={handleLeaveClub}
              disabled={joinLoading}
            >
              {joinLoading ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.leaveButtonText}>Leave Club</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{club.description || 'No description provided.'}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Heart size={24} color="#DC2626" />
            <Text style={styles.statValue}>{club.total_donations}</Text>
            <Text style={styles.statLabel}>Total Drives</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={24} color="#DC2626" />
            <Text style={styles.statValue}>{club.total_members}</Text>
            <Text style={styles.statLabel}>Active Members</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={24} color="#DC2626" />
            <Text style={styles.statValue}>
              {club.founded_year ? (new Date().getFullYear() - club.founded_year) : 'New'}
            </Text>
            <Text style={styles.statLabel}>Years Active</Text>
          </View>
        </View>

        {/* Club Features - Only show if member */}
        {club.is_member && (
          <>
            {/* Enhanced Communication Hub */}
            <View style={styles.communicationHubSection}>
              <View style={styles.communicationHubHeader}>
                <Text style={styles.sectionTitle}>Communication Hub</Text>
                <TouchableOpacity 
                  style={styles.expandButton}
                  onPress={() => setShowCommunicationModal(true)}
                >
                  <Text style={styles.expandButtonText}>View All</Text>
                </TouchableOpacity>
              </View>

              {/* Primary Communication Actions */}
              <View style={styles.primaryCommunicationGrid}>
                {/* Real-time Chat */}
                <TouchableOpacity 
                  style={[styles.primaryCommunicationCard, styles.chatCard]}
                  onPress={() => handleCommunicationAction('chat')}
                >
                  <View style={styles.communicationCardHeader}>
                    <View style={styles.communicationIconContainer}>
                      <MessageCircle size={24} color="#FFFFFF" />
                      <View style={styles.liveIndicator}>
                        <Zap size={10} color="#10B981" />
                      </View>
                    </View>
                    {club.unread_messages > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{club.unread_messages}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.communicationCardTitle}>Live Chat</Text>
                  <Text style={styles.communicationCardSubtitle}>
                    {club.online_members} online now
                  </Text>
                </TouchableOpacity>

                {/* Voice Channel */}
                <TouchableOpacity 
                  style={[styles.primaryCommunicationCard, styles.voiceCard]}
                  onPress={() => handleCommunicationAction('voice')}
                >
                  <View style={styles.communicationCardHeader}>
                    <View style={styles.communicationIconContainer}>
                      <Mic size={24} color="#FFFFFF" />
                      {club.voice_channel_active && (
                        <View style={styles.voiceActiveIndicator}>
                          <Radio size={10} color="#10B981" />
                        </View>
                      )}
                    </View>
                    {club.voice_channel_active && (
                      <View style={styles.voiceParticipantsBadge}>
                        <Text style={styles.voiceParticipantsText}>{club.voice_participants}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.communicationCardTitle}>Voice Channel</Text>
                  <Text style={styles.communicationCardSubtitle}>
                    {club.voice_channel_active ? `${club.voice_participants} talking` : 'Start voice chat'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Secondary Communication Options */}
              <View style={styles.secondaryCommunicationGrid}>
                <TouchableOpacity 
                  style={styles.secondaryCommunicationCard}
                  onPress={() => handleCommunicationAction('video')}
                >
                  <Video size={20} color="#DC2626" />
                  <Text style={styles.secondaryCommunicationText}>Video Call</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.secondaryCommunicationCard}
                  onPress={() => handleCommunicationAction('call')}
                >
                  <Phone size={20} color="#DC2626" />
                  <Text style={styles.secondaryCommunicationText}>Phone Call</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.secondaryCommunicationCard}
                  onPress={() => handleCommunicationAction('email')}
                >
                  <Mail size={20} color="#DC2626" />
                  <Text style={styles.secondaryCommunicationText}>Email</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Club Features */}
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Club Features</Text>
              
              <View style={styles.featureGrid}>
                <TouchableOpacity 
                  style={styles.featureCard}
                  onPress={() => handleCommunicationAction('announcements')}
                >
                  <Megaphone size={28} color="#DC2626" />
                  <Text style={styles.featureLabel}>Announcements</Text>
                  <Text style={styles.featureSubtext}>Important updates</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.featureCard}
                  onPress={() => handleCommunicationAction('events')}
                >
                  <Calendar size={28} color="#DC2626" />
                  <Text style={styles.featureLabel}>Events</Text>
                  <Text style={styles.featureSubtext}>Blood drives & meetings</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.featureCard}
                  onPress={() => handleCommunicationAction('members')}
                >
                  <Users size={28} color="#DC2626" />
                  <Text style={styles.featureLabel}>Members</Text>
                  <Text style={styles.featureSubtext}>View all members</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.featureCard}
                  onPress={() => showNotification({
                    type: 'info',
                    title: 'Coming Soon',
                    message: 'Advanced features coming soon!',
                    duration: 3000,
                  })}
                >
                  <Settings size={28} color="#DC2626" />
                  <Text style={styles.featureLabel}>Settings</Text>
                  <Text style={styles.featureSubtext}>Club preferences</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
        
        {/* Non-member view */}
        {!club.is_member && (
          <View style={styles.nonMemberSection}>
            <View style={styles.nonMemberCard}>
              <Users size={32} color="#DC2626" />
              <Text style={styles.nonMemberTitle}>
                {club.is_pending 
                  ? 'Your join request is pending approval' 
                  : 'Join this club to access all features'}
              </Text>
              <Text style={styles.nonMemberDescription}>
                {club.is_pending 
                  ? 'Club administrators will review your request soon. You\'ll be notified when your request is approved.'
                  : 'Members can participate in discussions, attend events, and connect with other blood donors.'}
              </Text>
              
              {!club.is_pending && !club.is_member && (
                <TouchableOpacity 
                  style={[styles.joinButton, joinLoading && styles.joinButtonLoading, styles.fullWidthButton]}
                  onPress={handleJoinClub}
                  disabled={joinLoading}
                >
                  {joinLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <UserPlus size={16} color="#FFFFFF" />
                      <Text style={styles.joinButtonText}>Join Club</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => showNotification({
              type: 'info',
              title: 'Coming Soon',
              message: 'Notification settings will be available soon',
              duration: 3000,
            })}
          >
            <Bell size={20} color="#374151" />
            <Text style={styles.quickActionText}>Notifications</Text>
            <Text style={styles.quickActionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => showNotification({
              type: 'info',
              title: 'Coming Soon',
              message: 'Privacy settings will be available soon',
              duration: 3000,
            })}
          >
            <Users size={20} color="#374151" />
            <Text style={styles.quickActionText}>Privacy</Text>
            <Text style={styles.quickActionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => showNotification({
              type: 'info',
              title: 'Coming Soon',
              message: 'Language settings will be available soon',
              duration: 3000,
            })}
          >
            <Users size={20} color="#374151" />
            <Text style={styles.quickActionText}>Language</Text>
            <View style={styles.languageContainer}>
              <Text style={styles.languageText}>English</Text>
              <Text style={styles.quickActionArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => showNotification({
              type: 'info',
              title: 'Coming Soon',
              message: 'Settings will be available soon',
              duration: 3000,
            })}
          >
            onPress={() => {
              if (club.is_admin && joinRequests.length > 0) {
                setShowRequestsModal(true);
              } else {
                handleCommunicationAction('email');
              }
            }}
            <Text style={styles.quickActionText}>Settings</Text>
            {club.is_admin && joinRequests.length > 0 ? (
              <View style={styles.notificationBadge}>
                <Bell size={24} color="#DC2626" />
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeText}>{joinRequests.length}</Text>
                </View>
              </View>
            ) : (
              <Mail size={24} color="#DC2626" />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Communication Options Modal */}
      <Modal
        visible={showCommunicationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCommunicationModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCommunicationModal(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Communication Options</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Real-time Communication</Text>
              
              <TouchableOpacity 
                style={styles.modalCommunicationItem}
                onPress={() => {
                  setShowCommunicationModal(false);
                  handleCommunicationAction('chat');
                }}
              >
                <View style={styles.modalItemLeft}>
                  <View style={[styles.modalItemIcon, { backgroundColor: '#DC2626' }]}>
                    <MessageCircle size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle}>Live Chat</Text>
                    <Text style={styles.modalItemSubtitle}>
                      Real-time messaging with {club.online_members} members online
                    </Text>
                  </View>
                </View>
                {club.unread_messages > 0 && (
                  <View style={styles.modalUnreadBadge}>
                    <Text style={styles.modalUnreadText}>{club.unread_messages}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCommunicationItem}
                onPress={() => {
                  setShowCommunicationModal(false);
                  handleCommunicationAction('voice');
                }}
              >
                <View style={styles.modalItemLeft}>
                  <View style={[styles.modalItemIcon, { backgroundColor: '#7C3AED' }]}>
                    <Mic size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle}>Voice Channel</Text>
                    <Text style={styles.modalItemSubtitle}>
                      {club.voice_channel_active 
                        ? `Join ${club.voice_participants} members in voice chat`
                        : 'Start a voice conversation with club members'
                      }
                    </Text>
                  </View>
                </View>
                {club.voice_channel_active && (
                  <View style={styles.modalVoiceIndicator}>
                    <Radio size={16} color="#10B981" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Direct Communication</Text>
              
              <TouchableOpacity 
                style={styles.modalCommunicationItem}
                onPress={() => {
                  setShowCommunicationModal(false);
                  handleCommunicationAction('video');
                }}
              >
                <View style={styles.modalItemLeft}>
                  <View style={[styles.modalItemIcon, { backgroundColor: '#059669' }]}>
                    <Video size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle}>Video Conference</Text>
                    <Text style={styles.modalItemSubtitle}>Start a video call with club members</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCommunicationItem}
                onPress={() => {
                  setShowCommunicationModal(false);
                  handleCommunicationAction('call');
                }}
              >
                <View style={styles.modalItemLeft}>
                  <View style={[styles.modalItemIcon, { backgroundColor: '#2563EB' }]}>
                    <Phone size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle}>Phone Call</Text>
                    <Text style={styles.modalItemSubtitle}>Call the club directly at {club.phone || 'N/A'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCommunicationItem}
                onPress={() => {
                  setShowCommunicationModal(false);
                  handleCommunicationAction('email');
                }}
              >
                <View style={styles.modalItemLeft}>
                  <View style={[styles.modalItemIcon, { backgroundColor: '#EA580C' }]}>
                    <Mail size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle}>Email</Text>
                    <Text style={styles.modalItemSubtitle}>Send an email to {club.email || 'N/A'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Join Request Modal */}
      <Modal
        visible={showJoinRequestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJoinRequestModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowJoinRequestModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Join Request</Text>
            <TouchableOpacity 
              onPress={submitJoinRequest}
              disabled={joinLoading}
            >
              <Text style={[
                styles.modalSendText,
                joinLoading && styles.modalSendTextDisabled
              ]}>
                {joinLoading ? 'Sending...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.joinRequestTitle}>Request to join {club.name}</Text>
            
            <View style={styles.joinRequestInfo}>
              <TextAvatar name={profile?.name || 'User'} size={48} />
              <View style={styles.joinRequestUserInfo}>
                <Text style={styles.joinRequestUserName}>{profile?.name}</Text>
                <Text style={styles.joinRequestUserEmail}>{profile?.email}</Text>
                {profile?.blood_group && (
                  <View style={styles.bloodGroupBadge}>
                    <Text style={styles.bloodGroupText}>{profile.blood_group}</Text>
                  </View>
                )}
              </View>
            </View>
            
            <Text style={styles.inputLabel}>Message (Optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Tell the club why you want to join..."
              placeholderTextColor="#9CA3AF"
              value={joinMessage}
              onChangeText={setJoinMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <Text style={styles.joinRequestNote}>
              Your request will be reviewed by club administrators. You'll be notified when your request is approved.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Join Requests Modal */}
      <Modal
        visible={showRequestsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRequestsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRequestsModal(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Join Requests</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView style={styles.modalContent}>
            {requestsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#DC2626" />
                <Text style={styles.loadingText}>Loading requests...</Text>
              </View>
            ) : joinRequests.length === 0 ? (
              <View style={styles.noRequests}>
                <UserPlus size={48} color="#D1D5DB" />
                <Text style={styles.noRequestsText}>No pending join requests</Text>
              </View>
            ) : (
              joinRequests.map(request => (
                <View key={request.id} style={styles.requestCard}>
                  {processingRequestId === request.id ? (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="small" color="#DC2626" />
                    </View>
                  ) : null}
                  
                  <View style={styles.requestHeader}>
                    <TextAvatar name={request.user_name} size={48} />
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.user_name}</Text>
                      <Text style={styles.requestEmail}>{request.user_email}</Text>
                      {request.blood_group && (
                        <View style={styles.bloodGroupBadge}>
                          <Text style={styles.bloodGroupText}>{request.blood_group}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {request.message && (
                    <View style={styles.requestMessage}>
                      <Text style={styles.requestMessageText}>{request.message}</Text>
                    </View>
                  )}
                  
                  <View style={styles.requestTime}>
                    <Text style={styles.requestTimeText}>
                      Requested {formatTimeAgo(request.created_at)}
                    </Text>
                  </View>
                  
                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                      style={[styles.rejectButton, processingRequestId !== null && styles.actionButtonDisabled]}
                      onPress={() => handleJoinRequest(request.id, request.user_id, false)}
                      disabled={processingRequestId !== null}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.approveButton, processingRequestId !== null && styles.actionButtonDisabled]}
                      onPress={() => handleJoinRequest(request.id, request.user_id, true)}
                      disabled={processingRequestId !== null}
                    >
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
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
    marginTop: 12,
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
  emailButton: {
    width: 40,
    height: 40,
    borderRadius: 20, 
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'relative',
  },
  badgeCount: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  clubBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  clubBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  clubName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#111827',
    marginBottom: 16,
  },
  contactInfo: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  joinButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonLoading: {
    backgroundColor: '#9CA3AF',
  },
  joinButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  leaveButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  leaveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pendingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#92400E',
  },
  fullWidthButton: {
    width: '100%',
    marginTop: 16,
  },
  aboutSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 12,
  },
  aboutText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    textAlign: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#111827',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  communicationHubSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  communicationHubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expandButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  expandButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#374151',
  },
  primaryCommunicationGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryCommunicationCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chatCard: {
    backgroundColor: '#DC2626',
  },
  voiceCard: {
    backgroundColor: '#7C3AED',
  },
  communicationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  communicationIconContainer: {
    position: 'relative',
  },
  liveIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
  },
  voiceActiveIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
  },
  unreadBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#DC2626',
  },
  voiceParticipantsBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  voiceParticipantsText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#7C3AED',
  },
  communicationCardTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  communicationCardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  secondaryCommunicationGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryCommunicationCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  secondaryCommunicationText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#374151',
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  featureLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  featureSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  nonMemberSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  nonMemberCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  nonMemberTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
  },
  nonMemberDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  quickActionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#374151',
    flex: 1,
    marginLeft: 12,
  },
  quickActionArrow: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    color: '#9CA3AF',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#DC2626',
  },
  // Modal styles
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
  modalSendText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
  modalSendTextDisabled: {
    color: '#9CA3AF',
  },
  headerSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalSection: {
    marginBottom: 32,
  },
  modalSectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  modalCommunicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  modalItemSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalUnreadBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  modalUnreadText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  modalVoiceIndicator: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 8,
  },
  joinRequestTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  joinRequestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 16,
  },
  joinRequestUserInfo: {
    flex: 1,
  },
  joinRequestUserName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  joinRequestUserEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  bloodGroupBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bloodGroupText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  inputLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  messageInput: {
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
    marginBottom: 16,
  },
  joinRequestNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
});