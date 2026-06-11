/** Format a number as Indian Rupees, e.g. 54000 -> "₹54,000.00". */
export function formatINR(value: number | null | undefined): string {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
