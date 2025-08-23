import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    //detectSessionInUrl: false,
    detectSessionInUrl: Platform.OS === 'web',
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
  avatar_url?: string;
  last_donation?: string; // Date of last blood donation by the donor
  is_engaged?: boolean; // Whether the donor has promised someone for a future blood donation
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
