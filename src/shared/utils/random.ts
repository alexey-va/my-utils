export function randPassword(
  len = 16,
  opts: { digits: boolean; symbols: boolean; similar: boolean } = {
    digits: true,
    symbols: true,
    similar: false,
  },
) {
  let chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  if (opts.digits) chars += "23456789";
  if (opts.symbols) chars += "!@$%^*_+-=?";
  if (!opts.similar) chars = chars.replace(/[O0Il1]/g, "");
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

/** Uniform integer in [min, max] inclusive (order-independent). */
export function randInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const range = hi - lo + 1;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return lo + (buf[0] % range);
}
