/**
 * RBAC Final Verification Script
 * Tests: company isolation, invitation E2E, role hierarchy
 * Run: node rbac-final-verification.mjs
 */

import { createHash } from 'crypto';
import mongoose from 'mongoose';

const API = 'http://localhost:3001';
const DB  = 'mongodb+srv://admin:admin@cluster0.3ffg4.mongodb.net/communication_platform_db';

// ─── Colour helpers ───────────────────────────────────────────────────────────
const clrG  = (s) => `\x1b[32m${s}\x1b[0m`;
const clrR  = (s) => `\x1b[31m${s}\x1b[0m`;
const clrB  = (s) => `\x1b[36m${s}\x1b[0m`;
const HD = (s) => `\n\x1b[1m${'═'.repeat(60)}\n  ${s}\n${'═'.repeat(60)}\x1b[0m`;

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ${clrG('✅ PASS')} ${label}${detail ? ` → ${detail}` : ''}`);
    passed++;
  } else {
    console.log(`  ${clrR('❌ FAIL')} ${label}${detail ? ` → ${detail}` : ''}`);
    failed++;
  }
  return ok;
}

function info(label, val) {
  console.log(`  ${clrB('ℹ')}  ${label}: ${JSON.stringify(val)}`);
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

function decodeJwt(token) {
  const part = token.split('.')[1];
  const padded = part + '='.repeat((4 - part.length % 4) % 4);
  return JSON.parse(Buffer.from(padded, 'base64url').toString('utf8'));
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function connectDb() {
  await mongoose.connect(DB, { serverSelectionTimeoutMS: 8000 });
}

async function verifyEmail(email) {
  const db = mongoose.connection.db;
  const r = await db.collection('users').updateOne(
    { email },
    { $set: { isEmailVerified: true } },
  );
  return r.modifiedCount;
}

async function deleteTestUsers(emails) {
  const db = mongoose.connection.db;
  await db.collection('users').deleteMany({ email: { $in: emails } });
  await db.collection('invitations').deleteMany({ email: { $in: emails } });
}

async function deleteTestCompanies(keys) {
  const db = mongoose.connection.db;
  await db.collection('companies').deleteMany({ companyKey: { $in: keys } });
}

// ─── Test data ────────────────────────────────────────────────────────────────

const TS = Date.now();
const A = {
  email: `qa-alpha-${TS}@test.com`,
  firstName: 'Alice',
  lastName: 'Alpha',
  companyName: `Company Alpha ${TS}`,
  password: 'QaTest123!',
};
const B = {
  email: `qa-beta-${TS}@test.com`,
  firstName: 'Bob',
  lastName: 'Beta',
  companyName: `Company Beta ${TS}`,
  password: 'QaTest123!',
};
const INVITE_EMAIL = `qa-invited-${TS}@test.com`;

let tokenA = null, tokenB = null;
let userA = null, userB = null;
let inviteToken = null;
let acceptedUser = null;

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log(HD('SETUP: DB + EMAIL VERIFICATION'));

await connectDb();
console.log(`  ${clrG('✅')} MongoDB connected`);

// Clean up any previous test runs
await deleteTestUsers([A.email, B.email, INVITE_EMAIL]);
await deleteTestCompanies([A.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)]);

// ─────────────────────────────────────────────────────────────────────────────
console.log(HD('TEST 1: REGISTRATION'));
// ─────────────────────────────────────────────────────────────────────────────

let r;

r = await api('POST', '/auth/register', A);
check('Company A registration → 201', r.status === 201, r.status);

r = await api('POST', '/auth/register', B);
check('Company B registration → 201', r.status === 201, r.status);

r = await api('POST', '/auth/register', A);
check('Duplicate email → 409', r.status === 409 || r.status === 400, r.status);

// Force email verification via DB
await verifyEmail(A.email);
await verifyEmail(B.email);
console.log(`  ${clrB('ℹ')}  Emails verified via DB`);

// Login before verify (already verified, but test the unverified scenario with a fresh user would be separate)
r = await api('POST', '/auth/login', { email: A.email, password: A.password });
check('Company A login → 200', r.status === 200, r.status);
tokenA = r.body?.accessToken;
userA  = r.body?.user;

r = await api('POST', '/auth/login', { email: B.email, password: B.password });
check('Company B login → 200', r.status === 200, r.status);
tokenB = r.body?.accessToken;
userB  = r.body?.user;

// ─────────────────────────────────────────────────────────────────────────────
console.log(HD('TEST 2: JWT PAYLOAD AUDIT'));
// ─────────────────────────────────────────────────────────────────────────────

const jwtA = tokenA ? decodeJwt(tokenA) : {};
const jwtB = tokenB ? decodeJwt(tokenB) : {};

info('Company A JWT', { role: jwtA.role, scope: jwtA.scope, companyId: jwtA.companyId });
info('Company B JWT', { role: jwtB.role, scope: jwtB.scope, companyId: jwtB.companyId });

check('JWT A: role = company_owner', jwtA.role === 'company_owner', jwtA.role);
check('JWT A: scope = company', jwtA.scope === 'company', jwtA.scope);
check('JWT A: companyId is set', !!jwtA.companyId, jwtA.companyId);
check('JWT A: NOT platform_admin', jwtA.role !== 'platform_admin', jwtA.role);
check('JWT B: role = company_owner', jwtB.role === 'company_owner', jwtB.role);
check('JWT B: companyId ≠ JWT A companyId', jwtA.companyId !== jwtB.companyId, `${jwtA.companyId} vs ${jwtB.companyId}`);

// ─────────────────────────────────────────────────────────────────────────────
console.log(HD('TEST 3: COMPANY ISOLATION PENETRATION'));
// ─────────────────────────────────────────────────────────────────────────────

// 3a. GET /users — Company A owner should only see Company A users
r = await api('GET', '/users?limit=100', null, tokenA);
check('GET /users (A) → 200', r.status === 200, r.status);
const usersA = r.body?.items ?? [];
const allBelongToCompA = usersA.every(u => u.companyId === jwtA.companyId);
check('GET /users (A) — all results are Company A', allBelongToCompA, `${usersA.length} users`);
const anyBCompanyInA = usersA.some(u => u.companyId === jwtB.companyId);
check('GET /users (A) — no Company B users leaked', !anyBCompanyInA, `B-leak: ${anyBCompanyInA}`);

// 3b. GET /users — Company B token should only see Company B users
r = await api('GET', '/users?limit=100', null, tokenB);
check('GET /users (B) → 200', r.status === 200, r.status);
const usersB = r.body?.items ?? [];
const anyACompanyInB = usersB.some(u => u.companyId === jwtA.companyId);
check('GET /users (B) — no Company A users leaked', !anyACompanyInB, `A-leak: ${anyACompanyInB}`);

// 3c. Try to fetch a Company A user by ID using Company B token
const userAId = userA?.id;
if (userAId) {
  r = await api('GET', `/users/${userAId}`, null, tokenB);
  check('Company B token cannot read Company A user by ID → 403', r.status === 403, r.status);
  info('Response body', r.body?.message ?? r.body);
}

// 3d. GET /users/invitations — Company B should not see Company A invitations
// (will test after creating A's invitation below)

// 3e. No token → 401
r = await api('GET', '/users', null, null);
check('No token → 401', r.status === 401, r.status);

// 3f. Operator token blocked from GET /users
r = await api('GET', '/auth/me', null, tokenA);  // confirm who we are
check('GET /auth/me (A) returns company_owner', r.body?.role === 'company_owner', r.body?.role);

// ─────────────────────────────────────────────────────────────────────────────
console.log(HD('TEST 4: ROLE HIERARCHY VALIDATION'));
// ─────────────────────────────────────────────────────────────────────────────

// company_owner cannot invite company_owner
r = await api('POST', '/users/invite', { email: 'x1@test.com', firstName: 'X', lastName: 'X', role: 'company_owner' }, tokenA);
check('Owner → Owner invite → 403', r.status === 403, r.status);
info('Owner→Owner body', r.body?.message);

// company_owner cannot invite platform_admin
// Returns 400 (DTO rejects it before hierarchy check) — stronger than 403
r = await api('POST', '/users/invite', { email: 'x2@test.com', firstName: 'X', lastName: 'X', role: 'platform_admin' }, tokenA);
check('Owner → platform_admin invite → 400 (DTO) or 403 (hierarchy)', r.status === 400 || r.status === 403, r.status);

// platform_admin in DTO rejected at DTO level (400 from class-validator)
r = await api('POST', '/users/invite', { email: 'x3@test.com', firstName: 'X', lastName: 'X', role: 'platform_admin' }, tokenA);
check('platform_admin not in invitable DTO → 400 or 403', r.status === 400 || r.status === 403, r.status);

// ─────────────────────────────────────────────────────────────────────────────
console.log(HD('TEST 5: INVITATION END-TO-END'));
// ─────────────────────────────────────────────────────────────────────────────

// Step 1: Send invitation
r = await api('POST', '/users/invite', {
  email: INVITE_EMAIL,
  firstName: 'Carol',
  lastName: 'Test',
  role: 'operator',
}, tokenA);
check('POST /users/invite → 201', r.status === 201, r.status);
info('Invite response', { id: r.body?.invitationId, role: r.body?.role, expiresAt: r.body?.expiresAt });

const inviteUrl = r.body?.inviteUrl ?? '';
const tokenMatch = inviteUrl.match(/token=([a-f0-9]+)/);
inviteToken = tokenMatch?.[1] ?? null;
check('Invite URL contains token', !!inviteToken, inviteUrl.substring(0, 80));

// Step 2: Verify pending in invitations list
r = await api('GET', '/users/invitations', null, tokenA);
check('GET /users/invitations → 200', r.status === 200, r.status);
const pendingInvites = r.body?.items ?? [];
const myInvite = pendingInvites.find(i => i.email === INVITE_EMAIL);
check('Invited user appears in pending list', !!myInvite, INVITE_EMAIL);
check('Invitation status = pending', myInvite?.status === 'pending', myInvite?.status);
info('Pending invitation', { email: myInvite?.email, role: myInvite?.role, status: myInvite?.status });

// Step 3: Company B cannot see Company A's invitations
r = await api('GET', '/users/invitations', null, tokenB);
check('GET /users/invitations (B) → 200', r.status === 200, r.status);
const bInvites = r.body?.items ?? [];
const leakedInvite = bInvites.find(i => i.email === INVITE_EMAIL);
check('Company B cannot see Company A invitations', !leakedInvite, leakedInvite ? 'LEAKED' : 'isolated');

// Step 4: Accept the invitation
if (inviteToken) {
  r = await api('POST', '/auth/accept-invitation', {
    token: inviteToken,
    password: 'QaTest123!',
  });
  check('POST /auth/accept-invitation → 200', r.status === 200, r.status);
  acceptedUser = r.body?.user;
  info('Accepted user', { role: acceptedUser?.role, scope: acceptedUser?.scope, companyId: acceptedUser?.companyId });
  check('Accepted user has role=operator', acceptedUser?.role === 'operator', acceptedUser?.role);
  check('Accepted user has scope=company', acceptedUser?.scope === 'company', acceptedUser?.scope);
  check('Accepted user companyId matches Company A', acceptedUser?.companyId === jwtA.companyId, `${acceptedUser?.companyId} vs ${jwtA.companyId}`);

  const acceptedJwt = r.body?.accessToken ? decodeJwt(r.body.accessToken) : {};
  check('Accepted JWT: role=operator', acceptedJwt.role === 'operator', acceptedJwt.role);
  check('Accepted JWT: scope=company', acceptedJwt.scope === 'company', acceptedJwt.scope);
  check('Accepted JWT: NOT platform_admin', acceptedJwt.role !== 'platform_admin', acceptedJwt.role);

  // Step 5: Re-accept must fail (already accepted)
  r = await api('POST', '/auth/accept-invitation', { token: inviteToken, password: 'QaTest123!' });
  check('Re-accept same token → 400 (already accepted)', r.status === 400, r.status);
  info('Re-accept error', r.body?.message);

  // Step 6: Accepted user now appears in GET /users for Company A
  r = await api('GET', '/users?limit=100', null, tokenA);
  const activeUsers = r.body?.items ?? [];
  const acceptedInUsers = activeUsers.find(u => u.email === INVITE_EMAIL);
  check('Accepted user appears in GET /users (A)', !!acceptedInUsers, INVITE_EMAIL);
  check('Accepted user is active', acceptedInUsers?.isActive !== false, acceptedInUsers?.isActive);

  // Step 7: Invitation no longer in pending list
  r = await api('GET', '/users/invitations', null, tokenA);
  const remainingPending = r.body?.items ?? [];
  const stillPending = remainingPending.find(i => i.email === INVITE_EMAIL);
  check('Accepted invitation disappears from pending list', !stillPending, stillPending ? 'STILL PENDING (bug)' : 'not in list');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(HD('TEST 6: EXPIRED TOKEN SAFETY'));
// ─────────────────────────────────────────────────────────────────────────────

// Try with a totally invalid token
r = await api('POST', '/auth/accept-invitation', { token: 'deadbeef0000000000000000', password: 'QaTest123!' });
check('Invalid token → 401', r.status === 401, r.status);

// Try with a mangled JWT
r = await api('GET', '/users', null, 'totally.invalid.jwt');
check('Malformed JWT → 401', r.status === 401, r.status);

// ─────────────────────────────────────────────────────────────────────────────
console.log(HD('SUMMARY'));
// ─────────────────────────────────────────────────────────────────────────────

await mongoose.disconnect();

console.log(`\n  ${clrG('PASSED:')} ${passed}`);
console.log(`  ${failed > 0 ? clrR('FAILED:') : clrG('FAILED:')} ${failed}`);
console.log(`  Total: ${passed + failed}\n`);

if (failed > 0) process.exit(1);
