import dotenv from 'dotenv';
dotenv.config();

import { isProduction, getAppDataMode } from '../src/config/runtime.js';
import { isServerSupabaseConfigured, supabaseAdmin } from '../src/lib/supabase.js';
import { SupabaseRepo, Sport, SkillLevel } from '../src/models/supabaseRepo.js';

/**
 * Explicit Non-Production Demo Seeding Script.
 * Strictly gated against production environments.
 */
async function seedDemoData() {
  console.log('======================================================');
  console.log('🌱 MAIDAAN EXPLICIT DEMO SEEDING SCRIPT');
  console.log('======================================================\n');

  // Hard production safeguards
  if (isProduction() || getAppDataMode() === 'production') {
    console.error('❌ FATAL ERROR: Cannot run seed:demo in production mode! Aborting immediately.');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  if (
    supabaseUrl.includes('prod') ||
    supabaseUrl.includes('production') ||
    supabaseUrl.includes('live')
  ) {
    console.error(`❌ FATAL ERROR: Target SUPABASE_URL (${supabaseUrl}) appears to be a production database! Aborting.`);
    process.exit(1);
  }

  console.log(`[seedDemo] Current mode: ${getAppDataMode()}`);
  console.log(`[seedDemo] Live Supabase configured: ${isServerSupabaseConfigured}\n`);

  const now = new Date().toISOString();

  // 1. Seed Demo Admin
  const adminId = '00000000-0000-0000-0000-000000000001';
  console.log('1. Seeding Demo Admin...');
  try {
    await SupabaseRepo.createProfile({
      id: adminId,
      name: 'Platform Administrator',
      email: 'admin@maidaan.pk',
      role: 'ADMIN',
    });
    await SupabaseRepo.addRole(adminId, 'ADMIN');
    await SupabaseRepo.setOnboardingCompleted(adminId, true);
    console.log('   ✅ Admin seeded');
  } catch (err: any) {
    console.warn('   ⚠️ Admin seed skipped/error:', err?.message || err);
  }

  // 2. Seed Demo Captain & Team
  const captainId = '00000000-0000-0000-0000-000000000002';
  let teamId: string | undefined;
  console.log('2. Seeding Demo Captain & Team...');
  try {
    await SupabaseRepo.createProfile({
      id: captainId,
      name: 'Shaheen Afridi',
      email: 'captain@maidaan.pk',
      role: 'TEAM_CAPTAIN',
    });
    await SupabaseRepo.addRole(captainId, 'PLAYER');
    await SupabaseRepo.addRole(captainId, 'TEAM_CAPTAIN');
    await SupabaseRepo.setOnboardingCompleted(captainId, true);
    await SupabaseRepo.upsertCaptainProfile({
      userId: captainId,
      teamName: 'Lahore Qalandars Grassroots',
      sports: ['cricket'] as Sport[],
      skillLevel: 'intermediate' as SkillLevel,
      primaryLocation: 'Gulberg III, Lahore',
    });

    try {
      const team = await SupabaseRepo.createTeam({
        captainId,
        name: 'Lahore Qalandars Grassroots',
        sport: 'cricket',
        skillLevel: 'intermediate',
        area: 'Gulberg III, Lahore',
      });
      teamId = team.id;
    } catch (teamErr: any) {
      console.warn('   ⚠️ Team creation skipped (ensure 20261016000002_create_teams_and_team_members_tables.sql is run):', teamErr?.message);
    }
    console.log('   ✅ Captain seeded');
  } catch (err: any) {
    console.warn('   ⚠️ Captain seed error:', err?.message || err);
  }

  // 3. Seed Demo Match for Captain
  console.log('3. Seeding Demo Match...');
  let matchId: string | undefined;
  try {
    const match = await SupabaseRepo.createMatch({
      captainId,
      teamId,
      title: 'Gulberg Floodlit Tape-Ball T10',
      sport: 'cricket',
      format: 'Tape-Ball (8 Overs)',
      date: 'Tonight',
      startTime: '8:30 PM',
      venueName: 'Gulberg Central Sports Arena',
      area: 'Gulberg III, Lahore',
      skillLevel: 'intermediate',
      totalCapacity: 16,
      openSlots: 4,
      contributionPerPlayer: 350,
      notes: 'Friendly floodlit tape-ball fixture. Bibs and taped balls provided.',
      schematicX: 52,
      schematicY: 48,
    });
    matchId = match.id;
    console.log('   ✅ Match seeded');
  } catch (err: any) {
    console.warn('   ⚠️ Match seed skipped/error:', err?.message || err);
  }

  // 4. Seed Demo Player & Join Request
  console.log('4. Seeding Demo Player & Join Request...');
  const playerId = '00000000-0000-0000-0000-000000000020';
  try {
    await SupabaseRepo.createProfile({
      id: playerId,
      name: 'Babar Azam',
      email: 'player@maidaan.pk',
      role: 'PLAYER',
    });
    await SupabaseRepo.addRole(playerId, 'PLAYER');
    await SupabaseRepo.setOnboardingCompleted(playerId, true);
    await SupabaseRepo.upsertPlayerProfile({
      userId: playerId,
      preferredSports: ['cricket', 'padel'] as Sport[],
      skillLevel: 'advanced' as SkillLevel,
      primaryLocation: 'Gulberg III, Lahore',
      matchesPlayed: 14,
    });

    if (matchId) {
      await SupabaseRepo.createJoinRequest(matchId, playerId, 'Looking forward to playing top-order batting tonight!');
    }
    console.log('   ✅ Player & Join Request seeded');
  } catch (err: any) {
    console.warn('   ⚠️ Player seed skipped/error:', err?.message || err);
  }

  // 5. Seed Demo Verified Hub with Courts
  console.log('5. Seeding Demo Verified Hub...');
  const verifiedHubOwnerId = '00000000-0000-0000-0000-000000000010';
  try {
    await SupabaseRepo.createProfile({
      id: verifiedHubOwnerId,
      name: 'Tariq Mehmood',
      email: 'hub.verified@maidaan.pk',
      role: 'HUB_OWNER',
    });
    await SupabaseRepo.addRole(verifiedHubOwnerId, 'PLAYER');
    await SupabaseRepo.addRole(verifiedHubOwnerId, 'HUB_OWNER');
    await SupabaseRepo.setOnboardingCompleted(verifiedHubOwnerId, true);
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: verifiedHubOwnerId,
      hubName: 'Gulberg Badminton Arena',
      contactNumber: '+92 300 1234567',
      sports: ['badminton'] as Sport[],
      location: 'Gulberg III, Lahore',
      courtCount: 4,
    });

    await SupabaseRepo.createHubCourt(verifiedHubOwnerId, {
      name: 'Court 1 - Wooden Floor',
      sport: 'badminton',
      status: 'AVAILABLE',
    }).catch(() => {});
    await SupabaseRepo.createHubCourt(verifiedHubOwnerId, {
      name: 'Court 2 - Synthetic Turf',
      sport: 'badminton',
      status: 'AVAILABLE',
    }).catch(() => {});
    console.log('   ✅ Verified Hub seeded');
  } catch (err: any) {
    console.warn('   ⚠️ Verified Hub skipped/error:', err?.message || err);
  }

  // 6. Seed Demo Pending Hub with Verification Request
  console.log('6. Seeding Demo Pending Hub...');
  const pendingHubOwnerId = '00000000-0000-0000-0000-000000000013';
  try {
    await SupabaseRepo.createProfile({
      id: pendingHubOwnerId,
      name: 'Usman Ghani',
      email: 'hub.pending@maidaan.pk',
      role: 'HUB_OWNER',
    });
    await SupabaseRepo.addRole(pendingHubOwnerId, 'PLAYER');
    await SupabaseRepo.addRole(pendingHubOwnerId, 'HUB_OWNER');
    await SupabaseRepo.setOnboardingCompleted(pendingHubOwnerId, true);
    await SupabaseRepo.upsertHubOwnerProfile({
      userId: pendingHubOwnerId,
      hubName: 'Johar Town Futsal Arena',
      contactNumber: '+92 345 4443322',
      sports: ['football'] as Sport[],
      location: 'Johar Town, Lahore',
      courtCount: 2,
    });
    await SupabaseRepo.createHubVerificationRequest(pendingHubOwnerId);
    console.log('   ✅ Pending Hub seeded');
  } catch (err: any) {
    console.warn('   ⚠️ Pending Hub skipped/error:', err?.message || err);
  }

  // 7. Seed Demo Moderation Report
  console.log('7. Seeding Demo Moderation Report...');
  try {
    await SupabaseRepo.createReport({
      reporterId: playerId,
      reportedUserId: captainId,
      matchId: matchId || null,
      category: 'CONDUCT',
      description: 'Fixture time was rescheduled with short notice.',
    });
    console.log('   ✅ Moderation Report seeded');
  } catch (err: any) {
    console.warn('   ⚠️ Moderation Report skipped/error:', err?.message || err);
  }

  console.log('\n======================================================');
  console.log('✅ DEMO DATA SEEDING COMPLETE');
  console.log('======================================================\n');
}

seedDemoData().catch((err) => {
  console.error('[seedDemo] Fatal error:', err);
  process.exit(1);
});
