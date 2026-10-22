import assert from "node:assert/strict";
import { test } from "node:test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
process.env.NODE_ENV = "production";
const { verifyAuthToken } = require("../src/middleware/auth.js");
const { supabaseAdmin } = require("../src/lib/supabase.js");
const { SupabaseRepo } = require("../src/models/supabaseRepo.js");
const { isStrongPassword } = require("../src/services/passwordPolicy.js");
const {
  rejectProfilePrivilegeChanges,
} = require("../src/middleware/profilePrivileges.js");

test("unverified email cannot reach database permissions, REST or socket authentication", async (t) => {
  t.mock.method(supabaseAdmin.auth, "getUser", async () => ({
    data: {
      user: {
        id: "fixture-user",
        email: "a@example.com",
        email_confirmed_at: null,
      },
    },
    error: null,
  }));
  const roles = t.mock.method(SupabaseRepo, "getUserRoles", async () => [
    "ADMIN",
  ]);
  assert.equal(await verifyAuthToken("unverified-token"), null);
  assert.equal(roles.mock.callCount(), 0);
});
test("verified email can authenticate with server roles", async (t) => {
  t.mock.method(supabaseAdmin.auth, "getUser", async () => ({
    data: {
      user: {
        id: "fixture-user",
        email: "a@example.com",
        email_confirmed_at: "2026-10-22",
      },
    },
    error: null,
  }));
  t.mock.method(SupabaseRepo, "getUserRoles", async () => ["PLAYER"]);
  t.mock.method(SupabaseRepo, "getProfile", async () => ({
    role: "PLAYER",
    account_status: "ACTIVE",
  }));
  assert.deepEqual((await verifyAuthToken("verified-token")).roles, ["PLAYER"]);
});
test("password rule rejects missing character classes and accepts a strong eight-character password", () => {
  for (const value of [
    "",
    "12345678",
    "password",
    "password1!",
    "PASSWORD1!",
    "Password12",
    "Aa1!aaa",
    "Password1 ",
  ])
    assert.equal(isStrongPassword(value), false, value);
  assert.equal(isStrongPassword("Aa1!aaaa"), true);
});

test("profile editing rejects permission and moderation mass assignment", () => {
  for (const field of [
    "role",
    "roles",
    "isAdmin",
    "is_admin",
    "isSuperuser",
    "is_superuser",
    "account_status",
    "accountStatus",
    "suspended_at",
    "suspension_reason",
  ]) {
    let status = 0,
      passed = false;
    const res = {
      status: (value: number) => {
        status = value;
        return res;
      },
      json: () => {},
    };
    rejectProfilePrivilegeChanges({ body: { [field]: "ADMIN" } }, res, () => {
      passed = true;
    });
    assert.equal(status, 403, field);
    assert.equal(passed, false);
  }
  let passed = false;
  rejectProfilePrivilegeChanges(
    { body: { phone: "03001234567", primaryLocation: "Gulberg" } },
    {},
    () => {
      passed = true;
    },
  );
  assert.equal(passed, true);
});
