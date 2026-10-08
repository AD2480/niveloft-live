/**
 * A small QR code encoder for the UPI payment code (no library: the app's dependencies stay as
 * they are). Byte mode, error correction level M, versions 1–10 (up to 213 bytes, plenty for a
 * upi://pay link), with the mask chosen by the standard penalty rules.
 *
 * Follows ISO/IEC 18004 the way Project Nayuki's reference implementation does (MIT).
 * qr.test.ts checks it against known codes; drawn, it scans in every UPI app.
 */

/** Level M: error-correction codewords per block, and number of blocks, for versions 1–10. */
const ECC_PER_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
/** Format bits use 00 for level M. */
const ECC_FORMAT_BITS = 0;
const MAX_VERSION = 10;

export interface QrCode {
  version: number;
  /** Modules per side (21 for version 1, +4 per version). */
  size: number;
  /** modules[y][x]: true is dark. */
  modules: boolean[][];
}

/** Encodes text (UTF-8) as a QR code; throws if it's longer than version 10 can hold. */
export function encodeQr(text: string): QrCode {
  const data = Array.from(new TextEncoder().encode(text));
  let version = 1;
  for (; version <= MAX_VERSION; version++) {
    const countBits = version <= 9 ? 8 : 16;
    if (4 + countBits + data.length * 8 <= dataCodewords(version) * 8) break;
  }
  if (version > MAX_VERSION) throw new Error('Text too long for a QR code here.');

  // Mode (byte = 0100), length, data, terminator, padding to whole bytes, then pad codewords.
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(data.length, version <= 9 ? 8 : 16);
  for (const b of data) push(b, 8);
  const capacity = dataCodewords(version) * 8;
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewords.push(b);
  }

  const all = addEccAndInterleave(codewords, version);
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  drawFunctionPatterns(version, size, modules, isFunction);
  drawCodewords(all, size, modules, isFunction);

  // Try all eight masks; keep the one with the lowest penalty.
  let best = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask, size, modules, isFunction);
    drawFormatBits(mask, size, modules, isFunction);
    const p = penalty(size, modules);
    if (p < bestPenalty) {
      best = mask;
      bestPenalty = p;
    }
    applyMask(mask, size, modules, isFunction); // undo (XOR)
  }
  applyMask(best, size, modules, isFunction);
  drawFormatBits(best, size, modules, isFunction);
  return { version, size, modules };
}

/** An SVG path ("M x y h1 v1 h-1 z" per dark module) for drawing the code at one unit per module. */
export function qrPath(qr: QrCode, margin = 4): string {
  const parts: string[] = [];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) parts.push(`M${x + margin} ${y + margin}h1v1h-1z`);
    }
  }
  return parts.join('');
}

// ------------------------------------------------------------------ sizes

function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number): number {
  return Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[version - 1] * NUM_BLOCKS[version - 1];
}

// ------------------------------------------------------------------ error correction

function addEccAndInterleave(data: number[], version: number): number[] {
  const numBlocks = NUM_BLOCKS[version - 1];
  const eccLen = ECC_PER_BLOCK[version - 1];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsDivisor(eccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dataLen = shortBlockLen - eccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + dataLen);
    k += dataLen;
    const ecc = rsRemainder(dat, divisor);
    if (i < numShortBlocks) dat.push(0); // placeholder so all blocks line up; skipped below
    blocks.push([...dat, ...ecc]);
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      // The placeholder in short blocks sits at index shortBlockLen - eccLen.
      if (i !== shortBlockLen - eccLen || j >= numShortBlocks) result.push(blocks[j][i]);
    }
  }
  return result;
}

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): number[] {
  const result = Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => (result[i] ^= gfMultiply(coef, factor)));
  }
  return result;
}

// ------------------------------------------------------------------ drawing

function setFunction(x: number, y: number, dark: boolean, modules: boolean[][], isFunction: boolean[][]) {
  modules[y][x] = dark;
  isFunction[y][x] = true;
}

