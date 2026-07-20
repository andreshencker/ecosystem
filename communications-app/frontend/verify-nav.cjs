const { chromium } = require('/Users/hencker/projects/invoiceApp/communications-frontend/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle', timeout: 20000 });
  await page.fill('input[type="email"]', 'admin@grapifly.com');
  await page.fill('input[type="password"]', '@Grapifly1');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(10000);
  console.log('URL after login:', page.url());
  await page.screenshot({ path: '/tmp/nav-01-after-login.png' });

  if (!page.url().includes('/dashboard')) {
    const alert = await page.locator('[role="alert"]').textContent().catch(() => '');
    console.log('LOGIN FAILED, alert:', alert);
    await browser.close(); return;
  }

  const tabs = await page.locator('[role="tab"]').allTextContents();
  const active = await page.locator('[role="tab"][aria-selected="true"]').first().textContent().catch(() => 'none');
  console.log('TABS:', JSON.stringify(tabs));
  console.log('ACTIVE_TAB:', active);

  const adminLinks = await page.locator('.MuiDrawer-paper a').allTextContents();
  console.log('ADMIN_SIDEBAR:', JSON.stringify(adminLinks));
  await page.screenshot({ path: '/tmp/nav-02-admin-sidebar.png' });

  await page.locator('[role="tab"]:has-text("Business App")').click();
  await page.waitForTimeout(500);
  const bizLinks = await page.locator('.MuiDrawer-paper a').allTextContents();
  console.log('BUSINESS_SIDEBAR:', JSON.stringify(bizLinks));
  await page.screenshot({ path: '/tmp/nav-03-business-sidebar.png' });

  await page.locator('[role="tab"]:has-text("Platform Admin")').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/nav-04-admin-mode-back.png' });

  const routes = [
    '/dashboard', '/companies', '/modules-admins', '/users',
    '/audit-logs', '/support/failed-notifications', '/support/api-usage',
    '/support/company-activity', '/support/error-logs',
    '/channels', '/providers', '/global-templates',
    '/files/reports', '/files/media', '/files/storage', '/settings/profile',
  ];

  console.log('\n=== ROUTE CHECK ===');
  for (const r of routes) {
    await page.goto(`http://localhost:3000${r}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(300);
    const finalUrl = page.url().replace('http://localhost:3000', '');
    const redirectedToLogin = finalUrl.includes('/auth/login');
    console.log(`${redirectedToLogin ? '🔒 AUTH' : '✅'} ${r} → ${finalUrl}`);
  }

  await page.screenshot({ path: '/tmp/nav-05-last-page.png' });
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
