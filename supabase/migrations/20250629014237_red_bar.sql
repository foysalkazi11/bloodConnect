/*
  # Email Verification and Enhanced Authentication

  1. Updates
    - Modify user profile policies to handle email verification
    - Add email verification status tracking
    - Update triggers for better user onboarding

  2. Security
    - Ensure profiles are only active after email verification
    - Add proper RLS policies for verified users
*/

-- Update the profile creation trigger to handle email verification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only create profile if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    INSERT INTO public.user_profiles (
      id, 
      email, 
      name, 
      user_type, 
      country, 
      is_available,
      phone,
      blood_group,
      district,
      police_station,
      state,
      city,
      address,
      website,
      description
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'user_type', 'donor'),
      COALESCE(NEW.raw_user_meta_data->>'country', 'BANGLADESH'),
      false, -- Always start as unavailable until email is verified
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'blood_group',
      NEW.raw_user_meta_data->>'district',
      NEW.raw_user_meta_data->>'police_station',
      NEW.raw_user_meta_data->>'state',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'website',
      NEW.raw_user_meta_data->>'description'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update public policies to only show verified users
DROP POLICY IF EXISTS "Public can read donor profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public can read club profiles" ON user_profiles;

-- Only show donors who are available AND have verified email
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

-- Only show clubs with verified email
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

-- Function to activate user after email verification
CREATE OR REPLACE FUNCTION public.activate_user_after_verification()
RETURNS trigger AS $$
BEGIN
  -- If email was just confirmed, activate donor availability
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.user_profiles 
    SET is_available = CASE 
      WHEN user_type = 'donor' THEN true 
      ELSE is_available 
    END,
    updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email verification activation
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.activate_user_after_verification();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.activate_user_after_verification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;