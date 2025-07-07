/*
  # Club Management System Fixes

  1. Security Updates
    - Fix RLS policies for club members and join requests
    - Add proper access control for club management features
    - Ensure club owners have full access to their clubs

  2. Changes
    - Add owner_id field to clubs table for better ownership tracking
    - Update club member role management policies
    - Fix join request handling
*/

-- Add owner_id to clubs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clubs' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE clubs ADD COLUMN owner_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create function to check if user is club owner
CREATE OR REPLACE FUNCTION is_club_owner(club_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = club_uuid AND user_type = 'club' AND id = user_uuid
  );
$$;

-- Create function to check if user is club admin
CREATE OR REPLACE FUNCTION is_club_admin_or_mod(club_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM club_members 
    WHERE club_id = club_uuid 
      AND member_id = user_uuid 
      AND role IN ('admin', 'moderator') 
      AND is_active = true
  ) OR is_club_owner(club_uuid, user_uuid);
$$;

-- Create function to check if user is club member
CREATE OR REPLACE FUNCTION is_club_member(club_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM club_members 
    WHERE club_id = club_uuid 
      AND member_id = user_uuid 
      AND is_active = true
  ) OR is_club_owner(club_uuid, user_uuid);
$$;

-- Update club_members policies
DROP POLICY IF EXISTS "Users can read own memberships" ON club_members;
DROP POLICY IF EXISTS "Allow reading club memberships for verification" ON club_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON club_members;
DROP POLICY IF EXISTS "Users can update own membership status" ON club_members;

-- Create new policies for club_members
CREATE POLICY "Users can read own memberships"
  ON club_members
  FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "Club members can read all memberships"
  ON club_members
  FOR SELECT
  TO authenticated
  USING (is_club_member(club_id, auth.uid()));

CREATE POLICY "Users can join clubs"
  ON club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "Club admins can manage members"
  ON club_members
  FOR UPDATE
  TO authenticated
  USING (is_club_admin_or_mod(club_id, auth.uid()) OR member_id = auth.uid());

-- Update club_join_requests policies
DROP POLICY IF EXISTS "Users can view their own join requests" ON club_join_requests;
DROP POLICY IF EXISTS "Club admins can view join requests" ON club_join_requests;
DROP POLICY IF EXISTS "Club admins can update join requests" ON club_join_requests;

CREATE POLICY "Users can view their own join requests"
  ON club_join_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Club admins can view join requests"
  ON club_join_requests
  FOR SELECT
  TO authenticated
  USING (is_club_admin_or_mod(club_id, auth.uid()));

CREATE POLICY "Club admins can update join requests"
  ON club_join_requests
  FOR UPDATE
  TO authenticated
  USING (is_club_admin_or_mod(club_id, auth.uid()));

-- Update club_events policies
DROP POLICY IF EXISTS "Club members can read events" ON club_events;
CREATE POLICY "Club members can read events"
  ON club_events
  FOR SELECT
  TO authenticated
  USING (is_club_member(club_id, auth.uid()));

-- Update club_announcements policies
DROP POLICY IF EXISTS "Club members can read announcements" ON club_announcements;
CREATE POLICY "Club members can read announcements"
  ON club_announcements
  FOR SELECT
  TO authenticated
  USING (is_club_member(club_id, auth.uid()));

-- Update club_messages policies
DROP POLICY IF EXISTS "Club members can read messages" ON club_messages;
CREATE POLICY "Club members can read messages"
  ON club_messages
  FOR SELECT
  TO authenticated
  USING (is_club_member(club_id, auth.uid()));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_club_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_club_admin_or_mod(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_club_member(uuid, uuid) TO authenticated;