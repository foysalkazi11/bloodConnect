/*
  # Fix Club Members Insert Policy for Join Request Approval

  1. Policy Updates
    - Update the INSERT policy on club_members to properly handle join request approvals
    - Allow club admins and moderators to add new members when approving join requests

  2. Security
    - Maintain security by ensuring only authorized users can add members
    - Preserve existing functionality for self-joining
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Allow member insertion" ON club_members;

-- Create a new, more comprehensive INSERT policy
CREATE POLICY "Club admins and self can insert members"
  ON club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to add themselves (self-join scenario)
    (member_id = auth.uid())
    OR
    -- Allow club admins and moderators to add other users
    (
      EXISTS (
        SELECT 1
        FROM club_members cm
        WHERE cm.club_id = club_members.club_id
          AND cm.member_id = auth.uid()
          AND cm.role IN ('admin', 'moderator')
          AND cm.is_active = true
      )
    )
    OR
    -- Allow club owners (from user_profiles) to add members
    (
      EXISTS (
        SELECT 1
        FROM user_profiles up
        WHERE up.id = club_members.club_id
          AND up.id = auth.uid()
          AND up.user_type = 'club'
      )
    )
  );

-- Ensure the trigger function for handling approved join requests has proper permissions
-- Update the function to use security definer if it doesn't already
CREATE OR REPLACE FUNCTION handle_approved_join_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Insert the user as a member of the club
    INSERT INTO club_members (club_id, member_id, role, is_active)
    VALUES (NEW.club_id, NEW.user_id, 'member', true)
    ON CONFLICT (club_id, member_id) 
    DO UPDATE SET 
      is_active = true,
      role = EXCLUDED.role;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_join_request_status_change ON club_join_requests;
CREATE TRIGGER on_join_request_status_change
  AFTER UPDATE OF status ON club_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_approved_join_request();