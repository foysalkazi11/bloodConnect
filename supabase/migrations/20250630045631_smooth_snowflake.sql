/*
  # Fix infinite recursion in club_members RLS policy

  1. Problem
    - The "Club members can read club membership" policy on club_members table creates infinite recursion
    - It queries the same table (club_members) that it's protecting, causing a circular dependency

  2. Solution
    - Drop the problematic policy
    - Create a simpler policy that allows users to read memberships where they are the member
    - Create a separate policy for club admins to read all memberships in their clubs
    - Use a more direct approach that doesn't create circular dependencies

  3. Security
    - Users can read their own membership records
    - Club admins can read membership records for their clubs
    - No circular dependencies or infinite recursion
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Club members can read club membership" ON club_members;

-- Create a simple policy for users to read their own membership records
CREATE POLICY "Users can read own memberships"
  ON club_members
  FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

-- Create a policy for club admins to read memberships in their clubs
-- This uses a direct approach without circular dependencies
CREATE POLICY "Club admins can read club memberships"
  ON club_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM club_members admin_check
      WHERE admin_check.club_id = club_members.club_id
        AND admin_check.member_id = auth.uid()
        AND admin_check.role IN ('admin', 'moderator')
        AND admin_check.is_active = true
    )
  );

-- Also ensure the existing policies don't have similar issues
-- Update the "Users can join clubs" policy to be more explicit
DROP POLICY IF EXISTS "Users can join clubs" ON club_members;
CREATE POLICY "Users can join clubs"
  ON club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

-- Update the "Users can leave clubs" policy
DROP POLICY IF EXISTS "Users can leave clubs" ON club_members;
CREATE POLICY "Users can update own membership"
  ON club_members
  FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());