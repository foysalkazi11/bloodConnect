/*
  # Fix club_members INSERT policy for join request approval

  1. Security Updates
    - Add policy to allow club admins/moderators to insert new members when approving join requests
    - This enables the join request approval trigger to work properly

  2. Changes
    - Create new INSERT policy for club admins and moderators
    - Allows insertion of new members by users with admin/moderator roles in the target club
*/

-- Drop existing restrictive INSERT policy if it exists
DROP POLICY IF EXISTS "Users can join clubs" ON club_members;

-- Create comprehensive INSERT policy that allows both self-joining and admin approval
CREATE POLICY "Allow member insertion" ON club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to join clubs themselves (self-insertion)
    (member_id = auth.uid())
    OR
    -- Allow club admins and moderators to add new members (for join request approval)
    (
      auth.uid() IN (
        SELECT cm.member_id 
        FROM club_members cm 
        WHERE cm.club_id = club_members.club_id 
        AND cm.role IN ('admin', 'moderator') 
        AND cm.is_active = true
      )
    )
  );