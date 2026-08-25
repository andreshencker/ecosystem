import pkg from './frontend/node_modules/playwright/index.js';
const { chromium } = pkg;

const BASE  = 'http://localhost:3000';
const USERS = [
  { email: 'admin@grapifly.com',         pass: 'QaTest123!', role: 'platform_admin' },
  { email: 'andreshenckerq@gmail.com',   pass: 'QaTest123!', role: 'company_owner'  },
];

const browser = await chromium.launch({ headless: true });

for (const U of USERS) {
  console.log(`\n══════ ${U.email} (${U.role}) ══════`);

  const ctx  = await browser.newContext();
  const page = await ctx.newPage();

  const logs = [];
  const nets = [];
  page.on('console', (m) => logs.push({ type: m.type(), text: m.text() }));
  page.on('response', (r) => {
    if (r.url().includes(':3001'))
      nets.push(`  ${r.status()} ${r.request().method()} ${r.url().replace('http://localhost:3001','')}`);
    if (r.url().includes('localhost:3000') && r.status() >= 300 && r.status() < 400)
      nets.push(`  REDIRECT ${r.status()} → ${r.headers()['location'] ?? '?'}`);
  });

  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', U.email);
  await page.fill('input[type="password"]', U.pass);
  await page.click('[data-testid="login-submit"]');

  // wait up to 6s
  await page.waitForTimeout(6000);

  const url    = page.url();
  const ls     = await page.evaluate(() => ({
    rt:   localStorage.getItem('comm_portal_rt'),
    user: localStorage.getItem('comm_portal_user'),
  })).catch(() => ({ rt:'ERR', user:'ERR' }));
  const cookie = (await ctx.cookies()).find(c => c.name === 'comm_portal_at');

  console.log('  Final URL            :', url.replace(BASE,''));
  console.log('  comm_portal_at cookie:', cookie ? 'SET (expires ' + new Date(cookie.expires*1000).toISOString() + ')' : 'NOT SET');
  console.log('  comm_portal_rt       :', ls.rt ? ls.rt.slice(0,20)+'...' : 'NOT SET');
  console.log('  comm_portal_user     :', ls.user ? JSON.parse(ls.user).email : 'NOT SET');

  console.log('\n  Backend calls:');
  nets.forEach(n => console.log(n));

  console.log('\n  Auth logs:');
  logs.filter(l =>
    l.text.includes('[AUTH') || l.text.includes('[Auth]') ||
    l.text.includes('[Login]') || l.text.includes('AUTH FIX') ||
    l.text.includes('401')
  ).forEach(l => console.log(`  [${l.type}] ${l.text}`));

  console.log('\n  VERDICT:', url.includes('/auth/') ? '❌ STILL ON LOGIN' : '✅ IN PORTAL');
  await ctx.close();
}

await browser.close();
