// utils/invoiceGenerator.js

/**
 * Generate invoice data for an order.
 * Returns a structured JSON object that can be rendered as a PDF later.
 */
const generateInvoiceData = (order, buyer, seller, workspace) => {
  const invoiceNumber = order.invoice?.number || `INV-${order._id.toString().slice(-8).toUpperCase()}`;
  const generatedAt = order.invoice?.generatedAt || new Date();

  return {
    invoiceNumber,
    generatedAt,
    order: {
      id: order._id,
      title: order.title,
      description: order.description,
      createdAt: order.createdAt,
      status: order.status
    },
    buyer: {
      id: buyer._id,
      name: buyer.name,
      email: buyer.email
    },
    seller: {
      id: seller._id,
      name: seller.name,
      email: seller.email
    },
    workspace: {
      id: workspace._id,
      name: workspace.name
    },
    lineItems: order.milestones && order.milestones.length > 0
      ? order.milestones.map(m => ({
          title: m.title,
          amount: m.amount,
          status: m.status
        }))
      : [{
          title: order.title,
          amount: order.price,
          status: 'Complete'
        }],
    subtotal: order.price,
    platformFee: order.platformFee,
    platformFeeRate: '10%',
    sellerPayout: order.sellerPayout,
    currency: order.currency,
    payment: {
      escrowFunded: order.escrow.funded,
      fundedAt: order.escrow.fundedAt,
      releasedAt: order.escrow.releasedAt
    },
    delivery: {
      deliveredAt: order.delivery?.deliveredAt,
      acceptedAt: order.acceptedAt
    }
  };
};

/**
 * Format currency amount for display.
 */
const formatCurrency = (amount, currency = 'HT') => {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `${amount} HT`;
};

module.exports = {
  generateInvoiceData,
  formatCurrency
};