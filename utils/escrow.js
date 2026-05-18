// utils/escrow.js

/**
 * Calculate the platform fee from an order amount.
 * Default rate is 10% (matching Fiverr-style marketplace fee).
 */
const calculatePlatformFee = (amount, rate = 0.10) => {
  if (amount < 0) return 0;
  return Math.round(amount * rate * 100) / 100;
};

/**
 * Calculate the seller payout after platform fee deduction.
 */
const calculateSellerPayout = (amount, platformFee) => {
  if (amount < 0) return 0;
  const payout = amount - platformFee;
  return Math.round(payout * 100) / 100;
};

/**
 * Generate a sequential invoice number.
 * Format: INV-YYYYMMDD-XXXX
 */
let invoiceCounter = 0;
const generateInvoiceNumber = () => {
  invoiceCounter += 1;
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const seq = String(invoiceCounter).padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
};

/**
 * Reset invoice counter (useful for testing).
 */
const resetInvoiceCounter = () => {
  invoiceCounter = 0;
};

/**
 * Determine if an order can transition to a given status.
 * Enforces the valid state machine transitions.
 */
const canTransitionTo = (currentStatus, newStatus) => {
  const transitions = {
    'Created': ['Funded', 'Cancelled'],
    'Funded': ['In Progress', 'Cancelled'],
    'In Progress': ['Delivered', 'Disputed', 'Cancelled'],
    'Delivered': ['Accepted', 'Revision', 'Disputed'],
    'Revision': ['Delivered', 'Disputed', 'Cancelled'],
    'Accepted': [],
    'Disputed': ['Accepted', 'Cancelled'],
    'Cancelled': []
  };

  const allowed = transitions[currentStatus] || [];
  return allowed.includes(newStatus);
};

module.exports = {
  calculatePlatformFee,
  calculateSellerPayout,
  generateInvoiceNumber,
  resetInvoiceCounter,
  canTransitionTo
};