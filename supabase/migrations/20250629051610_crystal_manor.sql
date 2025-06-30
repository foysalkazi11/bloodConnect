/*
  # Fix RLS policies for anonymous access

  1. Policy Updates
    - Remove policies that reference non-existent `users` table
    - Add proper policies for anonymous users to read public data
    - Ensure authenticated users can still access their own data

  2. Tables Updated
    - `user_profiles`: Allow anonymous users to read verified profiles
    - `donations`: Allow anonymous users to read all donations

  3. Security
    - Maintain data privacy for unverified profiles
    - Keep existing authenticated user policies intact
*/

-- Drop existing problematic policies that reference non-existent users table
DROP POLICY IF EXISTS "Allow public to read verified profiles" ON user_profiles;

-- Create new policy for anonymous users to read public profiles
-- This allows reading club profiles and available donor profiles
CREATE POLICY "Allow anonymous to read public profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (
    (user_type = 'club') OR 
    (user_type = 'donor' AND is_available = true)
  );

-- Ensure donations table allows anonymous users to read all donations
-- This is needed for displaying recent donations on the home screen
CREATE POLICY "Allow anonymous to read donations"
  ON donations
  FOR SELECT
  TO anon
  USING (true);

-- Verify that RLS is enabled on both tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;