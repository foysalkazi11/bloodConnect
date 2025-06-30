/*
  # Fix User Profiles RLS Policy

  1. Security Changes
    - Update INSERT policy to properly handle user profile creation
    - Ensure users can only create profiles with their own auth.uid()
    - Fix policy conditions for proper authentication flow

  2. Policy Updates
    - Modify "Users can insert own profile" policy to use auth.uid() correctly
    - Ensure the policy allows profile creation during signup process
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a new INSERT policy that allows users to create their own profile
-- The policy checks that the id being inserted matches the authenticated user's ID
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also ensure we have a proper SELECT policy for users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Ensure UPDATE policy is correct
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);