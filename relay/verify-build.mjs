import pkg from './frontend/node_modules/playwright/index.js';
const { chromium } = pkg;

const BASE  = 'http://localhost:3000';
const EMAIL = 'admin@grapifly.com';
const PASS  = 'QaTest123!';

const browser = await chromium.launch({ headless: true });

// ─── PHASE 1: Verify sentinel log appears ─────────────────────────────────────
console.log('\n══════ PHASE 1: SENTINEL CHECK ══════');
{
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();
  const seen = { login: false, layout: false };

  page.on('console', (m) => {
    if (m.text().startsWith('AUTH FIX BUILD 2026-06-26')) {
      console.log('  ✔ SENTINEL RECEIVED:', m.text());
      if (m.text().includes('LAYOUT')) seen.layout = true;
      else seen.login = true;
    }
  });

  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('[data-testid="login-submit"]');
  await page.waitForTimeout(4000);

  console.log(`  Login-page sentinel visible : ${seen.login}`);
  console.log(`  Layout sentinel visible     : ${seen.layout}`);

  if (!seen.login) {
    console.log('\n❌ Login-page sentinel NOT seen — browser is running stale JS.');
    console.log('   Possible causes: .next cache, wrong port, HMR failed.');
    await ctx.close();
    await browser.close();
    process.exit(1);
  }
  await ctx.close();
}

// ─── PHASE 2: Full diagnostic login ──────────────────────────────────────────
console.log('\n══════ PHASE 2: FULL DIAGNOSTIC ══════');
{
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();

  const logs = [];
  const nets = [];

  page.on('console', (m) => logs.push({ t: Date.now(), type: m.type(), text: m.text() }));
  page.on('pageerror', (e) => logs.push({ t: Date.now(), type: 'PAGEERROR', text: e.message }));

  page.on('request',  (r) => {
    if (r.url().includes(':3001') || r.url().includes('_next')) return;
    nets.push({ dir: '→', method: r.method(), url: r.url().replace(BASE, '') });
  });
  page.on('response', (r) => {
    if (r.url().includes(':3001')) {
      nets.push({ dir: '←', status: r.status(), method: r.request().method(), url: r.url().replace('http://localhost:3001', '') });
    }
    // Capture middleware redirects (Next.js internal)
    if (r.url().includes('localhost:3000') && r.status() >= 300 && r.status() < 400) {
      nets.push({ dir: 'REDIRECT', status: r.status(), url: r.url().replace(BASE, '') });
    }
  });

  const T0 = Date.now();

  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });

  // ── Fill and submit
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('[data-testid="login-submit"]');

  // ── Poll state every 250ms for 6 seconds
  const snapshots = [];
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(250);
    const url     = page.url();
    const cookies = await ctx.cookies();
    const atCookie = cookies.find(c => c.name === 'comm_portal_at');
    const ls = await page.evaluate(() => ({
      rt:   localStorage.getItem('comm_portal_rt'),
      user: localStorage.getItem('comm_portal_user'),
    })).catch(() => ({ rt: 'ERR', user: 'ERR' }));

    snapshots.push({
      ms:    Date.now() - T0,
      url:   url.replace(BASE, ''),
      rt:    !!ls.rt,
      user:  !!ls.user,
      cookie: !!atCookie,
    });
  }

  // ── Final cookie dump
  const finalCookies = await ctx.cookies();
  const atCookieFinal = finalCookies.find(c => c.name === 'comm_portal_at');

  // ── Final localStorage
  const finalLS = await page.evaluate(() => ({
    rt:    localStorage.getItem('comm_portal_rt'),
    user:  localStorage.getItem('comm_portal_user'),
    keys:  Object.keys(localStorage),
  })).catch(() => ({ rt: 'ERR', user: 'ERR', keys: [] }));

  // ── Print results

  console.log('\n── Timeline (URL / rt / user / cookie) ──');
  let prev = '';
  for (const s of snapshots) {
    const line = `${String(s.ms).padStart(5)}ms | ${s.url.padEnd(25)} | rt=${s.rt} user=${s.user} cookie=${s.cookie}`;
    if (line !== prev) { console.log('  ' + line); prev = line; }
  }

  console.log('\n── Backend API calls ──');
  nets.filter(n => n.dir !== '→').forEach(n => {
    if (n.dir === 'REDIRECT') console.log(`  REDIRECT ${n.status} ${n.url}`);
    else console.log(`  ${n.status} ${n.method} ${n.url}`);
  });

  console.log('\n── Console logs (auth-relevant) ──');
  const authLogs = logs.filter(l =>
    l.text.includes('[AUTH') || l.text.includes('[Login]') ||
    l.text.includes('[Auth]') || l.text.includes('AUTH FIX') ||
    l.text.includes('401') || l.text.includes('Unauthorized') ||
    l.text.includes('PAGEERROR')
  );
  authLogs.forEach(l => console.log(`  [${l.type.toUpperCase()}] ${l.text}`));

  console.log('\n── Final state ──');
  console.log('  URL            :', page.url().replace(BASE, ''));
  console.log('  comm_portal_at :', atCookieFinal ? `${atCookieFinal.value.slice(0,20)}... (expires ${new Date(atCookieFinal.expires * 1000).toISOString()})` : 'NOT SET');
  console.log('  comm_portal_rt :', finalLS.rt ? finalLS.rt.slice(0, 20) + '...' : 'NOT SET');
  console.log('  comm_portal_user:', finalLS.user ? JSON.parse(finalLS.user).email : 'NOT SET');
  console.log('  localStorage keys:', finalLS.keys.join(', '));

  const finalUrl = page.url();
  console.log('\n══════ VERDICT ══════');
  if (!finalUrl.includes('/auth/')) {
    console.log('✅  FIXED — session preserved, user is at', finalUrl.replace(BASE, ''));
  } else {
    console.log('❌  BUG STILL PRESENT — user ended up at', finalUrl.replace(BASE, ''));
  }

  await ctx.close();
}

await browser.close();
