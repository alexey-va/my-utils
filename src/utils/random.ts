export function randPassword(
  len = 16,
  opts: { digits: boolean; symbols: boolean; similar: boolean } = { digits: true, symbols: true, similar: false },
) {
  let chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  if (opts.digits) chars += "23456789";
  if (opts.symbols) chars += "!@$%^*_+-=?";
  if (!opts.similar) chars = chars.replace(/[O0Il1]/g, "");
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

import lipsums from "i18n-lipsum";

function toAscii(s: string) {
  // removes diacritics and any non-ASCII
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
}

function pickEntries(lang: "en" | "ru"): string[] {
  const isLang = (x: any, codes: string[], names: RegExp) =>
    Array.isArray(x?.languages) &&
    x.languages.some((l: any) => {
      const code = String(l?.code || "").toLowerCase();
      const name = String(l?.name || "").toLowerCase();
      return (code && codes.includes(code)) || names.test(name);
    });

  return (lipsums as any[])
    .filter((x) =>
      lang === "ru"
        ? isLang(x, ["ru", "ru-ru"], /russian|русск/i)
        : isLang(x, ["en", "en-us", "en-gb"], /english|англи/i),
    )
    .map((x) => String(x?.loremIpsum || ""));
}

function tokenize(texts: string[], ascii: boolean): string[] {
  const text = texts.join(" ").replace(/\s+/g, " ").trim();
  const normalized = ascii ? toAscii(text) : text;
  return normalized.split(" ").filter(Boolean);
}

function buildTextFromCorpus(
  corpus: string[],
  totalWords: number,
  opts: { capital?: boolean; punctuation?: boolean },
): string {
  if (!corpus.length) return "";

  // random start offset for variability
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const start = buf[0] % corpus.length;

  const out: string[] = [];
  for (let i = 0; i < totalWords; i++) {
    out.push(corpus[(start + i) % corpus.length]);
  }

  let text = out.join(" ");

  if (opts.punctuation) {
    const words = text.split(" ");
    for (let i = 0; i < totalWords; i++) {
      const r = crypto.getRandomValues(new Uint32Array(1))[0] % corpus.length;
      out.push(corpus[r]);
    }
    text = words.join(" ");
    if (!/[.!?]$/.test(text)) text += ".";
  }
  if (opts.capital && text) text = text.charAt(0).toUpperCase() + text.slice(1);
  return text;
}

/**
 * Generate lorem text with uneven paragraph lengths.
 */
export function loremText(
  words = 10,
  opts: { lang?: "en" | "ru"; paragraphs?: number; capital?: boolean; punctuation?: boolean } = {},
): string {
  const lang = opts.lang === "ru" ? "ru" : "en";
  const paras = Math.max(1, Math.min(500, Number(opts.paragraphs || 1)));
  const total = Math.max(1, Math.min(10000, Number(words)));

  const entries = pickEntries(lang);
  const corpus = tokenize(entries, lang === "en");

  // Distribute words randomly across paragraphs
  const sizes: number[] = [];
  let remaining = total;
  for (let p = 0; p < paras; p++) {
    const maxForThis = Math.max(1, Math.floor(remaining / (paras - p) * 2));
    const count = p === paras - 1 ? remaining : Math.max(1, Math.floor(Math.random() * maxForThis));
    sizes.push(count);
    remaining -= count;
  }

  const parts: string[] = [];
  for (const count of sizes) {
    parts.push(buildTextFromCorpus(corpus, count, { capital: !!opts.capital, punctuation: !!opts.punctuation }));
  }

  return parts.join("\n\n");
}
