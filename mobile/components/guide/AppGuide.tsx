import React, { useEffect } from "react";
import { Modal, View, Text, ScrollView, Pressable } from "../theme/Primitives";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "../theme/Icons";
import { useAuthStore } from "../../store/useAuthStore";
import { useGuideStore } from "../../store/useGuideStore";

const COMMON_CHAPTERS = [
  {
    title: "Welcome to Maidaan",
    steps: [
      "Find nearby games, explore sports venues and improve your game in one place. Maidaan currently focuses on Lahore.",
      "Use Discover for matches, Venues for courts and slots, AI Coach for training, Chat for conversations and Profile for your account.",
      "You can close this guide at any time and reopen it from the help icon or your profile.",
    ],
  },
  {
    title: "Set up your account",
    steps: [
      "Create an account with a strong password and verify your email using the link in your inbox. Google sign-in is also available.",
      "Complete your name, phone number, home address, sports and skill level. Add a profile photo if you like.",
      "Use Profile to update your details and switch between the roles your account has been granted.",
    ],
  },
  {
    title: "Find and join a match",
    steps: [
      "Open Discover and choose a sport. Open a match to check the date, time, skill level, fee and open spots.",
      "Tap the venue or location to view the match address on a map. Weather is advisory; check with the host if conditions change.",
      "Tap Request to Join. Your spot is confirmed only after the captain accepts. Check Notifications and your match chat for updates.",
    ],
  },
  {
    title: "Explore venues and slots",
    steps: [
      "Open Venues, select Lahore and search by venue name, address or area. Switch between the list and map.",
      "Open a venue to view its photos, facilities, playing spaces, prices and available time slots.",
      "Choose the correct date, court or pitch before continuing. Venue slots are separate from requests to join a captain’s match.",
    ],
  },
  {
    title: "Bookings and cancellation",
    steps: [
      "Where booking is enabled, select a slot and review the full price, required advance, balance and cancellation policy.",
      "A reservation requires a successful upfront payment. Depending on the owner’s policy, pay the full price or an advance and settle the remainder at the venue.",
      "Check your booking status and the owner’s cancellation deadline. Refunds depend on the disclosed policy and cancellation time. If checkout is unavailable, contact the venue; do not assume the slot is reserved.",
    ],
  },
  {
    title: "Chat and notifications",
    steps: [
      "Chat shows your direct and match-group conversations. Use the correct match group to coordinate with your squad.",
      "Notifications show updates such as join-request decisions. Open the related match or request to check its current status.",
      "Keep conversations respectful. Report inappropriate conduct through the reporting controls where available.",
    ],
  },
  {
    title: "Your AI tools",
    steps: [
      "Use AI Coach for sport-specific techniques, tactics and drills. Choose your sport before asking a training question. Voice features depend on your device and microphone permission.",
      "Your Assistant helps you find matches and venues, understand app features and check weather. You can reopen both assistants without losing saved account history.",
      "Review all results. An assistant draft never creates a match or changes a join request until you explicitly confirm it. AI coaching is not medical advice.",
    ],
  },
];
const ROLE_CHAPTERS = {
  TEAM_CAPTAIN: {
    title: "Captain workspace",
    steps: [
      "Create your team, then schedule a match with its sport, venue, time, capacity and contribution.",
      "Review incoming join requests. Accept only the players you want to confirm; the app checks remaining capacity.",
      "Use your dashboard to manage open spots and open squad chat. Your Assistant can prepare supported actions for your confirmation.",
    ],
  },
  HUB_OWNER: {
    title: "Hub owner workspace",
    steps: [
      "Complete your hub’s name, address, contact details, map location and venue photos.",
      "Add each court or pitch as a playing space, with the correct sport and facilities. Then publish its available slots and prices.",
      "For bookable slots, set upfront payment and cancellation rules clearly. Keep your listing and availability current, and check reservations before changing inventory.",
    ],
  },
  ADMIN: {
    title: "Admin control center",
    steps: [
      "Use the admin dashboard to review hub verification, reports and account status. Check supporting details before taking action.",
      "Suspend rule-breaking accounts or listings when necessary. Suspensions preserve history and allow reinstatement.",
      "Super-user access is restricted. Grant it only to trusted people; role selection and public signup never grant administrator permissions.",
    ],
  },
};

