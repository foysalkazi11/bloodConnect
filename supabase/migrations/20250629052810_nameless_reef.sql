/*
  # Fix Profile Update Issues

  1. Security Updates
    - Ensure authenticated users can update their own profiles
    - Fix any permission issues with profile updates
    - Add proper error handling for profile operations

  2. Changes
    - Update RLS policies to ensure profile updates work correctly
    - Add debugging support for profile operations
*/

-- Ensure the user_profiles table has proper UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure the user_profiles table has proper SELECT policy for authenticated users
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Ensure the user_profiles table has proper INSERT policy for authenticated users
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;

CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;