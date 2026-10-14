import { supabaseAdmin, isServerSupabaseConfigured } from './dist/lib/supabase.js';
import { SupabaseRepo } from './dist/models/supabaseRepo.js';

async function seedDemoData() {
  console.log('====================================================');
  console.log('   MAIDAAN — SEEDING PERSISTED DEMO ACCOUNTS & DATA  ');
  console.log('====================================================\n');

  if (!isServerSupabaseConfigured) {
    console.error('Server Supabase is not configured!');
    process.exit(1);
  }

  // 1. Helper to find or create Supabase Auth user
  async function ensureAuthUser(email, password) {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    let existing = listData?.users?.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!existing) {
      console.log(`Creating Auth user: ${email}...`);
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      return created.user;
    }
    // Update password to ensure it matches Password123!
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    console.log(`User exists: ${email} (${existing.id})`);
    return existing;
  }

  // A. ADMIN ACCOUNT
  console.log('\n--- 1. Seed Admin Account ---');
  const adminUser = await ensureAuthUser('admin@maidaan.pk', 'AdminPassword123!');
  const adminProfile = await SupabaseRepo.getProfile(adminUser.id);
  if (!adminProfile) {
    await SupabaseRepo.createProfile({
      id: adminUser.id,
      name: 'Platform Administrator',
      email: 'admin@maidaan.pk',
      role: 'ADMIN',
    });
  }
  await SupabaseRepo.setOnboardingCompleted(adminUser.id, true);
  console.log('Admin ready: admin@maidaan.pk / AdminPassword123!');

  // B. TEAM CAPTAIN ACCOUNT
  console.log('\n--- 2. Seed Team Captain Account ---');
  const captainUser = await ensureAuthUser('captain.demo@maidaan.pk', 'Password123!');
  const captainProfile = await SupabaseRepo.getProfile(captainUser.id);
  if (!captainProfile) {
    await SupabaseRepo.createProfile({
      id: captainUser.id,
      name: 'Shaheen Captain',
      email: 'captain.demo@maidaan.pk',
      role: 'TEAM_CAPTAIN',
    });
  }
  await SupabaseRepo.upsertCaptainProfile({
    userId: captainUser.id,
    teamName: 'Lahore Qalandars',
    sports: ['cricket', 'padel'],
    skillLevel: 'advanced',
    primaryLocation: 'Lahore Cantt',
  });
  await SupabaseRepo.setOnboardingCompleted(captainUser.id, true);
  console.log('Captain ready: captain.demo@maidaan.pk / Password123!');

  // C. PLAYER ACCOUNT
  console.log('\n--- 3. Seed Player Account ---');
  const playerUser = await ensureAuthUser('player.demo@maidaan.pk', 'Password123!');
  const playerProfile = await SupabaseRepo.getProfile(playerUser.id);
  if (!playerProfile) {
    await SupabaseRepo.createProfile({
      id: playerUser.id,
      name: 'Babar Player',
      email: 'player.demo@maidaan.pk',
      role: 'PLAYER',
    });
  }
  await SupabaseRepo.upsertPlayerProfile({
    userId: playerUser.id,
    preferredSports: ['cricket', 'football', 'badminton'],
    skillLevel: 'intermediate',
    primaryLocation: 'Gulberg III, Lahore',
    matchesPlayed: 14,
  });
  await SupabaseRepo.setOnboardingCompleted(playerUser.id, true);
  console.log('Player ready: player.demo@maidaan.pk / Password123!');

  // D. HUB OWNER ACCOUNT
  console.log('\n--- 4. Seed Hub Owner Account ---');
  const hubUser = await ensureAuthUser('hub.demo@maidaan.pk', 'Password123!');
  const hubProfile = await SupabaseRepo.getProfile(hubUser.id);
  if (!hubProfile) {
    await SupabaseRepo.createProfile({
      id: hubUser.id,
      name: 'Ahmad Hub Owner',
      email: 'hub.demo@maidaan.pk',
      role: 'HUB_OWNER',
    });
  }
  await SupabaseRepo.upsertHubOwnerProfile({
    userId: hubUser.id,
    hubName: 'Maidaan Sports Arena',
    location: 'Gulberg III, Main Boulevard, Lahore',
    courtCount: 3,
    contactNumber: '+92 300 8472910',
    sports: ['cricket', 'padel', 'badminton'],
  });
  await SupabaseRepo.setOnboardingCompleted(hubUser.id, true);
  console.log('Hub Owner ready: hub.demo@maidaan.pk / Password123!');

  // E. SEED INITIAL MATCHES FOR DEMO
  console.log('\n--- 5. Seed Initial Demo Matches ---');
  const existingMatches = await SupabaseRepo.getCaptainMatches(captainUser.id);
  if (existingMatches.length === 0) {
    const tmrw = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const match1 = await SupabaseRepo.createMatch({
      captainId: captainUser.id,
      sport: 'cricket',
      title: 'Floodlit Tape-Ball T20 Clash',
      format: 'Tape-Ball 8v8',
      date: tmrw,
      startTime: '20:00',
      venueName: 'Model Town Greens',
      area: 'Model Town, Lahore',
      skillLevel: 'intermediate',
      totalCapacity: 16,
      openSlots: 3,
      contributionPerPlayer: 600,
      notes: 'Under floodlights, new tape provided. Looking for middle-order batsmen.',
      mapPosition: { x: 45, y: 55 },
    });
    console.log(`Created Demo Match 1: ${match1.title} (${match1.id})`);

    const match2 = await SupabaseRepo.createMatch({
      captainId: captainUser.id,
      sport: 'padel',
      title: 'Weekend Padel Doubles Friendly',
      format: 'Doubles 2v2',
      date: tmrw,
      startTime: '18:30',
      venueName: 'Smash Padel Club',
      area: 'Gulberg III, Lahore',
      skillLevel: 'intermediate',
      totalCapacity: 4,
      openSlots: 1,
      contributionPerPlayer: 1500,
      notes: 'Need 1 player on left side. Rackets available for rent at venue.',
      mapPosition: { x: 50, y: 40 },
    });
    console.log(`Created Demo Match 2: ${match2.title} (${match2.id})`);
  } else {
    console.log(`Captain already has ${existingMatches.length} existing demo matches.`);
  }

  // F. SEED INITIAL COURTS FOR HUB OWNER
  console.log('\n--- 6. Seed Initial Demo Courts for Hub Owner ---');
  const existingCourts = await SupabaseRepo.getHubCourtsByOwner(hubUser.id);
  if (existingCourts.length === 0) {
    const court1 = await SupabaseRepo.createHubCourt({
      hubOwnerId: hubUser.id,
      name: 'Court 1 - Covered Panoramic Padel',
      sport: 'padel',
      status: 'AVAILABLE',
    });
    console.log(`Created Court 1: ${court1.name} (${court1.id})`);

    const court2 = await SupabaseRepo.createHubCourt({
      hubOwnerId: hubUser.id,
      name: 'Net 2 - Floodlit Tape-Ball Pitch',
      sport: 'cricket',
      status: 'AVAILABLE',
    });
    console.log(`Created Court 2: ${court2.name} (${court2.id})`);
  } else {
    console.log(`Hub Owner already has ${existingCourts.length} existing demo courts.`);
  }

  console.log('\n====================================================');
  console.log('DEMO DATA SEEDING COMPLETE & PERSISTED IN SUPABASE!');
  console.log('====================================================');
  console.log('DEMO CREDENTIALS FOR PRESENTATION:');
  console.log('  PLAYER:      player.demo@maidaan.pk  / Password123!');
  console.log('  CAPTAIN:     captain.demo@maidaan.pk / Password123!');
  console.log('  HUB OWNER:   hub.demo@maidaan.pk     / Password123!');
  console.log('  ADMIN:       admin@maidaan.pk        / AdminPassword123!');
  console.log('====================================================\n');
}

seedDemoData().catch((err) => {
  console.error('Error seeding demo data:', err);
  process.exit(1);
});
