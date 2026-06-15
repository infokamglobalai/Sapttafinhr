# Share Saptta Pricing Deck with ChatGPT

Use **one** of these methods to give ChatGPT the **exact** design.

---

## Method 1 — Upload PDF (easiest, best visual match)

1. Open [ChatGPT](https://chatgpt.com)
2. Click **Attach** (paperclip icon)
3. Upload: `saptta-pricing-executive.pdf`
4. Paste this prompt:

```
This is my Saptta Pricing Executive Deck (June 2026). Keep the EXACT same visual design when you help me:
- Green accent #1a7f5a, blue callouts #2563eb
- A4 layout, card sections with grey headers
- 5 stat boxes at top, tables with green highlight rows
- Progress bars for revenue levers, bar chart for MRR
- Font: Segoe UI, clean executive style, no gradients

Pricing data:
- HRMS: ₹111/employee/month (fixed)
- Finance: ₹4,999/month flat
- Complete bundle: ₹7,999 for 50 emp (list ₹10,549, 24% off)
- Prepay: HRMS/Finance 3·5·9% | Complete 4·6·11%

When I ask for changes, output updated HTML that matches this design exactly.
```

---

## Method 2 — Upload HTML file (best for edits / code)

1. In ChatGPT, attach: `saptta-pricing-executive.html`
2. Paste this prompt:

```
This HTML file IS the exact design. Do not change layout, colors, or CSS unless I ask.
Use it as the source of truth. When I request edits, return the full updated HTML file only.
```

ChatGPT can read `.html` files and return modified code.

---

## Method 3 — Copy-paste full HTML (no upload)

1. Open `saptta-pricing-executive.html` in Notepad or VS Code
2. Select all (`Ctrl+A`) → Copy (`Ctrl+C`)
3. In ChatGPT paste:

```
Below is the complete HTML for my Saptta Pricing Executive Deck. Reproduce this EXACT design for any edits I request. Return full HTML only.

[PASTE ENTIRE HTML HERE]
```

---

## Method 4 — Upload PDF + HTML together (most accurate)

Attach both files and paste:

```
PDF = visual reference (exact look)
HTML = source code (exact structure)

Match both. Never simplify the design. Keep all sections, tables, colors, and layout identical unless I specify a change.
```

---

## Files to share

| File | Path |
|------|------|
| PDF | `apps/hr/docs/saptta-pricing-executive.pdf` |
| HTML | `apps/hr/docs/saptta-pricing-executive.html` |
| Full prompt + HTML | `apps/hr/docs/saptta-pricing-executive-chatgpt-prompt.txt` |

Full path on your PC:
`C:\Users\ADMIN\Desktop\projects\sapttafinhr\apps\hr\docs\`

---

## Design spec (paste if ChatGPT loses context)

**Layout:** A4, 4 pages, page-breaks between major sections  
**Colors:** Green `#1a7f5a`, green-light `#e8f5ef`, blue `#2563eb`, blue-light `#eff6ff`, text `#1a1a1a`, muted `#5c5c5c`, border `#e2e2e2`  
**Typography:** Segoe UI, H1 22pt, stat values 16pt green, tables 9.5pt  
**Components:** badge pill, 5-column stat grid, blue left-border callout, cards with grey header, striped tables, green highlight rows, horizontal compare boxes, CSS bar chart for MRR, progress bars for levers, checkbox checklist  
**Sections:** Hero stats → Pricing rules (3 cols) → Complete anchor → Bands table → Prepay matrix → Complete prepay → Margin analysis → MRR growth → Roadmap → Revenue levers → CEO checklist
