/*
  # Fix user_profiles INSERT policy for user registration

  1. Policy Changes
    - Drop the existing restrictive INSERT policy
    - Create a new INSERT policy that allows authenticated users to insert their own profile
    - Ensure the policy correctly handles the user ID from auth.uid()

  2. Security
    - Maintains security by only allowing users to insert their own profile
    - Uses auth.uid() to verify the user is inserting their own data
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a new INSERT policy that properly handles user registration
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

-- Ensure UPDATE policy exists and is correct
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);