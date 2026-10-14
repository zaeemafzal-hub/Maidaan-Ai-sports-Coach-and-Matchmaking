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

interface ScheduledVenueMatch {
  id: string;
  title: string;
  sport: Sport;
  sportLabel: string;
  time: string;
  court: string;
  slotsOpen: number;
  totalSlots: number;
}

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

  // Mock venue schedule summary (purely informational activity overview)
  const scheduledMatches: ScheduledVenueMatch[] = [
    {
      id: 'vm-01',
      title: 'Evening 7v7 Floodlit Friendly',
      sport: 'football',
      sportLabel: 'Football',
      time: 'Tonight, 8:30 PM - 10:00 PM',
      court: 'Turf Pitch 1',
      slotsOpen: 3,
      totalSlots: 14,
    },
    {
      id: 'vm-02',
      title: 'Tape-Ball Floodlit Match',
      sport: 'cricket',
      sportLabel: 'Cricket',
      time: 'Tonight, 9:00 PM - 11:00 PM',
      court: 'Main Net A',
      slotsOpen: 4,
      totalSlots: 16,
    },
    {
      id: 'vm-03',
      title: 'Doubles Open Round',
      sport: 'padel',
      sportLabel: 'Padel',
      time: 'Tomorrow, 7:00 PM - 8:30 PM',
      court: 'Enclosed Court 2',
      slotsOpen: 1,
      totalSlots: 4,
    },
  ];

  const facilities = [
    { icon: 'flashlight-outline' as const, label: 'Floodlights' },
    { icon: 'car-outline' as const, label: 'Free Parking' },
    { icon: 'shield-checkmark-outline' as const, label: 'First Aid Desk' },
    { icon: 'water-outline' as const, label: 'Hydration Station' },
    { icon: 'shirt-outline' as const, label: 'Changing Rooms' },
  ];

  if (!hubOwnerProfile || !hubOwnerProfile.hubName) {
    return (
      <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
        <ArenaHeader
          title="HUB PROFILE"
          subtitle="VENUE SETUP REQUIRED"
          showBack
        />
        <View className="flex-1 px-6 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-stone/20 items-center justify-center mb-4 border border-stone">
            <Ionicons name="business-outline" size={32} color="#242522" />
          </View>
          <Text className="text-graphite text-xl font-black uppercase tracking-tight text-center">
            NO HUB PROFILE CONFIGURED
          </Text>
          <Text className="text-stone-muted text-sm font-medium text-center mt-2 mb-6 leading-5">
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
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      {/* Concrete Arena Header */}
      <ArenaHeader
        title="HUB PROFILE"
        subtitle="VENUE ID // 28"
        showBack
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1"
      >
        {/* Photography Hero Section */}
        <View className="relative w-full h-52 bg-graphite overflow-hidden border-b border-stone">
          <Image
            source={IMAGES.arenaGround}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Gritty Vignette & Atmospheric Stadium Lighting Overlay */}
          <View className="absolute inset-0 bg-graphite/40" />
          <View className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/40 to-transparent" />

          {/* Top Badges */}
          <View className="absolute top-3 left-4 right-4 flex-row items-center justify-between">
            <View className="bg-graphite/90 px-2.5 py-1 rounded-sm border border-stone/30 flex-row items-center">
              <Ionicons name="location-sharp" size={12} color="#D6D1C6" />
              <Text className="text-warm-white text-[10px] font-bold uppercase tracking-wider ml-1">
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
              className="text-warm-white text-2xl font-black uppercase tracking-tight"
            >
              {profile.hubName}
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="business-outline" size={13} color="#D6D1C6" />
              <Text className="text-stone text-xs font-semibold uppercase tracking-wider ml-1.5">
                {profile.courtsCount} {profile.courtsCount === 1 ? 'Court' : 'Courts'} • Registered Sports Venue
              </Text>
            </View>
          </View>
        </View>

        {/* Temporary Notification Banner */}
        {notification && (
          <View className="mx-4 mt-3 p-3 bg-graphite rounded-lg border border-stone/30 flex-row items-center">
            <Ionicons name="information-circle" size={16} color="#D6D1C6" />
            <Text className="text-warm-white text-xs font-medium ml-2 flex-1">
              {notification}
            </Text>
          </View>
        )}

        <View className="px-4 pt-4 space-y-4">
          {/* Identity & Verification Card */}
          <View className="bg-warm-white rounded-xl border border-stone p-4 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-stone-muted text-[10px] font-black uppercase tracking-wider">
                  OFFICIAL VENUE DETAILS
                </Text>
                <Text className="text-graphite text-lg font-black uppercase tracking-tight mt-0.5">
                  {profile.hubName}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="location" size={13} color="#666B60" />
                  <Text className="text-stone-muted text-xs font-medium ml-1">
                    {profile.location}
                  </Text>
                </View>
              </View>

              {/* Status Indicator */}
              <View className="items-end">
                <View
                  className={`px-2.5 py-1 rounded-sm border ${
                    profile.isVerified
                      ? 'bg-olive/15 border-olive'
                      : 'bg-stone/30 border-stone'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      profile.isVerified ? 'text-olive' : 'text-graphite'
                    }`}
                  >
                    {profile.isVerified ? 'STATUS: VERIFIED' : 'STATUS: REVIEW'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact details */}
            <View className="mt-3 pt-3 border-t border-stone flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="call-outline" size={14} color="#242522" />
                <Text className="text-graphite text-xs font-bold ml-1.5">
                  {profile.contactNumber || 'No contact provided'}
                </Text>
              </View>
              <Text className="text-stone-muted text-[11px] font-semibold uppercase">
                Primary Desk Coordinator
              </Text>
            </View>

            {/* Verification Status Description */}
            <View className="mt-3 p-3 bg-stone-light/60 rounded-lg border border-stone/60 flex-row items-start">
              <Ionicons
                name={profile.isVerified ? 'shield-checkmark' : 'time-outline'}
                size={16}
                color={profile.isVerified ? '#4B6344' : '#666B60'}
                style={{ marginTop: 1 }}
              />
              <Text className="text-stone-muted text-xs font-medium ml-2 flex-1 leading-4">
                {profile.isVerified
                  ? 'This venue is verified by Maidaan Platform Administration. Court dimensions, safety lighting, and ground amenities comply with standard specifications.'
                  : 'Verification application submitted. Venue details are undergoing administrative check.'}
              </Text>
            </View>
          </View>

          {/* Operational Metrics Summary */}
          <View className="mt-4">
            <Text className="text-graphite text-xs font-black uppercase tracking-wider mb-2">
              VENUE OVERVIEW & CAPACITY
            </Text>

            <View className="flex-row space-x-2">
              {/* Courts Count Tile */}
              <View className="flex-1 bg-warm-white border border-stone rounded-xl p-3 items-center mr-2">
                <Text className="text-graphite text-2xl font-black">
                  {profile.courtsCount}
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">
                  Courts / Pitches
                </Text>
              </View>

              {/* Supported Sports Tile */}
              <View className="flex-1 bg-warm-white border border-stone rounded-xl p-3 items-center mr-2">
                <Text className="text-olive text-2xl font-black">
                  {profile.sports?.length ?? 0}
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">
                  Active Sports
                </Text>
              </View>

              {/* Scheduled Slots Tile */}
              <View className="flex-1 bg-warm-white border border-stone rounded-xl p-3 items-center">
                <Text className="text-graphite text-2xl font-black">
                  {scheduledMatches.length}
                </Text>
                <Text className="text-stone-muted text-[10px] font-bold uppercase tracking-wider mt-0.5 text-center">
                  Matches Today
                </Text>
              </View>
            </View>
          </View>

          {/* Supported Sports Cards */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-graphite text-xs font-black uppercase tracking-wider">
                SUPPORTED SPORTS
              </Text>
              <Text className="text-stone-muted text-[10px] font-semibold uppercase">
                {(profile.sports?.length ?? 0)} Configured
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {profile.sports && profile.sports.length > 0 ? (
                profile.sports.map((sport) => {
                  const info = ALL_SPORTS_MAP[sport];
                  return (
                    <View
                      key={sport}
                      className="flex-row items-center bg-warm-white border border-stone px-3 py-2 rounded-lg mr-2 mb-2"
                    >
                      <MaterialCommunityIcons
                        name={info?.iconName || 'soccer'}
                        size={18}
                        color="#4B6344"
                      />
                      <Text className="text-graphite text-xs font-black uppercase ml-2 tracking-wide">
                        {info?.label || sport}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View className="bg-warm-white border border-stone p-3 rounded-lg w-full">
                  <Text className="text-stone-muted text-xs">
                    No sports configured yet.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Hub Management Actions */}
          <View className="mt-4 bg-graphite rounded-xl p-4 border border-surface-border-dark">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-warm-white text-sm font-black uppercase tracking-tight">
                  HUB COURTS & ALLOCATIONS
                </Text>
                <Text className="text-stone text-[11px] font-medium mt-0.5">
                  Inspect court layouts, surfaces, and active playing slots.
                </Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-olive/20 items-center justify-center border border-olive">
                <Ionicons name="grid-outline" size={16} color="#F4F1EA" />
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/hub/courts')}
              accessibilityRole="button"
              accessibilityLabel="Manage Hub Courts"
              className="w-full bg-olive min-h-[46px] rounded-xl items-center justify-center active:opacity-90 active:scale-[0.99] border-b-[3px] border-olive-dark"
            >
              <View className="flex-row items-center">
                <Ionicons name="layers" size={16} color="#F4F1EA" />
                <Text className="text-warm-white text-sm font-black uppercase tracking-wider ml-2">
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
              <Text className="text-stone text-xs font-bold uppercase tracking-wider underline">
                EDIT VENUE DETAILS & CONTACT
              </Text>
            </Pressable>
          </View>

          {/* Match / Activity Summary At This Venue */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-graphite text-xs font-black uppercase tracking-wider">
                COMMUNITY MATCHES AT THIS VENUE
              </Text>
              <Text className="text-stone-muted text-[10px] font-semibold uppercase">
                Active Today
              </Text>
            </View>

            {scheduledMatches.map((m) => (
              <View
                key={m.id}
                className="bg-warm-white border border-stone rounded-xl p-3.5 mb-2.5 shadow-sm"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-graphite text-sm font-black uppercase tracking-tight">
                      {m.title}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="time-outline" size={12} color="#666B60" />
                      <Text className="text-stone-muted text-xs font-medium ml-1">
                        {m.time}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-graphite/10 px-2 py-0.5 rounded-sm border border-stone">
                    <Text className="text-graphite text-[10px] font-black uppercase">
                      {m.sportLabel}
                    </Text>
                  </View>
                </View>

                <View className="mt-2.5 pt-2 border-t border-stone flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={12} color="#666B60" />
                    <Text className="text-stone-muted text-xs font-semibold ml-1">
                      {m.court}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={12} color="#4B6344" />
                    <Text className="text-olive text-xs font-black ml-1 uppercase">
                      {m.slotsOpen} of {m.totalSlots} Slots Open
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Venue Facilities */}
          <View className="mt-4 bg-warm-white rounded-xl border border-stone p-4">
            <Text className="text-graphite text-xs font-black uppercase tracking-wider mb-3">
              VENUE AMENITIES & FACILITIES
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {facilities.map((fac) => (
                <View
                  key={fac.label}
                  className="flex-row items-center bg-stone-light/70 px-3 py-2 rounded-lg border border-stone/80 mr-2 mb-2"
                >
                  <Ionicons name={fac.icon} size={14} color="#242522" />
                  <Text className="text-graphite text-xs font-bold ml-1.5">
                    {fac.label}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-2 pt-3 border-t border-stone flex-row items-center justify-between">
              <Text className="text-stone-muted text-[11px] font-semibold">
                Operating under Maidaan Fair Play standards
              </Text>
              <Pressable
                onPress={() => showNotification('Facility amenities can be updated with venue re-inspection.')}
              >
                <Text className="text-graphite text-[11px] font-bold underline">
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
