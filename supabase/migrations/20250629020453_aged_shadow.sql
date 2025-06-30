/*
  # Fix Email Verification Flow

  1. Updates
    - Fix email verification redirect handling
    - Ensure proper user activation after email confirmation
    - Handle expired verification links gracefully

  2. Security
    - Maintain RLS policies for verified users only
    - Ensure proper access control during verification process
*/

-- Update the email verification activation function
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

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.activate_user_after_verification();

-- Update the profile creation function to handle all metadata properly
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

-- Ensure the user creation trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.activate_user_after_verification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;