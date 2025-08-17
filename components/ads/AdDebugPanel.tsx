import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import { X, Settings, BarChart3, TestTube } from 'lucide-react-native';
import { AdConfigService } from '@/services/adConfigService';
import { useAds } from '@/providers/AdProvider';

interface AdDebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export const AdDebugPanel: React.FC<AdDebugPanelProps> = ({
  visible,
  onClose,
}) => {
  const { showFirstTimeAd, isLoaded, isLoading, loadAd, getStats } = useAds();
  const [config, setConfig] = useState(AdConfigService.getConfig());
  const [stats, setStats] = useState(getStats());

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config };
    const keys = key.split('.');
    let current = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i] as keyof typeof current] as any;
    }

    current[keys[keys.length - 1] as keyof typeof current] = value;
    setConfig(newConfig);
    AdConfigService.updateConfig(newConfig);
  };

  const testInterstitialAd = async () => {
    if (!isLoaded) {
      console.log('Interstitial ad not ready, loading...');
      loadAd();
      return;
    }

    try {
      await showFirstTimeAd();
      console.log('Debug interstitial ad shown successfully');
      // Refresh stats after showing ad
      setStats(getStats());
    } catch (error) {
      console.error('Failed to show debug interstitial ad:', error);
    }
  };

  const refreshStats = () => {
    setStats(getStats());
  };

  const testAdPlacements = [
    { id: 'home_stats', name: 'Home - After Stats' },
    { id: 'home_bottom', name: 'Home - Before Recent' },
    { id: 'search_results', name: 'Search - Before Results' },
    { id: 'gallery_top', name: 'Gallery - Top Banner' },
    { id: 'profile_stats', name: 'Profile - After Stats' },
  ];

  const interstitialTriggers = [
    { id: 'donor_contact', name: 'Donor Contact' },
    { id: 'profile_complete', name: 'Profile Complete' },
    { id: 'club_join', name: 'Club Join' },
    { id: 'blood_search', name: 'Blood Search' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-white rounded-xl w-full max-w-md max-h-[80%] shadow-lg">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <View className="flex-row items-center">
              <TestTube size={20} color="#DC2626" />
              <Text className="ml-2 font-bold text-lg">Ad Debug Panel</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1">
            {/* Ad Status */}
            <View className="p-4 border-b border-gray-100">
              <Text className="font-semibold text-base mb-3">Ad Status</Text>
              <View className="space-y-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Ads Enabled</Text>
                  <View
                    className={`w-3 h-3 rounded-full ${
                      config.enabled ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Banner Ads</Text>
                  <View
                    className={`w-3 h-3 rounded-full ${
                      config.bannerAds.enabled ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Interstitial Ready</Text>
                  <View
                    className={`w-3 h-3 rounded-full ${
                      isLoaded
                        ? 'bg-green-500'
                        : isLoading
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Native Ads</Text>
                  <View
                    className={`w-3 h-3 rounded-full ${
                      config.nativeAds.enabled ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                </View>
              </View>
            </View>

            {/* Quick Tests */}
            <View className="p-4 border-b border-gray-100">
              <Text className="font-semibold text-base mb-3">Quick Tests</Text>
              <View className="space-y-2">
                <TouchableOpacity
                  className="bg-blue-500 py-2 px-4 rounded-lg"
                  onPress={testInterstitialAd}
                >
                  <Text className="text-white font-medium text-center">
                    Test Interstitial Ad
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-green-500 py-2 px-4 rounded-lg"
                  onPress={() =>
                    AdConfigService.trackAdEvent('click', 'banner', 'debug')
                  }
                >
                  <Text className="text-white font-medium text-center">
                    Test Analytics Event
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Configuration */}
            <View className="p-4 border-b border-gray-100">
              <Text className="font-semibold text-base mb-3">
                Configuration
              </Text>

              <View className="space-y-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-700">Enable All Ads</Text>
                  <Switch
                    value={config.enabled}
                    onValueChange={(value) => updateConfig('enabled', value)}
                  />
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-700">Banner Ads</Text>
                  <Switch
                    value={config.bannerAds.enabled}
                    onValueChange={(value) =>
                      updateConfig('bannerAds.enabled', value)
                    }
                  />
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-700">Interstitial Ads</Text>
                  <Switch
                    value={config.interstitialAds.enabled}
                    onValueChange={(value) =>
                      updateConfig('interstitialAds.enabled', value)
                    }
                  />
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-700">Native Ads</Text>
                  <Switch
                    value={config.nativeAds.enabled}
                    onValueChange={(value) =>
                      updateConfig('nativeAds.enabled', value)
                    }
                  />
                </View>
              </View>
            </View>

            {/* Placement Status */}
            <View className="p-4 border-b border-gray-100">
              <Text className="font-semibold text-base mb-3">
                Banner Placements
              </Text>
              {testAdPlacements.map((placement) => (
                <View
                  key={placement.id}
                  className="flex-row justify-between items-center py-1"
                >
                  <Text className="text-gray-600 text-sm">
                    {placement.name}
                  </Text>
                  <View
                    className={`w-2 h-2 rounded-full ${
                      AdConfigService.isBannerEnabled(placement.id)
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                </View>
              ))}
            </View>

            {/* Interstitial Triggers */}
            <View className="p-4">
              <Text className="font-semibold text-base mb-3">
                Interstitial Triggers
              </Text>
              {interstitialTriggers.map((trigger) => (
                <View
                  key={trigger.id}
                  className="flex-row justify-between items-center py-1"
                >
                  <Text className="text-gray-600 text-sm">{trigger.name}</Text>
                  <View
                    className={`w-2 h-2 rounded-full ${
                      AdConfigService.isInterstitialEnabled(trigger.id)
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="p-4 border-t border-gray-200">
            <Text className="text-xs text-gray-500 text-center">
              Debug panel - Development only
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Debug trigger component for development
export const AdDebugTrigger: React.FC = () => {
  const [showPanel, setShowPanel] = useState(false);

  // Only show in development
  if (!__DEV__) return null;

  return (
    <>
      <TouchableOpacity
        className="absolute bottom-20 right-4 bg-red-500 w-12 h-12 rounded-full items-center justify-center shadow-lg z-50"
        onPress={() => setShowPanel(true)}
      >
        <Settings size={20} color="white" />
      </TouchableOpacity>

      <AdDebugPanel visible={showPanel} onClose={() => setShowPanel(false)} />
    </>
  );
};
