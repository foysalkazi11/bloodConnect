/*
  # Fix RLS Permissions for Public Access

  1. Security Updates
    - Update RLS policies to allow public read access to verified profiles
    - Fix permission issues for anonymous users
    - Ensure proper access to donations data

  2. Policy Changes
    - Allow anonymous users to read verified donor and club profiles
    - Allow anonymous users to read donation statistics
    - Maintain security for sensitive user data
*/

-- Drop existing restrictive policies that are causing issues
DROP POLICY IF EXISTS "Public can read verified club profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public can read verified donor profiles" ON user_profiles;

-- Create new policies that work with the current authentication state
CREATE POLICY "Allow public to read verified profiles"
  ON user_profiles
  FOR SELECT
  TO public
  USING (
    -- Allow reading profiles that are verified and either:
    -- 1. Club profiles (always visible when verified)
    -- 2. Donor profiles that are available
    (
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = user_profiles.id 
        AND auth.users.email_confirmed_at IS NOT NULL
      )
      AND (
        (user_type = 'club') OR 
        (user_type = 'donor' AND is_available = true)
      )
    )
    OR
    -- Allow users to always read their own profile
    (auth.uid() = id)
  );

-- Ensure donations table has proper public read access
DROP POLICY IF EXISTS "Public can read donations" ON donations;

CREATE POLICY "Allow public to read donations"
  ON donations
  FOR SELECT
  TO public
  USING (true);

-- Update clubs table to allow public read access
DROP POLICY IF EXISTS "Anyone can read clubs" ON clubs;

CREATE POLICY "Allow public to read clubs"
  ON clubs
  FOR SELECT
  TO public
  USING (true);

-- Ensure the policies are properly applied
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;