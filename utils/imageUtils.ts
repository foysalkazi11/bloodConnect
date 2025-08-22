import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: SaveFormat;
}

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Optimizes an image before upload to reduce file size and improve performance
 */
export async function optimizeImage(
  imageUri: string,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8,
    format = SaveFormat.JPEG,
  } = options;

  try {
    console.log('Optimizing image:', {
      imageUri,
      maxWidth,
      maxHeight,
      quality,
      format,
    });

    const manipulatedImage = await manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: quality,
        format,
        base64: false,
      }
    );

    console.log('Image optimized successfully:', manipulatedImage.uri);
    return manipulatedImage.uri;
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw new Error('Failed to optimize image');
  }
}

/**
 * Uploads an optimized image to Supabase storage
 */
export async function uploadImage(
  imageUri: string,
  bucket: string,
  fileName: string,
  options: ImageOptimizationOptions = {}
): Promise<ImageUploadResult> {
  try {
    // Optimize the image first
    const optimizedUri = await optimizeImage(imageUri, options);

    // Platform-specific file handling (same as gallery implementation)
    let file: any;
    if (Platform.OS === 'web') {
      // For web, convert to blob
      const response = await fetch(optimizedUri);
      const blob = await response.blob();
      file = blob;
    } else {
      // For React Native, we need to read the actual file content
      // The { uri, name, type } approach doesn't work with Supabase
      const response = await fetch(optimizedUri);
      const arrayBuffer = await response.arrayBuffer();

      // Convert to Uint8Array which Supabase can handle
      file = new Uint8Array(arrayBuffer);
    }

    // Upload to Supabase storage

    // Set content type based on file extension
    const fileExt = fileName.split('.').pop() || 'jpg';
    const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: `Upload failed: ${error.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Launches image picker with optimized settings for profile pictures
 */
export async function pickProfileImage(): Promise<ImagePicker.ImagePickerResult> {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Camera roll permissions are required');
  }

  // Launch image picker with profile-optimized settings
  return await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'livePhotos'],
    allowsEditing: true,
    aspect: [1, 1], // Square aspect ratio for profile pictures
    quality: 0.9, // High quality for picker, we'll optimize later
    exif: false, // Remove EXIF data for privacy
  });
}

/**
 * Generates a unique filename for user uploads
 */
export function generateImageFileName(
  userId: string,
  prefix: string = 'profile'
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}/${userId}/${timestamp}_${random}.jpg`;
}

/**
 * Deletes an image from Supabase storage
 */
export async function deleteImage(
  bucket: string,
  filePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}
