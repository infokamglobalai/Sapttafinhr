import { chromium } from 'playwright';
const log = (...a) => console.log(...a);
const browser = await chromium.launch();

async function login(page) {
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type=email]', { timeout: 15000 });
  await page.fill('input[type=email]', 'demo@saptta.com');
  await page.fill('input[type=password]', 'Demo@1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/app', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

// A) Switcher shows both cards (demo owns both)
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  log('\n== A. Switcher ==');
  await login(page);
  log('  url:', page.url());
  const body = (await page.textContent('body')) || '';
  log('  has fin-saptta card:', body.includes('fin-saptta'));
  log('  has Saptta HR card:', body.includes('Saptta HR'));
  await page.screenshot({ path: 'shots/P1-switcher.png', fullPage: true });
  await ctx.close();
}

// B) Finance → top-bar product menu → switch to HR
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  log('\n== B. Finance → switch to HR ==');
  await login(page);
  await page.getByRole('button', { name: /open fin-saptta/i }).first().click();
  await page.waitForURL('http://acme.localhost:8080/**', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  log('  in finance:', page.url());
  await page.locator('[title="Products & account"]').first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Saptta HR$/ }).first().click();
  await page.waitForURL('http://hr.localhost:8080/**', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  log('  after switch, url:', page.url(), '| title:', await page.title());
  log('  signed in to HR (not login):', !page.url().includes('/login'));
  await ctx.close();
}

// C) Finance → sign out → login, and session cleared (revisit bounces to login)
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  log('\n== C. Finance → Sign out ==');
  await login(page);
  await page.getByRole('button', { name: /open fin-saptta/i }).first().click();
  await page.waitForURL('http://acme.localhost:8080/**', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.locator('[title="Products & account"]').first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Sign out$/ }).first().click();
  await page.waitForURL('**/login**', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  log('  after sign out, url:', page.url());
  log('  on login page:', page.url().includes('/login'));
  // Revisit Finance directly — should bounce to login (session cleared).
  await page.goto('http://acme.localhost:8080/', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  log('  revisit finance →', page.url());
  log('  bounced to platform login:', page.url().includes('localhost:8080/login'));
  await ctx.close();
}

await browser.close();