export function GuideButton({ compact = false }: { compact?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Maidaan guide"
      onPress={useGuideStore.getState().open}
      className={
        compact
          ? "w-11 h-11 items-center justify-center"
          : "min-h-[44px] flex-row items-center justify-center gap-2"
      }
    >
      <Ionicons name="help-circle-outline" size={22} color="#E85D26" />
      {!compact ? (
        <Text className="text-[#E85D26] text-sm font-semibold">
          How Maidaan works
        </Text>
      ) : null}
    </Pressable>
  );
}

export function AppGuide() {
  const { visible, chapter, select, close, open } = useGuideStore();
  const userId = useAuthStore((state) => state.currentUser?.id);
  const status = useAuthStore((state) => state.authStatus);
  const mode = useAuthStore((state) => state.activeMode);
  const key = userId ? `maidaan.guide.seen.v1:${userId}` : null;
  useEffect(() => {
    close();
  }, [userId, close]);
  useEffect(() => {
    let active = true;
    if (key && status === "READY")
      void AsyncStorage.getItem(key)
        .then((seen) => {
          if (active && !seen) open();
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [key, status, open]);
  const dismiss = () => {
    close();
    if (key) void AsyncStorage.setItem(key, "1").catch(() => {});
  };
  const extra =
    mode in ROLE_CHAPTERS
      ? ROLE_CHAPTERS[mode as keyof typeof ROLE_CHAPTERS]
      : null;
  const chapters = extra ? [...COMMON_CHAPTERS, extra] : COMMON_CHAPTERS;
  const index = Math.min(chapter, chapters.length - 1),
    current = chapters[index];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-4 py-8">
        <View
          accessibilityViewIsModal
          className="w-full max-w-[640px] max-h-[88%] rounded-3xl bg-[#141518] border border-white/[0.12] overflow-hidden"
        >
          <View className="px-5 pt-4 flex-row justify-between items-center">
            <Text className="text-[#E85D26] text-xs font-bold uppercase tracking-wider">
              Your Maidaan guide
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Maidaan guide"
              onPress={dismiss}
              className="w-11 h-11 items-center justify-center"
            >
              <Ionicons name="close" size={22} color="#A0A5AD" />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              gap: 8,
              paddingBottom: 12,
            }}
          >
            {chapters.map((item, i) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                accessibilityLabel={`Guide chapter ${i + 1}: ${item.title}`}
                accessibilityState={{ selected: index === i }}
                onPress={() => select(i)}
                className={`min-h-[44px] px-3 rounded-full justify-center border ${index === i ? "bg-[#E85D26]/15 border-[#E85D26]" : "border-white/[0.08]"}`}
              >
                <Text
                  className={
                    index === i
                      ? "text-[#E85D26] text-xs"
                      : "text-[#A0A5AD] text-xs"
                  }
                >
                  {i + 1}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView
            key={current.title}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}
          >
            <Text
              accessibilityRole="header"
              className="text-white text-2xl font-bold mb-4"
            >
              {current.title}
            </Text>
            {current.steps.map((step, i) => (
              <View key={step} className="flex-row gap-3 mb-4">
                <Text className="text-[#E85D26] text-sm font-bold">
                  {i + 1}.
                </Text>
                <Text className="text-[#A0A5AD] text-sm leading-6 flex-1">
                  {step}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View className="px-5 py-4 border-t border-white/[0.08] flex-row items-center justify-between gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous guide chapter"
              disabled={index === 0}
              onPress={() => select(index - 1)}
              className="min-h-[44px] px-3 justify-center"
            >
              <Text
                className={
                  index === 0
                    ? "text-[#5C616A] text-sm"
                    : "text-[#A0A5AD] text-sm"
                }
              >
                Back
              </Text>
            </Pressable>
            <Text className="text-[#A0A5AD] text-xs">
              {index + 1} / {chapters.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                index === chapters.length - 1
                  ? "Finish Maidaan guide"
                  : "Next guide chapter"
              }
              onPress={() =>
                index === chapters.length - 1 ? dismiss() : select(index + 1)
              }
              className="min-h-[44px] px-5 bg-[#E85D26] rounded-full justify-center"
            >
              <Text className="text-white text-sm font-bold">
                {index === chapters.length - 1 ? "Got it" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
