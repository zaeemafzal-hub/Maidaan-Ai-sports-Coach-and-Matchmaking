import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { Role } from '../../types';
import { RoleCard } from '../../components/ui/RoleCard';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ArenaHeader } from '../../components/ui/ArenaHeader';

interface RoleOption {
  role: Role;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  badgeText?: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'PLAYER',
    title: 'Athlete / Player',
    description:
      'Find open evening matches, get drafted into local squads, track performance, and train.',
    iconName: 'football-outline',
    badgeText: 'PRIMARY',
  },
  {
    role: 'TEAM_CAPTAIN',
    title: 'Team Captain',
    description:
      'Organize competitive fixtures, recruit replacement players, manage join requests, and build team reputation.',
    iconName: 'shield-outline',
  },
  {
    role: 'HUB_OWNER',
    title: 'Ground Owner',
    description:
      'List sports complexes, floodlit grounds, and turf arenas. Manage slots and increase bookings.',
    iconName: 'business-outline',
  },
];

export default function RoleSelectionScreen() {
  const { selectedRole, setSelectedRole } = useAuthStore();

  useEffect(() => {
    if (!selectedRole) {
      setSelectedRole('PLAYER');
    }
  }, [selectedRole, setSelectedRole]);

  const currentRole = selectedRole || 'PLAYER';

  const handleContinue = () => {
    router.push('/(auth)/create-account');
  };

  return (
    <SafeAreaView className="flex-1 bg-warm-white" edges={['top', 'bottom']}>
      <ArenaHeader
        title="MAIDAAN"
        subtitle="STEP 01 OF 02"
        showBack
        fallbackRoute="/(auth)/welcome"
        rightAction={
          <View className="px-2.5 py-1 rounded-sm bg-stone/30 border border-stone">
            <Text className="text-graphite text-[10px] font-black uppercase tracking-wider">
              IDENTITY
            </Text>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="px-6"
      >
        {/* Athletic Headline */}
        <View className="mt-5 mb-5">
          <Text className="text-graphite text-2xl font-black uppercase tracking-tight">
            How will you enter the arena?
          </Text>
          <Text className="text-stone-muted text-xs font-semibold leading-relaxed mt-1.5 uppercase tracking-wide">
            Select your sporting identity. This shapes your match discovery, team rosters, and ground access.
          </Text>
        </View>

        {/* Identity Cards */}
        <View className="space-y-3 flex-1">
          {ROLE_OPTIONS.map((option) => (
            <RoleCard
              key={option.role}
              title={option.title}
              description={option.description}
              iconName={option.iconName}
              badgeText={option.badgeText}
              selected={currentRole === option.role}
              onSelect={() => setSelectedRole(option.role)}
              testID={`role-card-${option.role.toLowerCase()}`}
            />
          ))}
        </View>

        {/* Bottom CTA */}
        <View className="pt-6 pb-4">
          <PrimaryButton
            title="CONTINUE TO REGISTRATION"
            onPress={handleContinue}
            variant="primary"
          />

          <Text className="text-stone-muted text-[11px] font-medium text-center mt-3 uppercase tracking-wide">
            Role can be updated or expanded anytime in profile settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
