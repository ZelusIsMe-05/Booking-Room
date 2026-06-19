export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) {
    return '0 ₫';
  }
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return '0 ₫';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'symbol',
  }).format(num).replace('VND', '₫');
}
