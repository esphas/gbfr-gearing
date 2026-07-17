export class BinaryWriter {
  private readonly bytes: number[] = [];

  writeU8(value: number): void {
    this.bytes.push(value & 0xff);
  }

  writeBytes(data: Uint8Array): void {
    for (const byte of data) this.bytes.push(byte);
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

export class BinaryReader {
  private pos = 0;

  constructor(private readonly data: Uint8Array) {}

  get remaining(): number {
    return this.data.length - this.pos;
  }

  readU8(): number {
    if (this.pos >= this.data.length) {
      throw new RangeError("unexpected end of binary payload");
    }
    return this.data[this.pos++]!;
  }

  readBytes(length: number): Uint8Array {
    if (this.pos + length > this.data.length) {
      throw new RangeError("unexpected end of binary payload");
    }
    const slice = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return slice;
  }
}

export function bitsToBytes(bits: readonly boolean[], byteCount: number): Uint8Array {
  const out = new Uint8Array(byteCount);
  for (let i = 0; i < bits.length; i++) {
    if (!bits[i]) continue;
    const byteIndex = Math.floor(i / 8);
    const bitIndex = i % 8;
    if (byteIndex < byteCount) {
      out[byteIndex]! |= 1 << bitIndex;
    }
  }
  return out;
}

export function bytesToBits(data: Uint8Array, bitCount: number): boolean[] {
  const bits = Array.from({ length: bitCount }, () => false);
  for (let i = 0; i < bitCount; i++) {
    const byteIndex = Math.floor(i / 8);
    const bitIndex = i % 8;
    bits[i] = ((data[byteIndex] ?? 0) & (1 << bitIndex)) !== 0;
  }
  return bits;
}
