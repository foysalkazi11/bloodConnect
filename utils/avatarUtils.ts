import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/lib/supabase';

/**
 * Checks if the avatar URL is from an uploaded image (Supabase storage)
 */
function isUploadedImage(avatarUrl: string): boolean {
  return avatarUrl.includes('supabase') && avatarUrl.includes('/storage/');
}

/**
 * Extracts the file path from a Supabase storage URL
 */
function extractFilePathFromUrl(url: string): string | null {
  try {
    // Supabase storage URLs have format: https://project.supabase.co/storage/v1/object/public/bucket/path
    const match = url.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
}

/**
 * Get the profile image URL with priority order:
 * 1. Uploaded image (avatar_url from Supabase storage)
 * 2. Social auth avatar (avatar_url from Google/other providers)
 * 3. User metadata avatar (for newly signed-in users)
 * 4. Generated avatar based on user ID
 */
export const getProfileImageUrl = (
  user: User | null,
  profile: UserProfile | null,
  size = 200
): string => {
  // First priority: Uploaded image (Supabase storage URLs)
  if (profile?.avatar_url && isUploadedImage(profile.avatar_url)) {
    return profile.avatar_url;
  }

  // Second priority: Social auth avatar URL from profile
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }

  // Third priority: User metadata avatar (for newly signed-in users)
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
 * Priority: 1) Uploaded image, 2) Social auth avatar, 3) Generated fallback
 */
export const getAvatarUrl = (
  userProfile: { id?: string; avatar_url?: string; name?: string } | null,
  size = 200
): string => {
  // If user has avatar_url, prioritize uploaded images over social auth
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
 * Upload and set a new profile image, automatically deleting the previous one
 */
export const uploadProfileImage = async (
  imageUri: string,
  userId: string,
  currentAvatarUrl: string | null | undefined,
  updateProfile: (updates: any) => Promise<void>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { uploadImage, generateImageFileName, deleteImage } = await import(
      './imageUtils'
    );

    // Generate unique filename
    const fileName = generateImageFileName(userId, 'profile');

    // Upload optimized image
    const result = await uploadImage(imageUri, 'media', fileName, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.8,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Delete previous uploaded image if it exists
    if (currentAvatarUrl && isUploadedImage(currentAvatarUrl)) {
      try {
        const filePath = extractFilePathFromUrl(currentAvatarUrl);
        if (filePath) {
          await deleteImage('media', filePath);
        }
      } catch (deleteError) {
        console.warn('Failed to delete previous image:', deleteError);
        // Don't fail the upload if deletion fails
      }
    }

    // Update user profile with new avatar URL
    await updateProfile({ avatar_url: result.url });

    return { success: true };
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
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
