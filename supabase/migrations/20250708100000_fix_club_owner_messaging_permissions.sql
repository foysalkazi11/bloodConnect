-- Fix RLS policy for club_messages to allow club owners to send messages

-- Drop the existing policy for sending messages
DROP POLICY IF EXISTS "Club members can send messages" ON club_messages;

-- Create updated policy that allows both club members and club owners to send messages
CREATE POLICY "Club members and owners can send messages"
  ON club_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    (
      -- Allow club members to send messages
      EXISTS (
        SELECT 1 FROM club_members cm 
        WHERE cm.club_id = club_messages.club_id 
        AND cm.member_id = auth.uid()
        AND cm.is_active = true
      )
      OR
      -- Allow club owners to send messages to their own club
      (
        club_messages.club_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
          AND up.user_type = 'club'
        )
      )
    )
  );

-- Also update the read policy to allow club owners to read messages
DROP POLICY IF EXISTS "Club members can read messages" ON club_messages;

CREATE POLICY "Club members and owners can read messages"
  ON club_messages
  FOR SELECT
  TO authenticated
  USING (
    -- Allow club members to read messages
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_messages.club_id 
      AND cm.member_id = auth.uid()
      AND cm.is_active = true
    )
    OR
    -- Allow club owners to read messages from their own club
    (
      club_messages.club_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.user_type = 'club'
      )
    )
  );

-- Update the presence policy to allow club owners to manage presence in their own club
DROP POLICY IF EXISTS "Club members can manage presence" ON club_member_presence;

CREATE POLICY "Club members and owners can manage presence"
  ON club_member_presence
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id AND
    (
      -- Allow club members to manage their presence
      EXISTS (
        SELECT 1 FROM club_members cm 
        WHERE cm.club_id = club_member_presence.club_id 
        AND cm.member_id = auth.uid()
        AND cm.is_active = true
      )
      OR
      -- Allow club owners to manage presence in their own club
      (
        club_member_presence.club_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
          AND up.user_type = 'club'
        )
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Allow club members to manage their presence
      EXISTS (
        SELECT 1 FROM club_members cm 
        WHERE cm.club_id = club_member_presence.club_id 
        AND cm.member_id = auth.uid()
        AND cm.is_active = true
      )
      OR
      -- Allow club owners to manage presence in their own club
      (
        club_member_presence.club_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
          AND up.user_type = 'club'
        )
      )
    )
  ); 