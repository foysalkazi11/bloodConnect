/*
  # Fix Null User Profiles in Club Members and Join Requests

  1. Problem
    - User profiles are coming back as null in club members and join requests
    - This causes rendering errors in the frontend
    - The issue is with how the data is being queried and joined

  2. Solution
    - Create helper functions to safely fetch user profile data
    - Update the get_join_requests function to handle null profiles
    - Create a new function to get club members with profile data
    - Ensure proper error handling for null values
*/

-- Create a function to safely get club members with profile data
CREATE OR REPLACE FUNCTION get_club_members(club_id_param uuid)
RETURNS TABLE (
  id uuid,
  role text,
  joined_at timestamptz,
  member_id uuid,
  member_name text,
  member_email text,
  member_blood_group text,
  member_phone text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.role,
    cm.joined_at,
    cm.member_id,
    up.name AS member_name,
    up.email AS member_email,
    up.blood_group AS member_blood_group,
    up.phone AS member_phone
  FROM 
    club_members cm
  LEFT JOIN 
    user_profiles up ON cm.member_id = up.id
  WHERE 
    cm.club_id = club_id_param
    AND cm.is_active = true;
END;
$$;

-- Update the get_join_requests function to better handle null profiles
CREATE OR REPLACE FUNCTION get_join_requests(club_id_param uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  message text,
  status text,
  created_at timestamptz,
  user_name text,
  user_email text,
  user_blood_group text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cjr.id,
    cjr.user_id,
    cjr.message,
    cjr.status,
    cjr.created_at,
    COALESCE(up.name, 'Unknown User') AS user_name,
    COALESCE(up.email, 'No email') AS user_email,
    up.blood_group
  FROM 
    club_join_requests cjr
  LEFT JOIN 
    user_profiles up ON cjr.user_id = up.id
  WHERE 
    cjr.club_id = club_id_param
    AND cjr.status = 'pending';
END;
$$;

-- Create a helper function to check if a user exists
CREATE OR REPLACE FUNCTION user_exists(user_id_param uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = user_id_param
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_club_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_join_requests(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_exists(uuid) TO authenticated;

-- Update the handle_approved_join_request function to better handle errors
CREATE OR REPLACE FUNCTION handle_approved_join_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_profile_exists boolean;
BEGIN
  -- Check if the user profile exists
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = NEW.user_id
  ) INTO user_profile_exists;

  -- Only proceed if status changed to 'approved' and user profile exists
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND user_profile_exists THEN
    -- Insert the user as a member of the club
    INSERT INTO club_members (club_id, member_id, role, is_active)
    VALUES (NEW.club_id, NEW.user_id, 'member', true)
    ON CONFLICT (club_id, member_id) 
    DO UPDATE SET 
      is_active = true,
      role = EXCLUDED.role;
      
    -- Create notification for the user
    INSERT INTO club_notifications (
      club_id, 
      user_id, 
      type, 
      title, 
      message
    )
    VALUES (
      NEW.club_id,
      NEW.user_id,
      'new_member',
      'Join Request Approved',
      'Your request to join the club has been approved. Welcome to the club!'
    );
  END IF;
  
  RETURN NEW;
END;
$$;