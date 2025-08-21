-- Add avatar_url column to user_profiles table for social auth profile images
-- This migration adds support for storing social authentication profile images

-- Add avatar_url column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add comment to document the column purpose
COMMENT ON COLUMN user_profiles.avatar_url IS 'URL to user profile image from social authentication (Google, Facebook, etc.) or uploaded by user';

-- Update the updated_at trigger to include the new column if it exists
-- This ensures that any update to avatar_url also updates the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
