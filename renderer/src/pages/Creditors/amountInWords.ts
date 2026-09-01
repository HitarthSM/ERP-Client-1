const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function underThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const ones = n % 10;
    const tens = TENS[Math.floor(n / 10)];
    return ones ? `${tens}-${ONES[ones]}` : tens;
  }
  const rest = n % 100;
  const hundred = `${ONES[Math.floor(n / 100)]} Hundred`;
  return rest ? `${hundred} ${underThousand(rest)}` : hundred;
}

/** Integer amount in English words, e.g. 192240 → "One Hundred Ninety-Two Thousand Two Hundred Forty Only". */
export function amountInWords(n: number): string {
  const value = Math.round(Math.abs(n));
  if (value === 0) return 'Zero Only';
  const million = Math.floor(value / 1_000_000);
  const thousand = Math.floor((value % 1_000_000) / 1_000);
  const rest = value % 1_000;
  const parts: string[] = [];
  if (million) parts.push(`${underThousand(million)} Million`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));
  return `${parts.join(' ')} Only`;
}
