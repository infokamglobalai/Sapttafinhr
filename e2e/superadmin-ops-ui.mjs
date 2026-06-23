import { chromium } from 'playwright';
const log = (...a) => console.log(...a);
const page = await chromium.launch().then(b => b.newContext().then(c => c.newPage()));
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const shot = (n) => page.screenshot({ path: `shots/ops-${n}.png`, fullPage: true });

try {
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'sp@saptta.com');
  await page.fill('input[type=password]', 'Saptta@2026');
  await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.click('button[type=submit]')]);
  await page.waitForTimeout(3000);

  const dash = (await page.textContent('body')) || '';
  log('PASS dashboard health chip:', dash.includes('Healthy') || dash.includes('Degraded'));
  log('PASS dashboard Operations btn:', dash.includes('Operations'));

  log('go to Operations (deep link refresh too)');
  await page.goto('http://localhost:8080/superadmin/ops', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  log('  url:', page.url());
  const h = (await page.textContent('body')) || '';
  log('  PASS health tab renders:', h.includes('operational') || h.includes('Degraded'));
  log('  PASS service cards:', h.includes('PostgreSQL') && h.includes('Redis') && h.includes('Celery worker') && h.includes('HR backend'));
  log('  PASS HR rollup:', h.includes('Total employees'));
  await shot('01-health');

  await page.click('div[role="tab"]:has-text("Activity")').catch(() => {});
  await page.waitForTimeout(1200);
  const a = (await page.textContent('body')) || '';
  log('  PASS activity tab (source col):', a.includes('Source') && (a.includes('console') || a.includes('system')));
  await shot('02-activity');

  await page.click('div[role="tab"]:has-text("Payments")').catch(() => {});
  await page.waitForTimeout(1000);
  const p = (await page.textContent('body')) || '';
  log('  PASS payments tab:', p.includes('SaaS invoices') && p.includes('webhook'));
  await shot('03-payments');

  await page.click('div[role="tab"]:has-text("Automation")').catch(() => {});
  await page.waitForTimeout(1000);
  const au = (await page.textContent('body')) || '';
  log('  PASS automation tab:', au.includes('Run dunning now') && au.includes('Scheduled jobs'));
  await shot('04-automation');
} catch (e) {
  log('ERROR:', e.message);
  await shot('99-error');
} finally {
  log('\n=== CONSOLE ERRORS ==='); if (!errs.length) log('  (none)'); errs.slice(0, 12).forEach(e => log('  -', e));
  await page.context().browser().close();
}
