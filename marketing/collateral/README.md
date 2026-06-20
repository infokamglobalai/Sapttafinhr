# Saptta Marketing Collateral

## ⭐ Primary client deck (use this for sales)

| File | Description |
|------|-------------|
| **[Saptta-Client-Showcase.pptx](Saptta-Client-Showcase.pptx)** | **One polished 11-slide deck** — product screenshots, pricing cards, compliance, CTA |
| [build_client_showcase_pptx.py](build_client_showcase_pptx.py) | Regenerate after updating `shots/*.png` or slide copy |

Open in PowerPoint → present full-screen (F5). Screenshots pulled from repo `shots/` (switcher, HR, finance).

### Slide outline

1. Title — one platform for people & money  
2. Problem vs solution (before/after cards)  
3. Platform — HRMS · Accounts · Complete + pricing cards  
4. **Screenshot** — product switcher  
5. **Screenshot** — HR dashboard  
6. **Screenshot** — Finance workspace  
7. HR lifecycle modules (8 tiles)  
8. India + GCC compliance  
9. Pricing table + competitor comparison  
10. 90-day outcomes  
11. CTA — book demo  

---

## English & Arabic (optional separate packs)

Separate language packs for GCC: English for boards, Arabic for local owners.

| Folder | Language | Direction | Audience |
|--------|----------|-----------|------------|
| **[en/](en/)** | English | LTR | India SMB, international boards, English-first GCC |
| **[ar/](ar/)** | العربية (MSA) | RTL | Kuwait, UAE, KSA — owners, HR directors, local partners |

## Files in each language

| File | EN | AR |
|------|----|----|
| Executive deck (HTML → PDF) | `en/executive-showcase-deck.html` | `ar/executive-showcase-deck.html` |
| Executive deck (PowerPoint) | `en/Saptta-Executive-Showcase-Jun2026.pptx` | `ar/Saptta-Executive-Showcase-Jun2026-AR.pptx` |
| **Client showcase (recommended)** | **`Saptta-Client-Showcase.pptx`** (root) | — |
| One-pager brochure | `en/brochure-one-pager.html` | `ar/brochure-one-pager.html` |
| Complete product (2 pages) | `en/brochure-complete-product.html` | `ar/brochure-complete-product.html` |
| GCC / Kuwait (2 pages) | `en/brochure-gcc-kuwait.html` | `ar/brochure-gcc-kuwait.html` |
| Speaker notes | `en/SPEAKER_NOTES.md` | `ar/SPEAKER_NOTES.md` |
| Regenerate PPT | `en/generate_executive_pptx.py` | `ar/generate_executive_pptx.py` |

Legacy copies in the collateral root still work; prefer **`en/`** and **`ar/`** going forward.

## Export to PDF

1. Open the HTML file for your language in **Chrome**.
2. **Ctrl+P** → Save as PDF.
3. Deck: **A4 Landscape** · Brochures: **A4 Portrait**.
4. Turn **Background graphics ON**.
5. Arabic: confirm preview shows **right-to-left** layout before printing.

## When to use which

| Meeting | Use |
|---------|-----|
| **Default client pitch (any market)** | **`Saptta-Client-Showcase.pptx`** |
| Indian founder / CA / English board | EN deck + one-pager |
| Kuwaiti / Emirati owner, Arabic HR team | **AR** deck + GCC brochure |
| Mixed room (common in Gulf) | Lead with **AR**, keep **EN** PDF on tablet as backup |
| Email follow-up | Attach **both** PDFs — subject line in English + Arabic |

## Customise before printing

Replace contact placeholders in footers: `hello@saptta.com` · `saptta.com`

## Related docs

- Pricing: `apps/hr/docs/PRICING_EXECUTIVE_BRIEF.md`
- Demo script: `DEMO.md`
- Language strategy: `apps/hr/docs/GCC_LANGUAGES.md`
