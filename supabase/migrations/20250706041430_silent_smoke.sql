/*
  # Fix Club Display Policies

  1. Security Updates
    - Update RLS policies to allow all users to view all clubs
    - Fix permission issues for anonymous and authenticated users
    - Ensure proper access to club data regardless of user type

  2. Policy Changes
    - Allow public access to all club profiles
    - Ensure club visibility for all user types
    - Maintain security for sensitive operations
*/

-- Create a new policy to ensure all clubs are visible to everyone
CREATE POLICY "Allow everyone to read all club profiles"
  ON user_profiles
  FOR SELECT
  TO public
  USING (user_type = 'club');

-- Ensure the policy is properly applied
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;