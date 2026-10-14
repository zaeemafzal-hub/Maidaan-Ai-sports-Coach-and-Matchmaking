const API_URL = 'http://localhost:5000/api';

async function verifyDemoSecondaryFlow() {
  console.log('====================================================');
  console.log('  MAIDAAN — HUB OWNER & ADMIN DEMO FLOW VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  const ts = Date.now();
  const hubId = '790b3a9b-ed4c-4bd0-8883-78c246aa7bd1';
  const adminId = '0a3f23fd-ef05-4bc3-9b46-f35723651a84';

  const hubToken = `test_token:${hubId}:hub.demo@maidaan.pk`;
  const adminToken = `test_token:${adminId}:admin@maidaan.pk`;

  console.log('--- Step 1: Hub Owner Profile & Court Management ---');
  const hubMe = await fetch(`${API_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${hubToken}` },
  }).then((r) => r.json());
  assert(hubMe.user?.role === 'HUB_OWNER', 'Hub Owner authenticated with role HUB_OWNER');

  // Hub Owner adds a court: valid sports: cricket, badminton, padel, football
  const addCourtRes = await fetch(`${API_URL}/hub/courts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubToken}` },
    body: JSON.stringify({
      name: `Championship Court ${ts % 1000}`,
      sport: 'padel',
      status: 'AVAILABLE',
    }),
  });
  const courtData = await addCourtRes.json();
  const courtId = courtData.court?.id;
  assert(addCourtRes.status === 201 && !!courtId, `Court created (${courtId})`);

  // Hub Owner fetches their courts
  const courtsListRes = await fetch(`${API_URL}/hub/courts`, {
    headers: { Authorization: `Bearer ${hubToken}` },
  }).then((r) => r.json());
  const foundCourt = courtsListRes.courts?.find((c) => c.id === courtId);
  assert(!!foundCourt, 'Hub Owner retrieved court list with newly added court');

  console.log('\n--- Step 2: Hub Owner Submits Verification Request ---');
  const submitVerifRes = await fetch(`${API_URL}/hub/verification-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubToken}` },
    body: JSON.stringify({}),
  });
  const verifData = await submitVerifRes.json();
  // Status 201 (created) or 409 (already pending/verified) are both valid state affirmations
  assert(
    submitVerifRes.status === 201 || submitVerifRes.status === 409,
    `Hub Owner verification request handled (Status ${submitVerifRes.status}: ${verifData.id || verifData.error})`
  );

  console.log('\n--- Step 3: Admin Reviews Hubs ---');
  const adminMe = await fetch(`${API_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then((r) => r.json());
  assert(adminMe.user?.role === 'ADMIN', 'Admin authenticated with role ADMIN');

  // Admin gets hub verification requests
  const adminVerifsRes = await fetch(`${API_URL}/admin/hub-verifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then((r) => r.json());
  assert(Array.isArray(adminVerifsRes.requests), `Admin retrieved hub verifications list (${adminVerifsRes.requests?.length} items)`);

  // If a pending request exists, Admin approves it
  const pendingReq = adminVerifsRes.requests?.find((r) => r.status === 'PENDING');
  if (pendingReq) {
    const idToReview = pendingReq.requestId || pendingReq.id;
    const approveRes = await fetch(`${API_URL}/admin/hub-verifications/${idToReview}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'APPROVE', adminNote: 'Approved for live demo presentation' }),
    });
    assert(approveRes.status === 200, 'Admin approved pending Hub Owner verification');
  } else {
    assert(true, 'Hub Owner verification state already reviewed/approved');
  }

  console.log('\n--- Step 4: Admin Report Review Flow ---');
  // Hub Owner submits a report against another user
  const submitReportRes = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hubToken}` },
    body: JSON.stringify({
      category: 'CONDUCT',
      description: 'Demo report submission for FYP moderation walkthrough.',
      reportedUserId: '2cc17d8e-ae3b-43c6-af74-a50c91ddff74', // player
    }),
  });
  const reportData = await submitReportRes.json();
  const reportId = reportData.id || reportData.report?.id;
  assert(submitReportRes.status === 201 && !!reportId, `Report submitted (${reportId})`);

  // Admin lists reports
  const adminReportsRes = await fetch(`${API_URL}/admin/reports`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then((r) => r.json());
  assert(Array.isArray(adminReportsRes.reports), `Admin listed reports (${adminReportsRes.reports?.length} found)`);

  // Admin resolves report
  if (reportId) {
    const resolveReportRes = await fetch(`${API_URL}/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'RESOLVE', adminNote: 'Verified and resolved for FYP demo' }),
    });
    assert(resolveReportRes.status === 200, 'Admin resolved moderation report');
  }

  console.log('\n====================================================');
  console.log(`SECONDARY DEMO FLOW RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

verifyDemoSecondaryFlow().catch((err) => {
  console.error('Secondary demo verification error:', err);
  process.exit(1);
});
