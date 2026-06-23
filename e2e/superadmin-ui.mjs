import { chromium } from 'playwright';

const log = (...a) => console.log(...a);
const browser = await chromium.launch();
const page = await browser.newContext().then(c => c.newPage());
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

const shot = (n) => page.screenshot({ path: `shots/sa-${n}.png`, fullPage: true });

try {
  log('1. login as superadmin');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'sp@saptta.com');
  await page.fill('input[type=password]', 'Saptta@2026');
  await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), page.click('button[type=submit]')]);
  await page.waitForTimeout(3000);
  log('   url:', page.url());
  const body1 = (await page.textContent('body')) || '';
  log('   PASS dashboard:', page.url().includes('/superadmin') && body1.includes('Platform Overview'));
  log('   PASS analytics card:', body1.includes('Growth & Mix'));
  log('   PASS New company btn:', body1.includes('New company'));
  await shot('01-dashboard');

  log('2. open a company detail (click company name)');
  await page.click('a:has-text("Kuwait LLC")').catch(async () => {
    // fallback: navigate directly
    await page.goto('http://localhost:8080/superadmin/companies/kuwait', { waitUntil: 'networkidle' });
  });
  await page.waitForTimeout(2500);
  log('   url:', page.url());
  const body2 = (await page.textContent('body')) || '';
  log('   PASS detail tabs:', body2.includes('Overview') && body2.includes('Users') && body2.includes('Billing') && body2.includes('Activity'));
  log('   PASS open-as-admin btn:', body2.includes('Open as admin'));
  log('   PASS module access:', body2.includes('Module access'));
  await shot('02-company-detail');

  log('3. Users tab');
  await page.click('div[role="tab"]:has-text("Users")').catch(() => {});
  await page.waitForTimeout(1000);
  await shot('03-users-tab');

  log('4. Billing tab');
  await page.click('div[role="tab"]:has-text("Billing")').catch(() => {});
  await page.waitForTimeout(1000);
  await shot('04-billing-tab');

  log('5. Plans page');
  await page.goto('http://localhost:8080/superadmin/plans', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const body3 = (await page.textContent('body')) || '';
  log('   PASS plans page:', body3.includes('Pricing Plans') && body3.includes('New plan'));
  await shot('05-plans');
} catch (e) {
  log('ERROR:', e.message);
  await shot('99-error');
} finally {
  log('\n=== CONSOLE ERRORS ===');
  if (!consoleErrors.length) log('  (none)');
  consoleErrors.slice(0, 15).forEach((e) => log('  -', e));
  await browser.close();
}
