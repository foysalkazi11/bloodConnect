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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Crown,
  Shield,
  User,
  MoveVertical as MoreVertical,
  MessageCircle,
  Phone,
  Bell,
  Users,
} from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';
import { TextAvatar } from '@/components/TextAvatar';
import { supabase, UserProfile } from '@/lib/supabase';

interface ClubMember {
  id: string;
  name: string;
  email: string;
  blood_group?: string;
  role: 'admin' | 'moderator' | 'member';
  joined_date: string;
  last_active: string;
  is_online: boolean;
  total_donations: number;
  phone?: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  blood_group?: string;
  message?: string;
  created_at: string;
}

export default function ClubMembersScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();
  const [clubDetails, setClubDetails] = useState<UserProfile | null>(null);

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<ClubMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<
    'all' | 'admin' | 'moderator' | 'member'
  >('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedMember, setSelectedMember] = useState<ClubMember | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>(
    useLocalSearchParams().tab === 'requests' ? 'requests' : 'members'
  );

  useEffect(() => {
    checkAccess();
  }, [id, user]);

  const checkAccess = async () => {
    try {
      setLoading(true);

      // First, fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .eq('user_type', 'club')
        .single();

      if (clubError) {
        console.error('Error loading club details:', clubError);
        throw clubError;
      }

      setClubDetails(clubData);

      // Check if user is authenticated
      if (!user) {
        setAccessDenied(true);
        return;
      }

      // Check if user is the club owner
      const isOwner = user.id === id;

      if (isOwner) {
        setIsAdmin(true);
        await loadMembers();
        if (activeTab === 'requests') {
          await loadJoinRequests();
        }
        return;
      }

      // Check if user is a member of this club
      const { data: memberData, error: memberError } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', id)
        .eq('member_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError && !memberError.message.includes('PGRST116')) {
        console.error('Error checking membership:', memberError);
      }

      if (!memberData) {
        setAccessDenied(true);
        return;
      }

      // Check if user is admin or moderator
      const isAdminOrMod = ['admin', 'moderator'].includes(memberData.role);
      setIsAdmin(isAdminOrMod);

      await loadMembers();
      if (isAdminOrMod && activeTab === 'requests') {
        await loadJoinRequests();
      }
    } catch (error) {
      console.error('Error checking access:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to check access permissions',
        duration: 4000,
      });
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery, selectedRole]);

  const loadMembers = async () => {
    try {
      setLoading(true);

      // Fetch club members
      const { data, error } = await supabase
        .from('club_members')
        .select(
          `
          id,
          role,
          joined_at,
          user_profiles:member_id(
            id,
            name,
            email,
            blood_group,
            phone
          )
        `
        )
        .eq('club_id', id)
        .eq('is_active', true);

      if (error) throw error;

      // Format member data
      const formattedMembers: ClubMember[] = data.map((member) => ({
        id: member.user_profiles[0]?.id,
        name: member.user_profiles[0]?.name,
        email: member.user_profiles[0]?.email,
        blood_group: member.user_profiles[0]?.blood_group,
        role: member.role,
        joined_date: member.joined_at,
        last_active: new Date(
          Date.now() - Math.random() * 24 * 60 * 60 * 1000
        ).toISOString(), // Random for demo
        is_online: Math.random() > 0.7, // Random for demo
        total_donations: Math.floor(Math.random() * 20), // Random for demo
        phone: member.user_profiles[0]?.phone,
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error loading members:', error);

      // Fallback to mock data
      const mockMembers: ClubMember[] = [
        {
          id: '1',
          name: 'Ahmed Rahman',
          email: 'ahmed@example.com',
          blood_group: 'O+',
          role: 'admin',
          joined_date: '2023-01-15',
          last_active: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          is_online: true,
          total_donations: 12,
          phone: '+880 1234567890',
        },
        {
          id: '2',
          name: 'Fatima Khan',
          email: 'fatima@example.com',
          blood_group: 'A+',
          role: 'moderator',
          joined_date: '2023-02-20',
          last_active: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_online: false,
          total_donations: 8,
          phone: '+880 1987654321',
        },
      ];
      setMembers(mockMembers);
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    try {
      setRequestsLoading(true);
      console.log('Loading join requests for club:', id);

      let data: any;
      let error: any;

      try {
        const { data: functionData, error: functionError } = await supabase.rpc(
          'get_join_requests',
          { club_id_param: id }
        );

        if (functionError) throw functionError;

        data = functionData.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          message: item.message,
          created_at: item.created_at,
          user_profiles: {
            name: item.user_name,
            email: item.user_email,
            blood_group: item.user_blood_group,
          },
        }));
      } catch (functionError) {
        console.log(
          'Function approach failed, falling back to direct query:',
          functionError
        );

        // Fallback to direct query with join
        const { data: directData, error: directError } = await supabase
          .from('club_join_requests')
          .select(
            `
            id,
            user_id,
            message,
            created_at,
            user_profiles:user_profiles!inner(
              name,
              email,
              blood_group
            )
          `
          )
          .eq('club_id', id)
          .eq('status', 'pending');

        data = directData;
        error = directError;
      }

      if (error) throw error;

      // Format request data
      const formattedRequests: JoinRequest[] = data.map((request) => ({
        id: request.id,
        user_id: request.user_id,
        user_name: request.user_profiles?.name,
        user_email: request.user_profiles?.email,
        blood_group: request.user_profiles?.blood_group,
        message: request.message,
        created_at: request.created_at,
      }));

      setJoinRequests(formattedRequests);
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

  const checkAdminStatus = async () => {
    try {
      // Check if current user is admin or moderator
      const { data, error } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', id)
        .eq('member_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setIsAdmin(data ? ['admin', 'moderator'].includes(data.role) : false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.blood_group?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter((member) => member.role === selectedRole);
    }

    setFilteredMembers(filtered);
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter an email address',
        duration: 4000,
      });
      return;
    }

    try {
      // This would typically send an invitation email
      // For now, just show a success notification
      showNotification({
        type: 'success',
        title: 'Invitation Sent',
        message: `Invitation sent to ${inviteEmail}`,
        duration: 3000,
      });
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to send invitation',
        duration: 4000,
      });
    }
  };

  const handleMemberAction = (member: ClubMember, action: string) => {
    switch (action) {
      case 'message':
        // Navigate to direct message
        router.push(`/(tabs)/clubs/${id}/chat?member=${member.id}`);
        break;
      case 'call':
        if (member.phone) {
          // Handle phone call
          Alert.alert('Call Member', `Call ${member.name} at ${member.phone}?`);
        } else {
          showNotification({
            type: 'info',
            title: 'No Phone Number',
            message: 'This member has not provided a phone number',
            duration: 3000,
          });
        }
        break;
      case 'promote':
        Alert.alert('Promote Member', `Promote ${member.name} to moderator?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Promote', onPress: () => promoteMember(member.id) },
        ]);
        break;
      case 'remove':
        Alert.alert('Remove Member', `Remove ${member.name} from the club?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeMember(member.id),
          },
        ]);
        break;
    }
    setShowMemberModal(false);
  };

  const promoteMember = async (memberId: string) => {
    try {
      setActionLoading(memberId);

      // Update member role
      const { error } = await supabase
        .from('club_members')
        .update({ role: 'moderator' })
        .eq('club_id', id)
        .eq('member_id', memberId);

      if (error) throw error;

      // Update local state
      setMembers(
        members.map((member) =>
          member.id === memberId
            ? { ...member, role: 'moderator' as const }
            : member
        )
      );

      showNotification({
        type: 'success',
        title: 'Member Promoted',
        message: 'Member has been promoted to moderator',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error promoting member:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to promote member',
        duration: 4000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      setActionLoading(memberId);

      // Set member as inactive
      const { error } = await supabase
        .from('club_members')
        .update({ is_active: false })
        .eq('club_id', id)
        .eq('member_id', memberId);

      if (error) throw error;

      // Update local state
      setMembers(members.filter((member) => member.id !== memberId));

      showNotification({
        type: 'success',
        title: 'Member Removed',
        message: 'Member has been removed from the club',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error removing member:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove member',
        duration: 4000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoinRequest = async (
    requestId: string,
    userId: string,
    approved: boolean
  ) => {
    try {
      setActionLoading(requestId);

      // Update request status
      const { error } = await supabase
        .from('club_join_requests')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setJoinRequests(
        joinRequests.filter((request) => request.id !== requestId)
      );

      // If approved, add to members list
      if (approved) {
        // The trigger will handle adding the member to club_members
        // We'll reload the members list to show the new member
        await loadMembers();
      }

      showNotification({
        type: 'success',
        title: approved ? 'Request Approved' : 'Request Rejected',
        message: approved
          ? 'User has been added to the club'
          : 'Join request has been rejected',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error handling join request:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to process join request',
        duration: 4000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTabChange = (tab: 'members' | 'requests') => {
    setActiveTab(tab);
    if (tab === 'requests' && !requestsLoading && joinRequests.length === 0) {
      loadJoinRequests();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown size={16} color="#F59E0B" />;
      case 'moderator':
        return <Shield size={16} color="#3B82F6" />;
      default:
        return <User size={16} color="#6B7280" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#F59E0B';
      case 'moderator':
        return '#3B82F6';
      default:
        return '#6B7280';
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

  if (loading && !accessDenied) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (accessDenied) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Club Members</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.accessDeniedContainer}>
          <Users size={64} color="#D1D5DB" />
          <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
          <Text style={styles.accessDeniedText}>
            You need to be a member of this club to view its members.
          </Text>
          <TouchableOpacity
            style={styles.backToClubButton}
            onPress={() => router.replace(`/(tabs)/clubs/${id}`)}
          >
            <Text style={styles.backToClubButtonText}>Back to Club</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>
          {activeTab === 'members'
            ? `Members (${members.length})`
            : 'Join Requests'}
        </Text>
        <View style={styles.headerActions}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.requestsButton}
              onPress={() =>
                handleTabChange(
                  activeTab === 'members' ? 'requests' : 'members'
                )
              }
            >
              {activeTab === 'members' ? (
                <>
                  <UserPlus size={20} color="#FFFFFF" />
                  {joinRequests.length > 0 && (
                    <View style={styles.requestsBadge}>
                      <Text style={styles.requestsBadgeText}>
                        {joinRequests.length}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Users size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => setShowInviteModal(true)}
            >
              <UserPlus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activeTab === 'members' ? (
        <>
          {/* Search and Filters */}
          <View style={styles.filtersContainer}>
            <View style={styles.searchContainer}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search members..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.roleFilters}
            >
              {['all', 'admin', 'moderator', 'member'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleFilter,
                    selectedRole === role && styles.roleFilterActive,
                  ]}
                  onPress={() => setSelectedRole(role as any)}
                >
                  <Text
                    style={[
                      styles.roleFilterText,
                      selectedRole === role && styles.roleFilterTextActive,
                    ]}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Members List */}
          <ScrollView
            style={styles.membersList}
            showsVerticalScrollIndicator={false}
          >
            {filteredMembers.length === 0 ? (
              <View style={styles.noMembers}>
                <User size={48} color="#D1D5DB" />
                <Text style={styles.noMembersText}>No members found</Text>
                <Text style={styles.noMembersSubtext}>
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'No members match the selected filters'}
                </Text>
              </View>
            ) : (
              filteredMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberCard,
                    actionLoading === member.id && styles.memberCardLoading,
                  ]}
                  onPress={() => {
                    setSelectedMember(member);
                    setShowMemberModal(true);
                  }}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === member.id ? (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="small" color="#DC2626" />
                    </View>
                  ) : null}

                  <View style={styles.memberInfo}>
                    <View style={styles.avatarContainer}>
                      <TextAvatar name={member.name} size={48} />
                      {member.is_online && (
                        <View style={styles.onlineIndicator} />
                      )}
                    </View>

                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: getRoleColor(member.role) },
                          ]}
                        >
                          {getRoleIcon(member.role)}
                          <Text style={styles.roleText}>{member.role}</Text>
                        </View>
                      </View>

                      <Text style={styles.memberEmail}>{member.email}</Text>

                      <View style={styles.memberStats}>
                        {member.blood_group && (
                          <Text style={styles.bloodGroup}>
                            {member.blood_group}
                          </Text>
                        )}
                        <Text style={styles.statDivider}>•</Text>
                        <Text style={styles.donationCount}>
                          {member.total_donations} donations
                        </Text>
                        <Text style={styles.statDivider}>•</Text>
                        <Text style={styles.lastActive}>
                          {member.is_online
                            ? 'Online'
                            : formatTimeAgo(member.last_active)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.moreButton}>
                    <MoreVertical size={20} color="#6B7280" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </>
      ) : (
        /* Join Requests List */
        <ScrollView
          style={styles.requestsList}
          showsVerticalScrollIndicator={false}
        >
          {requestsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DC2626" />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : joinRequests.length === 0 ? (
            <View style={styles.noRequests}>
              <UserPlus size={48} color="#D1D5DB" />
              <Text style={styles.noRequestsText}>
                No pending join requests
              </Text>
            </View>
          ) : (
            joinRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                {actionLoading === request.id ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#DC2626" />
                  </View>
                ) : null}

                <View style={styles.requestHeader}>
                  <TextAvatar name={request.user_name} size={48} />
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{request.user_name}</Text>
                    <Text style={styles.requestEmail}>
                      {request.user_email}
                    </Text>
                    {request.blood_group && (
                      <View style={styles.bloodGroupBadge}>
                        <Text style={styles.bloodGroupText}>
                          {request.blood_group}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {request.message && (
                  <View style={styles.requestMessage}>
                    <Text style={styles.requestMessageText}>
                      {request.message}
                    </Text>
                  </View>
                )}

                <View style={styles.requestTime}>
                  <Text style={styles.requestTimeText}>
                    Requested {formatTimeAgo(request.created_at)}
                  </Text>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[
                      styles.rejectButton,
                      actionLoading !== null && styles.actionButtonDisabled,
                    ]}
                    onPress={() =>
                      handleJoinRequest(request.id, request.user_id, false)
                    }
                    disabled={actionLoading !== null}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.approveButton,
                      actionLoading !== null && styles.actionButtonDisabled,
                    ]}
                    onPress={() =>
                      handleJoinRequest(request.id, request.user_id, true)
                    }
                    disabled={actionLoading !== null}
                  >
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Invite Member Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invite Member</Text>
            <TouchableOpacity
              onPress={handleInviteMember}
              disabled={!inviteEmail.trim()}
            >
              <Text
                style={[
                  styles.modalSendText,
                  !inviteEmail.trim() && styles.modalSendTextDisabled,
                ]}
              >
                Send
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="Enter email address"
              placeholderTextColor="#9CA3AF"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <Text style={styles.inviteNote}>
              An invitation will be sent to this email address to join the club.
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
                <Text style={styles.noRequestsText}>
                  No pending join requests
                </Text>
              </View>
            ) : (
              joinRequests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  {actionLoading === request.id ? (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="small" color="#DC2626" />
                    </View>
                  ) : null}

                  <View style={styles.requestHeader}>
                    <TextAvatar name={request.user_name} size={48} />
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>
                        {request.user_name}
                      </Text>
                      <Text style={styles.requestEmail}>
                        {request.user_email}
                      </Text>
                      {request.blood_group && (
                        <View style={styles.bloodGroupBadge}>
                          <Text style={styles.bloodGroupText}>
                            {request.blood_group}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {request.message && (
                    <View style={styles.requestMessage}>
                      <Text style={styles.requestMessageText}>
                        {request.message}
                      </Text>
                    </View>
                  )}

                  <View style={styles.requestTime}>
                    <Text style={styles.requestTimeText}>
                      Requested {formatTimeAgo(request.created_at)}
                    </Text>
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[
                        styles.rejectButton,
                        actionLoading !== null && styles.actionButtonDisabled,
                      ]}
                      onPress={() =>
                        handleJoinRequest(request.id, request.user_id, false)
                      }
                      disabled={actionLoading !== null}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.approveButton,
                        actionLoading !== null && styles.actionButtonDisabled,
                      ]}
                      onPress={() =>
                        handleJoinRequest(request.id, request.user_id, true)
                      }
                      disabled={actionLoading !== null}
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

      {/* Member Actions Modal */}
      <Modal
        visible={showMemberModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMemberModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMemberModal(false)}
        >
          <View style={styles.memberActionModal}>
            {selectedMember && (
              <>
                <View style={styles.memberModalHeader}>
                  <TextAvatar name={selectedMember.name} size={60} />
                  <Text style={styles.memberModalName}>
                    {selectedMember.name}
                  </Text>
                  <Text style={styles.memberModalRole}>
                    {selectedMember.role}
                  </Text>
                  {selectedMember.blood_group && (
                    <View style={styles.modalBloodGroup}>
                      <Text style={styles.modalBloodGroupText}>
                        {selectedMember.blood_group}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={styles.memberAction}
                    onPress={() =>
                      handleMemberAction(selectedMember, 'message')
                    }
                  >
                    <MessageCircle size={20} color="#DC2626" />
                    <Text style={styles.memberActionText}>Message</Text>
                  </TouchableOpacity>

                  {selectedMember.phone && (
                    <TouchableOpacity
                      style={styles.memberAction}
                      onPress={() => handleMemberAction(selectedMember, 'call')}
                    >
                      <Phone size={20} color="#DC2626" />
                      <Text style={styles.memberActionText}>Call</Text>
                    </TouchableOpacity>
                  )}

                  {isAdmin && selectedMember.id !== user?.id && (
                    <>
                      {selectedMember.role === 'member' && (
                        <TouchableOpacity
                          style={styles.memberAction}
                          onPress={() =>
                            handleMemberAction(selectedMember, 'promote')
                          }
                        >
                          <Shield size={20} color="#3B82F6" />
                          <Text style={styles.memberActionText}>
                            Promote to Moderator
                          </Text>
                        </TouchableOpacity>
                      )}

                      {selectedMember.role !== 'admin' && (
                        <TouchableOpacity
                          style={[styles.memberAction, styles.dangerAction]}
                          onPress={() =>
                            handleMemberAction(selectedMember, 'remove')
                          }
                        >
                          <User size={20} color="#EF4444" />
                          <Text
                            style={[
                              styles.memberActionText,
                              styles.dangerActionText,
                            ]}
                          >
                            Remove from Club
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
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
    padding: 20,
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  requestsButton: {
    backgroundColor: '#F59E0B',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  requestsBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  inviteButton: {
    backgroundColor: '#DC2626',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
  },
  roleFilters: {
    flexDirection: 'row',
  },
  roleFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  roleFilterActive: {
    backgroundColor: '#DC2626',
  },
  roleFilterText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  roleFilterTextActive: {
    color: '#FFFFFF',
  },
  membersList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  memberCardLoading: {
    opacity: 0.7,
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
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  memberName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  roleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  memberEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bloodGroup: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#DC2626',
  },
  statDivider: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#D1D5DB',
  },
  donationCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  lastActive: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMembers: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noMembersText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
  },
  noMembersSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  requestsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  modalSendText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
  modalSendTextDisabled: {
    color: '#9CA3AF',
  },
  modalContent: {
    padding: 20,
    flex: 1,
  },
  inputLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  emailInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  inviteNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  memberActionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  memberModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  memberModalName: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
    marginTop: 12,
  },
  memberModalRole: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modalBloodGroup: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  modalBloodGroupText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  memberActions: {
    gap: 12,
  },
  memberAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  memberActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  dangerAction: {
    backgroundColor: '#FEF2F2',
  },
  dangerActionText: {
    color: '#EF4444',
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
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  backToClubButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backToClubButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
