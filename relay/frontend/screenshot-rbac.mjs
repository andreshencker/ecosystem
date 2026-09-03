import { chromium } from 'playwright';
import mongoose from 'mongoose';

const BASE = 'http://localhost:3000';
const API  = 'http://localhost:3001';
const DB   = 'mongodb+srv://admin:admin@cluster0.3ffg4.mongodb.net/relaydb';
const DIR  = '/tmp/rbac-screenshots';
const TS   = Date.now();

const USERS = {
  owner:   { email: `ss-owner-${TS}@test.com`,   pw: 'QaTest123!', firstName: 'Alice', lastName: 'Owner',   companyName: `Screenshot Co ${TS}` },
  admin:   { email: `ss-admin-${TS}@test.com`,    pw: 'QaTest123!', firstName: 'Bob',   lastName: 'Admin'   },
  operator:{ email: `ss-operator-${TS}@test.com`, pw: 'QaTest123!', firstName: 'Carol', lastName: 'Operator'},
  viewer:  { email: `ss-viewer-${TS}@test.com`,   pw: 'QaTest123!', firstName: 'Dave',  lastName: 'Viewer'  },
  invited: { email: `ss-invited-${TS}@test.com`,  pw: 'QaTest123!', firstName: 'Eve',   lastName: 'Invited' },
};

async function apiCall(method, path, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  try { return { status: res.status, body: await res.json() }; } catch { return { status: res.status, body: null }; }
}

async function shot(page, name) {
  const p = `${DIR}/${name}.png`;
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  📸 ${name}.png`);
}

// ── Setup DB ──
await mongoose.connect(DB, { serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;

// Clean up
for (const u of Object.values(USERS)) {
  await db.collection('users').deleteMany({ email: u.email });
  await db.collection('invitations').deleteMany({ email: u.email });
}

// Register owner
let r = await apiCall('POST', '/auth/register', {
  email: USERS.owner.email, password: USERS.owner.pw,
  firstName: USERS.owner.firstName, lastName: USERS.owner.lastName,
  companyName: USERS.owner.companyName,
});
console.log('Register owner:', r.status);
await db.collection('users').updateOne({ email: USERS.owner.email }, { $set: { isEmailVerified: true } });

// Login as owner, get token
r = await apiCall('POST', '/auth/login', { email: USERS.owner.email, password: USERS.owner.pw });
const ownerToken = r.body?.accessToken;
const ownerCompanyId = r.body?.user?.companyId;
const ownerCompanyKey = r.body?.user?.companyKey;

// Inject admin, operator, viewer directly into DB
async function createUser(u, role) {
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(u.pw, 12);
  await db.collection('users').insertOne({
    email: u.email, passwordHash: hash,
    firstName: u.firstName, lastName: u.lastName,
    role, scope: 'company',
    companyId: ownerCompanyId, companyKey: ownerCompanyKey,
    isEmailVerified: true, isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  });
  console.log(`Created ${role}: ${u.email}`);
}

await createUser(USERS.admin,    'company_admin');
await createUser(USERS.operator, 'operator');
await createUser(USERS.viewer,   'viewer');

// Create a pending invitation
r = await apiCall('POST', '/users/invite', {
  email: USERS.invited.email, firstName: USERS.invited.firstName,
  lastName: USERS.invited.lastName, role: 'viewer',
}, ownerToken);
console.log('Invite created:', r.status, r.body?.inviteUrl);
const inviteToken = r.body?.inviteUrl?.match(/token=([a-f0-9]+)/)?.[1];

await mongoose.disconnect();

// ── Playwright ────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

async function loginAndShot(email, pw, prefix) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log(`  CONSOLE ERROR [${prefix}]:`, m.text().substring(0,120)); });
  
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pw);
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForURL('**/dashboard', { timeout: 12000 });
  } catch {
    await shot(page, `${prefix}-login-failed`);
    await ctx.close();
    return { page, ctx, ok: false };
  }
  
  await page.waitForTimeout(2000);
  await shot(page, `${prefix}-dashboard`);
  
  // Navigate to Team page if accessible
  const sidebar = await page.locator('nav, [class*="Drawer"] [class*="MuiList"]').first();
  const teamLink = page.locator('a[href="/users"]').first();
  if (await teamLink.isVisible().catch(() => false)) {
    await teamLink.click();
    await page.waitForTimeout(1500);
    await shot(page, `${prefix}-team`);
  }
  
  return { page, ctx, ok: true };
}

// ── Company Owner ──
console.log('\n── Company Owner ──');
const { page: ownerPage, ctx: ownerCtx } = await loginAndShot(USERS.owner.email, USERS.owner.pw, '01-owner');

// Screenshot pending invitation in team
if (ownerPage) {
  await ownerPage.goto(`${BASE}/users`, { waitUntil: 'networkidle' });
  await ownerPage.waitForTimeout(2000);
  await shot(ownerPage, '02-team-pending-invitation');
  await ownerCtx.close();
}

// ── Company Admin ──
console.log('\n── Company Admin ──');
const { page: adminPage, ctx: adminCtx } = await loginAndShot(USERS.admin.email, USERS.admin.pw, '03-admin');
if (adminCtx) await adminCtx.close();

// ── Operator ──
console.log('\n── Operator ──');
const { page: opPage, ctx: opCtx } = await loginAndShot(USERS.operator.email, USERS.operator.pw, '04-operator');
if (opCtx) await opCtx.close();

// ── Viewer ──
console.log('\n── Viewer ──');
const { page: viewerPage, ctx: viewerCtx } = await loginAndShot(USERS.viewer.email, USERS.viewer.pw, '05-viewer');
if (viewerCtx) await viewerCtx.close();

// ── Accept invitation ──
console.log('\n── Accept Invitation ──');
if (inviteToken) {
  const invCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const invPage = await invCtx.newPage();
  await invPage.goto(`${BASE}/auth/accept-invitation?token=${inviteToken}`, { waitUntil: 'networkidle' });
  await invPage.waitForTimeout(1000);
  await shot(invPage, '06-accept-invitation-form');
  
  const pwFields = await invPage.locator('input[type="password"]').all();
  if (pwFields.length >= 2) {
    await pwFields[0].fill(USERS.invited.pw);
    await pwFields[1].fill(USERS.invited.pw);
    await invPage.click('button[type="submit"]');
    try {
      await invPage.waitForURL('**/dashboard', { timeout: 10000 });
      await invPage.waitForTimeout(1500);
      await shot(invPage, '07-post-accept-dashboard');
    } catch {
      await shot(invPage, '07-accept-error');
    }
  }
  await invCtx.close();
}

// ── Owner views team after acceptance ──
console.log('\n── Post-accept Team view ──');
const postCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const postPage = await postCtx.newPage();
await postPage.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
await postPage.fill('input[type="email"]', USERS.owner.email);
await postPage.fill('input[type="password"]', USERS.owner.pw);
await postPage.click('button[type="submit"]');
try {
  await postPage.waitForURL('**/dashboard', { timeout: 10000 });
  await postPage.goto(`${BASE}/users`, { waitUntil: 'networkidle' });
  await postPage.waitForTimeout(2000);
  await shot(postPage, '08-team-after-acceptance');
} catch {}
await postCtx.close();

await browser.close();
console.log('\nDone. Screenshots in', DIR);