function alignmentPositions(version: number, size: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function drawFunctionPatterns(version: number, size: number, modules: boolean[][], isFunction: boolean[][]) {
  // Timing patterns.
  for (let i = 0; i < size; i++) {
    setFunction(6, i, i % 2 === 0, modules, isFunction);
    setFunction(i, 6, i % 2 === 0, modules, isFunction);
  }
  // Finder patterns (with separators) in three corners.
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFunction(x, y, dist !== 2 && dist !== 4, modules, isFunction);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  // Alignment patterns, except where they'd overlap the finders.
  const align = alignmentPositions(version, size);
  const n = align.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) setFunction(align[i] + dx, align[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1, modules, isFunction);
      }
    }
  }
  // Reserve the format areas (drawn per mask later) and draw the version blocks (version 7+).
  drawFormatBits(0, size, modules, isFunction);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, dark, modules, isFunction);
      setFunction(b, a, dark, modules, isFunction);
    }
  }
}

function drawFormatBits(mask: number, size: number, modules: boolean[][], isFunction: boolean[][]) {
  const data = (ECC_FORMAT_BITS << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((bits >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) setFunction(8, i, bit(i), modules, isFunction);
  setFunction(8, 7, bit(6), modules, isFunction);
  setFunction(8, 8, bit(7), modules, isFunction);
  setFunction(7, 8, bit(8), modules, isFunction);
  for (let i = 9; i < 15; i++) setFunction(14 - i, 8, bit(i), modules, isFunction);
  for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, bit(i), modules, isFunction);
  for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, bit(i), modules, isFunction);
  setFunction(8, size - 8, true, modules, isFunction); // the dark module
}

function drawCodewords(data: number[], size: number, modules: boolean[][], isFunction: boolean[][]) {
  let i = 0;
  // Two-module-wide columns, right to left, zigzagging up and down; column 6 is the timing pattern.
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && i < data.length * 8) {
          modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }
}

function applyMask(mask: number, size: number, modules: boolean[][], isFunction: boolean[][]) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFunction[y][x]) continue;
      let invert: boolean;
      switch (mask) {
        case 0:
          invert = (x + y) % 2 === 0;
          break;
        case 1:
          invert = y % 2 === 0;
          break;
        case 2:
          invert = x % 3 === 0;
          break;
        case 3:
          invert = (x + y) % 3 === 0;
          break;
        case 4:
          invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
          break;
        case 5:
          invert = ((x * y) % 2) + ((x * y) % 3) === 0;
          break;
        case 6:
          invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
          break;
        default:
          invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
      if (invert) modules[y][x] = !modules[y][x];
    }
  }
}

// ------------------------------------------------------------------ mask penalty

function penalty(size: number, modules: boolean[][]): number {
  let result = 0;
  const line = (get: (i: number) => boolean) => {
    // Runs of five or more of one colour, and finder-like 1:1:3:1:1 patterns with light space.
    let runColor = false;
    let runLen = 0;
    const history = [0, 0, 0, 0, 0, 0, 0];
    const addHistory = (len: number) => {
      if (history[0] === 0) len += size; // the light border before the first run
      history.pop();
      history.unshift(len);
    };
    const countPatterns = () => {
      const n = history[1];
      const core = n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
      return (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) + (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0);
    };
    for (let i = 0; i < size; i++) {
      const c = get(i);
      if (c === runColor) {
        runLen++;
        if (runLen === 5) result += 3;
        else if (runLen > 5) result++;
      } else {
        addHistory(runLen);
        if (!runColor) result += countPatterns() * 40;
        runColor = c;
        runLen = 1;
      }
    }
    // Close the line as if light modules followed.
    if (runColor) {
      addHistory(runLen);
      runLen = 0;
    }
    runLen += size;
    addHistory(runLen);
    result += countPatterns() * 40;
  };
  for (let y = 0; y < size; y++) line((x) => modules[y][x]);
  for (let x = 0; x < size; x++) line((y) => modules[y][x]);
  // 2×2 blocks of one colour.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) result += 3;
    }
  }
  // Balance of dark and light.
  let dark = 0;
  for (const row of modules) for (const m of row) if (m) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  result += k * 10;
  return result;
}
