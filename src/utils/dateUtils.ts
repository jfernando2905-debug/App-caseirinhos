/**
 * Date utility functions for local Brazilian date handling.
 *
 * CRITICAL: Never use `new Date().toISOString().slice(0, 10)` for "today" in local comparisons,
 * because `toISOString()` returns UTC time. In GMT-3 (Brazil), after 21:00, UTC is already
 * tomorrow, which causes orders scheduled for tomorrow to be mistakenly flagged as "para hoje",
 * and orders for today to be marked as "atrasada"!
 */

/**
 * Returns today's date in local calendar time as "YYYY-MM-DD"
 */
export function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns tomorrow's date in local calendar time as "YYYY-MM-DD"
 */
export function getTomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return getLocalDateStr(d);
}

/**
 * Returns yesterday's date in local calendar time as "YYYY-MM-DD"
 */
export function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateStr(d);
}

/**
 * Checks whether an order's delivery date is strictly today in local calendar time.
 */
export function isOrderToday(entregaDateStr?: string): boolean {
  if (!entregaDateStr) return false;
  return entregaDateStr.trim().slice(0, 10) === getLocalDateStr();
}

/**
 * Checks whether an order's delivery date is strictly tomorrow in local calendar time.
 */
export function isOrderTomorrow(entregaDateStr?: string): boolean {
  if (!entregaDateStr) return false;
  return entregaDateStr.trim().slice(0, 10) === getTomorrowDateStr();
}

/**
 * Checks whether an order's delivery date is past (strictly before today) in local calendar time.
 */
export function isOrderLate(entregaDateStr?: string): boolean {
  if (!entregaDateStr) return false;
  return entregaDateStr.trim().slice(0, 10) < getLocalDateStr();
}

/**
 * Formats YYYY-MM-DD into DD/MM/YYYY
 */
export function formatDatePtBR(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim().slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
