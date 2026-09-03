import { chromium } from 'playwright';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const BASE = 'http://localhost:3000';
const API  = 'http://localhost:3001';
const DB   = 'mongodb+srv://admin:admin@cluster0.3ffg4.mongodb.net/relaydb';
const DIR  = '/tmp/final-screenshots';
const TS   = Date.now();

const PW = 'QaTest123!';
const ownerEmail = `fs-owner-${TS}@test.com`;
const adminEmail = `fs-admin-${TS}@test.com`;
const opEmail    = `fs-op-${TS}@test.com`;
const viewEmail  = `fs-viewer-${TS}@test.com`;
const paEmail    = 'andreshenckerq@gmail.com';

async function apiFetch(method, path, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  try { return { status: r.status, body: await r.json() }; } catch { return { status: r.status, body: null }; }
}

// ── DB setup ──
await mongoose.connect(DB, { serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;
for (const e of [ownerEmail, adminEmail, opEmail, viewEmail]) {
  await db.collection('users').deleteMany({ email: e });
}

// Register owner + company
const reg = await apiFetch('POST', '/auth/register', {
  email: ownerEmail, password: PW, firstName: 'Owner', lastName: 'Demo',
  companyName: `Final Demo Co ${TS}`,
});
console.log('Register:', reg.status);
await db.collection('users').updateOne({ email: ownerEmail }, { $set: { isEmailVerified: true } });
const ownerAuth = await apiFetch('POST', '/auth/login', { email: ownerEmail, password: PW });
const companyId  = ownerAuth.body?.user?.companyId;
const companyKey = ownerAuth.body?.user?.companyKey;

// Create other roles
const hash = await bcrypt.hash(PW, 12);
for (const [e, role] of [[adminEmail, 'company_admin'], [opEmail, 'operator'], [viewEmail, 'viewer']]) {
  await db.collection('users').insertOne({
    email: e, passwordHash: hash, firstName: role.split('_').pop(), lastName: 'Demo',
    role, scope: 'company', companyId, companyKey,
    isEmailVerified: true, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  });
}

// Get all tokens
const tokens = {
  platform_admin: (await apiFetch('POST', '/auth/login', { email: paEmail, password: PW })).body?.accessToken,
  company_owner:  ownerAuth.body?.accessToken,
  company_admin:  (await apiFetch('POST', '/auth/login', { email: adminEmail, password: PW })).body?.accessToken,
  operator:       (await apiFetch('POST', '/auth/login', { email: opEmail,   password: PW })).body?.accessToken,
  viewer:         (await apiFetch('POST', '/auth/login', { email: viewEmail, password: PW })).body?.accessToken,
};
await mongoose.disconnect();

// ── Screenshots ──
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

async function loginAs(email, pw, role) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pw);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL('**/dashboard', { timeout: 12000 });
    await page.waitForTimeout(2000);
  } catch {
    await page.screenshot({ path: `${DIR}/00-login-fail-${role}.png`, fullPage: true });
    await ctx.close();
    return null;
  }
  return { page, ctx };
}

async function shot(page, name) {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
  console.log(`  📸 ${name}.png`);
}

// ── platform_admin ──
console.log('\n── platform_admin ──');
const pa = await loginAs(paEmail, PW, 'platform_admin');
if (pa) {
  await shot(pa.page, '01-platform_admin-dashboard');
  await pa.page.goto(`${BASE}/users`, { waitUntil: 'networkidle' });
  await pa.page.waitForTimeout(1500);
  await shot(pa.page, '02-platform_admin-users');
  await pa.page.goto(`${BASE}/company`, { waitUntil: 'networkidle' });
  await pa.page.waitForTimeout(1000);
  const url = pa.page.url();
  console.log(`  PA /company access: ${url} (should redirect to /dashboard)`);
  await shot(pa.page, '03-platform_admin-company-blocked');
  await pa.ctx.close();
}

// ── company_owner ──
console.log('\n── company_owner ──');
const co = await loginAs(ownerEmail, PW, 'company_owner');
if (co) {
  await shot(co.page, '04-company_owner-dashboard');
  await co.page.goto(`${BASE}/company`, { waitUntil: 'networkidle' });
  await co.page.waitForTimeout(2000);
  await shot(co.page, '05-company_owner-my-company');
  await co.page.goto(`${BASE}/users`, { waitUntil: 'networkidle' });
  await co.page.waitForTimeout(1500);
  await shot(co.page, '06-company_owner-team');
  await co.page.goto(`${BASE}/companies`, { waitUntil: 'networkidle' });
  await co.page.waitForTimeout(1000);
  console.log(`  Owner /companies access: ${co.page.url()} (should redirect)`);
  await shot(co.page, '07-company_owner-companies-blocked');
  await co.ctx.close();
}

// ── company_admin ──
console.log('\n── company_admin ──');
const ca = await loginAs(adminEmail, PW, 'company_admin');
if (ca) {
  await shot(ca.page, '08-company_admin-dashboard');
  await ca.page.goto(`${BASE}/company`, { waitUntil: 'networkidle' });
  await ca.page.waitForTimeout(2000);
  await shot(ca.page, '09-company_admin-my-company');
  await ca.ctx.close();
}

// ── operator ──
console.log('\n── operator ──');
const op = await loginAs(opEmail, PW, 'operator');
if (op) {
  await shot(op.page, '10-operator-dashboard');
  await op.page.goto(`${BASE}/users`, { waitUntil: 'networkidle' });
  await op.page.waitForTimeout(800);
  console.log(`  Operator /users: ${op.page.url()} (should redirect)`);
  await shot(op.page, '11-operator-users-blocked');
  await op.ctx.close();
}

// ── viewer ──
console.log('\n── viewer ──');
const vi = await loginAs(viewEmail, PW, 'viewer');
if (vi) {
  await shot(vi.page, '12-viewer-dashboard');
  await vi.page.goto(`${BASE}/files/storage`, { waitUntil: 'networkidle' });
  await vi.page.waitForTimeout(800);
  console.log(`  Viewer /files/storage: ${vi.page.url()} (should redirect)`);
  await shot(vi.page, '13-viewer-storage-blocked');
  await vi.ctx.close();
}

await browser.close();
console.log(`\nDone. Screenshots in ${DIR}`);
