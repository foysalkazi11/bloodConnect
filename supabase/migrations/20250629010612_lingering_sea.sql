/*
  # Fix user_profiles INSERT policy

  1. Security Policy Updates
    - Drop the existing INSERT policy that uses incorrect uid() function
    - Create new INSERT policy using correct auth.uid() function
    - Ensure authenticated users can create their own profiles during signup

  2. Changes Made
    - Replace uid() with auth.uid() in the INSERT policy
    - Maintain security by ensuring users can only create profiles for themselves
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create new INSERT policy with correct auth.uid() function
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);