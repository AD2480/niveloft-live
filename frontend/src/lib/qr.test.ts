import { describe, expect, it } from 'vitest';
import { encodeQr, qrPath } from './qr';

/** The 7×7 finder pattern: dark ring, light ring, dark 3×3 core. */
function finderAt(m: boolean[][], x0: number, y0: number): boolean {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
      if (m[y0 + y][x0 + x] !== (ring !== 2)) return false;
    }
  }
  return true;
}

describe('QR encoder', () => {
  it('picks the smallest version that fits, at level M', () => {
    expect(encodeQr('HELLO').version).toBe(1);
    expect(encodeQr('HELLO').size).toBe(21);
    const upi = 'upi://pay?pa=dobhalaaryam-2@okhdfcbank&pn=Niveloft&am=24990.00&cu=INR&tn=Niveloft%20Team%20NLABCDEFGH';
    expect(encodeQr(upi).version).toBe(6);
    expect(encodeQr('x'.repeat(213)).version).toBe(10);
    expect(() => encodeQr('x'.repeat(214))).toThrow();
  });

  it('draws the three finder patterns and the timing lines', () => {
    const q = encodeQr('upi://pay?pa=a@b&am=1.00&cu=INR');
    const s = q.size;
    expect(finderAt(q.modules, 0, 0)).toBe(true);
    expect(finderAt(q.modules, s - 7, 0)).toBe(true);
    expect(finderAt(q.modules, 0, s - 7)).toBe(true);
    for (let i = 8; i < s - 8; i++) {
      expect(q.modules[6][i]).toBe(i % 2 === 0);
      expect(q.modules[i][6]).toBe(i % 2 === 0);
    }
    expect(q.modules[s - 8][8]).toBe(true); // the dark module
  });

  it('is deterministic and draws one square per dark module', () => {
    const a = encodeQr('NL2345ABCD');
    const b = encodeQr('NL2345ABCD');
    expect(a.modules).toEqual(b.modules);
    const dark = a.modules.flat().filter(Boolean).length;
    expect(qrPath(a).split('M').length - 1).toBe(dark);
  });
});
