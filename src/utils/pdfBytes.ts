/** True if buffer looks like a PDF. */
export function isPdfBuffer(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  return buf.subarray(0, 4).toString("ascii") === "%PDF";
}
