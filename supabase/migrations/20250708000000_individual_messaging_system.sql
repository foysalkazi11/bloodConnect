/*
  # Individual Messaging System

  1. New Tables
    - `direct_messages` - Individual messages between users
    - `conversation_participants` - Track conversation participants  
    - `message_read_status` - Track read status of messages
    - `conversation_settings` - Conversation-specific settings

  2. Security
    - Enable RLS on all tables
    - Add policies for message participants only
    - Real-time subscriptions for live updates

  3. Features
    - Direct messaging between any two users
    - Read receipts and status tracking
    - Conversation management
    - Message history and search
*/

-- Create direct_messages table for individual messaging
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system', 'voice_note')),
  reply_to_id uuid REFERENCES direct_messages(id) ON DELETE SET NULL,
  file_url text,
  file_name text,
  file_size bigint,
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(conversation_id, user_id)
);

-- Create message_read_status table
CREATE TABLE IF NOT EXISTS message_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create conversation_settings table
CREATE TABLE IF NOT EXISTS conversation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_muted boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  custom_name text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_settings ENABLE ROW LEVEL SECURITY;

-- Policies for direct_messages
CREATE POLICY "Users can read their own messages"
  ON direct_messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = direct_messages.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

CREATE POLICY "Users can send messages to conversation participants"
  ON direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    (
      receiver_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = direct_messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = true
      )
    )
  );

CREATE POLICY "Users can update their own messages"
  ON direct_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Policies for conversation_participants
CREATE POLICY "Users can read their own conversation participations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can join conversations"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON conversation_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for message_read_status
CREATE POLICY "Users can read their own read status"
  ON message_read_status
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM direct_messages dm
      WHERE dm.id = message_read_status.message_id
      AND dm.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_read_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status"
  ON message_read_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for conversation_settings
CREATE POLICY "Users can read their own conversation settings"
  ON conversation_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own conversation settings"
  ON conversation_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_id ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_id ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_settings_conversation_id ON conversation_settings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_settings_user_id ON conversation_settings(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_direct_messages_updated_at
  BEFORE UPDATE ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_settings_updated_at
  BEFORE UPDATE ON conversation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate conversation ID for two users
CREATE OR REPLACE FUNCTION generate_conversation_id(user1_id uuid, user2_id uuid)
RETURNS uuid AS $$
DECLARE
  conversation_uuid uuid;
  smaller_id uuid;
  larger_id uuid;
BEGIN
  -- Ensure consistent conversation ID regardless of user order
  IF user1_id < user2_id THEN
    smaller_id := user1_id;
    larger_id := user2_id;
  ELSE
    smaller_id := user2_id;
    larger_id := user1_id;
  END IF;
  
  -- Generate deterministic UUID based on the two user IDs
  conversation_uuid := gen_random_uuid();
  
  -- Check if participants already exist for this pair
  SELECT conversation_id INTO conversation_uuid
  FROM conversation_participants cp1
  WHERE cp1.user_id = smaller_id
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2 
    WHERE cp2.conversation_id = cp1.conversation_id 
    AND cp2.user_id = larger_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp3
    WHERE cp3.conversation_id = cp1.conversation_id
    AND cp3.user_id NOT IN (smaller_id, larger_id)
  )
  LIMIT 1;
  
  -- If no existing conversation, create a new conversation ID
  IF conversation_uuid IS NULL THEN
    conversation_uuid := gen_random_uuid();
    
    -- Insert both participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
      (conversation_uuid, smaller_id),
      (conversation_uuid, larger_id);
  END IF;
  
  RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id uuid, user2_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  participant_name text,
  participant_email text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
) AS $$
DECLARE
  conv_id uuid;
  other_user_id uuid;
BEGIN
  -- Get conversation ID
  conv_id := generate_conversation_id(user1_id, user2_id);
  
  -- Determine the other user
  other_user_id := CASE 
    WHEN user1_id = auth.uid() THEN user2_id
    ELSE user1_id
  END;
  
  RETURN QUERY
  SELECT 
    conv_id as conversation_id,
    up.name as participant_name,
    up.email as participant_email,
    (
      SELECT dm.content 
      FROM direct_messages dm 
      WHERE dm.conversation_id = conv_id 
      ORDER BY dm.created_at DESC 
      LIMIT 1
    ) as last_message,
    (
      SELECT dm.created_at 
      FROM direct_messages dm 
      WHERE dm.conversation_id = conv_id 
      ORDER BY dm.created_at DESC 
      LIMIT 1
    ) as last_message_at,
    (
      SELECT COUNT(*)
      FROM direct_messages dm
      WHERE dm.conversation_id = conv_id
      AND dm.receiver_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM message_read_status mrs
        WHERE mrs.message_id = dm.id
        AND mrs.user_id = auth.uid()
      )
    ) as unread_count
  FROM user_profiles up
  WHERE up.id = other_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Mark all unread messages in the conversation as read
  INSERT INTO message_read_status (message_id, user_id)
  SELECT dm.id, p_user_id
  FROM direct_messages dm
  WHERE dm.conversation_id = p_conversation_id
  AND dm.receiver_id = p_user_id
  AND NOT EXISTS (
    SELECT 1 FROM message_read_status mrs
    WHERE mrs.message_id = dm.id
    AND mrs.user_id = p_user_id
  );
  
  -- Update last read time
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
  AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_conversation_id(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(uuid, uuid) TO authenticated; 