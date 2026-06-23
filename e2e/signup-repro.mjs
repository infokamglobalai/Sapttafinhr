import { chromium } from 'playwright';

const log = (...a) => console.log(...a);
const browser = await chromium.launch();
const page = await browser.newContext().then(c => c.newPage());

const consoleErrors = [];
const netFails = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('requestfailed', (r) => netFails.push(`${r.method()} ${r.url()} -> ${r.failure()?.errorText}`));
page.on('response', async (r) => {
  const u = r.url();
  if (u.includes('/api/v1/saas/signup') || u.includes('/api/v1/auth') || u.includes('/api/v1/saas/subscriptions') || u.includes('/api/v1/saas/dev/activate')) {
    let body = '';
    try { body = (await r.text()).slice(0, 300); } catch {}
    log(`   [net] ${r.status()} ${u}\n        ${body}`);
  }
});

const shot = (n) => page.screenshot({ path: `shots/signup-${n}.png`, fullPage: true }).catch(() => {});
const email = `repro+${Date.now()}@example.com`;

try {
  log('1. open /signup');
  await page.goto('http://localhost:8080/signup', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  log('   url:', page.url());
  await shot('01-landing');

  // If on plan-choice step, pick the "complete" plan.
  const choosePlanBtns = await page.$$('button:has-text("Choose Plan")');
  log('   choose-plan buttons:', choosePlanBtns.length);
  if (choosePlanBtns.length) {
    await choosePlanBtns[choosePlanBtns.length - 1].click();
    await page.waitForTimeout(1200);
  }
  await shot('02-form');

  log('2. fill form');
  await page.fill('input[placeholder="John"]', 'Repro');
  await page.fill('input[placeholder="Doe"]', 'Tester');
  await page.fill('input[placeholder="Acme Pvt Ltd"]', `Repro Co ${Date.now()}`);
  await page.fill('input[placeholder="you@company.com"]', email);
  await page.fill('input[placeholder="At least 8 characters"]', 'Test1234!');
  log('   email:', email);
  await shot('03-filled');

  // Run A leaves the country Select untouched (relies on initialValue="IN").
  // Run B (REPRO_SELECT_COUNTRY=1) explicitly picks India from the dropdown.
  if (process.env.REPRO_SELECT_COUNTRY) {
    log('   explicitly selecting country = India');
    await page.click('.ant-select-selector');
    await page.waitForTimeout(400);
    await page.click('.ant-select-item-option:has-text("India")');
    await page.waitForTimeout(300);
  }

  // Dump every input's value to confirm the form is actually filled.
  const fieldVals = await page.$$eval('input', els =>
    els.map(e => ({ ph: e.getAttribute('placeholder'), val: e.value, type: e.type })));
  log('   field values:', JSON.stringify(fieldVals));

  // Inspect the submit button + wire a DOM submit listener before clicking.
  const btnInfo = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /Create Workspace/.test(b.textContent || ''));
    const form = btn?.closest('form');
    if (form) form.addEventListener('submit', () => { window.__submitFired = true; }, { once: true });
    const r = btn?.getBoundingClientRect();
    const topEl = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return {
      found: !!btn,
      disabled: btn?.disabled,
      htmlType: btn?.getAttribute('type'),
      classes: btn?.className,
      hasForm: !!form,
      // What element is actually on top at the button's center (occlusion check)?
      topElTag: topEl ? `${topEl.tagName}.${topEl.className}`.slice(0, 80) : null,
      topElIsButtonOrChild: topEl ? (btn?.contains(topEl) || topEl === btn) : null,
    };
  });
  log('   button info:', JSON.stringify(btnInfo));

  // Log EVERY request fired from here on.
  const allReqs = [];
  page.on('request', (r) => allReqs.push(`${r.method()} ${r.url()}`));

  log('3. submit (Create Workspace)');
  await page.click('button:has-text("Create Workspace")');
  await page.waitForTimeout(300);
  log('   DOM submit fired:', await page.evaluate(() => !!window.__submitFired));
  const btnLoading = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /Create Workspace/.test(b.textContent || ''));
    return btn?.className.includes('ant-btn-loading');
  });
  log('   button loading after click:', btnLoading);
  // Wait up to 20s for the signup to resolve + navigate.
  await page.waitForURL('**/app**', { timeout: 20000 }).catch(() => {});
  log('   requests after click:', JSON.stringify(allReqs.slice(0, 15), null, 0));
  await page.waitForTimeout(5000);
  log('   url after submit:', page.url());

  // antd validation errors block onFinish → no network call.
  const errs = await page.$$eval('.ant-form-item-explain', els => els.map(e => e.textContent));
  log('   validation explains:', JSON.stringify(errs));
  const errCount = await page.$$eval('.ant-form-item-has-error', els => els.length);
  log('   .has-error count:', errCount);
  const body = (await page.textContent('body')) || '';
  log('   body snippet:', body.replace(/\s+/g, ' ').slice(0, 400));
  await shot('04-after-submit');

  // antd toast messages
  const toasts = await page.$$eval('.ant-message-notice-content', els => els.map(e => e.textContent));
  log('   toasts:', JSON.stringify(toasts));

} catch (e) {
  log('ERROR:', e.message);
  await shot('99-error');
} finally {
  log('\n=== CONSOLE ERRORS ===');
  if (!consoleErrors.length) log('  (none)');
  consoleErrors.slice(0, 20).forEach((e) => log('  -', e));
  log('\n=== NET FAILURES ===');
  if (!netFails.length) log('  (none)');
  netFails.slice(0, 20).forEach((e) => log('  -', e));
  await browser.close();
}
