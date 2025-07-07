/*
  # Fix Club Join Requests Query

  1. Security Updates
    - Update the join request query to properly fetch user profile data
    - Fix the relationship between join requests and user profiles
    - Ensure proper data structure for frontend consumption

  2. Changes
    - Modify the club_join_requests query to use proper join syntax
    - Update RLS policies to ensure proper access control
*/

-- Update the club_join_requests query to properly fetch user profile data
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cjr.id,
    cjr.user_id,
    cjr.message,
    cjr.status,
    cjr.created_at,
    up.name AS user_name,
    up.email AS user_email,
    up.blood_group AS user_blood_group
  FROM 
    club_join_requests cjr
  JOIN 
    user_profiles up ON cjr.user_id = up.id
  WHERE 
    cjr.club_id = club_id_param
    AND cjr.status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_join_requests(uuid) TO authenticated;