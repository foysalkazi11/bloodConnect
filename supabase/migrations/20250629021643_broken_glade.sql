/*
  # Fix RLS policies for user profile creation

  1. Security Updates
    - Update the profile creation policy to properly handle signup flow
    - Ensure both anonymous and authenticated users can create profiles during signup
    - Fix the policy conditions to work with the signup process

  2. Changes
    - Drop and recreate the problematic policy with correct conditions
    - Ensure the policy works for both initial signup and subsequent updates
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;

-- Create a new policy that properly handles profile creation during signup
CREATE POLICY "Allow profile creation during signup"
  ON user_profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure the policy for users to insert their own profile works correctly
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update the policy for users to update their own profile to handle upserts
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);