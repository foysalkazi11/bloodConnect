/*
  # Fix User Profiles RLS Policies

  1. Security Updates
    - Add policy for anonymous users to create profiles during sign-up
    - Ensure authenticated users can update their own profiles
    - Maintain existing policies for reading profiles

  2. Changes
    - Add "Allow anon to create own profile" policy for INSERT operations
    - Ensure "Users can update own profile" policy covers all necessary updates
    - Keep existing read policies intact

  This fixes the "permission denied for table users" error during sign-up.
*/

-- Allow anonymous users to create their own profile during sign-up
CREATE POLICY "Allow anon to create own profile"
  ON user_profiles
  FOR INSERT
  TO anon
  WITH CHECK (auth.uid() = id);

-- Ensure the existing update policy is properly configured
-- (This should already exist but we're making sure it's correct)
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);