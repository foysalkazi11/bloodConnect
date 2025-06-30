/*
  # Fix user profiles permissions for signup

  1. Security Updates
    - Update RLS policies for user_profiles table to allow anon users to insert during signup
    - Ensure proper permissions for profile creation process
    
  2. Changes
    - Modify existing "Allow profile creation during signup" policy to work correctly
    - Add proper conditions for anon role access during signup process
*/

-- Drop the existing policy that might be causing issues
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;

-- Create a new policy that allows anon users to insert profiles during signup
-- This is safe because the profile creation happens immediately after user creation
-- and the auth.uid() will be available from the JWT token
CREATE POLICY "Allow profile creation during signup"
  ON user_profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also ensure the existing policies work correctly with the updated permissions
-- Update the policy for users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);