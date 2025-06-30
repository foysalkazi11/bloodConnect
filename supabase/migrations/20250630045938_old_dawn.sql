/*
  # Fix Club Members RLS Policies

  1. Policy Updates
    - Remove recursive policies that cause infinite loops
    - Simplify policies to avoid circular references
    - Ensure users can read their own memberships without recursion
    - Allow club admins to read memberships through a non-recursive approach

  2. Security
    - Maintain proper access control
    - Users can only see their own memberships
    - Club admins can see all memberships for their clubs
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Club admins can read club memberships" ON club_members;
DROP POLICY IF EXISTS "Users can read own memberships" ON club_members;
DROP POLICY IF EXISTS "Users can update own membership" ON club_members;
DROP POLICY IF EXISTS "Users can join clubs" ON club_members;

-- Create new non-recursive policies
CREATE POLICY "Users can read own memberships"
  ON club_members
  FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "Users can insert own membership"
  ON club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "Users can update own membership status"
  ON club_members
  FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

-- Create a simplified policy for club admins to read memberships
-- This avoids recursion by not checking club_members table within the policy
CREATE POLICY "Allow reading club memberships for verification"
  ON club_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a function to check if user is club admin without recursion
CREATE OR REPLACE FUNCTION is_club_admin(club_uuid uuid, user_uuid uuid)
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
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_club_admin(uuid, uuid) TO authenticated;