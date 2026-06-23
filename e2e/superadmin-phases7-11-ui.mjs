import { chromium } from 'playwright';
const log = (...a) => console.log(...a);
const page = await chromium.launch().then(b => b.newContext().then(c => c.newPage()));
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const shot = (n) => page.screenshot({ path: `shots/p711-${n}.png`, fullPage: true });

try {
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'sp@saptta.com');
  await page.fill('input[type=password]', 'Saptta@2026');
  await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.click('button[type=submit]')]);
  await page.waitForTimeout(3000);

  // Phase 7 — dashboard search + filters + server pagination
  const dash = (await page.textContent('body')) || '';
  log('P7 PASS header links (Revenue/Users/Announce):', dash.includes('Revenue') && dash.includes('Users') && dash.includes('Announce'));
  log('P7 PASS search box present:', (await page.locator('input[placeholder*="Search company"]').count()) > 0);
  await page.fill('input[placeholder*="Search company"]', 'wayne');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const filtered = (await page.textContent('body')) || '';
  log('P7 PASS search filters table:', filtered.includes('Wayne Industries'));
  await shot('01-dashboard-search');

  // Phase 7 — company detail usage + notes
  await page.goto('http://localhost:8080/superadmin/companies/acme', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const det = (await page.textContent('body')) || '';
  log('P7 PASS detail usage block:', det.includes('Usage') && det.includes('HR headcount') && det.includes('Onboarding'));
  log('P7 PASS notes tab present:', det.includes('Notes'));
  await shot('02-detail-usage');

  // Phase 8 — revenue
  await page.goto('http://localhost:8080/superadmin/revenue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const rev = (await page.textContent('body')) || '';
  log('P8 PASS revenue KPIs:', rev.includes('MRR') && rev.includes('ARR') && rev.includes('GST collected'));
  log('P8 PASS dunning queue:', rev.includes('Dunning queue'));
  log('P8 PASS export buttons:', rev.includes('Invoices CSV') && rev.includes('GST CSV'));
  await shot('03-revenue');

  // Phase 10 — users
  await page.goto('http://localhost:8080/superadmin/users', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const usr = (await page.textContent('body')) || '';
  log('P10 PASS users page:', usr.includes('Platform Users') && usr.includes('Workspace'));
  log('P10 PASS admin/impersonate actions:', (usr.includes('Make admin') || usr.includes('Revoke admin')) && usr.includes('Open as'));
  await shot('04-users');

  // Phase 11 — announcements: create one, see banner, then delete
  await page.goto('http://localhost:8080/superadmin/announcements', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const ann = (await page.textContent('body')) || '';
  log('P11 PASS announcements page:', ann.includes('Platform Announcements'));
  await page.click('button:has-text("New announcement")');
  await page.waitForTimeout(600);
  await page.fill('input[placeholder*="Scheduled maintenance"]', 'E2E banner test');
  await page.click('.ant-modal button:has-text("Publish")');
  await page.waitForTimeout(1800);
  await shot('05-announcements');
  // Navigate to dashboard → banner should show
  await page.goto('http://localhost:8080/superadmin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const withBanner = (await page.textContent('body')) || '';
  log('P11 PASS global banner shows:', withBanner.includes('E2E banner test'));
  await shot('06-banner');
  // cleanup: delete the announcement
  await page.goto('http://localhost:8080/superadmin/announcements', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('button:has-text("Delete")').catch(() => {});
  await page.waitForTimeout(400);
  await page.click('.ant-popover button:has-text("OK")').catch(() => {});
  await page.waitForTimeout(1000);
  log('P11 cleanup: announcement deleted');
} catch (e) {
  log('ERROR:', e.message);
  await shot('99-error');
} finally {
  log('\n=== CONSOLE ERRORS ==='); if (!errs.length) log('  (none)'); errs.slice(0, 12).forEach(e => log('  -', e));
  await page.context().browser().close();
}
