import { chromium } from 'playwright';

const log = (...a) => console.log(...a);
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const trail = [];
page.on('framenavigated', (f) => { if (f === page.mainFrame()) trail.push(f.url()); });

try {
  log('STEP 1 — open platform login:');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('input[type=email]', { timeout: 15000 });

  log('STEP 2 — sign in as superadmin sp@saptta.com:');
  await page.fill('input[type=email]', 'sp@saptta.com');
  await page.fill('input[type=password]', 'Saptta@2026');
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);
  await page.waitForTimeout(3500);

  log('  url after login:', page.url());
  const bodyText = (await page.textContent('body')) || '';
  const onSuperadmin = page.url().includes('/superadmin');
  const sawConsole = bodyText.includes('Platform Overview') || bodyText.includes('SUPER ADMIN');
  log('  on /superadmin route?', onSuperadmin);
  log('  superadmin console rendered?', sawConsole);
  log('  RESULT:', onSuperadmin && sawConsole ? 'PASS ✅' : 'FAIL ❌');
  await page.screenshot({ path: 'shots/superadmin-redirect.png', fullPage: true });
} catch (e) {
  log('ERROR during flow:', e.message);
  await page.screenshot({ path: 'shots/superadmin-redirect-error.png' }).catch(() => {});
} finally {
  log('\n=== NAV TRAIL ===');
  trail.forEach((u, i) => log(`  ${i}. ${u}`));
  await browser.close();
}
