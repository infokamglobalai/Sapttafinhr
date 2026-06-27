#!/usr/bin/env node
/**
 * Generate PDF exports from README.md and customer guide HTML.
 * Requires: npm install in e2e/ (playwright).
 *
 * Usage: node scripts/generate-docs-pdf.mjs
 * Output:
 *   marketing/collateral/Saptta-Project-Guide.pdf
 *   marketing/collateral/en/Saptta-Customer-Guide.pdf
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

let chromium;
try {
  const pwPath = pathToFileURL(join(root, 'e2e', 'node_modules', 'playwright', 'index.mjs')).href;
  ({ chromium } = await import(pwPath));
} catch (err) {
  console.error('Playwright not found. Run: cd e2e; npm install; npx playwright install chromium');
  console.error(err?.message || err);
  process.exit(1);
}

function mdToHtml(md) {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang}">${code.trimEnd()}</code></pre>`);

  // inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // horizontal rules
  html = html.replace(/^---$/gm, '<hr/>');

  // bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // tables (simple)
  html = html.replace(/^\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)+)/gm, (_, header, body) => {
    const ths = header.split('|').filter(Boolean).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const tds = row.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // unordered lists
  html = html.replace(/^(?:- .+\n?)+/gm, block => {
    const items = block.trim().split('\n').map(l => `<li>${l.slice(2)}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // checkboxes in lists
  html = html.replace(/\[ \]/g, '☐').replace(/\[x\]/gi, '☑');

  // paragraphs (lines not already tagged)
  html = html.split('\n\n').map(block => {
    const t = block.trim();
    if (!t) return '';
    if (/^<(h[1-4]|ul|ol|table|pre|hr)/.test(t)) return t;
    return `<p>${t.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');

  return html;
}

function wrapProjectGuide(body) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Saptta — Complete Project Guide</title>
<style>
  body { font-family: "Segoe UI", system-ui, sans-serif; font-size: 9.5pt; line-height: 1.5; color: #0F172A; max-width: 190mm; margin: 0 auto; padding: 12mm; }
  h1 { font-size: 20pt; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; }
  h2 { font-size: 14pt; margin-top: 1.4em; color: #1D4ED8; page-break-after: avoid; }
  h3 { font-size: 11pt; margin-top: 1em; page-break-after: avoid; }
  h4 { font-size: 10pt; }
  pre { background: #F1F5F9; padding: 10px 12px; border-radius: 6px; font-size: 8pt; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
  code { font-family: Consolas, monospace; font-size: 8.5pt; background: #F1F5F9; padding: 1px 4px; border-radius: 3px; }
  pre code { background: none; padding: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 10px 0; }
  th, td { border: 1px solid #E2E8F0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #F8FAFC; }
  ul { margin: 6px 0 6px 20px; }
  li { margin: 3px 0; }
  hr { border: none; border-top: 1px solid #E2E8F0; margin: 16px 0; }
  a { color: #2563EB; }
  @page { size: A4; margin: 14mm; }
  @media print { h2 { page-break-before: auto; } }
</style></head><body>${body}</body></html>`;
}

async function pdfFromHtml(htmlPath, pdfPath, opts = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = pathToFileURL(htmlPath).href;
  await page.goto(url, { waitUntil: 'networkidle' });
  mkdirSync(dirname(pdfPath), { recursive: true });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: opts.margin || { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
    ...opts,
  });
  await browser.close();
  console.log('Wrote', pdfPath);
}

const readmePath = join(root, 'README.md');
const tmpHtml = join(root, 'marketing', 'collateral', '_project-guide-print.html');
const projectPdf = join(root, 'marketing', 'collateral', 'Saptta-Project-Guide.pdf');
const customerHtml = join(root, 'marketing', 'collateral', 'en', 'saptta-customer-guide.html');
const customerPdf = join(root, 'marketing', 'collateral', 'en', 'Saptta-Customer-Guide.pdf');

const md = readFileSync(readmePath, 'utf8');
writeFileSync(tmpHtml, wrapProjectGuide(mdToHtml(md)), 'utf8');

await pdfFromHtml(tmpHtml, projectPdf);
await pdfFromHtml(customerHtml, customerPdf);

console.log('Done. Customer HTML:', customerHtml);
