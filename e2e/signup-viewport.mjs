import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1280, height: 900 } }).then(c => c.newPage());
await page.goto('http://localhost:8080/signup', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const btns = await page.$$('button:has-text("Choose Plan")');
if (btns.length) { await btns[btns.length - 1].click(); await page.waitForTimeout(1000); }
// Viewport screenshot at top (no scroll) — shows what the user actually sees.
await page.screenshot({ path: 'shots/signup-viewport-top.png' });
// Is the navbar overlapping the form card? Compare bounding boxes.
const info = await page.evaluate(() => {
  const nav = document.querySelector('header, nav, [class*="navbar" i], [class*="Navbar"]');
  const card = [...document.querySelectorAll('*')].find(e => /Create your workspace/.test(e.textContent || '') && e.children.length < 6);
  const navR = nav?.getBoundingClientRect();
  const company = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Acme Pvt Ltd');
  const compR = company?.getBoundingClientRect();
  return {
    nav: nav ? { tag: nav.tagName, cls: nav.className?.slice?.(0, 40), top: navR.top, bottom: navR.bottom, position: getComputedStyle(nav).position } : null,
    companyInputTop: compR?.top,
    navCoversCompany: navR && compR ? (navR.bottom > compR.top && navR.top < compR.bottom) : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
