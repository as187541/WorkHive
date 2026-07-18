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
 * Uses a persistent counter stored in a simple JSON file to survive restarts.
 */
const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.join(process.cwd(), 'data', 'invoice-counter.json');

const loadCounter = () => {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      if (data.date === today) {
        return data.counter;
      }
    }
  } catch (err) {
    console.error('Failed to load invoice counter:', err.message);
  }
  return 0;
};

const saveCounter = (counter) => {
  try {
    const dir = path.dirname(COUNTER_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ date: today, counter }), 'utf8');
  } catch (err) {
    console.error('Failed to save invoice counter:', err.message);
  }
};

let invoiceCounter = loadCounter();

const generateInvoiceNumber = () => {
  invoiceCounter += 1;
  saveCounter(invoiceCounter);
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