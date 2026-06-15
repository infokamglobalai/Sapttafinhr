import { chromium } from 'playwright';

const log = (...a) => console.log(...a);
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleErrors = [];
const netFails = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('requestfailed', (r) => netFails.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) netFails.push(`${r.status()} ${r.request().method()} ${r.url()}`); });

const trail = [];
page.on('framenavigated', (f) => { if (f === page.mainFrame()) trail.push(f.url()); });

try {
  log('STEP 1 — open Finance product directly (no session):');
  await page.goto('http://acme.localhost:8080/', { waitUntil: 'networkidle', timeout: 30000 });
  log('  url after load:', page.url());

  // Should have bounced to the platform login.
  if (!page.url().includes('/login')) {
    log('  !! did NOT redirect to platform login');
  }

  log('STEP 2 — sign in on the platform login:');
  // Wait for the email field.
  await page.waitForSelector('input[type=email]', { timeout: 15000 });
  await page.fill('input[type=email]', 'demo@saptta.com');
  await page.fill('input[type=password]', 'Demo@1234');
  await page.screenshot({ path: 'shots/01-login.png' });
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);
  // Give SPA/handoff time.
  await page.waitForTimeout(4000);
  log('  url after submit:', page.url());
  await page.screenshot({ path: 'shots/02-after-login.png', fullPage: true });

  log('STEP 3 — assess where we landed:');
  const bodyText = (await page.textContent('body')) || '';
  const onFinanceLogin = bodyText.includes('Enter your credentials to access your workspace');
  const onPlatformLogin = page.url().includes('/login');
  const looksLikeApp = await page.$('nav, aside, [class*="sidebar"], [class*="Shell"]');
  log('  on a login page?', onPlatformLogin || onFinanceLogin, '(platform:', onPlatformLogin, 'finance:', onFinanceLogin, ')');
  log('  app shell elements present?', !!looksLikeApp);
  log('  title-ish:', (await page.title()));
} catch (e) {
  log('ERROR during flow:', e.message);
  await page.screenshot({ path: 'shots/99-error.png' }).catch(() => {});
} finally {
  log('\n=== NAV TRAIL ===');
  trail.forEach((u, i) => log(`  ${i}. ${u}`));
  log('\n=== CONSOLE ERRORS ===');
  consoleErrors.slice(0, 20).forEach((e) => log('  -', e));
  log('\n=== NETWORK 4xx/5xx / FAILS ===');
  netFails.slice(0, 30).forEach((e) => log('  -', e));
  await browser.close();
}
