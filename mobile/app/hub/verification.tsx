import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { HubVerificationStatus, HubOwnerProfile } from '../../types';
import { hubCourtService, VerificationStatusResponse } from '../../services/hubCourtService';

export default function HubVerificationScreen() {
  const { roles, activeMode, hubOwnerProfile } = useAuthStore();
  const isHubOwner = roles.includes('HUB_OWNER') || activeMode === 'HUB_OWNER';

  const [verification, setVerification] = useState<VerificationStatusResponse | null>(null);
  const [profile, setProfile] = useState<HubOwnerProfile | null>(hubOwnerProfile);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  const loadVerificationData = useCallback(async (isPull = false) => {
    try {
      if (!isPull) setLoading(true);
      setErrorMsg(null);

      const [statusRes, profileRes] = await Promise.all([
        hubCourtService.getVerificationStatus(),
        hubCourtService.getVenueProfile().catch(() => hubOwnerProfile),
      ]);

      if (isMountedRef.current) {
        setVerification(statusRes);
        if (profileRes) setProfile(profileRes);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMsg(err?.message || 'Failed to load verification status.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [hubOwnerProfile]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadVerificationData();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadVerificationData])
  );

  const handleSubmitRequest = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await hubCourtService.submitVerificationRequest();
      if (isMountedRef.current) {
        setVerification(res);
        setSuccessMsg('Verification request submitted successfully for review.');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMsg(err?.message || 'Failed to submit verification request.');
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  if (!isHubOwner) {
    return (
      <SafeAreaView className="flex-1 bg-[#0C0D0E]" edges={['top']}>
        <ArenaHeader
          title="Hub Verification"
          subtitle="Access Restricted"
          showBack
          fallbackRoute="/hub/dashboard"
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-base font-bold mb-2">Access Restricted</Text>
          <Text className="text-[#8E9298] text-sm text-center mb-4">
            Only registered Hub Owners can access venue verification.
          </Text>
          <PrimaryButton
            title="Return to Dashboard"
            onPress={() => router.replace('/hub/dashboard')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus: HubVerificationStatus | 'NOT_SUBMITTED' =
    verification?.status || (profile?.isVerified ? 'APPROVED' : 'NOT_SUBMITTED');

  return (
    <SafeAreaView className="flex-1 bg-[#0C0D0E]" edges={['top']}>
      <ArenaHeader
        title="Hub Verification"
        subtitle="Venue Credential & Verification"
        showBack
        fallbackRoute="/hub/dashboard"
      />

      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadVerificationData(true);
            }}
            tintColor="#E85D26"
            colors={['#E85D26']}
          />
        }
      >
        {loading && !refreshing ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#E85D26" />
            <Text className="text-[#8E9298] text-xs font-semibold mt-3">
              Checking verification records...
            </Text>
          </View>
        ) : (
          <View>
            {errorMsg && (
              <View className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/20 flex-row items-center">
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text className="ml-2 text-red-200 text-xs flex-1">{errorMsg}</Text>
              </View>
            )}

            {successMsg && (
              <View className="mb-4 p-3.5 rounded-xl bg-green-950/40 border border-green-500/20 flex-row items-center">
                <Ionicons name="checkmark-circle-outline" size={18} color="#22C55E" />
                <Text className="ml-2 text-green-200 text-xs flex-1">{successMsg}</Text>
              </View>
            )}

            {/* Status Card */}
            {currentStatus === 'APPROVED' && (
              <View className="p-6 rounded-2xl bg-[#141518] border border-[#22C55E]/30 mb-6 items-center text-center">
                <View className="w-16 h-16 rounded-full bg-[#1B3B2B] items-center justify-center mb-3">
                  <Ionicons name="checkmark-done" size={32} color="#22C55E" />
                </View>
                <Text className="text-white text-xl font-bold mb-1">Venue Verified</Text>
                <Text className="text-[#22C55E] text-xs font-semibold uppercase tracking-wider mb-3">
                  Official Verification Active
                </Text>
                <Text className="text-[#8E9298] text-xs text-center leading-5 mb-4">
                  Your venue has been reviewed and verified by platform administrators. Your profile displays the official verified badge across all player match and court discovery.
                </Text>
                {verification?.reviewedAt && (
                  <View className="px-3 py-1.5 rounded-lg bg-[#1B1E22] border border-white/[0.06]">
                    <Text className="text-[#8E9298] text-[11px]">
                      Verified on {new Date(verification.reviewedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {currentStatus === 'PENDING' && (
              <View className="p-6 rounded-2xl bg-[#141518] border border-[#EAB308]/30 mb-6 items-center text-center">
                <View className="w-16 h-16 rounded-full bg-[#3B2C1A] items-center justify-center mb-3">
                  <Ionicons name="hourglass-outline" size={30} color="#EAB308" />
                </View>
                <Text className="text-white text-xl font-bold mb-1">Verification In Review</Text>
                <Text className="text-[#EAB308] text-xs font-semibold uppercase tracking-wider mb-3">
                  Pending Review
                </Text>
                <Text className="text-[#8E9298] text-xs text-center leading-5 mb-4">
                  Your submission is currently in the admin verification queue. We verify venue information, location validity, and facility details.
                </Text>
                {verification?.submittedAt && (
                  <View className="px-3 py-1.5 rounded-lg bg-[#1B1E22] border border-white/[0.06]">
                    <Text className="text-[#8E9298] text-[11px]">
                      Submitted on {new Date(verification.submittedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {currentStatus === 'REJECTED' && (
              <View className="p-6 rounded-2xl bg-[#141518] border border-[#EF4444]/30 mb-6">
                <View className="items-center mb-4">
                  <View className="w-16 h-16 rounded-full bg-[#3B1A1A] items-center justify-center mb-2">
                    <Ionicons name="close" size={32} color="#EF4444" />
                  </View>
                  <Text className="text-white text-xl font-bold mb-1">Verification Needs Update</Text>
                  <Text className="text-[#EF4444] text-xs font-semibold uppercase tracking-wider">
                    Application Rejected
                  </Text>
                </View>

                {verification?.adminNote && (
                  <View className="p-4 rounded-xl bg-[#1B1E22] border border-[#EF4444]/20 mb-5">
                    <Text className="text-[#EF4444] text-xs font-bold uppercase tracking-wider mb-1">
                      Admin Feedback
                    </Text>
                    <Text className="text-white text-xs leading-5">{verification.adminNote}</Text>
                  </View>
                )}

                <Text className="text-[#8E9298] text-xs leading-5 mb-5 text-center">
                  Review the administrator feedback above. You can update your venue profile or court details and resubmit for verification without restrictions.
                </Text>

                <View className="gap-3">
                  <PrimaryButton
                    title={submitting ? 'Submitting...' : 'Resubmit for Verification'}
                    onPress={handleSubmitRequest}
                    disabled={submitting}
                  />

                  <Pressable
                    onPress={() => router.push('/onboarding/hub-setup?mode=edit')}
                    className="p-3.5 rounded-xl bg-[#1B1E22] border border-white/[0.08] items-center justify-center"
                  >
                    <Text className="text-white text-xs font-semibold uppercase tracking-wider">
                      Edit Venue Details
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {currentStatus === 'NOT_SUBMITTED' && (
              <View className="p-6 rounded-2xl bg-[#141518] border border-white/[0.08] mb-6">
                <View className="items-center mb-4">
                  <View className="w-16 h-16 rounded-full bg-[#1B1E22] border border-white/10 items-center justify-center mb-3">
                    <Ionicons name="shield-checkmark-outline" size={30} color="#E85D26" />
                  </View>
                  <Text className="text-white text-xl font-bold text-center mb-1">
                    Verify Your Sports Venue
                  </Text>
                  <Text className="text-[#8E9298] text-xs text-center leading-5">
                    Verified venues earn a trust badge, receive priority ranking in matchmaking, and inspire confidence in recreational solo and team players.
                  </Text>
                </View>

                {/* Venue Details Snapshot */}
                <View className="p-4 rounded-xl bg-[#1B1E22] border border-white/[0.06] mb-5">
                  <Text className="text-[#8E9298] text-[10px] font-bold uppercase tracking-wider mb-2">
                    Submission Details Snapshot
                  </Text>
                  <View className="space-y-1.5">
                    <View className="flex-row justify-between py-1 border-b border-white/[0.04]">
                      <Text className="text-[#8E9298] text-xs">Venue Name</Text>
                      <Text className="text-white text-xs font-semibold">{profile?.hubName || 'N/A'}</Text>
                    </View>
                    <View className="flex-row justify-between py-1 border-b border-white/[0.04]">
                      <Text className="text-[#8E9298] text-xs">Location</Text>
                      <Text className="text-white text-xs font-semibold">{profile?.location || 'N/A'}</Text>
                    </View>
                    <View className="flex-row justify-between py-1 border-b border-white/[0.04]">
                      <Text className="text-[#8E9298] text-xs">Contact</Text>
                      <Text className="text-white text-xs font-semibold">{profile?.contactNumber || 'N/A'}</Text>
                    </View>
                    <View className="flex-row justify-between py-1">
                      <Text className="text-[#8E9298] text-xs">Sports</Text>
                      <Text className="text-white text-xs font-semibold capitalize">
                        {(profile?.sports || []).join(', ') || 'None'}
                      </Text>
                    </View>
                  </View>
                </View>

                <PrimaryButton
                  title={submitting ? 'Submitting...' : 'Submit Verification Request'}
                  onPress={handleSubmitRequest}
                  disabled={submitting}
                />
              </View>
            )}

            {/* Verification Standard Information */}
            <View className="p-5 rounded-2xl bg-[#141518] border border-white/[0.08]">
              <Text className="text-white text-sm font-bold uppercase tracking-wider mb-3">
                How Verification Works
              </Text>

              <View className="gap-3">
                <View className="flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-[#1B1E22] items-center justify-center mr-3 mt-0.5">
                    <Text className="text-[#E85D26] text-xs font-bold">1</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-xs font-semibold">Submit Venue Information</Text>
                    <Text className="text-[#8E9298] text-[11px] leading-4 mt-0.5">
                      Hub Owner submits complete facility name, location, and supported sports.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-[#1B1E22] items-center justify-center mr-3 mt-0.5">
                    <Text className="text-[#E85D26] text-xs font-bold">2</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-xs font-semibold">Admin Desk Review</Text>
                    <Text className="text-[#8E9298] text-[11px] leading-4 mt-0.5">
                      Platform admins verify facility contact information and location authenticity.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-[#1B1E22] items-center justify-center mr-3 mt-0.5">
                    <Text className="text-[#E85D26] text-xs font-bold">3</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-xs font-semibold">Badge Activation</Text>
                    <Text className="text-[#8E9298] text-[11px] leading-4 mt-0.5">
                      Upon approval, the verified badge is instantly attached to your hub across discovery maps and lists.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
