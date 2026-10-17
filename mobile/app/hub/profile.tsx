import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ArenaHeader } from '../../components/ui/ArenaHeader';
import { ArenaBadge } from '../../components/ui/ArenaBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IMAGES } from '../../constants/images';
import { useAuthStore } from '../../store/useAuthStore';
import { Sport } from '../../types';
import { authService } from '../../services/authService';
import { hubCourtService } from '../../services/hubCourtService';

interface SportInfo {
  sport: Sport;
  label: string;
  iconName: 'cricket' | 'badminton' | 'tennis' | 'soccer';
}

const ALL_SPORTS_MAP: Record<Sport, SportInfo> = {
  cricket: { sport: 'cricket', label: 'Cricket', iconName: 'cricket' },
  badminton: { sport: 'badminton', label: 'Badminton', iconName: 'badminton' },
  padel: { sport: 'padel', label: 'Padel', iconName: 'tennis' },
  football: { sport: 'football', label: 'Football', iconName: 'soccer' },
};

import { ScheduledVenueMatch, DEMO_VENUE_MATCHES } from '../../demo/mockHubMatches';
import { isProduction } from '../../config/runtime';

export default function HubProfileScreen() {
  const { currentUser, hubOwnerProfile, setHubOwnerProfile } = useAuthStore();
  const [realCourtCount, setRealCourtCount] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  const loadData = useCallback(async () => {
    try {
      const meData = await authService.me();
      if (isMountedRef.current && meData.hubOwnerProfile) {
        setHubOwnerProfile(meData.hubOwnerProfile);
      }
    } catch {
      // Keep store state
    }

    try {
      const courts = await hubCourtService.getCourts();
      if (isMountedRef.current) {
        setRealCourtCount(courts.length);
      }
    } catch {
      // Keep store / profile count
    }
  }, [setHubOwnerProfile]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadData();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadData])
  );

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const scheduledMatches: ScheduledVenueMatch[] = isProduction() ? [] : DEMO_VENUE_MATCHES;

  const facilities = [
    { icon: 'flashlight-outline' as const, label: 'Floodlights' },
    { icon: 'car-outline' as const, label: 'Free Parking' },
    { icon: 'shield-checkmark-outline' as const, label: 'First Aid Desk' },
    { icon: 'water-outline' as const, label: 'Hydration Station' },
    { icon: 'shirt-outline' as const, label: 'Changing Rooms' },
  ];

  if (!hubOwnerProfile || !hubOwnerProfile.hubName) {
    return (
      <SafeAreaView className="flex-1 bg-[#0C0D0E]" edges={['top', 'bottom']}>
        <ArenaHeader
          title="Hub Profile"
          subtitle="Venue Setup Required"
          showBack
        />
        <View className="flex-1 px-6 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-[#1B1D22] items-center justify-center mb-4 border border-white/[0.08]">
            <Ionicons name="business-outline" size={32} color="#A0A5AD" />
          </View>
          <Text className="text-[#FFFFFF] text-xl font-black uppercase tracking-tight text-center">
            No Hub Profile Configured
          </Text>
          <Text className="text-[#A0A5AD] text-sm font-medium text-center mt-2 mb-6 leading-5">
            Your venue profile is not yet configured. Complete venue details, contact number, and supported sports to start managing courts and match slots.
          </Text>
          <PrimaryButton
            title="COMPLETE HUB SETUP"
            onPress={() => router.push('/onboarding/hub-setup')}
            className="w-full"
          />
        </View>
      </SafeAreaView>
    );
  }

  const profile = {
    userId: hubOwnerProfile.userId || currentUser?.id || '',
    hubName: hubOwnerProfile.hubName,
    location: hubOwnerProfile.location || 'Location not specified',
    courtsCount: realCourtCount !== null ? realCourtCount : (hubOwnerProfile.courtsCount ?? 0),
    isVerified: Boolean(hubOwnerProfile.isVerified),
    contactNumber: hubOwnerProfile.contactNumber || 'No contact provided',
    sports: hubOwnerProfile.sports || [],
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0C0D0E]" edges={['top', 'bottom']}>
      {/* Modern Athletic Header */}
      <ArenaHeader
        title="Venue Profile"
        subtitle="Facility Specifications"
        showBack
        fallbackRoute="/hub/dashboard"
        rightAction={
          <Pressable
            onPress={() => router.push('/onboarding/hub-setup?mode=edit')}
            className="px-3 py-1.5 rounded-xl bg-[#E85D26] flex-row items-center"
          >
            <Ionicons name="pencil" size={14} color="#FFFFFF" />
            <Text className="text-white text-xs font-bold uppercase ml-1">Edit</Text>
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1"
      >
        {/* Photography Hero Section */}
        <View className="relative w-full h-54 bg-[#141518] overflow-hidden border-b border-white/[0.08]">
          <Image
            source={IMAGES.arenaGround}
            className="w-full h-full opacity-40"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-gradient-to-t from-[#0C0D0E] via-[#0C0D0E]/50 to-transparent" />

          {/* Top Badges */}
          <View className="absolute top-3 left-4 right-4 flex-row items-center justify-between">
            <View className="bg-[#0C0D0E]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/[0.08] flex-row items-center">
              <Ionicons name="location-sharp" size={12} color="#A0A5AD" />
              <Text className="text-[#FFFFFF] text-xs font-bold uppercase tracking-wider ml-1">
                {profile.location}
              </Text>
            </View>

            {profile.isVerified ? (
              <ArenaBadge label="VERIFIED HUB" variant="olive" />
            ) : (
              <ArenaBadge label="PENDING VERIFICATION" variant="stone" />
            )}
          </View>

          {/* Bottom Title In Overlay */}
          <View className="absolute bottom-3 left-4 right-4">
            <Text
              numberOfLines={1}
              className="text-[#FFFFFF] text-2xl font-black uppercase tracking-tight"
            >
              {profile.hubName}
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="business-outline" size={13} color="#A0A5AD" />
              <Text className="text-[#A0A5AD] text-xs font-semibold uppercase tracking-wider ml-1.5">
                {profile.courtsCount} {profile.courtsCount === 1 ? 'Court' : 'Courts'} • Registered Sports Venue
              </Text>
            </View>
          </View>
        </View>

        {/* Temporary Notification Banner */}
        {notification && (
          <View className="mx-4 mt-3 p-3 bg-[#141518] rounded-xl border border-white/[0.08] flex-row items-center">
            <Ionicons name="information-circle" size={16} color="#E85D26" />
            <Text className="text-[#FFFFFF] text-xs font-medium ml-2 flex-1">
              {notification}
            </Text>
          </View>
        )}

        <View className="px-4 pt-4 space-y-4">
          {/* Identity & Verification Card */}
          <View className="bg-[#141518] rounded-2xl border border-white/[0.08] p-4 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[#5C616A] text-[10px] font-mono uppercase tracking-wider font-bold">
                  Official Venue Details
                </Text>
                <Text className="text-[#FFFFFF] text-lg font-black uppercase tracking-tight mt-0.5">
                  {profile.hubName}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="location" size={13} color="#A0A5AD" />
                  <Text className="text-[#A0A5AD] text-xs font-medium ml-1">
                    {profile.location}
                  </Text>
                </View>
              </View>

              {/* Status Indicator */}
              <View className="items-end">
                <View
                  className={`px-2.5 py-1 rounded-lg border ${
                    profile.isVerified
                      ? 'bg-[#E85D26]/15 border-[#E85D26]'
                      : 'bg-[#1B1D22] border-white/[0.08]'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      profile.isVerified ? 'text-[#E85D26]' : 'text-[#A0A5AD]'
                    }`}
                  >
                    {profile.isVerified ? 'VERIFIED' : 'PENDING'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact details */}
            <View className="mt-3 pt-3 border-t border-white/[0.08] flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="call-outline" size={14} color="#E85D26" />
                <Text className="text-[#FFFFFF] text-xs font-bold ml-1.5">
                  {profile.contactNumber || 'No contact provided'}
                </Text>
              </View>
              <Text className="text-[#5C616A] text-[11px] font-semibold uppercase">
                Desk Coordinator
              </Text>
            </View>

            {/* Verification Status Description */}
            <View className="mt-3 p-3 bg-[#1B1D22] rounded-xl border border-white/[0.08] flex-row items-start">
              <Ionicons
                name={profile.isVerified ? 'shield-checkmark' : 'time-outline'}
                size={16}
                color={profile.isVerified ? '#E85D26' : '#A0A5AD'}
                style={{ marginTop: 1 }}
              />
              <Text className="text-[#A0A5AD] text-xs font-medium ml-2 flex-1 leading-4">
                {profile.isVerified
                  ? 'This venue is verified by Maidaan Platform Administration. Court dimensions and ground amenities comply with standard specifications.'
                  : 'Verification application submitted. Venue details are undergoing administrative check.'}
              </Text>
            </View>
          </View>

          {/* Operational Metrics Summary */}
          <View className="mt-4">
            <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider mb-2 font-bold">
              Venue Overview & Capacity
            </Text>

            <View className="flex-row space-x-2">
              {/* Courts Count Tile */}
              <View className="flex-1 bg-[#141518] border border-white/[0.08] rounded-2xl p-3.5 items-center mr-2">
                <Text className="text-[#FFFFFF] text-2xl font-black">
                  {profile.courtsCount}
                </Text>
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">
                  Courts / Pitches
                </Text>
              </View>

              {/* Supported Sports Tile */}
              <View className="flex-1 bg-[#141518] border border-white/[0.08] rounded-2xl p-3.5 items-center mr-2">
                <Text className="text-[#E85D26] text-2xl font-black">
                  {profile.sports?.length ?? 0}
                </Text>
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">
                  Active Sports
                </Text>
              </View>

              {/* Scheduled Slots Tile */}
              <View className="flex-1 bg-[#141518] border border-white/[0.08] rounded-2xl p-3.5 items-center">
                <Text className="text-[#FFFFFF] text-2xl font-black">
                  {scheduledMatches.length}
                </Text>
                <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">
                  Matches Today
                </Text>
              </View>
            </View>
          </View>

          {/* Supported Sports Cards */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold">
                Supported Sports
              </Text>
              <Text className="text-[#5C616A] text-[10px] font-semibold uppercase">
                {(profile.sports?.length ?? 0)} Configured
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {profile.sports && profile.sports.length > 0 ? (
                profile.sports.map((sport: Sport) => {
                  const info = ALL_SPORTS_MAP[sport];
                  return (
                    <View
                      key={sport}
                      className="flex-row items-center bg-[#141518] border border-white/[0.08] px-3.5 py-2.5 rounded-xl mr-2 mb-2"
                    >
                      <MaterialCommunityIcons
                        name={info?.iconName || 'soccer'}
                        size={18}
                        color="#E85D26"
                      />
                      <Text className="text-[#FFFFFF] text-xs font-bold uppercase ml-2 tracking-wide">
                        {info?.label || sport}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View className="bg-[#141518] border border-white/[0.08] p-4 rounded-2xl w-full">
                  <Text className="text-[#5C616A] text-xs">
                    No sports configured yet.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Hub Management Actions */}
          <View className="mt-4 bg-[#141518] rounded-2xl p-4 border border-white/[0.08] shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-[#FFFFFF] text-sm font-black uppercase tracking-tight">
                  Hub Courts & Allocations
                </Text>
                <Text className="text-[#A0A5AD] text-xs font-medium mt-0.5">
                  Inspect court layouts, surfaces, and active playing slots.
                </Text>
              </View>
              <View className="w-9 h-9 rounded-xl bg-[#1B1D22] items-center justify-center border border-white/[0.08]">
                <Ionicons name="grid-outline" size={18} color="#E85D26" />
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/hub/courts')}
              accessibilityRole="button"
              accessibilityLabel="Manage Hub Courts"
              className="w-full bg-[#E85D26] min-h-[46px] rounded-xl items-center justify-center active:opacity-90 active:scale-[0.99]"
            >
              <View className="flex-row items-center">
                <Ionicons name="layers" size={16} color="#0C0D0E" />
                <Text className="text-[#0C0D0E] text-xs font-black uppercase tracking-wider ml-2">
                  MANAGE HUB COURTS
                </Text>
              </View>
            </Pressable>

            {/* Quick Edit Setup Link */}
            <Pressable
              onPress={() => router.push({ pathname: '/onboarding/hub-setup', params: { mode: 'edit' } } as any)}
              accessibilityRole="button"
              accessibilityLabel="Edit Hub Setup"
              className="mt-2.5 py-2 items-center justify-center"
            >
              <Text className="text-[#A0A5AD] text-xs font-bold uppercase tracking-wider underline">
                Edit Venue Details & Contact
              </Text>
            </Pressable>
          </View>

          {/* Match / Activity Summary At This Venue */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider font-bold">
                Community Matches at this Venue
              </Text>
              <Text className="text-[#5C616A] text-[10px] font-semibold uppercase">
                Active Today
              </Text>
            </View>

            {scheduledMatches.length === 0 ? (
              <View className="bg-[#141518] border border-white/[0.08] rounded-2xl p-6 items-center justify-center">
                <Ionicons name="calendar-outline" size={28} color="#5C616A" />
                <Text className="text-[#FFFFFF] text-sm font-bold mt-2">No Matches Scheduled Today</Text>
                <Text className="text-[#5C616A] text-xs text-center mt-1">
                  Community games hosted at this venue will appear here.
                </Text>
              </View>
            ) : (
              scheduledMatches.map((m) => (
                <View
                  key={m.id}
                  className="bg-[#141518] border border-white/[0.08] rounded-2xl p-4 mb-2.5 shadow-sm"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-[#FFFFFF] text-sm font-black uppercase tracking-tight">
                        {m.title}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="time-outline" size={12} color="#A0A5AD" />
                        <Text className="text-[#A0A5AD] text-xs font-medium ml-1">
                          {m.time}
                        </Text>
                      </View>
                    </View>

                    <View className="bg-[#1B1D22] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                      <Text className="text-[#FFFFFF] text-[10px] font-bold uppercase">
                        {m.sportLabel}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-2.5 pt-2 border-t border-white/[0.08] flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={12} color="#A0A5AD" />
                      <Text className="text-[#A0A5AD] text-xs font-medium ml-1">
                        {m.court}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Ionicons name="people-outline" size={12} color="#E85D26" />
                      <Text className="text-[#E85D26] text-xs font-bold ml-1 uppercase">
                        {m.slotsOpen} of {m.totalSlots} Slots Open
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Venue Facilities */}
          <View className="mt-4 bg-[#141518] rounded-2xl border border-white/[0.08] p-4">
            <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider mb-3 font-bold">
              Venue Amenities & Facilities
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {facilities.map((fac) => (
                <View
                  key={fac.label}
                  className="flex-row items-center bg-[#1B1D22] px-3 py-2 rounded-xl border border-white/[0.08] mr-2 mb-2"
                >
                  <Ionicons name={fac.icon} size={14} color="#E85D26" />
                  <Text className="text-[#FFFFFF] text-xs font-bold ml-1.5">
                    {fac.label}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-2 pt-3 border-t border-white/[0.08] flex-row items-center justify-between">
              <Text className="text-[#5C616A] text-xs">
                Operating under Maidaan Fair Play standards
              </Text>
              <Pressable
                onPress={() => showNotification('Facility amenities can be updated with venue re-inspection.')}
              >
                <Text className="text-[#E85D26] text-xs font-bold underline">
                  Info
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
