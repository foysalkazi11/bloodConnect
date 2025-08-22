import React from 'react';
import { TouchableOpacity, ActivityIndicator, ViewStyle } from 'react-native';
import { Camera } from 'lucide-react-native';
import { useImageUpload, UseImageUploadOptions } from '@/hooks/useImageUpload';

interface ImageUploadButtonProps extends UseImageUploadOptions {
  userId: string;
  children?: React.ReactNode;
  style?: ViewStyle;
  size?: number;
  color?: string;
  disabled?: boolean;
}

export function ImageUploadButton({
  userId,
  children,
  style,
  size = 16,
  color = '#FFFFFF',
  disabled = false,
  ...uploadOptions
}: ImageUploadButtonProps) {
  const { uploadImageFile, loading } = useImageUpload(uploadOptions);

  const handlePress = async () => {
    if (disabled || loading) return;
    await uploadImageFile(userId);
  };

  return (
    <TouchableOpacity
      style={[style, loading && { opacity: 0.7 }]}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {children ||
        (loading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Camera size={size} color={color} />
        ))}
    </TouchableOpacity>
  );
}
