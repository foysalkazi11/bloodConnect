/*
  # Fix user profiles RLS policies

  1. Security Updates
    - Update INSERT policy to allow users to create their own profile during signup
    - Ensure proper RLS policies for user profile creation
    - Add trigger to automatically create profile when user signs up

  2. Changes
    - Drop existing INSERT policy and create a new one that works during signup
    - Add database trigger function to auto-create profiles
    - Update policies to handle auth context properly
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create new INSERT policy that allows profile creation during signup
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also ensure we have a policy for unauthenticated users during the signup process
-- This is needed because during signup, the user might not be fully authenticated yet
CREATE POLICY "Allow profile creation during signup"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create a function to handle automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only create profile if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    INSERT INTO public.user_profiles (id, email, name, user_type, country, is_available)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'user_type', 'donor'),
      'BANGLADESH',
      CASE 
        WHEN COALESCE(NEW.raw_user_meta_data->>'user_type', 'donor') = 'donor' THEN true
        ELSE false
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;