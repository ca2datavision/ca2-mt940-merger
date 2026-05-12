/**
 * HTML Formatter
 * Self-contained HTML output with collapsible sections, XSS-safe.
 */

import type { ParsedLine, DecodedTag, DecodedTransaction, DecodedBalance } from '../decoder.js';
import type { Formatter, FormatterOptions, DocumentSummary } from './types.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const CSS = `
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background: #f5f5f5;
    color: #333;
  }
  .header {
    background: #2c3e50;
    color: white;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  .header h1 { margin: 0 0 10px 0; font-size: 24px; }
  .stats { display: flex; gap: 20px; flex-wrap: wrap; }
  .stat { background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 4px; }
  .stat-value { font-size: 20px; font-weight: bold; }
  .stat-label { font-size: 12px; opacity: 0.8; }
  .stat.error .stat-value { color: #e74c3c; }
  .stat.warning .stat-value { color: #f39c12; }
  .statement {
    background: white;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  .statement-header {
    background: #3498db;
    color: white;
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .statement-header:hover { background: #2980b9; }
  .statement-content { padding: 16px; display: block; }
  .statement.collapsed .statement-content { display: none; }
  .line {
    border-left: 3px solid #ddd;
    padding: 8px 16px;
    margin: 8px 0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
  }
  .line.tag { border-left-color: #3498db; }
  .line.separator { border-left-color: #95a5a6; background: #ecf0f1; }
  .line.continuation { border-left-color: #9b59b6; opacity: 0.8; }
  .raw-line { color: #666; margin-bottom: 4px; word-break: break-all; }
  .tag-name { color: #2980b9; font-weight: bold; }
  .field { margin: 4px 0 4px 20px; }
  .field-name { color: #7f8c8d; }
  .field-value { color: #2c3e50; }
  .field-value.credit { color: #27ae60; }
  .field-value.debit { color: #c0392b; }
  .issue { padding: 4px 8px; border-radius: 4px; margin: 4px 0 4px 20px; font-size: 12px; }
  .issue.error { background: #fadbd8; color: #c0392b; }
  .issue.warning { background: #fef9e7; color: #b7950b; }
  .issue.info { background: #eaf2f8; color: #2874a6; }
  .toggle { font-size: 18px; }
  @media print {
    .statement-content { display: block !important; }
    .statement-header { background: #333 !important; -webkit-print-color-adjust: exact; }
    body { background: white; }
    .statement { box-shadow: none; border: 1px solid #ddd; }
  }
</style>
`;

const JS = `
<script>
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.statement-header').forEach(function(header) {
    header.addEventListener('click', function() {
      this.parentElement.classList.toggle('collapsed');
      var toggle = this.querySelector('.toggle');
      toggle.textContent = this.parentElement.classList.contains('collapsed') ? '+' : '−';
    });
  });
});
</script>
`;

function formatField(name: string, value: string, cssClass?: string): string {
  const valueClass = cssClass ? `field-value ${cssClass}` : 'field-value';
  return `<div class="field"><span class="field-name">${escapeHtml(name)}:</span> <span class="${valueClass}">${escapeHtml(value)}</span></div>`;
}

function formatDecodedFields(decoded: DecodedTag): string {
  const html: string[] = [];
  const fields = decoded.fields;

  if (decoded.tag === '61') {
    const tx = fields as unknown as DecodedTransaction;
    html.push(formatField('Value Date', tx.valueDateFormatted || 'N/A'));
    if (tx.entryDateFormatted) {
      html.push(formatField('Entry Date', tx.entryDateFormatted));
    }
    const direction = tx.isDebit ? 'D = Debit (money out)' : 'C = Credit (money in)';
    const dirClass = tx.isDebit ? 'debit' : 'credit';
    html.push(formatField('Direction', direction + (tx.isReversal ? ' [REVERSAL]' : ''), dirClass));
    html.push(formatField('Amount', tx.amount || 'N/A'));
    if (tx.transactionType) {
      const typeDesc = `${tx.transactionType.prefix}${tx.transactionType.code} = ${tx.transactionType.prefixMeaning} ${tx.transactionType.name}`;
      html.push(formatField('Type', typeDesc));
    }
    html.push(formatField('Customer Ref', tx.customerReference || 'N/A'));
    if (tx.bankReference) {
      html.push(formatField('Bank Ref', tx.bankReference));
    }
    if (tx.supplementary) {
      html.push(formatField('Supplementary', tx.supplementary));
    }
  } else if (['60F', '60M', '62F', '62M', '64', '65'].includes(decoded.tag)) {
    const bal = fields as unknown as DecodedBalance;
    html.push(formatField('Date', bal.dateFormatted || 'N/A'));
    const direction = bal.isDebit ? 'Debit (negative)' : 'Credit (positive)';
    html.push(formatField('Direction', direction, bal.isDebit ? 'debit' : 'credit'));
    html.push(formatField('Currency', bal.currency || 'N/A'));
    html.push(formatField('Amount', bal.amount || 'N/A'));
  } else if (decoded.tag === '25') {
    html.push(formatField('Account', String(fields.accountId || 'N/A')));
    if (fields.bic) {
      html.push(formatField('BIC', String(fields.bic)));
    }
  } else if (decoded.tag === '28C') {
    html.push(formatField('Statement Number', String(fields.statementNumber || 'N/A')));
    if (fields.sequenceNumber) {
      html.push(formatField('Sequence', String(fields.sequenceNumber)));
    }
  } else if (decoded.tag === '86') {
    if (fields.hasSubfields && fields.subfields) {
      const subfields = fields.subfields as Record<string, string>;
      for (const [code, value] of Object.entries(subfields)) {
        html.push(formatField(`[${code}]`, value));
      }
    } else {
      const narrative = String(fields.rawNarrative || '');
      html.push(formatField('Narrative', narrative));
    }
  } else {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && typeof value !== 'object') {
        html.push(formatField(key, String(value)));
      }
    }
  }

  return html.join('\n');
}

function formatIssues(issues: DecodedTag['issues']): string {
  return issues.map(issue => {
    const icon = issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ';
    return `<div class="issue ${issue.severity}">${icon} ${escapeHtml(issue.message)}</div>`;
  }).join('\n');
}

function formatLine(line: ParsedLine): string {
  if (line.isStatementSeparator) {
    return `<div class="line separator"><em>End of Statement</em></div>`;
  }

  if (!line.decoded) {
    if (line.isContinuation) {
      return `<div class="line continuation"><div class="raw-line">${escapeHtml(line.raw)}</div></div>`;
    }
    if (line.raw.trim()) {
      return `<div class="line"><div class="raw-line">${escapeHtml(line.raw)}</div></div>`;
    }
    return '';
  }

  const decoded = line.decoded;
  const html: string[] = [];

  html.push(`<div class="line tag">`);
  html.push(`<div class="raw-line">LINE ${line.lineNumber}: ${escapeHtml(line.raw)}</div>`);
  html.push(`<div class="tag-name">:${escapeHtml(decoded.tag)}: ${escapeHtml(decoded.tagName)}</div>`);
  html.push(formatDecodedFields(decoded));
  if (decoded.issues.length > 0) {
    html.push(formatIssues(decoded.issues));
  }
  html.push(`</div>`);

  return html.join('\n');
}

function formatHeader(summary: DocumentSummary): string {
  const errorStat = summary.errorCount > 0
    ? `<div class="stat error"><div class="stat-value">${summary.errorCount}</div><div class="stat-label">Errors</div></div>`
    : '';
  const warningStat = summary.warningCount > 0
    ? `<div class="stat warning"><div class="stat-value">${summary.warningCount}</div><div class="stat-label">Warnings</div></div>`
    : '';

  return `
<div class="header">
  <h1>MT940 File Explanation</h1>
  ${summary.fileName ? `<div>File: ${escapeHtml(summary.fileName)}</div>` : ''}
  <div class="stats">
    <div class="stat"><div class="stat-value">${summary.lineCount}</div><div class="stat-label">Lines</div></div>
    <div class="stat"><div class="stat-value">${summary.statementCount}</div><div class="stat-label">Statements</div></div>
    <div class="stat"><div class="stat-value">${summary.transactionCount}</div><div class="stat-label">Transactions</div></div>
    ${errorStat}
    ${warningStat}
  </div>
</div>
`;
}

function groupByStatement(lines: ParsedLine[]): ParsedLine[][] {
  const groups: ParsedLine[][] = [];
  let current: ParsedLine[] = [];

  for (const line of lines) {
    current.push(line);
    if (line.isStatementSeparator) {
      groups.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

export const htmlFormatter: Formatter = {
  format(lines: ParsedLine[], _options?: FormatterOptions): string {
    void _options;
    const groups = groupByStatement(lines);
    const body: string[] = [];

    groups.forEach((group, idx) => {
      const accountLine = group.find(l => l.decoded?.tag === '25');
      const accountId = accountLine?.decoded?.fields?.accountId || 'Unknown Account';
      const stmtNum = group.find(l => l.decoded?.tag === '28C')?.decoded?.fields?.statementNumber || idx + 1;

      body.push(`<div class="statement">`);
      body.push(`<div class="statement-header"><span>Statement ${stmtNum} - ${escapeHtml(String(accountId))}</span><span class="toggle">−</span></div>`);
      body.push(`<div class="statement-content">`);
      for (const line of group) {
        const lineHtml = formatLine(line);
        if (lineHtml) {
          body.push(lineHtml);
        }
      }
      body.push(`</div></div>`);
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MT940 Explanation</title>
${CSS}
</head>
<body>
${body.join('\n')}
${JS}
</body>
</html>`;
  },

  formatWithSummary(lines: ParsedLine[], summary: DocumentSummary, _options?: FormatterOptions): string {
    void _options;
    const groups = groupByStatement(lines);
    const body: string[] = [];

    body.push(formatHeader(summary));

    groups.forEach((group, idx) => {
      const accountLine = group.find(l => l.decoded?.tag === '25');
      const accountId = accountLine?.decoded?.fields?.accountId || 'Unknown Account';
      const stmtNum = group.find(l => l.decoded?.tag === '28C')?.decoded?.fields?.statementNumber || idx + 1;

      body.push(`<div class="statement">`);
      body.push(`<div class="statement-header"><span>Statement ${stmtNum} - ${escapeHtml(String(accountId))}</span><span class="toggle">−</span></div>`);
      body.push(`<div class="statement-content">`);
      for (const line of group) {
        const lineHtml = formatLine(line);
        if (lineHtml) {
          body.push(lineHtml);
        }
      }
      body.push(`</div></div>`);
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MT940 Explanation${summary.fileName ? ` - ${escapeHtml(summary.fileName)}` : ''}</title>
${CSS}
</head>
<body>
${body.join('\n')}
${JS}
</body>
</html>`;
  },
};

export default htmlFormatter;
