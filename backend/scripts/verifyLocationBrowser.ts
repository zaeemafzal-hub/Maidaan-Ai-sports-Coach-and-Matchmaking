// Disposable local-only fixture server for UI verification. Never writes Supabase.
process.env.NODE_ENV = "test";
process.env.APP_DATA_MODE = "test";
async function main() {
  const { default: app } = await import("../src/app.js");
  const { SupabaseRepo } = await import("../src/models/supabaseRepo.js");
  const { VenueRepo } = await import("../src/models/venueRepo.js");
  const player = "00000000-0000-0000-0000-000000007201";
  await SupabaseRepo.createProfile({
    id: player,
    name: "Location QA Player",
    email: "location-qa@example.com",
    role: "PLAYER",
  });
  await SupabaseRepo.upsertPlayerProfile({
    userId: player,
    preferredSports: ["cricket"],
    skillLevel: "intermediate",
    primaryLocation: "Gulberg, Lahore",
    cityId: "lahore",
    areaId: "gulberg",
    phone: "+923001234567",
    avatarUrl: "",
  });
  await SupabaseRepo.setOnboardingCompleted(player, true);
  for (const [id, name, area, lat, lng] of [
    [
      "00000000-0000-0000-0000-000000007202",
      "Gulberg QA Arena",
      "gulberg",
      31.52,
      74.35,
    ],
    [
      "00000000-0000-0000-0000-000000007203",
      "Johar QA Arena",
      "johar-town",
      31.46,
      74.27,
    ],
  ] as const) {
    await SupabaseRepo.createProfile({
      id,
      name,
      email: "owner-qa@example.com",
      role: "HUB_OWNER",
    });
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: id,
      hubName: name,
      sports: ["cricket"],
      location: "Lahore",
      courtCount: 0,
    });
    await VenueRepo.saveDetails(id, {
      hubName: name,
      sports: ["cricket"],
      location: "Lahore",
      contactNumber: "+923001234567",
      cityId: "lahore",
      areaId: area,
      latitude: lat,
      longitude: lng,
      description: "Local UI fixture",
      photoUrls: [],
    });
  }
  const captain = "00000000-0000-0000-0000-000000007204";
  await SupabaseRepo.createProfile({
    id: captain,
    name: "UI QA Captain",
    email: "captain-qa@example.com",
    role: "TEAM_CAPTAIN",
  });
  await SupabaseRepo.upsertCaptainProfile({
    userId: captain,
    teamName: "Lahore UI Squad",
    sports: ["cricket"],
    skillLevel: "intermediate",
    primaryLocation: "Gulberg, Lahore",
  });
  await SupabaseRepo.setOnboardingCompleted(captain, true);
  await SupabaseRepo.createMatch({
    captainId: captain,
    sport: "cricket",
    title: "UI QA Cricket Match",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    startTime: "18:00",
    venueName: "Gulberg QA Arena",
    area: "Gulberg, Lahore",
    skillLevel: "intermediate",
    totalCapacity: 12,
    openSlots: 3,
    contributionPerPlayer: 500,
  });
  const admin = "00000000-0000-0000-0000-000000007205";
  await SupabaseRepo.createProfile({
    id: admin,
    name: "UI QA Administrator",
    email: "admin-qa@example.com",
    role: "ADMIN",
  });
  await SupabaseRepo.setOnboardingCompleted(admin, true);
  const server = app.listen(5002, "127.0.0.1", () =>
    console.log(
      "Local fixture API on 127.0.0.1:5002; Supabase writes disabled.",
    ),
  );
  process.on("SIGINT", () => server.close(() => process.exit(0)));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
