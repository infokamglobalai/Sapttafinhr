/** Lightweight Markdown → HTML for chat replies (tables, headers, bold, lists). */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.includes('|') && /^\|?.+\|.+/.test(t);
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s|:-]+\|?$/.test(line.trim()) && line.includes('-');
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(lines: string[]): string {
  if (!lines.length) return '';
  const headerCells = parseTableRow(lines[0]);
  let bodyStart = 1;
  if (lines.length > 1 && isTableSeparator(lines[1])) {
    bodyStart = 2;
  }

  let html = '<table class="chat-md-table"><thead><tr>';
  for (const cell of headerCells) {
    html += `<th>${renderInline(cell)}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let i = bodyStart; i < lines.length; i++) {
    const cells = parseTableRow(lines[i]);
    if (!cells.length || (cells.length === 1 && cells[0] === '')) continue;
    html += '<tr>';
    for (const cell of cells) {
      html += `<td>${renderInline(cell)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

export function renderChatMarkdown(text: string): string {
  if (!text) return '';
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  const para: string[] = [];
  let i = 0;

  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${renderInline(para.join(' '))}</p>`);
    para.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      i += 1;
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      flushPara();
      out.push('<hr class="chat-md-hr">');
      i += 1;
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      flushPara();
      out.push(`<h3 class="chat-md-h3">${renderInline(trimmed.replace(/^###\s+/, ''))}</h3>`);
      i += 1;
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      flushPara();
      out.push(`<h2 class="chat-md-h2">${renderInline(trimmed.replace(/^##\s+/, ''))}</h2>`);
      i += 1;
      continue;
    }

    if (/^#\s+/.test(trimmed)) {
      flushPara();
      out.push(`<h1 class="chat-md-h1">${renderInline(trimmed.replace(/^#\s+/, ''))}</h1>`);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInline(lines[i].trim().replace(/^[-*]\s+/, ''))}</li>`);
        i += 1;
      }
      out.push(`<ul class="chat-md-ul">${items.join('')}</ul>`);
      continue;
    }

    if (isTableRow(trimmed)) {
      flushPara();
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        tableLines.push(lines[i]);
        i += 1;
      }
      out.push(renderTable(tableLines));
      continue;
    }

    para.push(trimmed);
    i += 1;
  }

  flushPara();
  return out.join('');
}
