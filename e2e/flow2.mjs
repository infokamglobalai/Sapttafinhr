import { chromium } from 'playwright';
const log = (...a) => console.log(...a);
const browser = await chromium.launch();

async function run(label, fn) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [], nets = [], trail = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) nets.push(`${r.status()} ${r.request().method()} ${r.url().slice(0,90)}`); });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) trail.push(f.url().slice(0, 90)); });
  log(`\n========== ${label} ==========`);
  try { await fn(page); } catch (e) { log('  ERROR:', e.message); }
  log('  -- nav trail --'); trail.forEach((u, i) => log(`     ${i}. ${u}`));
  if (errs.length) { log('  -- console errors --'); errs.slice(0,10).forEach(e => log('     -', e)); }
  if (nets.length) { log('  -- http >=400 --'); nets.slice(0,15).forEach(e => log('     -', e)); }
  await ctx.close();
}

async function platformLogin(page) {
  await page.waitForSelector('input[type=email]', { timeout: 15000 });
  await page.fill('input[type=email]', 'demo@saptta.com');
  await page.fill('input[type=password]', 'Demo@1234');
  await page.click('button[type=submit]');
}

// PATH B: platform → switcher → click Open fin-saptta
await run('PATH B: switcher → Open Finance', async (page) => {
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await platformLogin(page);
  await page.waitForURL('**/app', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  log('  landed on switcher:', page.url());
  await page.screenshot({ path: 'shots/B1-switcher.png', fullPage: true });
  // Find the "Open fin-saptta" button
  const btn = page.getByRole('button', { name: /open fin-saptta/i });
  const count = await btn.count();
  log('  "Open fin-saptta" buttons found:', count);
  if (count) {
    await btn.first().click();
    await page.waitForTimeout(4000);
    log('  url after click:', page.url());
    const onLogin = page.url().includes('/login') || ((await page.textContent('body'))||'').includes('access your workspace');
    log('  back on a login page?', onLogin);
    await page.screenshot({ path: 'shots/B2-finance.png', fullPage: true });
  }
});

// PATH C: platform → switcher → click Open Saptta HR
await run('PATH C: switcher → Open HR', async (page) => {
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });
  await platformLogin(page);
  await page.waitForURL('**/app', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const btn = page.getByRole('button', { name: /open saptta hr/i });
  const count = await btn.count();
  log('  "Open Saptta HR" buttons found:', count);
  if (count) {
    await btn.first().click();
    await page.waitForTimeout(5000);
    log('  url after click:', page.url());
    const body = (await page.textContent('body')) || '';
    log('  shows HR login form?', body.toLowerCase().includes('password') && page.url().includes('/auth/login'));
    log('  page title:', await page.title());
    await page.screenshot({ path: 'shots/C-hr.png', fullPage: true });
  }
});

// PATH D: HR direct
await run('PATH D: hr.localhost direct', async (page) => {
  await page.goto('http://hr.localhost:8080/', { waitUntil: 'networkidle' }).catch(()=>{});
  await page.waitForTimeout(1500);
  log('  url after load:', page.url());
  await page.screenshot({ path: 'shots/D-hr-direct.png', fullPage: true });
});

await browser.close();
