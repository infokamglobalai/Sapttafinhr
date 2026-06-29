/**
 * Lightweight Markdown → HTML for Sahayak chat replies (tables, headers, bold, lists).
 * Escapes raw HTML first; only emits a small safe tag set.
 */
(function (global) {
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderInline(text) {
    return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function isTableRow(line) {
    var t = line.trim();
    return t.indexOf('|') !== -1 && /^\|?.+\|.+/.test(t);
  }

  function isTableSeparator(line) {
    return /^\|?[\s|:-]+\|?$/.test(line.trim()) && line.indexOf('-') !== -1;
  }

  function parseTableRow(line) {
    return line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(function (cell) { return cell.trim(); });
  }

  function renderTable(lines) {
    if (!lines.length) return '';
    var headerCells = parseTableRow(lines[0]);
    var bodyStart = 1;
    if (lines.length > 1 && isTableSeparator(lines[1])) {
      bodyStart = 2;
    }
    var html = '<div class="sahayak-md-table-wrap"><table class="sahayak-md-table"><thead><tr>';
    headerCells.forEach(function (cell) {
      html += '<th>' + renderInline(cell) + '</th>';
    });
    html += '</tr></thead><tbody>';
    for (var i = bodyStart; i < lines.length; i++) {
      var cells = parseTableRow(lines[i]);
      if (!cells.length || (cells.length === 1 && cells[0] === '')) continue;
      html += '<tr>';
      cells.forEach(function (cell) {
        html += '<td>' + renderInline(cell) + '</td>';
      });
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  function renderMarkdown(text) {
    if (!text) return '';
    var lines = String(text).replace(/\r\n/g, '\n').split('\n');
    var out = [];
    var para = [];
    var i = 0;

    function flushPara() {
      if (!para.length) return;
      out.push('<p>' + renderInline(para.join(' ')) + '</p>');
      para = [];
    }

    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();

      if (!trimmed) {
        flushPara();
        i += 1;
        continue;
      }

      if (/^-{3,}$/.test(trimmed)) {
        flushPara();
        out.push('<hr class="sahayak-md-hr">');
        i += 1;
        continue;
      }

      if (/^###\s+/.test(trimmed)) {
        flushPara();
        out.push('<h3 class="sahayak-md-h3">' + renderInline(trimmed.replace(/^###\s+/, '')) + '</h3>');
        i += 1;
        continue;
      }

      if (/^##\s+/.test(trimmed)) {
        flushPara();
        out.push('<h2 class="sahayak-md-h2">' + renderInline(trimmed.replace(/^##\s+/, '')) + '</h2>');
        i += 1;
        continue;
      }

      if (/^#\s+/.test(trimmed)) {
        flushPara();
        out.push('<h1 class="sahayak-md-h1">' + renderInline(trimmed.replace(/^#\s+/, '')) + '</h1>');
        i += 1;
        continue;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        flushPara();
        var items = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
          items.push('<li>' + renderInline(lines[i].trim().replace(/^[-*]\s+/, '')) + '</li>');
          i += 1;
        }
        out.push('<ul class="sahayak-md-ul">' + items.join('') + '</ul>');
        continue;
      }

      if (isTableRow(trimmed)) {
        flushPara();
        var tableLines = [];
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

  global.SahayakMarkdown = { render: renderMarkdown };
})(window);
