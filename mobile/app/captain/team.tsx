import { isActiveCapability } from "../../utils/capabilities";
import { ArtworkScrollView as ThemedScroll } from "../../components/ui/Artwork";
import { ThemedScreen } from "../../components/ui/ThemedScreen";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from "../../components/theme/Primitives";

import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "../../components/theme/Icons";
import { useAuthStore } from "../../store/useAuthStore";
import { ArenaHeader } from "../../components/ui/ArenaHeader";
import { ArenaBadge } from "../../components/ui/ArenaBadge";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import {
  teamService,
  TeamModel,
  TeamMemberModel,
  TeamMemberRole,
} from "../../services/teamService";
import { Sport, SkillLevel } from "../../types";

const SPORT_META: Record<
  Sport,
  { label: string; icon: "soccer" | "cricket" | "tennis" | "badminton" }
> = {
  football: { label: "Football", icon: "soccer" },
  cricket: { label: "Cricket", icon: "cricket" },
  padel: { label: "Padel", icon: "tennis" },
  badminton: { label: "Badminton", icon: "badminton" },
};

const SKILL_METAS: Record<SkillLevel, { label: string; tierBadge: string }> = {
  beginner: { label: "Beginner", tierBadge: "Tier 3" },
  intermediate: { label: "Intermediate", tierBadge: "Tier 2" },
  advanced: { label: "Advanced", tierBadge: "Tier 1" },
};

