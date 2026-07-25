// Persian number / currency formatting helpers.

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function formatFaNumber(n: number): string {
  const withCommas = new Intl.NumberFormat("en-US").format(n).replace(/,/g, "٬");
  return toFaDigits(withCommas);
}

export function formatIRR(n: number): string {
  return `${formatFaNumber(n)} ریال`;
}

export function formatCompactIRR(n: number): string {
  if (n >= 1_000_000_000_000) return `${toFaDigits((n / 1_000_000_000_000).toFixed(1))} همت`;
  if (n >= 1_000_000_000) return `${toFaDigits((n / 1_000_000_000).toFixed(1))} م.ت`;
  if (n >= 1_000_000) return `${toFaDigits((n / 1_000_000).toFixed(1))} م`;
  return formatFaNumber(n);
}

export function formatPercent(n: number): string {
  return `${toFaDigits(n.toFixed(0))}٪`;
}
