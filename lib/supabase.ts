import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://ctuspyegqmzgjnhnerqt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dXNweWVncW16Z2puaG5lcnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTMyMDIsImV4cCI6MjA2NjY4OTIwMn0.5N4FFsYwDpcYaAxKz3n31N7rfz1yBTSMeosMAWWssuw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { detectSessionInUrl: false } : {}),
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  blood_group?: string;
  user_type: 'donor' | 'club';
  country: string;
  district?: string;
  police_station?: string;
  state?: string;
  city?: string;
  address?: string;
  website?: string;
  description?: string;
  is_available?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  name: string;
  description?: string;
  website?: string;
  country: string;
  district?: string;
  police_station?: string;
  state?: string;
  city?: string;
  address?: string;
  total_members: number;
  total_donations: number;
  founded_year: number;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  donor_id: string;
  recipient_info?: string;
  location: string;
  donation_date: string;
  blood_group: string;
  notes?: string;
  created_at: string;
}