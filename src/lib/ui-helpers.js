/**
 * FinanceHub Pro V3 - UI Helper Utilities
 * 
 * Reusable layout cells, currency formatters, and HTML sanitization.
 * 
 * @module UIHelpers
 */

/**
 * Escapes unsafe characters to block XSS and HTML injection vulnerabilities.
 * 
 * @param {string} str - User-provided raw text.
 * @returns {string} Sanitized safe string.
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a number as currency in BRL (pt-BR).
 * 
 * @param {number} value - The float amount to format.
 * @returns {string} Formatted currency text (e.g., "R$ 1.150,00").
 */
export function formatCurrency(value) {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(parsed);
}

/**
 * Converts a "YYYY-MM" month selector key into a beautiful human-readable string.
 * 
 * @param {string} yyyyMM - Format "YYYY-MM".
 * @returns {string} Capitalized month and year (e.g., "Março de 2026").
 */
export function formatMonthLabel(yyyyMM) {
  if (!yyyyMM || !yyyyMM.includes('-')) return yyyyMM;
  const [year, month] = yyyyMM.split('-');
  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 15));
  const options = { month: 'long', year: 'numeric', timeZone: 'UTC' };
  const formatted = new Intl.DateTimeFormat('pt-BR', options).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Generates reusable SVG indicators and colors based on semantic tones.
 * 
 * @param {string} tone - Semantic type "success" | "danger" | "info" | "neutral"
 * @returns {Object} Icon SVG and color details
 */
export function getToneMeta(tone) {
  switch (tone) {
    case 'success':
      return {
        color: '#10b981',
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-up"><polyline points="22 7 13.5 16 8.5 11 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`
      };
    case 'danger':
      return {
        color: '#f43f5e',
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-down"><polyline points="22 17 13.5 8 8.5 13 2 7"/><polyline points="16 17 22 17 22 11"/></svg>`
      };
    case 'info':
      return {
        color: '#0ea5e9',
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-piggy-bank"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1a5 5 0 0 1 5-5h2a2 2 0 0 0 2-2c0-1.8 1-2 2-2h1a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H19Z"/><path d="M7 14h.01"/><path d="M11 14h.01"/><path d="M15 13h.01"/><path d="M11 9h.01"/></svg>`
      };
    default:
      return {
        color: '#9ca3af',
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M16 10h6v4h-6z"/></svg>`
      };
  }
}

/**
 * Calculates the dynamic invoice month and the payment due date in Portuguese format.
 * 
 * @param {string} dateStr - Date string YYYY-MM-DD
 * @param {number} closingDay - Credit card closing day (e.g., 28)
 * @param {number} dueDay - Credit card due day (e.g., 5)
 * @returns {Object|null}
 */
export function calculateInvoiceAndDueDate(dateStr, closingDay, dueDay) {
  if (!dateStr || isNaN(closingDay) || isNaN(dueDay)) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  
  let invoiceYear = year;
  let invoiceMonth = month;
  
  if (day > closingDay) {
    invoiceMonth += 1;
    if (invoiceMonth > 12) {
      invoiceMonth = 1;
      invoiceYear += 1;
    }
  }
  
  // Payment due date is next month after invoice month
  let dueMonth = invoiceMonth + 1;
  let dueYear = invoiceYear;
  if (dueMonth > 12) {
    dueMonth = 1;
    dueYear += 1;
  }
  
  const formattedInvoiceMonth = `${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}`;
  const formattedDueDate = `${String(dueDay).padStart(2, '0')}/${String(dueMonth).padStart(2, '0')}/${dueYear}`;
  
  return {
    invoiceMonth: formattedInvoiceMonth,
    dueDateStr: formattedDueDate
  };
}
