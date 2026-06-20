#!/usr/bin/env python3
"""One-shot template migration to HR UI v2 patterns."""
from __future__ import annotations

import re
from pathlib import Path

TEMPLATES_DIRS = [
    Path(__file__).resolve().parents[1] / "templates",
    Path(__file__).resolve().parents[1] / "apps" / "reports" / "templates",
]
SKIP = {"emails/", "reports/pdf/", "payroll/payslip_pdf", "payroll/form16_part_b", "admin/"}

REPLACEMENTS = [
    ("btn-base ", "btn "),
    ("btn-base btn-primary", "btn btn-primary"),
    ("btn-base btn-outline", "btn btn-outline"),
    ("btn-base btn-ghost", "btn btn-ghost"),
    ("btn-base btn-neutral", "btn btn-neutral"),
    ("btn-base btn-warning", "btn btn-outline"),
    ("btn-base btn-sm", "btn btn-sm"),
    ("#FFF7ED", "#EFF6FF"),
    ("#FED7AA", "#BFDBFE"),
    ("#C2410C", "#2563EB"),
    ("#FF6D00", "#2563EB"),
    ("#FB923C", "#3B82F6"),
    ("#EA580C", "#1D4ED8"),
    ("linear-gradient(135deg, #FB923C, #EA580C)", "linear-gradient(135deg, #3B82F6, #2563EB)"),
    ("linear-gradient(135deg,#FF9800,#FF6D00)", "#2563EB"),
    ("linear-gradient(90deg, #FB923C, #EA580C)", "linear-gradient(90deg, #3B82F6, #2563EB)"),
    ('class="card bg-base-100 shadow overflow-x-auto"', 'class="card hr-table-wrap"'),
    ('class="card bg-base-100 shadow"', 'class="card"'),
    ('class="card bg-base-100 shadow mb-4"', 'class="card hr-filter-bar"'),
    ('class="card bg-base-100 shadow"', 'class="card"'),
    ("card bg-base-100 shadow", "card"),
]

HEADER_WITH_SUB_RE = re.compile(
    r'<div class="flex items-center justify-between mb-[46]">\s*\n'
    r'\s*<div>\s*\n'
    r'\s*<h2 class="text-(?:xl|2xl) font-bold[^"]*">([^<]+)</h2>\s*\n'
    r'\s*<p class="[^"]*">([^<]+)</p>\s*\n'
    r'\s*</div>\s*\n'
    r'(\s*{% if[^%]+%}[\s\S]*?{% endif %}\s*\n)?'
    r'(\s*<div class="flex gap-2">([\s\S]*?)</div>\s*\n)?'
    r'</div>',
    re.MULTILINE,
)

HEADER_BACK_RE = re.compile(
    r'<div class="flex items-center justify-between mb-4">\s*\n'
    r'\s*<div class="flex items-center gap-3">([\s\S]*?)</div>\s*\n'
    r'\s*<div class="flex gap-2">([\s\S]*?)</div>\s*\n'
    r'</div>',
    re.MULTILINE,
)

HEADER_RE = re.compile(
    r'<div class="flex items-center justify-between mb-4">\s*\n'
    r'\s*<h2 class="text-xl font-bold">([^<]+)</h2>\s*\n'
    r'(\s*<div class="flex gap-2">([\s\S]*?)</div>\s*\n|\s*(<a[^>]+class="btn[^"]*"[^>]*>[\s\S]*?</a>)\s*\n)?'
    r'</div>',
    re.MULTILINE,
)


def should_skip(path: Path) -> bool:
    rel = path.as_posix().replace("\\", "/")
    return any(s in rel for s in SKIP)


def migrate_header(content: str) -> str:
    def repl(m: re.Match) -> str:
        title = m.group(1).strip()
        actions_block = (m.group(3) or m.group(4) or "").strip()
        if actions_block:
            return (
                f'<div class="hr-page-header">\n'
                f'  <div class="hr-page-header__main">\n'
                f'    <h1 class="hr-page-header__title">{title}</h1>\n'
                f"  </div>\n"
                f'  <div class="hr-page-header__actions">\n'
                f"    {actions_block}\n"
                f"  </div>\n"
                f"</div>"
            )
        return (
            f'<div class="hr-page-header">\n'
            f'  <div class="hr-page-header__main">\n'
            f'    <h1 class="hr-page-header__title">{title}</h1>\n'
            f"  </div>\n"
            f"</div>"
        )

    return HEADER_RE.sub(repl, content)


def migrate_header_with_sub(content: str) -> str:
    def repl(m: re.Match) -> str:
        title, subtitle = m.group(1).strip(), m.group(2).strip()
        conditional = (m.group(3) or "").strip()
        actions = (m.group(5) or "").strip()
        actions_html = ""
        if conditional:
            actions_html += conditional + "\n"
        if actions:
            actions_html += f'  <div class="hr-page-header__actions">\n    {actions}\n  </div>'
        elif conditional:
            actions_html = conditional
        block = (
            f'<div class="hr-page-header">\n'
            f'  <div class="hr-page-header__main">\n'
            f'    <h1 class="hr-page-header__title">{title}</h1>\n'
            f'    <p class="hr-page-header__sub">{subtitle}</p>\n'
            f"  </div>\n"
        )
        if actions_html.strip():
            if "hr-page-header__actions" not in actions_html:
                block += f'  <div class="hr-page-header__actions">\n    {actions_html}\n  </div>\n'
            else:
                block += actions_html + "\n"
        block += "</div>"
        return block

    return HEADER_WITH_SUB_RE.sub(repl, content)


def migrate_header_with_back(content: str) -> str:
    def repl(m: re.Match) -> str:
        left = m.group(1).strip()
        actions = m.group(2).strip()
        left = left.replace('class="text-xl font-bold"', 'class="hr-page-header__title"')
        left = re.sub(r"<h2\b", "<h1", left)
        left = left.replace("</h2>", "</h1>")
        return (
            f'<div class="hr-page-header">\n'
            f'  <div class="hr-page-header__main" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">\n'
            f"    {left}\n"
            f"  </div>\n"
            f'  <div class="hr-page-header__actions">\n'
            f"    {actions}\n"
            f"  </div>\n"
            f"</div>"
        )

    return HEADER_BACK_RE.sub(repl, content)


def migrate_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if 'class="flex items-center justify-between mb-4"' in text and "hr-page-header" not in text.split("block content")[-1][:1200]:
        text = migrate_header(text)
    if 'class="flex items-center justify-between mb-' in text:
        text = migrate_header_with_sub(text)
        text = migrate_header_with_back(text)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = []
    for templates_root in TEMPLATES_DIRS:
        if not templates_root.exists():
            continue
        for path in sorted(templates_root.rglob("*.html")):
            if should_skip(path):
                continue
            if migrate_file(path):
                changed.append(path.relative_to(templates_root.parent))
    print(f"Updated {len(changed)} templates")
    for p in changed:
        print(f"  - {p}")


if __name__ == "__main__":
    main()
