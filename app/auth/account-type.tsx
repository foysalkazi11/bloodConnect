import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, ArrowLeft, Users } from 'lucide-react-native';
import { useI18n } from '@/providers/I18nProvider';
import { router } from 'expo-router';
import { useNotification } from '@/components/NotificationSystem';
import { Logo } from '@/components/ui';

export default function AccountTypeScreen() {
  const { t } = useI18n();
  const { showNotification } = useNotification();
  const [selectedType, setSelectedType] = useState('');

  const handleNext = () => {
    if (!selectedType) {
      showNotification(
        {
          type: 'error',
          title: 'Selection Required',
          message: 'Please select an account type to continue.',
          duration: 4000,
        },
        true
      );
      return;
    }

    // Navigate to signup with account type
    router.push(`/auth/signup?accountType=${selectedType}`);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            {/* <Heart size={32} color="#DC2626" /> */}
            <Logo size={64} />
            <Text style={styles.headerTitle}>Join BloodLink</Text>
          </View>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>1/3</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Choose Account Type</Text>
          <Text style={styles.subtitle}>Select what best describes you</Text>

          <View style={styles.accountTypeContainer}>
            <TouchableOpacity
              style={[
                styles.accountTypeCard,
                selectedType === 'donor' && styles.accountTypeCardActive,
              ]}
              onPress={() => setSelectedType('donor')}
            >
              <Heart
                size={48}
                color={selectedType === 'donor' ? '#FFFFFF' : '#DC2626'}
              />
              <Text
                style={[
                  styles.accountTypeTitle,
                  selectedType === 'donor' && styles.accountTypeTextActive,
                ]}
              >
                Blood Donor
              </Text>
              <Text
                style={[
                  styles.accountTypeDescription,
                  selectedType === 'donor' &&
                    styles.accountTypeDescriptionActive,
                ]}
              >
                Help save lives by donating blood to those in need. Connect with
                hospitals and blood banks in your area.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.accountTypeCard,
                selectedType === 'club' && styles.accountTypeCardActive,
              ]}
              onPress={() => setSelectedType('club')}
            >
              <Users
                size={48}
                color={selectedType === 'club' ? '#FFFFFF' : '#DC2626'}
              />
              <Text
                style={[
                  styles.accountTypeTitle,
                  selectedType === 'club' && styles.accountTypeTextActive,
                ]}
              >
                Blood Donation Club
              </Text>
              <Text
                style={[
                  styles.accountTypeDescription,
                  selectedType === 'club' &&
                    styles.accountTypeDescriptionActive,
                ]}
              >
                Organize blood drives, manage donation activities, and build a
                community of donors.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !selectedType && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!selectedType}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>

          <View style={styles.signInSection}>
            <Text style={styles.signInText}>
              {t('auth.alreadyHaveAccount')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/auth')}>
              <Text style={styles.signInLink}>{t('auth.signIn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  stepIndicator: {
    width: 40,
    alignItems: 'center',
  },
  stepText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  accountTypeContainer: {
    gap: 24,
  },
  accountTypeCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 20,
  },
  accountTypeCardActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  accountTypeTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#111827',
    textAlign: 'center',
  },
  accountTypeDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  accountTypeTextActive: {
    color: '#FFFFFF',
  },
  accountTypeDescriptionActive: {
    color: '#FEE2E2',
  },
  footer: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },
  nextButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  nextButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  signInText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  signInLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#DC2626',
  },
});
