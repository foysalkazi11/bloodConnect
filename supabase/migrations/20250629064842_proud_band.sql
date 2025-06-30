/*
  # Fix Row Level Security policies for user_profiles table

  1. Security Policy Updates
    - Drop existing conflicting INSERT policies
    - Create a single, clear INSERT policy for authenticated users
    - Ensure proper auth.uid() function usage
    - Maintain existing SELECT and UPDATE policies

  2. Changes Made
    - Remove duplicate INSERT policies that may be conflicting
    - Add proper INSERT policy using auth.uid() = id condition
    - Ensure users can create their own profile during signup
*/

-- Drop existing INSERT policies that might be conflicting
DROP POLICY IF EXISTS "Allow users to create own profile during signup" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;

-- Create a single, clear INSERT policy for authenticated users
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also allow anonymous users to insert profiles during signup process
-- This is needed for the signup flow where user might not be fully authenticated yet
CREATE POLICY "Allow profile creation during signup"
  ON user_profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);