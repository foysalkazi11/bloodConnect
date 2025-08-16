import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Heart, Users, Calendar } from 'lucide-react-native';

interface FeedAdProps {
  type: 'community_health' | 'wellness' | 'awareness';
  placement: string;
}

export const FeedAd: React.FC<FeedAdProps> = ({ type, placement }) => {
  return (
    <Card className="mx-4 mb-4 border-l-4 border-l-blue-500">
      <View className="flex-row items-center mb-3">
        <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
          <Heart size={16} color="#3B82F6" />
        </View>
        <View className="flex-1">
          <Text className="font-semibold">Community Health Partner</Text>
          <Text className="text-sm text-gray-500">Sponsored</Text>
        </View>
      </View>

      <TouchableOpacity
        className="bg-gradient-to-r from-blue-50 to-red-50 p-4 rounded-xl"
        onPress={() => {
          // Track ad click
          console.log(`Social ad clicked: ${placement}`);
        }}
      >
        <Text className="font-semibold text-lg mb-2">
          Join Local Health Awareness Events
        </Text>
        <Text className="text-gray-600 mb-3">
          Connect with healthcare professionals in your community
        </Text>
        <View className="flex-row items-center">
          <Users size={16} color="#DC2626" />
          <Text className="ml-2 text-red-600 font-medium">Learn More</Text>
        </View>
      </TouchableOpacity>
    </Card>
  );
};

interface SponsoredEventAdProps {
  type: 'health_awareness' | 'blood_drive' | 'wellness';
  targetLocation?: string;
}

export const SponsoredEventAd: React.FC<SponsoredEventAdProps> = ({
  type,
  targetLocation,
}) => {
  return (
    <TouchableOpacity className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
      <View className="flex-row items-center mb-3">
        <Calendar size={20} color="#DC2626" />
        <Text className="ml-2 text-red-600 font-semibold">Sponsored Event</Text>
      </View>

      <Text className="font-bold text-lg mb-2">
        Community Blood Drive - {targetLocation || 'Your Area'}
      </Text>
      <Text className="text-gray-600 mb-3">
        Join us for a special community blood donation event. Every donation
        saves lives.
      </Text>

      <View className="bg-red-50 p-3 rounded-lg">
        <Text className="text-red-700 font-medium text-center">
          Register Now - Free Health Screening Included
        </Text>
      </View>
    </TouchableOpacity>
  );
};

interface NativeGalleryAdProps {
  placement: string;
}

export const NativeGalleryAd: React.FC<NativeGalleryAdProps> = ({
  placement,
}) => {
  return (
    <TouchableOpacity
      className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 m-2"
      style={{ aspectRatio: 1 }}
    >
      <View className="flex-1 justify-center items-center">
        <Heart size={32} color="#DC2626" />
        <Text className="font-bold text-center mt-2 text-red-700">
          Health Tips
        </Text>
        <Text className="text-sm text-center text-red-600 mt-1">
          Daily wellness advice for donors
        </Text>
      </View>

      <View className="absolute top-2 right-2">
        <Text className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
          Sponsored
        </Text>
      </View>
    </TouchableOpacity>
  );
};

interface SponsoredStoryProps {
  content: string;
  sponsor: string;
}

export const SponsoredStory: React.FC<SponsoredStoryProps> = ({
  content,
  sponsor,
}) => {
  return (
    <TouchableOpacity className="w-20 h-20 rounded-full border-2 border-blue-400 p-1 mr-3">
      <View className="w-full h-full bg-gradient-to-b from-blue-100 to-red-100 rounded-full items-center justify-center">
        <Heart size={24} color="#DC2626" />
      </View>
      <Text className="text-xs text-center mt-1 font-medium">{sponsor}</Text>
    </TouchableOpacity>
  );
};
