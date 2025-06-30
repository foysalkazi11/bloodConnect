/*
  # Fix RLS policies for user profile creation during signup

  1. Security Updates
    - Update the anonymous INSERT policy to properly allow profile creation during signup
    - Ensure the policy checks that the user ID matches the authenticated user ID
    - Keep existing policies for other operations intact

  2. Changes Made
    - Drop the existing anonymous INSERT policy that has incorrect conditions
    - Create a new policy that allows both anonymous and authenticated users to insert their own profile
    - This fixes the signup flow where users need to create profiles before email verification
*/

-- Drop the existing problematic anonymous insert policy
DROP POLICY IF EXISTS "Allow anon to create own profile" ON user_profiles;

-- Create a new policy that allows profile creation during signup
-- This policy allows both anonymous and authenticated users to insert profiles
-- but only for their own user ID (matching auth.uid())
CREATE POLICY "Allow users to create own profile during signup"
  ON user_profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the existing policies for other operations remain intact
-- (The SELECT, UPDATE policies should already exist and work correctly)