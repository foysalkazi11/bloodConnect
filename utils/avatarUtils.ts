import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/lib/supabase';

/**
 * Get the profile image URL with priority order:
 * 1. Profile avatar_url (saved from social auth)
 * 2. User metadata avatar (for newly signed-in users)
 * 3. Generated avatar based on user ID
 */
export const getProfileImageUrl = (
  user: User | null,
  profile: UserProfile | null,
  size = 200
): string => {
  // Prioritize social auth avatar URL from profile
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }

  // Fallback to user metadata avatar (for newly signed-in users)
  if (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) {
    return user.user_metadata.avatar_url || user.user_metadata.picture;
  }

  // Generate a consistent avatar based on user ID as final fallback
  const avatarId = user?.id
    ? (parseInt(user.id.slice(-3), 16) % 1000) + 1
    : 220453;
  return `https://images.pexels.com/photos/${avatarId}/pexels-photo-${avatarId}.jpeg?auto=compress&cs=tinysrgb&w=${size}&h=${size}&fit=crop`;
};

/**
 * Get profile image URL for any user (including other users in lists)
 * This is for displaying other users' avatars in search results, member lists, etc.
 */
export const getAvatarUrl = (
  userProfile: { id?: string; avatar_url?: string; name?: string } | null,
  size = 200
): string => {
  // If user has avatar_url from their profile, use it
  if (userProfile?.avatar_url) {
    return userProfile.avatar_url;
  }

  // Generate a consistent avatar based on user ID as fallback
  const avatarId = userProfile?.id
    ? (parseInt(userProfile.id.slice(-3), 16) % 1000) + 1
    : 220453;
  return `https://images.pexels.com/photos/${avatarId}/pexels-photo-${avatarId}.jpeg?auto=compress&cs=tinysrgb&w=${size}&h=${size}&fit=crop`;
};

/**
 * Check if the user has a social auth profile image
 */
export const hasSocialAuthAvatar = (
  user: User | null,
  profile: UserProfile | null
): boolean => {
  return !!(
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture
  );
};
