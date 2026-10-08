import { format, parseISO } from 'date-fns';
import type { BillingPeriod, PaymentStatus } from '@/api/types';

/** "7 Oct 2026" from an ISO instant. */
export const day = (iso: string | null | undefined): string => (iso ? format(parseISO(iso), 'd MMM yyyy') : '—');

export const periodWord = (p: BillingPeriod): string => (p === 'YEAR' ? '1 year' : '1 month');

export const STATUS_WORD: Record<PaymentStatus, string> = {
  AWAITING_PAYMENT: 'Waiting for your payment',
  SUBMITTED: 'Paid, being checked',
  APPROVED: 'Confirmed',
  REJECTED: 'Not confirmed',
  CANCELLED: 'Cancelled',
};

export const STATUS_TONE: Record<PaymentStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'> = {
  AWAITING_PAYMENT: 'neutral',
  SUBMITTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

/** A UPI transaction reference (UTR) is 12 digits; people paste it with spaces or dashes. */
export function cleanUtr(s: string): string {
  return s.replace(/[\s-]+/g, '');
}

export function utrProblem(s: string): string | null {
  const u = cleanUtr(s);
  if (!u) return 'Enter the 12-digit UPI reference number (UTR) from your payment app.';
  if (!/^\d+$/.test(u)) return 'The UPI reference is only digits. Check you copied the UTR, not the transaction ID from a bank statement.';
  if (u.length !== 12) return `The UPI reference has 12 digits; this has ${u.length}.`;
  return null;
}
