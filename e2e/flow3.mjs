import { chromium } from 'playwright';
const log = (...a) => console.log(...a);
const browser = await chromium.launch();

async function platformLogin(page) {
  await page.waitForSelector('input[type=email]', { timeout: 15000 });
  await page.fill('input[type=email]', 'demo@saptta.com');
  await page.fill('input[type=password]', 'Demo@1234');
  await page.click('button[type=submit]');
}

// ---- Finance: open → Back to products ----
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  log('\n========== FINANCE: open → Back to products ==========');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await platformLogin(page);
  await page.waitForURL('**/app', { timeout: 20000 }).catch(() => {});
  await page.getByRole('button', { name: /open fin-saptta/i }).first().click();
  await page.waitForURL('http://acme.localhost:8080/**', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  log('  in finance at:', page.url());
  // Click the "Back to products" icon button (title attr).
  const back = page.locator('[title="Back to products"]');
  log('  back-to-products buttons:', await back.count());
  await back.first().click();
  await page.waitForURL('http://localhost:8080/app**', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  log('  after click, url:', page.url());
  const body = (await page.textContent('body')) || '';
  log('  on switcher (sees "Choose a product")?', body.includes('Choose a product'));
  log('  bounced to login?', page.url().includes('/login'));
  await page.screenshot({ path: 'shots/F-back-to-products.png', fullPage: true });
  await ctx.close();
}

// ---- HR: open → Back to products ----
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  log('\n========== HR: open → Back to products ==========');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await platformLogin(page);
  await page.waitForURL('**/app', { timeout: 20000 }).catch(() => {});
  await page.getByRole('button', { name: /open saptta hr/i }).first().click();
  await page.waitForURL('http://hr.localhost:8080/**', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  log('  in HR at:', page.url(), '| title:', await page.title());
  // Open the user menu then click Back to products. Try clicking the avatar/email area.
  const btn = page.getByRole('button', { name: /back to products/i });
  if (await btn.count() === 0) {
    // Menu likely collapsed — click the user/account toggle to reveal it.
    const toggles = ['text=demo@saptta.com', '[class*="avatar"]', '[class*="user"]', 'header button'];
    for (const sel of toggles) {
      const el = page.locator(sel).first();
      if (await el.count()) { await el.click().catch(()=>{}); await page.waitForTimeout(400); }
      if (await btn.count()) break;
    }
  }
  log('  back-to-products buttons after menu:', await btn.count());
  if (await btn.count()) {
    await Promise.all([
      page.waitForURL('http://localhost:8080/app**', { timeout: 20000 }).catch(() => {}),
      btn.first().click(),
    ]);
    await page.waitForTimeout(2500);
  }
  log('  after click, url:', page.url());
  const body = (await page.textContent('body')) || '';
  log('  on switcher?', body.includes('Choose a product'));
  log('  bounced to login?', page.url().includes('/login'));
  await page.screenshot({ path: 'shots/H-back-to-products.png', fullPage: true });
  await ctx.close();
}

await browser.close();
