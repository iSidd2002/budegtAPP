/**
 * Currency formatting utilities for Indian Rupees (INR)
 */

/**
 * Format a number as Indian Rupees with proper formatting
 * Examples: 1000 -> ₹1,000 | 100000 -> ₹1,00,000 | 1000000 -> ₹10,00,000
 */
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  
  // Convert to string and split into integer and decimal parts
  const [integerPart, decimalPart] = amount.toFixed(2).split('.');
  
  // Format integer part with Indian numbering system
  const formattedInteger = formatIndianNumber(integerPart);
  
  // Combine with decimal part
  return `₹${formattedInteger}.${decimalPart}`;
}

/**
 * Format a number using Indian numbering system (lakhs, crores)
 * Examples: 1000 -> 1,000 | 100000 -> 1,00,000 | 1000000 -> 10,00,000
 */
function formatIndianNumber(num: string): string {
  // Remove leading zeros
  num = num.replace(/^0+/, '') || '0';
  
  // If less than 1000, return as is
  if (num.length <= 3) {
    return num;
  }
  
  // Split into groups: last 3 digits, then groups of 2
  const lastThree = num.slice(-3);
  const remaining = num.slice(0, -3);
  
  // Add commas to remaining part (every 2 digits from right)
  const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  
  return `${formattedRemaining},${lastThree}`;
}

/**
 * Parse INR formatted string back to number
 * Examples: "₹1,000" -> 1000 | "₹1,00,000" -> 100000
 */
export function parseINR(value: string): number {
  // Remove currency symbol and commas
  const cleaned = value.replace(/[₹,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format amount for display in lists/tables
 * Shows amount with currency symbol
 */
export function displayAmount(amount: number): string {
  return formatINR(amount);
}

/**
 * Format amount for compact display (used in summaries)
 * Examples: 1000 -> ₹1K | 100000 -> ₹1L | 1000000 -> ₹10L
 */
export function formatCompactINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 10000000) {
    // Crores
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  } else if (absAmount >= 100000) {
    // Lakhs
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (absAmount >= 1000) {
    // Thousands
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  
  return formatINR(amount);
}

