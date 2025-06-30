/*
  # Fix user profiles INSERT policy

  1. Security Changes
    - Update the INSERT policy for user_profiles table to properly handle new user registration
    - Ensure authenticated users can insert their own profile during signup process
    - Maintain security by only allowing users to create profiles with their own auth.uid()

  2. Policy Updates
    - Drop existing INSERT policy that may be too restrictive
    - Create new INSERT policy that works correctly during signup flow
    - Ensure the policy allows profile creation immediately after user authentication
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a new INSERT policy that properly handles the signup flow
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Ensure the policy is properly applied by refreshing the table's RLS
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;