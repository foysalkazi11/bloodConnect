import { useState } from 'react';
import {
  pickProfileImage,
  uploadImage,
  generateImageFileName,
  deleteImage,
} from '@/utils/imageUtils';
import { useNotification } from '@/components/NotificationSystem';

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

export interface UseImageUploadOptions {
  bucket?: string;
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  currentImageUrl?: string | null;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const {
    bucket = 'media',
    folder = 'uploads',
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8,
    onSuccess,
    onError,
    currentImageUrl,
  } = options;

  const uploadImageFile = async (userId: string) => {
    if (loading) return null;

    try {
      setLoading(true);

      // Pick image
      const result = await pickProfileImage();

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const imageUri = result.assets[0].uri;

      // Generate unique filename
      const fileName = generateImageFileName(userId, folder);

      // Upload optimized image
      const uploadResult = await uploadImage(imageUri, bucket, fileName, {
        maxWidth,
        maxHeight,
        quality,
      });

      if (uploadResult.success && uploadResult.url) {
        // Delete previous uploaded image if it exists
        if (currentImageUrl && isUploadedImage(currentImageUrl)) {
          try {
            const filePath = extractFilePathFromUrl(currentImageUrl);
            if (filePath) {
              await deleteImage(bucket, filePath);
            }
          } catch (deleteError) {
            console.warn('Failed to delete previous image:', deleteError);
            // Don't fail the upload if deletion fails
          }
        }

        onSuccess?.(uploadResult.url);
        showNotification({
          type: 'success',
          title: 'Upload Successful',
          message: 'Image uploaded successfully',
          duration: 3000,
        });
        return uploadResult.url;
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: errorMessage,
        duration: 4000,
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadImageFile,
    loading,
  };
}
