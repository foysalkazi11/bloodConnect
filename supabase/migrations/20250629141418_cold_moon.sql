/*
  # Club Communication System

  1. New Tables
    - `club_messages` - Real-time chat messages
    - `club_message_reactions` - Message reactions/emojis
    - `club_voice_channels` - Voice/video call channels
    - `club_announcements` - Important announcements
    - `club_events` - Club events and meetings
    - `club_member_presence` - Online/offline status

  2. Security
    - Enable RLS on all tables
    - Add policies for club members only
    - Real-time subscriptions for live updates

  3. Features
    - Real-time messaging
    - Voice/video calls
    - Announcements with priorities
    - Event scheduling
    - Member presence tracking
    - Message reactions
    - File sharing
*/

-- Create club_messages table for real-time chat
CREATE TABLE IF NOT EXISTS club_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system', 'voice_note')),
  reply_to_id uuid REFERENCES club_messages(id) ON DELETE SET NULL,
  file_url text,
  file_name text,
  file_size bigint,
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create club_message_reactions table
CREATE TABLE IF NOT EXISTS club_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES club_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create club_voice_channels table
CREATE TABLE IF NOT EXISTS club_voice_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  max_participants integer DEFAULT 50,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create club_voice_participants table
CREATE TABLE IF NOT EXISTS club_voice_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES club_voice_channels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_muted boolean DEFAULT false,
  is_video_on boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Create club_announcements table
CREATE TABLE IF NOT EXISTS club_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  author_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_pinned boolean DEFAULT false,
  event_date timestamptz,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create club_events table
CREATE TABLE IF NOT EXISTS club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  organizer_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'blood_drive', 'training', 'social', 'other')),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  max_attendees integer,
  is_virtual boolean DEFAULT false,
  meeting_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create club_event_attendees table
CREATE TABLE IF NOT EXISTS club_event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES club_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create club_member_presence table
CREATE TABLE IF NOT EXISTS club_member_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen timestamptz DEFAULT now(),
  is_typing boolean DEFAULT false,
  typing_in_channel text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Enable RLS
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_voice_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_voice_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_member_presence ENABLE ROW LEVEL SECURITY;

-- Policies for club_messages
CREATE POLICY "Club members can read messages"
  ON club_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_messages.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Club members can send messages"
  ON club_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_messages.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Authors can update own messages"
  ON club_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Policies for club_message_reactions
CREATE POLICY "Club members can read reactions"
  ON club_message_reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_messages cm
      JOIN club_members cmb ON cm.club_id = cmb.club_id
      WHERE cm.id = club_message_reactions.message_id
      AND cmb.member_id = auth.uid()
      AND cmb.is_active = true
    )
  );

CREATE POLICY "Club members can add reactions"
  ON club_message_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM club_messages cm
      JOIN club_members cmb ON cm.club_id = cmb.club_id
      WHERE cm.id = club_message_reactions.message_id
      AND cmb.member_id = auth.uid()
      AND cmb.is_active = true
    )
  );

CREATE POLICY "Users can remove own reactions"
  ON club_message_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for club_voice_channels
CREATE POLICY "Club members can read voice channels"
  ON club_voice_channels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_voice_channels.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Club admins can manage voice channels"
  ON club_voice_channels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_voice_channels.club_id 
      AND cm.member_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
      AND cm.is_active = true
    )
  );

-- Policies for club_announcements
CREATE POLICY "Club members can read announcements"
  ON club_announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_announcements.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Club admins can create announcements"
  ON club_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_announcements.club_id 
      AND cm.member_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
      AND cm.is_active = true
    )
  );

CREATE POLICY "Authors can update own announcements"
  ON club_announcements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Policies for club_events
CREATE POLICY "Club members can read events"
  ON club_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_events.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Club members can create events"
  ON club_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_events.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Organizers can update own events"
  ON club_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

-- Policies for club_event_attendees
CREATE POLICY "Club members can read event attendees"
  ON club_event_attendees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_events ce
      JOIN club_members cm ON ce.club_id = cm.club_id
      WHERE ce.id = club_event_attendees.event_id
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Club members can manage own attendance"
  ON club_event_attendees
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for club_member_presence
CREATE POLICY "Club members can read presence"
  ON club_member_presence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_member_presence.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Users can update own presence"
  ON club_member_presence
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_club_messages_club_id ON club_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_club_messages_created_at ON club_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_messages_sender_id ON club_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_club_message_reactions_message_id ON club_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_club_announcements_club_id ON club_announcements(club_id);
CREATE INDEX IF NOT EXISTS idx_club_announcements_created_at ON club_announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_events_club_id ON club_events(club_id);
CREATE INDEX IF NOT EXISTS idx_club_events_start_time ON club_events(start_time);
CREATE INDEX IF NOT EXISTS idx_club_member_presence_club_id ON club_member_presence(club_id);
CREATE INDEX IF NOT EXISTS idx_club_member_presence_updated_at ON club_member_presence(updated_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_club_messages_updated_at
  BEFORE UPDATE ON club_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_announcements_updated_at
  BEFORE UPDATE ON club_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_events_updated_at
  BEFORE UPDATE ON club_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_member_presence_updated_at
  BEFORE UPDATE ON club_member_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update member presence
CREATE OR REPLACE FUNCTION update_member_presence(
  p_club_id uuid,
  p_user_id uuid,
  p_status text DEFAULT 'online'
)
RETURNS void AS $$
BEGIN
  INSERT INTO club_member_presence (club_id, user_id, status, last_seen, updated_at)
  VALUES (p_club_id, p_user_id, p_status, now(), now())
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    last_seen = EXCLUDED.last_seen,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle typing indicators
CREATE OR REPLACE FUNCTION set_typing_status(
  p_club_id uuid,
  p_user_id uuid,
  p_is_typing boolean,
  p_channel text DEFAULT 'general'
)
RETURNS void AS $$
BEGIN
  INSERT INTO club_member_presence (club_id, user_id, is_typing, typing_in_channel, updated_at)
  VALUES (p_club_id, p_user_id, p_is_typing, p_channel, now())
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET
    is_typing = EXCLUDED.is_typing,
    typing_in_channel = EXCLUDED.typing_in_channel,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_member_presence(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_typing_status(uuid, uuid, boolean, text) TO authenticated;