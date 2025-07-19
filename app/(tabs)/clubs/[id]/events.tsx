import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  CircleHelp as HelpCircle,
} from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useNotification } from '@/components/NotificationSystem';
import { TextAvatar } from '@/components/TextAvatar';
import { supabase } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ClubEvent {
  id: string;
  title: string;
  description: string;
  event_type: 'meeting' | 'blood_drive' | 'training' | 'social' | 'other';
  start_time: string;
  end_time: string;
  location?: string;
  is_virtual: boolean;
  meeting_link?: string;
  max_attendees?: number;
  organizer_id: string;
  organizer_name: string;
  attendees_count: number;
  user_status: 'going' | 'maybe' | 'not_going' | null;
}

export default function ClubEventsScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>(
    'upcoming'
  );
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'meeting' as const,
    start_time: '',
    end_time: '',
    location: '',
    is_virtual: false,
    meeting_link: '',
    max_attendees: '',
  });

  // Permission and role state
  const [userRole, setUserRole] = useState<
    'owner' | 'admin' | 'moderator' | 'member' | null
  >(null);
  const [canCreateEvent, setCanCreateEvent] = useState(false);
  const [clubData, setClubData] = useState<any>(null);

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);

  useEffect(() => {
    checkUserPermissions();
  }, [id, user]);

  useEffect(() => {
    if (userRole !== null) {
      loadEvents();
    }
  }, [userRole]);

  const checkUserPermissions = async () => {
    try {
      if (!user) {
        setUserRole(null);
        setCanCreateEvent(false);
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
        setCanCreateEvent(true);
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
        setCanCreateEvent(false);
        return;
      }

      if (!memberData) {
        setUserRole(null);
        setCanCreateEvent(false);
        return;
      }

      setUserRole(memberData.role);
      // Only owners and admins can create events
      setCanCreateEvent(memberData.role === 'admin');
    } catch (error) {
      console.error('Error checking permissions:', error);
      setUserRole(null);
      setCanCreateEvent(false);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);

      // First, fetch the main event data
      const { data: eventsData, error: eventsError } = await supabase
        .from('club_events')
        .select(
          `
          id,
          title,
          description,
          event_type,
          start_time,
          end_time,
          location,
          is_virtual,
          meeting_link,
          max_attendees,
          organizer_id,
          user_profiles!club_events_organizer_id_fkey(name)
        `
        )
        .eq('club_id', id)
        .order('start_time', { ascending: true });

      if (eventsError) {
        throw eventsError;
      }

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        return;
      }

      // Get event IDs for attendee queries
      const eventIds = eventsData.map((event) => event.id);

      // Fetch attendee counts for each event (only if we have events)
      const { data: attendeeCounts, error: attendeeError } = await supabase
        .from('club_event_attendees')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'going');

      if (attendeeError) {
        console.warn('Error loading attendee counts:', attendeeError);
      }

      // Count attendees per event
      const attendeeCountMap = (attendeeCounts || []).reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item.event_id] = (acc[item.event_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Fetch current user's attendance status for each event
      const { data: userAttendance, error: userAttendanceError } =
        await supabase
          .from('club_event_attendees')
          .select('event_id, status')
          .in('event_id', eventIds)
          .eq('user_id', user?.id);

      if (userAttendanceError) {
        console.warn('Error loading user attendance:', userAttendanceError);
      }

      // Create user attendance map
      const userAttendanceMap = (userAttendance || []).reduce(
        (acc, attendance) => {
          acc[attendance.event_id] = attendance.status;
          return acc;
        },
        {} as Record<string, string>
      );

      // Combine all data
      const formattedEvents: ClubEvent[] = eventsData.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        is_virtual: event.is_virtual,
        meeting_link: event.meeting_link,
        max_attendees: event.max_attendees,
        organizer_id: event.organizer_id,
        organizer_name: event.user_profiles?.[0]?.name || 'Unknown',
        attendees_count: attendeeCountMap[event.id] || 0,
        user_status:
          (userAttendanceMap[event.id] as 'going' | 'maybe' | 'not_going') ||
          null,
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load events',
        duration: 4000,
      });
      // Fallback to mock data for development
      const mockEvents: ClubEvent[] = [
        {
          id: '1',
          title: 'Emergency Blood Drive',
          description:
            'Urgent blood drive for emergency cases at Dhaka Medical College Hospital. We need O+ and AB- donors.',
          event_type: 'blood_drive',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(
            Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000
          ).toISOString(),
          location: 'Dhaka Medical College Hospital',
          is_virtual: false,
          organizer_id: 'admin1',
          organizer_name: 'Ahmed Rahman',
          attendees_count: 23,
          user_status: 'going',
        },
        {
          id: '2',
          title: 'Monthly Club Meeting',
          description:
            'Regular monthly meeting to discuss club activities, upcoming events, and new member orientations.',
          event_type: 'meeting',
          start_time: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000
          ).toISOString(),
          end_time: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
          ).toISOString(),
          location: 'Club Office',
          is_virtual: true,
          meeting_link: 'https://meet.google.com/abc-defg-hij',
          max_attendees: 50,
          organizer_id: 'admin2',
          organizer_name: 'Fatima Khan',
          attendees_count: 18,
          user_status: 'maybe',
        },
        {
          id: '3',
          title: 'Volunteer Training Workshop',
          description:
            'Comprehensive training for new volunteers covering blood donation processes, donor care, and emergency procedures.',
          event_type: 'training',
          start_time: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          end_time: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
          ).toISOString(),
          location: 'Training Center',
          is_virtual: false,
          max_attendees: 30,
          organizer_id: 'admin1',
          organizer_name: 'Ahmed Rahman',
          attendees_count: 12,
          user_status: null,
        },
      ];
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!canCreateEvent) {
      showNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only club owners and admins can create events',
        duration: 4000,
      });
      return;
    }

    if (!newEvent.title.trim() || !startDateTime || !endDateTime) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in title, start time, and end time',
        duration: 4000,
      });
      return;
    }

    if (endDateTime <= startDateTime) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'End time must be after start time',
        duration: 4000,
      });
      return;
    }

    try {
      const eventData = {
        club_id: id,
        organizer_id: user?.id,
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        event_type: newEvent.event_type,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: newEvent.location.trim() || null,
        is_virtual: newEvent.is_virtual,
        meeting_link: newEvent.meeting_link.trim() || null,
        max_attendees: newEvent.max_attendees
          ? parseInt(newEvent.max_attendees)
          : null,
      };

      const { data, error } = await supabase
        .from('club_events')
        .insert([eventData])
        .select(
          `
          *,
          user_profiles!club_events_organizer_id_fkey(name)
        `
        )
        .single();

      if (error) {
        console.error('Error creating event:', error);
        throw error;
      }

      // Add the new event to the list
      const newEventItem: ClubEvent = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        event_type: data.event_type,
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location,
        is_virtual: data.is_virtual,
        meeting_link: data.meeting_link,
        max_attendees: data.max_attendees,
        organizer_id: data.organizer_id,
        organizer_name: data.user_profiles?.name || profile?.name || 'You',
        attendees_count: 0,
        user_status: null,
      };

      setEvents([newEventItem, ...events]);

      // Reset form
      setNewEvent({
        title: '',
        description: '',
        event_type: 'meeting',
        start_time: '',
        end_time: '',
        location: '',
        is_virtual: false,
        meeting_link: '',
        max_attendees: '',
      });
      setStartDateTime(null);
      setEndDateTime(null);
      setShowCreateModal(false);

      showNotification({
        type: 'success',
        title: 'Event Created',
        message: 'Your event has been created successfully',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error creating event:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create event',
        duration: 4000,
      });
    }
  };

  const handleAttendanceChange = (
    eventId: string,
    status: 'going' | 'maybe' | 'not_going'
  ) => {
    setEvents(
      events.map((event) => {
        if (event.id === eventId) {
          const oldStatus = event.user_status;
          let attendeesChange = 0;

          if (oldStatus === null && status === 'going') attendeesChange = 1;
          else if (oldStatus === 'going' && status !== 'going')
            attendeesChange = -1;
          else if (oldStatus !== 'going' && status === 'going')
            attendeesChange = 1;

          return {
            ...event,
            user_status: status,
            attendees_count: Math.max(
              0,
              event.attendees_count + attendeesChange
            ),
          };
        }
        return event;
      })
    );
  };

  // Date picker functions
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }

    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (startDateTime) {
        // Preserve the time if it was already set
        newDate.setHours(startDateTime.getHours(), startDateTime.getMinutes());
      }
      setStartDateTime(newDate);

      if (Platform.OS === 'ios') {
        setShowStartDatePicker(false);
        setShowStartTimePicker(true);
      }
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }

    if (selectedTime && startDateTime) {
      const newDate = new Date(startDateTime);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setStartDateTime(newDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }

    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (endDateTime) {
        // Preserve the time if it was already set
        newDate.setHours(endDateTime.getHours(), endDateTime.getMinutes());
      }
      setEndDateTime(newDate);

      if (Platform.OS === 'ios') {
        setShowEndDatePicker(false);
        setShowEndTimePicker(true);
      }
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }

    if (selectedTime && endDateTime) {
      const newDate = new Date(endDateTime);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setEndDateTime(newDate);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Web-specific date handlers
  const handleWebStartDateChange = (event: any) => {
    const value = event.target.value; // Format: YYYY-MM-DDTHH:mm
    if (value) {
      const newDate = new Date(value);
      setStartDateTime(newDate);
    }
  };

  const handleWebEndDateChange = (event: any) => {
    const value = event.target.value; // Format: YYYY-MM-DDTHH:mm
    if (value) {
      const newDate = new Date(value);
      setEndDateTime(newDate);
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

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'blood_drive':
        return '#EF4444';
      case 'meeting':
        return '#3B82F6';
      case 'training':
        return '#10B981';
      case 'social':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'blood_drive':
        return 'Blood Drive';
      case 'meeting':
        return 'Meeting';
      case 'training':
        return 'Training';
      case 'social':
        return 'Social';
      default:
        return 'Other';
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isEventPast = (endTime: string) => {
    return new Date(endTime) < new Date();
  };

  const filteredEvents = events.filter((event) => {
    if (selectedTab === 'upcoming') {
      return !isEventPast(event.end_time);
    } else {
      return isEventPast(event.end_time);
    }
  });

  const getAttendanceIcon = (status: string | null) => {
    switch (status) {
      case 'going':
        return <CheckCircle size={16} color="#10B981" />;
      case 'maybe':
        return <HelpCircle size={16} color="#F59E0B" />;
      case 'not_going':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading events...</Text>
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
        <Text style={styles.headerTitle}>Events</Text>
        {canCreateEvent ? (
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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'upcoming' && styles.activeTab]}
          onPress={() => setSelectedTab('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'upcoming' && styles.activeTabText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'past' && styles.activeTab]}
          onPress={() => setSelectedTab('past')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'past' && styles.activeTabText,
            ]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredEvents.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            {/* Event Header */}
            <View style={styles.eventHeader}>
              <View style={styles.eventTypeContainer}>
                <View
                  style={[
                    styles.eventTypeBadge,
                    { backgroundColor: getEventTypeColor(event.event_type) },
                  ]}
                >
                  <Text style={styles.eventTypeText}>
                    {getEventTypeLabel(event.event_type)}
                  </Text>
                </View>
                {event.is_virtual && (
                  <View style={styles.virtualBadge}>
                    <Video size={12} color="#3B82F6" />
                    <Text style={styles.virtualText}>Virtual</Text>
                  </View>
                )}
              </View>

              <View style={styles.attendanceStatus}>
                {getAttendanceIcon(event.user_status)}
              </View>
            </View>

            {/* Event Info */}
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDescription}>{event.description}</Text>

            {/* Event Details */}
            <View style={styles.eventDetails}>
              <View style={styles.eventDetailRow}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.eventDetailText}>
                  {formatEventDate(event.start_time)} •{' '}
                  {formatEventTime(event.start_time)} -{' '}
                  {formatEventTime(event.end_time)}
                </Text>
              </View>

              <View style={styles.eventDetailRow}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.eventDetailText}>
                  {event.is_virtual ? 'Virtual Event' : event.location}
                </Text>
              </View>

              <View style={styles.eventDetailRow}>
                <Users size={16} color="#6B7280" />
                <Text style={styles.eventDetailText}>
                  {event.attendees_count} attending
                  {event.max_attendees && ` • ${event.max_attendees} max`}
                </Text>
              </View>
            </View>

            {/* Organizer */}
            <View style={styles.organizerInfo}>
              <TextAvatar name={event.organizer_name} size={24} />
              <Text style={styles.organizerText}>
                Organized by {event.organizer_name}
              </Text>
            </View>

            {/* Actions */}
            {!isEventPast(event.end_time) && (
              <View style={styles.eventActions}>
                <TouchableOpacity
                  style={[
                    styles.attendanceButton,
                    event.user_status === 'going' &&
                      styles.attendanceButtonActive,
                  ]}
                  onPress={() => handleAttendanceChange(event.id, 'going')}
                >
                  <CheckCircle
                    size={16}
                    color={
                      event.user_status === 'going' ? '#FFFFFF' : '#10B981'
                    }
                  />
                  <Text
                    style={[
                      styles.attendanceButtonText,
                      event.user_status === 'going' &&
                        styles.attendanceButtonTextActive,
                    ]}
                  >
                    Going
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.attendanceButton,
                    event.user_status === 'maybe' &&
                      styles.attendanceButtonActive,
                  ]}
                  onPress={() => handleAttendanceChange(event.id, 'maybe')}
                >
                  <HelpCircle
                    size={16}
                    color={
                      event.user_status === 'maybe' ? '#FFFFFF' : '#F59E0B'
                    }
                  />
                  <Text
                    style={[
                      styles.attendanceButtonText,
                      event.user_status === 'maybe' &&
                        styles.attendanceButtonTextActive,
                    ]}
                  >
                    Maybe
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.attendanceButton,
                    event.user_status === 'not_going' &&
                      styles.attendanceButtonActive,
                  ]}
                  onPress={() => handleAttendanceChange(event.id, 'not_going')}
                >
                  <XCircle
                    size={16}
                    color={
                      event.user_status === 'not_going' ? '#FFFFFF' : '#EF4444'
                    }
                  />
                  <Text
                    style={[
                      styles.attendanceButtonText,
                      event.user_status === 'not_going' &&
                        styles.attendanceButtonTextActive,
                    ]}
                  >
                    Can&apos;t Go
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Join Meeting Link */}
            {event.is_virtual &&
              event.meeting_link &&
              !isEventPast(event.end_time) && (
                <TouchableOpacity style={styles.joinMeetingButton}>
                  <Video size={16} color="#FFFFFF" />
                  <Text style={styles.joinMeetingText}>Join Meeting</Text>
                </TouchableOpacity>
              )}
          </View>
        ))}

        {filteredEvents.length === 0 && (
          <View style={styles.noEvents}>
            <Calendar size={48} color="#D1D5DB" />
            <Text style={styles.noEventsText}>No {selectedTab} events</Text>
            <Text style={styles.noEventsSubtext}>
              {selectedTab === 'upcoming'
                ? 'Create an event to get started'
                : 'Past events will appear here'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Event Modal */}
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
            <Text style={styles.modalTitle}>New Event</Text>
            <TouchableOpacity
              onPress={handleCreateEvent}
              disabled={
                !newEvent.title.trim() || !startDateTime || !endDateTime
              }
            >
              <Text
                style={[
                  styles.modalCreateText,
                  (!newEvent.title.trim() || !startDateTime || !endDateTime) &&
                    styles.modalCreateTextDisabled,
                ]}
              >
                Create
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter event title"
                placeholderTextColor="#9CA3AF"
                value={newEvent.title}
                onChangeText={(text) =>
                  setNewEvent({ ...newEvent, title: text })
                }
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {['meeting', 'blood_drive', 'training', 'social', 'other'].map(
                  (type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        newEvent.event_type === type && styles.typeOptionActive,
                        { borderColor: getEventTypeColor(type) },
                      ]}
                      onPress={() =>
                        setNewEvent({ ...newEvent, event_type: type as any })
                      }
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          newEvent.event_type === type && {
                            color: getEventTypeColor(type),
                          },
                        ]}
                      >
                        {getEventTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textAreaInput}
                placeholder="Describe your event..."
                placeholderTextColor="#9CA3AF"
                value={newEvent.description}
                onChangeText={(text) =>
                  setNewEvent({ ...newEvent, description: text })
                }
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Start Time *</Text>

              {Platform.OS === 'web' ? (
                // Web: HTML5 datetime-local input
                <View style={styles.webDateContainer}>
                  <input
                    type="datetime-local"
                    value={formatDateForWeb(startDateTime)}
                    onChange={handleWebStartDateChange}
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
                  {startDateTime && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={() => setStartDateTime(null)}
                    >
                      <Text style={styles.clearDateText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // Mobile: Native date/time pickers
                <>
                  {startDateTime ? (
                    <View style={styles.dateDisplayContainer}>
                      <Text style={styles.dateDisplayText}>
                        {formatDateTime(startDateTime)}
                      </Text>
                      <TouchableOpacity
                        style={styles.clearDateButton}
                        onPress={() => setStartDateTime(null)}
                      >
                        <Text style={styles.clearDateText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.datePickerButtonText}>
                        Select Start Date & Time
                      </Text>
                    </TouchableOpacity>
                  )}

                  {startDateTime && (
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.updateDateButton]}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Calendar size={20} color="#DC2626" />
                      <Text
                        style={[
                          styles.datePickerButtonText,
                          { color: '#DC2626' },
                        ]}
                      >
                        Change Start Time
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>End Time *</Text>

              {Platform.OS === 'web' ? (
                // Web: HTML5 datetime-local input
                <View style={styles.webDateContainer}>
                  <input
                    type="datetime-local"
                    value={formatDateForWeb(endDateTime)}
                    onChange={handleWebEndDateChange}
                    min={formatDateForWeb(startDateTime || new Date())}
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
                  {endDateTime && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={() => setEndDateTime(null)}
                    >
                      <Text style={styles.clearDateText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // Mobile: Native date/time pickers
                <>
                  {endDateTime ? (
                    <View style={styles.dateDisplayContainer}>
                      <Text style={styles.dateDisplayText}>
                        {formatDateTime(endDateTime)}
                      </Text>
                      <TouchableOpacity
                        style={styles.clearDateButton}
                        onPress={() => setEndDateTime(null)}
                      >
                        <Text style={styles.clearDateText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.datePickerButtonText}>
                        Select End Date & Time
                      </Text>
                    </TouchableOpacity>
                  )}

                  {endDateTime && (
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.updateDateButton]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Calendar size={20} color="#DC2626" />
                      <Text
                        style={[
                          styles.datePickerButtonText,
                          { color: '#DC2626' },
                        ]}
                      >
                        Change End Time
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Date Pickers */}
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDateTime || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleStartDateChange}
                      minimumDate={new Date()}
                    />
                  )}

                  {showStartTimePicker && (
                    <DateTimePicker
                      value={startDateTime || new Date()}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleStartTimeChange}
                    />
                  )}

                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDateTime || startDateTime || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleEndDateChange}
                      minimumDate={startDateTime || new Date()}
                    />
                  )}

                  {showEndTimePicker && (
                    <DateTimePicker
                      value={endDateTime || new Date()}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleEndTimeChange}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.inputSection}>
              <TouchableOpacity
                style={styles.virtualToggle}
                onPress={() =>
                  setNewEvent({ ...newEvent, is_virtual: !newEvent.is_virtual })
                }
              >
                <View
                  style={[
                    styles.checkbox,
                    newEvent.is_virtual && styles.checkboxActive,
                  ]}
                >
                  {newEvent.is_virtual && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.virtualToggleText}>Virtual Event</Text>
              </TouchableOpacity>
            </View>

            {newEvent.is_virtual ? (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Meeting Link</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://meet.google.com/..."
                  placeholderTextColor="#9CA3AF"
                  value={newEvent.meeting_link}
                  onChangeText={(text) =>
                    setNewEvent({ ...newEvent, meeting_link: text })
                  }
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter event location"
                  placeholderTextColor="#9CA3AF"
                  value={newEvent.location}
                  onChangeText={(text) =>
                    setNewEvent({ ...newEvent, location: text })
                  }
                />
              </View>
            )}

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Max Attendees (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter maximum number of attendees"
                placeholderTextColor="#9CA3AF"
                value={newEvent.max_attendees}
                onChangeText={(text) =>
                  setNewEvent({ ...newEvent, max_attendees: text })
                }
                keyboardType="numeric"
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
  placeholderButton: {
    width: 40,
    height: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#DC2626',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventTypeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  virtualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  virtualText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#3B82F6',
  },
  attendanceStatus: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#111827',
    marginBottom: 8,
  },
  eventDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#374151',
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  organizerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  attendanceButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  attendanceButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#374151',
  },
  attendanceButtonTextActive: {
    color: '#FFFFFF',
  },
  joinMeetingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  joinMeetingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  noEvents: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noEventsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#6B7280',
  },
  noEventsSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
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
  modalCreateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
  modalCreateTextDisabled: {
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
  textInput: {
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
  textAreaInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
  },
  typeOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  typeOptionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#6B7280',
  },
  virtualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  virtualToggleText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#374151',
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
});
