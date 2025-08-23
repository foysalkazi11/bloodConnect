-- Add donor-specific fields to user_profiles table
-- This migration adds last_donation and is_engaged fields for better donor tracking

-- Add last_donation column to track when donor last donated blood
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_donation timestamptz;

-- Add is_engaged column to track if donor is promised to someone for future donation
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_engaged boolean DEFAULT false;

-- Add comments to document the columns purpose
COMMENT ON COLUMN user_profiles.last_donation IS 'Date of last blood donation by the donor';
COMMENT ON COLUMN user_profiles.is_engaged IS 'Whether the donor has promised someone for a future blood donation';

-- Create index for better query performance on last_donation
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_donation ON user_profiles(last_donation);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_engaged ON user_profiles(is_engaged);

-- Update the handle_new_user function to include the new fields
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
      description,
      last_donation,
      is_engaged
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
      NEW.raw_user_meta_data->>'description',
      NULL, -- last_donation starts as null
      false -- is_engaged starts as false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
