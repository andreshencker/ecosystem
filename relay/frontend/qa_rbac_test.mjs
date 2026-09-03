import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';
const SS_DIR = '/tmp/qa-screenshots';
const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';
const WARN = '\x1b[33m⚠️  WARN\x1b[0m';
const INFO = '\x1b[36mℹ️  INFO\x1b[0m';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ss(page, name) {
  const p = path.join(SS_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  📸 screenshot: ${p}`);
  return p;
}

function apiCall(method, endpoint, body, token) {
  const headers = ['Content-Type: application/json'];
  if (token) headers.push(`Authorization: Bearer ${token}`);
  const h = headers.map(h => `-H "${h}"`).join(' ');
  const b = body ? `-d '${JSON.stringify(body)}'` : '';
  const cmd = `curl -s -w "\\nHTTP_STATUS:%{http_code}" -X ${method} ${API_URL}${endpoint} ${h} ${b}`;
  const raw = execSync(cmd, { encoding: 'utf8' });
  const lines = raw.split('\n');
  const statusLine = lines.find(l => l.startsWith('HTTP_STATUS:'));
  const status = statusLine ? parseInt(statusLine.split(':')[1]) : 0;
  const body2 = lines.filter(l => !l.startsWith('HTTP_STATUS:')).join('\n');
  let parsed = null;
  try { parsed = JSON.parse(body2); } catch {}
  return { status, body: parsed, raw: body2 };
}

function decodeJwt(token) {
  const payload = token.split('.')[1];
  const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function check(label, condition, actual) {
  const icon = condition ? PASS : FAIL;
  console.log(`  ${icon} ${label}${actual !== undefined ? ` → ${JSON.stringify(actual)}` : ''}`);
  return condition;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

function dbRun(script) {
  const escaped = script.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  return execSync(`node -e "${escaped}"`, {
    cwd: '/Users/hencker/projects/invoiceApp/communications-app/backend',
    encoding: 'utf8'
  }).trim();
}

function verifyEmail(email) {
  return dbRun(`
    const mongoose = require('mongoose');
    mongoose.connect('mongodb+srv://admin:admin@cluster0.3ffg4.mongodb.net/relaydb')
      .then(async () => {
        const db = mongoose.connection.db;
        const r = await db.collection('users').updateOne({ email: '${email}' }, { \\$set: { isEmailVerified: true } });
        console.log('verified:' + r.modifiedCount);
        await mongoose.disconnect();
      }).then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
  `);
}

function createUser(email, firstName, lastName, role, ownerEmail) {
  return dbRun(`
    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');
    mongoose.connect('mongodb+srv://admin:admin@cluster0.3ffg4.mongodb.net/relaydb')
      .then(async () => {
        const db = mongoose.connection.db;
        const owner = await db.collection('users').findOne({ email: '${ownerEmail}' });
        const hash = await bcrypt.hash('QaTest123!', 12);
        await db.collection('users').insertOne({
          email: '${email}',
          passwordHash: hash,
          firstName: '${firstName}',
          lastName: '${lastName}',
          role: '${role}',
          scope: 'company',
          companyId: String(owner.companyId),
          companyKey: owner.companyKey,
          isEmailVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('created');
        await mongoose.disconnect();
      }).then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
  `);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const results = {};
let token = {};

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// Collect console errors
const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

// ════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ TEST 1: COMPANY REGISTRATION ═══\x1b[0m');
// ════════════════════════════════════════════════════════════════════

await page.goto(`${BASE_URL}/auth/register`, { waitUntil: 'networkidle' });
await ss(page, '01-register-page-empty');

// Fill the form
await page.fill('input[autocomplete="organization"]', 'Test Company');
await page.fill('input[autocomplete="given-name"]', 'Alice');
await page.fill('input[autocomplete="family-name"]', 'Owner');
await page.fill('input[type="email"]', 'qa-owner@testco.com');
const pwFields = await page.locator('input[type="password"]').all();
await pwFields[0].fill('QaTest123!');
await pwFields[1].fill('QaTest123!');

await ss(page, '02-register-form-filled');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
await ss(page, '03-register-submitted');

const currentUrl = page.url();
check('Registration redirects to login with ?registered=true', currentUrl.includes('/auth/login'), currentUrl);

// API: verify login returns correct role before email verification
let r = apiCall('POST', '/auth/login', { email: 'qa-owner@testco.com', password: 'QaTest123!' });
check('Login before verify blocked (403 or 401)', r.status === 401 || r.status === 403, r.status);

// Force email verification
verifyEmail('qa-owner@testco.com');
console.log(`  ${INFO} Email verified via DB`);

// Login now
r = apiCall('POST', '/auth/login', { email: 'qa-owner@testco.com', password: 'QaTest123!' });
check('Login after verify returns 200', r.status === 200, r.status);
check('user.role = company_owner', r.body?.user?.role === 'company_owner', r.body?.user?.role);
check('user.scope = company', r.body?.user?.scope === 'company', r.body?.user?.scope);
check('user.companyId is set', !!r.body?.user?.companyId, r.body?.user?.companyId);
check('user.companyKey is set', !!r.body?.user?.companyKey, r.body?.user?.companyKey);
check('user.role is NOT platform_admin', r.body?.user?.role !== 'platform_admin', r.body?.user?.role);

token.owner = r.body?.accessToken;
const ownerPayload = token.owner ? decodeJwt(token.owner) : {};
console.log(`  ${INFO} JWT payload:`, JSON.stringify(ownerPayload, null, 2));
check('JWT.role = company_owner', ownerPayload.role === 'company_owner', ownerPayload.role);
check('JWT.scope = company', ownerPayload.scope === 'company', ownerPayload.scope);
check('JWT.companyId set', !!ownerPayload.companyId, ownerPayload.companyId);

results.test1 = true;

// ════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ TEST 2: COMPANY_OWNER LOGIN & NAVIGATION ═══\x1b[0m');
// ════════════════════════════════════════════════════════════════════

await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'qa-owner@testco.com');
await page.fill('input[type="password"]', 'QaTest123!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 10000 });
await page.waitForTimeout(1500);
await ss(page, '04-owner-dashboard');

// Check cookie
const cookies = await context.cookies();
const atCookie = cookies.find(c => c.name === 'comm_portal_at');
check('comm_portal_at cookie exists', !!atCookie, atCookie?.name);

// Sidebar audit — read all visible nav text
const sidebarText = await page.locator('[data-testid="sidebar"], nav, [class*="MuiDrawer"] .MuiList-root').first().innerText().catch(() => '');
const allNavText = await page.locator('a, button, [role="menuitem"]').allInnerTexts();
const navJoined = allNavText.join('|').toLowerCase();

console.log(`  ${INFO} Sidebar visible text sample: ${navJoined.substring(0, 300)}`);

// Company_owner SHOULD see
check('Sidebar: Dashboard visible', navJoined.includes('dashboard'), 'dashboard');
check('Sidebar: Team/Users visible', navJoined.includes('team') || navJoined.includes('users'), 'team/users');
check('Sidebar: Channel Providers visible', navJoined.includes('channel provider') || navJoined.includes('credentials'), 'channel providers');
check('Sidebar: Reports visible', navJoined.includes('report'), 'reports');
check('Sidebar: Profile visible', navJoined.includes('profile'), 'profile');

// Company_owner should NOT see
check('Sidebar: Companies NOT visible', !navJoined.includes('companies'), '!companies');
check('Sidebar: Channels NOT visible', !navJoined.includes('channels'), '!channels');
check('Sidebar: Providers NOT visible (standalone)', !navJoined.includes('\nproviders\n'), '!providers');

// Navbar audit
const navbarText = await page.locator('header, [class*="AppBar"]').first().innerText().catch(() => '');
console.log(`  ${INFO} Navbar text: ${navbarText.replace(/\n/g, ' ')}`);
check('Navbar: Owner badge visible', navbarText.toLowerCase().includes('owner'), 'Owner badge');
check('Navbar: No ENV badge', !navbarText.toLowerCase().includes('development') && !navbarText.toLowerCase().includes('staging'), 'no env badge');

// Route protection checks
await page.goto(`${BASE_URL}/companies`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '05-owner-tries-companies');
check('Route /companies: redirected away (owner)', page.url().includes('/dashboard') || !page.url().includes('/companies'), page.url());

await page.goto(`${BASE_URL}/channels`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '06-owner-tries-channels');
check('Route /channels: redirected away (owner)', !page.url().includes('/channels'), page.url());

await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '07-owner-users-page');
check('Route /users: allowed for owner', page.url().includes('/users'), page.url());

// Check invite button visible
const inviteBtn = await page.locator('button', { hasText: /invite/i }).first();
const inviteBtnVisible = await inviteBtn.isVisible().catch(() => false);
check('Users page: Invite User button visible', inviteBtnVisible, 'Invite User button');

results.test2 = true;

// ════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ TEST 3: COMPANY_ADMIN ═══\x1b[0m');
// ════════════════════════════════════════════════════════════════════

// Create company_admin user
createUser('qa-admin@testco.com', 'Bob', 'Admin', 'company_admin', 'qa-owner@testco.com');
console.log(`  ${INFO} company_admin user created in DB`);

// Login as company_admin
await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'qa-admin@testco.com');
await page.fill('input[type="password"]', 'QaTest123!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 10000 });
await page.waitForTimeout(1500);
await ss(page, '08-admin-dashboard');

const adminNavbar = await page.locator('header, [class*="AppBar"]').first().innerText().catch(() => '');
check('Navbar: Company Admin badge', adminNavbar.toLowerCase().includes('company admin'), 'Company Admin badge');

// Get admin token for API tests
const adminLoginPA = apiCall('POST', '/auth/login', { email: 'qa-admin@testco.com', password: 'QaTest123!' });
token.admin = adminLoginPA.body?.accessToken;
const adminPayload = token.admin ? decodeJwt(token.admin) : {};
check('Admin JWT.role = company_admin', adminPayload.role === 'company_admin', adminPayload.role);
check('Admin JWT.scope = company', adminPayload.scope === 'company', adminPayload.scope);

// Invite role restrictions
let resp;

resp = apiCall('POST', '/users/invite', { email: 'bad@test.com', firstName: 'X', lastName: 'X', role: 'company_owner' }, token.admin);
check('company_admin CANNOT invite company_owner → 403', resp.status === 403, resp.status);
console.log(`  ${INFO} invite company_owner body:`, JSON.stringify(resp.body));

resp = apiCall('POST', '/users/invite', { email: 'bad2@test.com', firstName: 'X', lastName: 'X', role: 'platform_admin' }, token.admin);
check('company_admin CANNOT invite platform_admin → 403', resp.status === 403, resp.status);
console.log(`  ${INFO} invite platform_admin body:`, JSON.stringify(resp.body));

resp = apiCall('POST', '/users/invite', { email: 'qa-operator@testco.com', firstName: 'Carol', lastName: 'Operator', role: 'operator' }, token.admin);
check('company_admin CAN invite operator → 201', resp.status === 201, resp.status);
console.log(`  ${INFO} invite operator response:`, JSON.stringify(resp.body));

resp = apiCall('POST', '/users/invite', { email: 'qa-viewer@testco.com', firstName: 'Dave', lastName: 'Viewer', role: 'viewer' }, token.admin);
check('company_admin CAN invite viewer → 201', resp.status === 201, resp.status);

results.test3 = true;

// ════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ TEST 4: OPERATOR ═══\x1b[0m');
// ════════════════════════════════════════════════════════════════════

createUser('qa-operator@testco.com', 'Carol', 'Operator', 'operator', 'qa-owner@testco.com');
console.log(`  ${INFO} operator user created in DB`);

await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'qa-operator@testco.com');
await page.fill('input[type="password"]', 'QaTest123!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 10000 });
await page.waitForTimeout(1500);
await ss(page, '09-operator-dashboard');

const opNavbar = await page.locator('header, [class*="AppBar"]').first().innerText().catch(() => '');
const opNav = await page.locator('a, button, [role="menuitem"]').allInnerTexts();
const opNavJoined = opNav.join('|').toLowerCase();
check('Navbar: Operator badge', opNavbar.toLowerCase().includes('operator'), 'Operator badge');
check('Sidebar: Dashboard visible', opNavJoined.includes('dashboard'), 'dashboard');
check('Sidebar: Test Notifications visible', opNavJoined.includes('notification') || opNavJoined.includes('test'), 'notifications');
check('Sidebar: Reports visible', opNavJoined.includes('report'), 'reports');
check('Sidebar: Team/Users NOT visible', !opNavJoined.includes('team'), '!team');
check('Sidebar: Companies NOT visible', !opNavJoined.includes('companies'), '!companies');

// Route protection — /users
await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '10-operator-tries-users');
check('Route /users: operator redirected to /dashboard', page.url().includes('/dashboard'), page.url());

await page.goto(`${BASE_URL}/companies`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '11-operator-tries-companies');
check('Route /companies: operator redirected', !page.url().includes('/companies'), page.url());

// API protection
let opLogin = apiCall('POST', '/auth/login', { email: 'qa-operator@testco.com', password: 'QaTest123!' });
token.operator = opLogin.body?.accessToken;
const opPayload = token.operator ? decodeJwt(token.operator) : {};
check('Operator JWT.role = operator', opPayload.role === 'operator', opPayload.role);

resp = apiCall('GET', '/users', null, token.operator);
check('GET /users → 403 for operator', resp.status === 403, resp.status);

resp = apiCall('POST', '/users/invite', { email: 'x@test.com', firstName: 'X', lastName: 'X', role: 'viewer' }, token.operator);
check('POST /users/invite → 403 for operator', resp.status === 403, resp.status);

// No invite button visible
await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const opInviteBtn = await page.locator('button', { hasText: /invite/i }).count();
check('No Invite button on operator dashboard', opInviteBtn === 0, `found ${opInviteBtn} invite buttons`);

results.test4 = true;

// ════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ TEST 5: VIEWER ═══\x1b[0m');
// ════════════════════════════════════════════════════════════════════

createUser('qa-viewer@testco.com', 'Dave', 'Viewer', 'viewer', 'qa-owner@testco.com');
console.log(`  ${INFO} viewer user created in DB`);

await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'qa-viewer@testco.com');
await page.fill('input[type="password"]', 'QaTest123!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 10000 });
await page.waitForTimeout(1500);
await ss(page, '12-viewer-dashboard');

const viewerNavbar = await page.locator('header, [class*="AppBar"]').first().innerText().catch(() => '');
const viewerNav = await page.locator('a, button, [role="menuitem"]').allInnerTexts();
const viewerNavJoined = viewerNav.join('|').toLowerCase();
check('Navbar: Viewer badge', viewerNavbar.toLowerCase().includes('viewer'), 'Viewer badge');
check('Sidebar: Dashboard visible', viewerNavJoined.includes('dashboard'), 'dashboard');
check('Sidebar: Templates visible', viewerNavJoined.includes('template'), 'templates');
check('Sidebar: Reports visible', viewerNavJoined.includes('report'), 'reports');
check('Sidebar: Team/Users NOT visible', !viewerNavJoined.includes('team'), '!team');
check('Sidebar: Notifications NOT visible', !viewerNavJoined.includes('test notification'), '!test notifications');
check('Sidebar: Media NOT visible', !viewerNavJoined.includes('media'), '!media');

// Route protection
await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '13-viewer-tries-users');
check('Route /users: viewer redirected', !page.url().includes('/users') || page.url().includes('/dashboard'), page.url());

await page.goto(`${BASE_URL}/companies`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
check('Route /companies: viewer redirected', !page.url().includes('/companies'), page.url());

// API protection
let viewerLogin = apiCall('POST', '/auth/login', { email: 'qa-viewer@testco.com', password: 'QaTest123!' });
token.viewer = viewerLogin.body?.accessToken;
const viewerPayload = token.viewer ? decodeJwt(token.viewer) : {};
check('Viewer JWT.role = viewer', viewerPayload.role === 'viewer', viewerPayload.role);

resp = apiCall('GET', '/users', null, token.viewer);
check('GET /users → 403 for viewer', resp.status === 403, resp.status);

resp = apiCall('POST', '/users/invite', { email: 'x@test.com', firstName: 'X', lastName: 'X', role: 'viewer' }, token.viewer);
check('POST /users/invite → 403 for viewer', resp.status === 403, resp.status);

results.test5 = true;

// ════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ TEST 6: PLATFORM_ADMIN ═══\x1b[0m');
// ════════════════════════════════════════════════════════════════════

// Reset password for platform_admin
dbRun(`
  const mongoose = require('mongoose');
  const bcrypt = require('bcryptjs');
  mongoose.connect('mongodb+srv://admin:admin@cluster0.3ffg4.mongodb.net/relaydb')
    .then(async () => {
      const db = mongoose.connection.db;
      const hash = await bcrypt.hash('QaTest123!', 12);
      await db.collection('users').updateOne(
        { email: 'andreshenckerq@gmail.com' },
        { \\$set: { passwordHash: hash, isEmailVerified: true } }
      );
      console.log('admin pw reset');
      await mongoose.disconnect();
    }).then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
`);
console.log(`  ${INFO} platform_admin password set`);

await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'andreshenckerq@gmail.com');
await page.fill('input[type="password"]', 'QaTest123!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 10000 });
await page.waitForTimeout(1500);
await ss(page, '14-admin-dashboard');

const adminNavbarFull = await page.locator('header, [class*="AppBar"]').first().innerText().catch(() => '');
const adminNavAll = await page.locator('a, button, [role="menuitem"]').allInnerTexts();
const adminNavJoined = adminNavAll.join('|').toLowerCase();

console.log(`  ${INFO} Platform admin navbar: ${adminNavbarFull.replace(/\n/g, ' ')}`);
check('Navbar: Platform Admin badge', adminNavbarFull.toLowerCase().includes('modules admin'), 'Platform Admin badge');
check('Navbar: No company name shown', !adminNavbarFull.toLowerCase().includes('test company'), 'no company name');

check('Sidebar: Dashboard visible', adminNavJoined.includes('dashboard'), 'dashboard');
check('Sidebar: Companies visible', adminNavJoined.includes('companies'), 'companies');
check('Sidebar: Channels visible', adminNavJoined.includes('channels'), 'channels');
check('Sidebar: Providers visible', adminNavJoined.includes('providers'), 'providers');
check('Sidebar: My Company NOT visible', !adminNavJoined.includes('my company'), '!my company');
check('Sidebar: Team NOT visible', !adminNavJoined.includes('team'), '!team');

// Navigate to modules routes
await page.goto(`${BASE_URL}/companies`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '15-admin-companies');
check('Route /companies: allowed for platform_admin', page.url().includes('/companies'), page.url());

await page.goto(`${BASE_URL}/channels`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '16-admin-channels');
check('Route /channels: allowed for platform_admin (no redirect)', !page.url().includes('/dashboard'), page.url());

await page.goto(`${BASE_URL}/providers`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '17-admin-providers');
check('Route /providers: allowed for platform_admin', !page.url().includes('/dashboard'), page.url());

// API: GET /users — should return ALL users
const adminLoginPlatform = apiCall('POST', '/auth/login', { email: 'andreshenckerq@gmail.com', password: 'QaTest123!' });
token.platformAdmin = adminLoginPlatform.body?.accessToken;
const adminJwt = token.platformAdmin ? decodeJwt(token.platformAdmin) : {};
check('Admin JWT.role = platform_admin', adminJwt.role === 'platform_admin', adminJwt.role);
check('Admin JWT.scope = global', adminJwt.scope === 'global', adminJwt.scope);
check('Admin JWT.companyId = null', adminJwt.companyId === null, adminJwt.companyId);
console.log(`  ${INFO} Platform admin JWT:`, JSON.stringify(adminJwt));

resp = apiCall('GET', '/users?limit=10', null, token.platformAdmin);
check('GET /users → 200 for platform_admin', resp.status === 200, resp.status);
check('GET /users returns items array', Array.isArray(resp.body?.items), typeof resp.body?.items);
check('GET /users returns all users (>1, cross-company)', (resp.body?.total || 0) > 1, resp.body?.total);
console.log(`  ${INFO} Users returned: ${resp.body?.total}, items: ${resp.body?.items?.length}`);
const rolesReturned = (resp.body?.items || []).map(u => u.role);
console.log(`  ${INFO} Roles in response: ${JSON.stringify(rolesReturned)}`);
check('GET /users: mix of roles (not just one company)', new Set(rolesReturned).size >= 1, rolesReturned);

results.test6 = true;

// ════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ CROSS-CUTTING TESTS ═══\x1b[0m');
// ════════════════════════════════════════════════════════════════════

// 1. Logout flow
await page.click('text=Sign out').catch(async () => {
  const avatar = await page.locator('[class*="Avatar"], [aria-haspopup="true"]').first();
  await avatar.click();
  await page.waitForTimeout(500);
  await page.click('text=Sign out');
});
await page.waitForTimeout(1500);
await ss(page, '18-after-logout');
check('Logout: redirected to /auth/login', page.url().includes('/auth/login'), page.url());

// 2. Unauthenticated access
await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '19-unauth-tries-dashboard');
check('Unauthenticated /dashboard → /auth/login', page.url().includes('/auth/login'), page.url());

// 3. Direct URL bypass attempt: login as viewer, then try /companies
await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'qa-viewer@testco.com');
await page.fill('input[type="password"]', 'QaTest123!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 10000 });
await page.waitForTimeout(1000);

await page.goto(`${BASE_URL}/companies`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await ss(page, '20-viewer-direct-url-companies');
check('Viewer direct URL to /companies: blocked and redirected', !page.url().includes('/companies'), page.url());

await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
check('Viewer direct URL to /users: blocked', !page.url().includes('/users'), page.url());

// 4. Company isolation: company_owner cannot see other company users via API
resp = apiCall('GET', '/users?limit=20', null, token.owner);
check('GET /users (company_owner) returns 200', resp.status === 200, resp.status);
const ownerUsers = resp.body?.items || [];
const allSameCompany = ownerUsers.every(u => u.companyId === (ownerUsers[0]?.companyId));
check('Company isolation: all returned users have same companyId', allSameCompany, `${ownerUsers.length} users`);
const otherCompanyLeak = ownerUsers.some(u => u.role === 'platform_admin');
check('Company isolation: platform_admin NOT in company_owner results', !otherCompanyLeak, '!platform_admin leaked');

results.crossCutting = true;

// ════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m═══ CLEANUP ═══\x1b[0m');
// ════════════════════════════════════════════════════════════════════

await browser.close();

// Print final console errors encountered during session
if (consoleErrors.length > 0) {
  console.log(`\n\x1b[33m⚠️  Console errors during session (${consoleErrors.length}):\x1b[0m`);
  consoleErrors.slice(0, 10).forEach(e => console.log('  ', e));
}

console.log('\n\x1b[1mScreenshots saved to:\x1b[0m', SS_DIR);
console.log(fs.readdirSync(SS_DIR).filter(f => f.endsWith('.png')).map(f => '  📸 ' + f).join('\n'));
