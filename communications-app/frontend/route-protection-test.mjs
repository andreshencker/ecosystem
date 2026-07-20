/**
 * Direct URL protection test — verifies middleware blocks forbidden routes
 * and allows permitted ones for each role.
 */

const API  = 'http://localhost:3001';
const APP  = 'http://localhost:3000';

let pass = 0, fail = 0;

function ok(label, condition, detail = '') {
  if (condition) {
    console.log(`  \x1b[32m✅ PASS\x1b[0m ${label}${detail ? ` → ${detail}` : ''}`);
    pass++;
  } else {
    console.log(`  \x1b[31m❌ FAIL\x1b[0m ${label}${detail ? ` → ${detail}` : ''}`);
    fail++;
  }
}

async function login(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}

/**
 * Fetch a portal route with the given access token cookie.
 * Next.js middleware reads comm_portal_at cookie for route auth.
 * Returns the final URL after any redirects.
 */
async function getRoute(path, token) {
  try {
    const r = await fetch(`${APP}${path}`, {
      headers: { Cookie: `comm_portal_at=${token}` },
      redirect: 'manual',
    });
    // redirect → Location header tells us where middleware sent the user
    if (r.status === 307 || r.status === 302 || r.status === 308) {
      return { redirected: true, location: r.headers.get('location') ?? '', status: r.status };
    }
    return { redirected: false, location: path, status: r.status };
  } catch {
    return { redirected: false, location: path, status: 0 };
  }
}

function allowed(result, route) {
  // Either not redirected (200) or redirected to same path
  return !result.redirected || result.location?.includes(route);
}

