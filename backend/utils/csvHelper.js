/**
 * Tiny CSV builder (no dependencies).
 *
 * - Escapes cells containing comma / quote / newline per RFC 4180.
 * - Prepends a UTF-8 BOM so Excel opens Vietnamese text correctly.
 */

const BOM = String.fromCharCode(0xfeff);

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * @param {string[]} headers
 * @param {Array<Array<string|number|null|undefined>>} rows
 * @returns {string} CSV text (with BOM)
 */
function buildCsv(headers, rows) {
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','));
  }
  return BOM + lines.join('\r\n');
}

module.exports = { buildCsv, escapeCell };
