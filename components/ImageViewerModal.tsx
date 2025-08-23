import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  images: Array<{
    url: string;
    id: string;
    sender_name?: string;
    created_at?: string;
  }>;
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewerModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  // Update current index when initial index changes
  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * screenWidth,
        animated: true,
      });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({
        x: prevIndex * screenWidth,
        animated: true,
      });
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  if (!visible || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.senderName}>
                {currentImage.sender_name || 'Unknown'}
              </Text>
              {currentImage.created_at && (
                <Text style={styles.timestamp}>
                  {formatDate(currentImage.created_at)}
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.downloadButton}>
              <Download size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Image Counter */}
          {images.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {currentIndex + 1} of {images.length}
              </Text>
            </View>
          )}

          {/* Image Viewer */}
          <View style={styles.imageContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              scrollEventThrottle={16}
            >
              {images.map((image, index) => (
                <View key={image.id} style={styles.imageWrapper}>
                  <View style={styles.imageView}>
                    <Image
                      source={{ uri: image.url }}
                      style={styles.image}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                {currentIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.prevButton]}
                    onPress={goToPrevious}
                  >
                    <ChevronLeft size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {currentIndex < images.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.nextButton]}
                    onPress={goToNext}
                  >
                    <ChevronRight size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Dots Indicator */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center' as const,
    marginHorizontal: 16,
  },
  senderName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  timestamp: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    opacity: 0.8,
    marginTop: 2,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  counter: {
    alignItems: 'center' as const,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  imageContainer: {
    flex: 1,
    position: 'relative' as const,
  },
  imageWrapper: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  imageView: {
    width: screenWidth,
    height: screenHeight * 0.7,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute' as const,
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: -25,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  dotsContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
  },
};
