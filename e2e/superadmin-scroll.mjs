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

  // The scroll container is the dashboard root div (overflowY:auto).
  const scroll = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(d => {
      const s = getComputedStyle(d);
      return s.overflowY === 'auto' && d.scrollHeight > d.clientHeight + 50;
    });
    if (!el) return { found: false };
    const before = el.scrollTop;
    el.scrollTop = el.scrollHeight;       // scroll to bottom
    return { found: true, before, after: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  });
  log('scroll container:', JSON.stringify(scroll));
  log('  PASS page is scrollable:', scroll.found && scroll.after > scroll.before);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/sa-07-scrolled-bottom.png', fullPage: false });

  // Row click → company profile (click a status tag cell, NOT the action buttons).
  log('click on a company row (cell, not actions)');
  await page.evaluate((d) => { d.scrollTop = 0; }, await page.evaluateHandle(() => [...document.querySelectorAll('div')].find(x => getComputedStyle(x).overflowY === 'auto')));
  await page.waitForTimeout(500);
  // Click the "Since" date cell of the first data row to test row-level click.
  const firstRow = page.locator('tbody tr.ant-table-row').first();
  await firstRow.locator('td').nth(4).click();   // Since column — safe (no buttons)
  await page.waitForTimeout(2500);
  log('  url:', page.url());
  const body = (await page.textContent('body')) || '';
  log('  PASS navigated to company profile:', page.url().includes('/superadmin/companies/'));
  log('  PASS profile rendered:', body.includes('Module access') && body.includes('Open as admin'));
  await page.screenshot({ path: 'shots/sa-08-rowclick-profile.png', fullPage: false });
} catch (e) {
  log('ERROR:', e.message);
  await page.screenshot({ path: 'shots/sa-99-scroll-error.png' }).catch(() => {});
} finally {
  log('\n=== CONSOLE ERRORS ==='); errs.slice(0, 10).forEach(e => log('  -', e));
  if (!errs.length) log('  (none)');
  await page.context().browser().close();
}
