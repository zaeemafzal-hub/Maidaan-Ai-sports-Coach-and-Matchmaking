import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/useAuthStore";
import { Role } from "../../types";
import { RoleCard } from "../../components/ui/RoleCard";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { AmbientGlowOverlay } from "../../components/ui";
import { authService } from "../../services/authService";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

interface RoleOption {
  role: Role;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  badgeText?: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "PLAYER",
    title: "Athlete / Player",
    description:
      "Find open evening matches, get drafted into local squads, track performance, and train.",
    iconName: "football-outline",
    badgeText: "PRIMARY",
  },
  {
    role: "TEAM_CAPTAIN",
    title: "Team Captain",
    description:
      "Organize competitive fixtures, recruit replacement players, manage join requests, and build team reputation.",
    iconName: "shield-outline",
  },
  {
    role: "HUB_OWNER",
    title: "Ground Owner",
    description:
      "List sports complexes, floodlit grounds, and turf arenas. Manage slots and increase bookings.",
    iconName: "business-outline",
  },
];

export default function RoleSelectionScreen() {
  const { loadProfile } = useAuthStore();
  // This legacy onboarding choice is only a form value, never an authorization mode.
  const [selectedRole, setSelectedRole] = useState<Role>("PLAYER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRole) {
      setSelectedRole("PLAYER");
    }
  }, [selectedRole, setSelectedRole]);

  const currentRole = selectedRole || "PLAYER";

  const handleContinue = async () => {
    if (isSubmitting) return;
    setError(null);

    // Check if user already has an active Supabase session (e.g. from Google OAuth)
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          setIsSubmitting(true);
          const meta = data.session.user?.user_metadata || {};
          const displayName =
            meta.full_name ||
            meta.name ||
            data.session.user?.email?.split("@")[0] ||
            "Athlete";

          await authService.initProfile({
            name: displayName,
            role: currentRole,
          });

          await loadProfile();

          switch (currentRole) {
            case "PLAYER":
              router.replace("/onboarding/player-setup");
              break;
            case "TEAM_CAPTAIN":
              router.replace("/onboarding/captain-setup");
              break;
            case "HUB_OWNER":
              router.replace("/onboarding/hub-setup");
              break;
            default:
              router.replace("/onboarding/player-setup");
              break;
          }
          return;
        }
      } catch (err: any) {
        setError(err?.message || "Failed to initialize account identity.");
        setIsSubmitting(false);
        return;
      }
    }

    // New unauthenticated registration flow
    router.push("/(auth)/create-account");
  };

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <AmbientGlowOverlay showTop={true} showBottom={false} />
      <ArenaHeader
        title="Role Selection"
        subtitle="Step 1 of 2"
        showBack
        fallbackRoute="/(auth)/welcome"
        rightAction={
          <View className="px-3 py-1 rounded-full bg-[#1B1D22] border border-[rgba(255,255,255,0.08)]">
            <Text className="text-[#A0A5AD] text-[10px] font-bold uppercase tracking-wider">
              Identity
            </Text>
          </View>
        }
      />

      <ThemedScroll
        kind="form"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="px-5"
      >
        {/* Athletic Headline */}
        <View className="mt-4 mb-6">
          <Text className="text-white text-2xl font-bold tracking-tight">
            How will you participate?
          </Text>
          <Text className="text-[#A0A5AD] text-sm leading-relaxed mt-2 font-normal">
            Choose your primary role. This personalizes your discovery,
            fixtures, coaching, and team tools.
          </Text>
        </View>

        {error && (
          <View className="mb-4 p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30">
            <Text className="text-[#EF4444] text-xs font-medium text-center">
              {error}
            </Text>
          </View>
        )}

        {/* Identity Cards */}
        <View className="space-y-3.5 flex-1">
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
        <View className="pt-6 pb-6">
          <PrimaryButton
            title="Continue"
            onPress={handleContinue}
            loading={isSubmitting}
            variant="primary"
            size="lg"
          />

          <Text className="text-[#5C616A] text-xs font-normal text-center mt-3">
            You can change or add roles later in your profile settings.
          </Text>
        </View>
      </ThemedScroll>
    </ThemedScreen>
  );
}
