import { useMemo } from 'react';
import { encodeQr, qrPath } from '@/lib/qr';
import { cn } from '@/lib/cn';

/**
 * The UPI payment link as a QR code, black on white whatever the theme (scanners need the contrast),
 * with the standard four-module quiet zone around it.
 */
export function UpiQr({ value, label, className }: { value: string; label: string; className?: string }) {
  const qr = useMemo(() => encodeQr(value), [value]);
  const side = qr.size + 8;
  return (
    <svg
      viewBox={`0 0 ${side} ${side}`}
      role="img"
      aria-label={label}
      className={cn('block h-auto w-full rounded-lg bg-white', className)}
      shapeRendering="crispEdges"
      data-upi-qr=""
    >
      <rect width={side} height={side} fill="#ffffff" />
      <path d={qrPath(qr)} fill="#0a131b" />
    </svg>
  );
}
