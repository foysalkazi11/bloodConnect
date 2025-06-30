/*
  # Fix user profile creation permissions

  1. Security Updates
    - Update RLS policies to allow profile creation during signup
    - Ensure authenticated users can create their own profiles
    - Fix permission issues for new user registration

  2. Policy Changes
    - Update existing policies to handle signup flow properly
    - Add proper permissions for profile creation
*/

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a comprehensive policy for profile creation that works during signup
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the policy for reading own profile exists and is correct
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Ensure the policy for updating own profile exists and is correct
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also ensure we have proper policies for public access to verified profiles
DROP POLICY IF EXISTS "Public can read verified donor profiles" ON user_profiles;
CREATE POLICY "Public can read verified donor profiles"
  ON user_profiles
  FOR SELECT
  TO public
  USING (
    user_type = 'donor' 
    AND is_available = true 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = user_profiles.id 
      AND auth.users.email_confirmed_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public can read verified club profiles" ON user_profiles;
CREATE POLICY "Public can read verified club profiles"
  ON user_profiles
  FOR SELECT
  TO public
  USING (
    user_type = 'club' 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = user_profiles.id 
      AND auth.users.email_confirmed_at IS NOT NULL
    )
  );