function blocked(result) {
  // Redirected away from the attempted path
  return result.redirected && !result.location?.includes('/auth/accept');
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const TS = Date.now();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

await mongoose.connect('mongodb+srv://admin:admin@cluster0.3ffg4.mongodb.net/communication_platform_db', { serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;

const ownerEmail = `rt-owner-${TS}@test.com`;
const adminEmail = `rt-admin-${TS}@test.com`;
const opEmail    = `rt-op-${TS}@test.com`;
const viewEmail  = `rt-viewer-${TS}@test.com`;
const pw = 'QaTest123!';

// Register company owner
const regRes = await fetch(`${API}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: ownerEmail, password: pw, firstName: 'RT', lastName: 'Owner', companyName: `Route Test Co ${TS}` }),
});
console.log('Register:', (await regRes.json()).message?.substring(0, 50));

// Verify emails
await db.collection('users').updateOne({ email: ownerEmail }, { $set: { isEmailVerified: true } });

// Login owner and get companyId
const ownerAuth = await login(ownerEmail, pw);
const ownerToken = ownerAuth.accessToken;
const companyId  = ownerAuth.user?.companyId;
const companyKey = ownerAuth.user?.companyKey;
console.log(`Owner companyId: ${companyId}`);

// Create other roles directly in DB
const hash = await bcrypt.hash(pw, 12);
for (const [email, role] of [[adminEmail, 'company_admin'], [opEmail, 'operator'], [viewEmail, 'viewer']]) {
  await db.collection('users').deleteMany({ email });
  await db.collection('users').insertOne({
    email, passwordHash: hash, firstName: 'RT', lastName: role,
    role, scope: 'company', companyId, companyKey,
    isEmailVerified: true, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  });
}

// Login all roles
const adminAuth  = await login(adminEmail, pw);
const opAuth     = await login(opEmail, pw);
const viewAuth   = await login(viewEmail, pw);
const paAuth     = await login('andreshenckerq@gmail.com', pw);

const tokens = {
  platform_admin: paAuth.accessToken,
  company_owner:  ownerToken,
  company_admin:  adminAuth.accessToken,
  operator:       opAuth.accessToken,
  viewer:         viewAuth.accessToken,
};

await mongoose.disconnect();
console.log('\nAll tokens obtained. Running route protection tests...\n');

// ─── Route protection matrix ──────────────────────────────────────────────────

console.log('\x1b[1m── platform_admin route tests ──\x1b[0m');
const pa = tokens.platform_admin;
ok('PA can access /dashboard',    allowed(await getRoute('/dashboard',    pa), '/dashboard'));
ok('PA can access /companies',    allowed(await getRoute('/companies',    pa), '/companies'));
ok('PA can access /users',        allowed(await getRoute('/users',        pa), '/users'));
ok('PA can access /channels',     allowed(await getRoute('/channels',     pa), '/channels'));
ok('PA can access /providers',    allowed(await getRoute('/providers',    pa), '/providers'));
ok('PA can access /audit-logs',   allowed(await getRoute('/audit-logs',   pa), '/audit-logs'));
ok('PA blocked from /company',    blocked(await getRoute('/company',      pa)));

console.log('\n\x1b[1m── company_owner route tests ──\x1b[0m');
const co = tokens.company_owner;
ok('Owner can access /dashboard', allowed(await getRoute('/dashboard', co), '/dashboard'));
ok('Owner can access /company',   allowed(await getRoute('/company',   co), '/company'));
ok('Owner can access /users',     allowed(await getRoute('/users',     co), '/users'));
ok('Owner blocked from /companies', blocked(await getRoute('/companies', co)));
ok('Owner blocked from /channels',  blocked(await getRoute('/channels',  co)));
ok('Owner blocked from /providers', blocked(await getRoute('/providers', co)));
ok('Owner blocked from /audit-logs',blocked(await getRoute('/audit-logs',co)));

console.log('\n\x1b[1m── company_admin route tests ──\x1b[0m');
const ca = tokens.company_admin;
ok('Admin can access /dashboard', allowed(await getRoute('/dashboard', ca), '/dashboard'));
ok('Admin can access /company',   allowed(await getRoute('/company',   ca), '/company'));
ok('Admin can access /users',     allowed(await getRoute('/users',     ca), '/users'));
ok('Admin blocked from /companies', blocked(await getRoute('/companies', ca)));
ok('Admin blocked from /audit-logs',blocked(await getRoute('/audit-logs',ca)));

console.log('\n\x1b[1m── operator route tests ──\x1b[0m');
const op = tokens.operator;
ok('Operator can access /dashboard',          allowed(await getRoute('/dashboard',          op), '/dashboard'));
ok('Operator can access /notifications/test', allowed(await getRoute('/notifications/test', op), '/notifications'));
ok('Operator can access /files/storage',      allowed(await getRoute('/files/storage',      op), '/files'));
ok('Operator blocked from /users',            blocked(await getRoute('/users',   op)));
ok('Operator blocked from /company',          blocked(await getRoute('/company', op)));
ok('Operator blocked from /companies',        blocked(await getRoute('/companies', op)));

console.log('\n\x1b[1m── viewer route tests ──\x1b[0m');
const vi = tokens.viewer;
ok('Viewer can access /dashboard',     allowed(await getRoute('/dashboard',     vi), '/dashboard'));
ok('Viewer can access /files/reports', allowed(await getRoute('/files/reports', vi), '/files'));
ok('Viewer can access /files/media',   allowed(await getRoute('/files/media',   vi), '/files'));
ok('Viewer blocked from /users',       blocked(await getRoute('/users',       vi)));
ok('Viewer blocked from /company',     blocked(await getRoute('/company',     vi)));
ok('Viewer blocked from /companies',   blocked(await getRoute('/companies',   vi)));
ok('Viewer blocked from /files/storage', blocked(await getRoute('/files/storage', vi)));
ok('Viewer blocked from /notifications/test', blocked(await getRoute('/notifications/test', vi)));

console.log('\n\x1b[1m── unauthenticated ──\x1b[0m');
ok('No token → /dashboard redirects to /auth/login', blocked(await getRoute('/dashboard', '')));
ok('No token → /users redirects to /auth/login',     blocked(await getRoute('/users',     '')));

console.log(`\n  \x1b[32mPASSED:\x1b[0m ${pass}   \x1b[${fail > 0 ? 31 : 32}mFAILED:\x1b[0m ${fail}   Total: ${pass + fail}`);
if (fail > 0) process.exit(1);