export default function CaptainTeamScreen() {
  const { currentUser, roles, activeMode, captainProfile } = useAuthStore();
  const isCaptain = isActiveCapability(roles, activeMode, "TEAM_CAPTAIN");

  const [team, setTeam] = useState<TeamModel | null>(null);
  const [members, setMembers] = useState<TeamMemberModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Team Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Add Member Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamMemberRole>("PLAYER");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Remove Member Confirm Modal
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberModel | null>(
    null,
  );
  const [isRemoving, setIsRemoving] = useState(false);

  const isMountedRef = React.useRef(true);

  const loadTeamData = useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }
      const myTeam = await teamService.getMyTeam();
      if (isMountedRef.current) {
        setTeam(myTeam);
      }

      if (myTeam) {
        const teamMembers = await teamService.getTeamMembers();
        if (isMountedRef.current) {
          setMembers(teamMembers);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || "Failed to load team data.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadTeamData();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadTeamData]),
  );

  // Role Gate
  if (!isCaptain) {
    return (
      <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
        <ArenaHeader
          title="Team Management"
          subtitle="Access Restricted"
          showBack
          onBack={() => router.replace("/(tabs)/discover")}
        />
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-16 h-16 rounded-full bg-[#1B1D22] border border-white/10 items-center justify-center mb-4">
            <Ionicons name="shield-outline" size={30} color="#E85D26" />
          </View>
          <Text className="text-white text-lg font-black uppercase text-center">
            Captain Role Required
          </Text>
          <Text className="text-[#A0A5AD] text-sm text-center mt-2 max-w-[280px]">
            Only Team Captains can manage their team profile and squad roster.
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)/discover")}
            className="mt-6 px-6 py-3 bg-[#E85D26] rounded-xl"
          >
            <Text className="text-[#0C0D0E] font-black uppercase text-xs">
              Return to Discover
            </Text>
          </Pressable>
        </View>
      </ThemedScreen>
    );
  }

  // Handle Edit Team Submit
  const handleSaveEditTeam = async () => {
    if (!editName.trim() || editName.trim().length < 3) {
      Alert.alert(
        "Validation Error",
        "Team name must be at least 3 characters.",
      );
      return;
    }
    if (!editArea.trim() || editArea.trim().length < 2) {
      Alert.alert("Validation Error", "Area / Neighborhood is required.");
      return;
    }

    try {
      setIsSavingEdit(true);
      const updated = await teamService.updateTeam({
        name: editName.trim(),
        area: editArea.trim(),
      });
      setTeam(updated);
      setIsEditModalOpen(false);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update team.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Add Member Submit
  const handleAddMember = async () => {
    if (!newUserId.trim()) {
      setAddError("User ID is required.");
      return;
    }

    try {
      setIsAddingMember(true);
      setAddError(null);
      await teamService.addTeamMember({
        userId: newUserId.trim(),
        memberRole: newMemberRole,
      });
      setIsAddModalOpen(false);
      setNewUserId("");
      loadTeamData();
    } catch (err: any) {
      setAddError(err?.message || "Failed to add member.");
    } finally {
      setIsAddingMember(false);
    }
  };

  // Handle Remove Member Submit
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      setIsRemoving(true);
      await teamService.removeTeamMember(memberToRemove.userId);
      setMemberToRemove(null);
      loadTeamData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to remove member.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <ThemedScreen className="flex-1 bg-transparent" edges={["top"]}>
      <ArenaHeader
        title="My Team"
        subtitle="Squad & Roster"
        showBack
        onBack={() => router.replace("/captain/dashboard")}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E85D26" />
          <Text className="text-[#A0A5AD] text-xs font-mono uppercase tracking-wider mt-3">
            Loading Squad Data...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="alert-circle-outline" size={40} color="#E85D26" />
          <Text className="text-white text-base font-bold text-center mt-3">
            {error}
          </Text>
          <Pressable
            onPress={loadTeamData}
            className="mt-4 px-5 py-2.5 bg-[#1B1D22] border border-white/10 rounded-xl"
          >
            <Text className="text-white text-xs font-bold uppercase">
              Retry
            </Text>
          </Pressable>
        </View>
      ) : !team ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-16 h-16 rounded-full bg-[#1B1D22] border border-white/10 items-center justify-center mb-4">
            <Ionicons name="people-outline" size={32} color="#E85D26" />
          </View>
          <Text className="text-white text-lg font-black uppercase text-center">
            No Team Registered
          </Text>
          <Text className="text-[#A0A5AD] text-sm text-center mt-2 max-w-[280px]">
            Complete Captain Onboarding to register your team and unlock roster
            recruitment.
          </Text>
          <Pressable
            onPress={() => router.push("/onboarding/captain-setup")}
            className="mt-6 px-6 py-3 bg-[#E85D26] rounded-xl"
          >
            <Text className="text-[#0C0D0E] font-black uppercase text-xs">
              Set Up Captain Profile
            </Text>
          </Pressable>
        </View>
      ) : (
        <ThemedScroll
          kind="venues"
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* TEAM PROFILE CARD */}
          <View className="bg-[#141518]/25 rounded-2xl p-5 border border-white/10 mb-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[#A0A5AD] text-[10px] font-mono uppercase tracking-wider">
                  Registered Squad
                </Text>
                <Text className="text-white text-2xl font-black uppercase tracking-tight mt-1">
                  {team.name}
                </Text>
                <View className="flex-row items-center mt-2">
                  <Ionicons name="location-outline" size={14} color="#A0A5AD" />
                  <Text className="text-[#A0A5AD] text-xs font-medium ml-1">
                    {team.area}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  setEditName(team.name);
                  setEditArea(team.area);
                  setIsEditModalOpen(true);
                }}
                className="w-10 h-10 rounded-xl bg-[#1B1D22] border border-white/10 items-center justify-center"
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Badges Row */}
            <View className="flex-row flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
              <ArenaBadge
                label={
                  SPORT_META[team.sport]?.label.toUpperCase() ||
                  team.sport.toUpperCase()
                }
                variant="olive"
                size="sm"
              />
              <ArenaBadge
                label={SKILL_METAS[team.skillLevel]?.tierBadge || "Tier 2"}
                variant="stone"
                size="sm"
              />
              <ArenaBadge
                label={`${members.length} SQUAD MEMBER${members.length !== 1 ? "S" : ""}`}
                variant="rust"
                size="sm"
              />
            </View>

            {/* Quick Actions */}
            <View className="flex-row gap-3 mt-5">
              <Pressable
                onPress={() => router.push("/captain/create-match")}
                className="flex-1 bg-[#E85D26] min-h-[44px] rounded-xl flex-row items-center justify-center"
              >
                <Ionicons name="add-circle-outline" size={18} color="#0C0D0E" />
                <Text className="text-[#0C0D0E] font-black uppercase text-xs tracking-wider ml-1.5">
                  Schedule Match
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setNewUserId("");
                  setNewMemberRole("PLAYER");
                  setAddError(null);
                  setIsAddModalOpen(true);
                }}
                className="flex-1 bg-[#1B1D22] border border-white/10 min-h-[44px] rounded-xl flex-row items-center justify-center"
              >
                <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                <Text className="text-white font-bold uppercase text-xs tracking-wider ml-1.5">
                  Add Member
                </Text>
              </Pressable>
            </View>
          </View>

          {/* SQUAD ROSTER SECTION */}
          <View className="flex-row items-center justify-between mb-3 px-1">
            <View>
              <Text className="text-white text-base font-black uppercase tracking-tight">
                Squad Roster
              </Text>
              <Text className="text-[#A0A5AD] text-xs font-medium">
                Official team members managed by captain
              </Text>
            </View>
            <View className="px-2.5 py-1 bg-[#1B1D22] border border-white/10 rounded-full">
              <Text className="text-[#A0A5AD] text-[11px] font-mono font-bold">
                {members.length} Active
              </Text>
            </View>
          </View>

          {/* ROSTER LIST */}
          <View className="gap-3">
            {members.map((member) => {
              const isCaptainMember = member.memberRole === "CAPTAIN";
              return (
                <View
                  key={member.id}
                  className="bg-[#141518]/25 rounded-2xl p-4 border border-white/10 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View
                      className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
                        isCaptainMember
                          ? "bg-[#E85D26]/20 border border-[#E85D26]/40"
                          : "bg-[#1B1D22] border border-white/10"
                      }`}
                    >
                      {isCaptainMember ? (
                        <MaterialCommunityIcons
                          name="crown"
                          size={22}
                          color="#E85D26"
                        />
                      ) : (
                        <Ionicons name="person" size={20} color="#A0A5AD" />
                      )}
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-white text-sm font-bold tracking-tight">
                          {member.userName}
                        </Text>
                        {isCaptainMember && (
                          <View className="ml-2 px-1.5 py-0.5 bg-[#E85D26]/20 rounded">
                            <Text className="text-[#E85D26] text-[9px] font-mono font-black uppercase">
                              CAPTAIN
                            </Text>
                          </View>
                        )}
                        {member.memberRole === "VICE_CAPTAIN" && (
                          <View className="ml-2 px-1.5 py-0.5 bg-white/10 rounded">
                            <Text className="text-[#F4A261] text-[9px] font-mono font-black uppercase">
                              VICE CAPTAIN
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text className="text-[#A0A5AD] text-xs font-mono mt-0.5">
                        {member.userEmail ||
                          `Member ID: ${member.userId.slice(0, 8)}...`}
                      </Text>
                    </View>
                  </View>

                  {!isCaptainMember && (
                    <Pressable
                      onPress={() => setMemberToRemove(member)}
                      className="w-9 h-9 rounded-xl bg-[#1B1D22] border border-white/10 items-center justify-center"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#E85D26"
                      />
                    </Pressable>
                  )}
                </View>
              );
            })}

            {members.length <= 1 && (
              <View className="bg-[#141518]/60 border border-dashed border-white/10 rounded-2xl p-6 items-center justify-center">
                <Ionicons name="people-outline" size={28} color="#5C616A" />
                <Text className="text-white text-xs font-bold uppercase tracking-wider mt-2">
                  No Additional Teammates
                </Text>
                <Text className="text-[#5C616A] text-xs text-center mt-1 max-w-[260px]">
                  Your squad currently has no regular members. Tap "Add Member"
                  to build your roster.
                </Text>
              </View>
            )}
          </View>
        </ThemedScroll>
      )}

      {/* EDIT TEAM MODAL */}
      <Modal visible={isEditModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="w-full bg-[#141518]/25 rounded-2xl p-6 border border-white/10">
            <Text className="text-white text-lg font-black uppercase">
              Edit Team Details
            </Text>
            <Text className="text-[#A0A5AD] text-xs mt-1">
              Update your registered team name and primary location.
            </Text>

            <View className="mt-4">
              <Text className="text-[#A0A5AD] text-[10px] font-mono uppercase font-bold mb-1.5">
                Team Name
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Lahore Strikers"
                placeholderTextColor="#5C616A"
                className="bg-[#1B1D22] text-white px-4 py-3 rounded-xl border border-white/10 text-sm"
              />
            </View>

            <View className="mt-4">
              <Text className="text-[#A0A5AD] text-[10px] font-mono uppercase font-bold mb-1.5">
                Area / Neighborhood
              </Text>
              <TextInput
                value={editArea}
                onChangeText={setEditArea}
                placeholder="e.g. Model Town, Lahore"
                placeholderTextColor="#5C616A"
                className="bg-[#1B1D22] text-white px-4 py-3 rounded-xl border border-white/10 text-sm"
              />
            </View>

            <View className="flex-row gap-3 mt-6">
              <Pressable
                onPress={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 bg-[#1B1D22] border border-white/10 rounded-xl items-center justify-center"
              >
                <Text className="text-[#A0A5AD] font-bold uppercase text-xs">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSaveEditTeam}
                disabled={isSavingEdit}
                className="flex-1 py-3 bg-[#E85D26] rounded-xl items-center justify-center"
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#0C0D0E" />
                ) : (
                  <Text className="text-[#0C0D0E] font-black uppercase text-xs">
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD MEMBER MODAL */}
      <Modal visible={isAddModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="w-full bg-[#141518]/25 rounded-2xl p-6 border border-white/10">
            <Text className="text-white text-lg font-black uppercase">
              Add Squad Member
            </Text>
            <Text className="text-[#A0A5AD] text-xs mt-1">
              Add a registered player to your squad roster by User ID.
            </Text>

            {addError && (
              <View className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <Text className="text-red-400 text-xs font-medium">
                  {addError}
                </Text>
              </View>
            )}

            <View className="mt-4">
              <Text className="text-[#A0A5AD] text-[10px] font-mono uppercase font-bold mb-1.5">
                Player User ID
              </Text>
              <TextInput
                value={newUserId}
                onChangeText={setNewUserId}
                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                placeholderTextColor="#5C616A"
                className="bg-[#1B1D22] text-white px-4 py-3 rounded-xl border border-white/10 text-sm font-mono"
              />
            </View>

            <View className="mt-4">
              <Text className="text-[#A0A5AD] text-[10px] font-mono uppercase font-bold mb-1.5">
                Squad Role
              </Text>
              <View className="flex-row gap-2">
                {(["PLAYER", "VICE_CAPTAIN"] as TeamMemberRole[]).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setNewMemberRole(r)}
                    className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                      newMemberRole === r
                        ? "bg-[#E85D26]/20 border-[#E85D26]"
                        : "bg-[#1B1D22] border-white/10"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase ${
                        newMemberRole === r
                          ? "text-[#E85D26]"
                          : "text-[#A0A5AD]"
                      }`}
                    >
                      {r.replace("_", " ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="flex-row gap-3 mt-6">
              <Pressable
                onPress={() => setIsAddModalOpen(false)}
                className="flex-1 py-3 bg-[#1B1D22] border border-white/10 rounded-xl items-center justify-center"
              >
                <Text className="text-[#A0A5AD] font-bold uppercase text-xs">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleAddMember}
                disabled={isAddingMember}
                className="flex-1 py-3 bg-[#E85D26] rounded-xl items-center justify-center"
              >
                {isAddingMember ? (
                  <ActivityIndicator size="small" color="#0C0D0E" />
                ) : (
                  <Text className="text-[#0C0D0E] font-black uppercase text-xs">
                    Add Member
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONFIRM REMOVE MODAL */}
      <Modal visible={!!memberToRemove} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="w-full bg-[#141518]/25 rounded-2xl p-6 border border-white/10">
            <View className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 items-center justify-center mb-3">
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </View>
            <Text className="text-white text-lg font-black uppercase">
              Remove Member
            </Text>
            <Text className="text-[#A0A5AD] text-xs mt-1">
              Are you sure you want to remove{" "}
              <Text className="text-white font-bold">
                {memberToRemove?.userName}
              </Text>{" "}
              from your squad roster?
            </Text>

            <View className="flex-row gap-3 mt-6">
              <Pressable
                onPress={() => setMemberToRemove(null)}
                className="flex-1 py-3 bg-[#1B1D22] border border-white/10 rounded-xl items-center justify-center"
              >
                <Text className="text-[#A0A5AD] font-bold uppercase text-xs">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleRemoveMember}
                disabled={isRemoving}
                className="flex-1 py-3 bg-red-600 rounded-xl items-center justify-center"
              >
                {isRemoving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-black uppercase text-xs">
                    Remove
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}
