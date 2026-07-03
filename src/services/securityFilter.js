/**
 * Helper to validate card number using Luhn algorithm to prevent false positives (like phone numbers)
 */
function isValidLuhn(digits) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Filter out sensitive credit card data from text.
 * Matches 13-19 digits potentially separated by spaces or hyphens.
 * Checks via Luhn algorithm and redacts if valid.
 * @param {string} text - The text to sanitize
 * @returns {string} The redacted/sanitized text
 */
export function redactCreditCards(text) {
  if (typeof text !== 'string') return text;

  // Pattern looking for credit card numbers (13 to 19 digits, space/hyphen separators allowed)
  const ccPattern = /\b(?:\d[ -]*?){13,19}\b/g;

  return text.replace(ccPattern, (match) => {
    // Strip separators to get raw digits
    const digits = match.replace(/[\s-]/g, '');
    
    // Validate prefix (Visa=4, MC=5/2, Amex=3, Discover=6) and Luhn algorithm
    const firstDigit = digits.charAt(0);
    const hasValidPrefix = ['3', '4', '5', '6'].includes(firstDigit) || (digits.startsWith('222') || digits.startsWith('272'));
    
    if (hasValidPrefix && isValidLuhn(digits)) {
      console.log('[Security] Intercepted and redacted valid credit card pattern.');
      return '[כרטיס אשראי חסום / CC REDACTED]';
    }
    
    // Return original match if it is not a valid credit card
    return match;
  });
}
