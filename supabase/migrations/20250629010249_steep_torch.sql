/*
  # Create user profiles and related tables

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique, not null)
      - `name` (text, not null)
      - `phone` (text, optional)
      - `blood_group` (text, optional)
      - `user_type` (text, not null, check constraint for 'donor' or 'club')
      - `country` (text, not null)
      - `district` (text, optional)
      - `police_station` (text, optional)
      - `state` (text, optional)
      - `city` (text, optional)
      - `address` (text, optional)
      - `website` (text, optional)
      - `description` (text, optional)
      - `is_available` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `clubs`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text, optional)
      - `website` (text, optional)
      - `country` (text, not null)
      - `district` (text, optional)
      - `police_station` (text, optional)
      - `state` (text, optional)
      - `city` (text, optional)
      - `address` (text, optional)
      - `total_members` (integer, default 0)
      - `total_donations` (integer, default 0)
      - `founded_year` (integer, not null)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `donations`
      - `id` (uuid, primary key)
      - `donor_id` (uuid, references user_profiles.id)
      - `recipient_info` (text, optional)
      - `location` (text, not null)
      - `donation_date` (timestamptz, not null)
      - `blood_group` (text, not null)
      - `notes` (text, optional)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public read access where appropriate
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  blood_group text,
  user_type text NOT NULL CHECK (user_type IN ('donor', 'club')),
  country text NOT NULL,
  district text,
  police_station text,
  state text,
  city text,
  address text,
  website text,
  description text,
  is_available boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  website text,
  country text NOT NULL,
  district text,
  police_station text,
  state text,
  city text,
  address text,
  total_members integer DEFAULT 0,
  total_donations integer DEFAULT 0,
  founded_year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_info text,
  location text NOT NULL,
  donation_date timestamptz NOT NULL,
  blood_group text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can read donor profiles"
  ON user_profiles
  FOR SELECT
  TO public
  USING (user_type = 'donor' AND is_available = true);

CREATE POLICY "Public can read club profiles"
  ON user_profiles
  FOR SELECT
  TO public
  USING (user_type = 'club');

-- Create policies for clubs
CREATE POLICY "Anyone can read clubs"
  ON clubs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert clubs"
  ON clubs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clubs"
  ON clubs
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for donations
CREATE POLICY "Users can read own donations"
  ON donations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = donor_id);

CREATE POLICY "Users can insert own donations"
  ON donations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = donor_id);

CREATE POLICY "Users can update own donations"
  ON donations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = donor_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_blood_group ON user_profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_available ON user_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_blood_group ON donations(blood_group);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON donations(donation_date);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();