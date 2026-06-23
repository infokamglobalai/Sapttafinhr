import { chromium } from 'playwright';
const log = (...a) => console.log(...a);
const page = await chromium.launch().then(b => b.newContext().then(c => c.newPage()));
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

try {
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'sp@saptta.com');
  await page.fill('input[type=password]', 'Saptta@2026');
  await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.click('button[type=submit]')]);
  await page.waitForTimeout(2500);

  log('open kuwait detail');
  await page.goto('http://localhost:8080/superadmin/companies/kuwait', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  log('click Open as admin');
  await page.click('button:has-text("Open as admin")');
  await page.waitForTimeout(4000);
  log('  url:', page.url());
  const body = (await page.textContent('body')) || '';
  const impersonating = body.includes('impersonating') || body.includes('Viewing as');
  log('  PASS landed on /app:', page.url().includes('/app'));
  log('  PASS impersonation banner:', impersonating);
  await page.screenshot({ path: 'shots/sa-06-impersonating.png', fullPage: true });

  log('click Exit impersonation');
  await page.click('button:has-text("Exit impersonation")');
  await page.waitForTimeout(3500);
  log('  url:', page.url());
  const body2 = (await page.textContent('body')) || '';
  log('  PASS back on /superadmin:', page.url().includes('/superadmin'));
  log('  PASS console restored (Platform Overview):', body2.includes('Platform Overview'));
  log('  PASS banner gone:', !(body2.includes('Exit impersonation')));
} catch (e) {
  log('ERROR:', e.message);
  await page.screenshot({ path: 'shots/sa-99-imp-error.png' }).catch(() => {});
} finally {
  log('\n=== CONSOLE ERRORS ==='); errs.slice(0, 10).forEach(e => log('  -', e));
  if (!errs.length) log('  (none)');
  await page.context().browser().close();
}
