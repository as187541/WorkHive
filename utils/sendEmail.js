const nodemailer = require('nodemailer');

/**
 * Create email transporter with OAuth2 support if credentials are available,
 * otherwise fall back to Gmail SMTP (for development only).
 * 
 * SECURITY NOTE: For production, always use OAuth2 or a transactional email
 * service (SendGrid, Resend, AWS SES). Never commit plaintext credentials.
 */
const createTransporter = () => {
  // Check if OAuth2 credentials are configured
  if (process.env.EMAIL_OAUTH_CLIENT_ID && process.env.EMAIL_OAUTH_CLIENT_SECRET && process.env.EMAIL_OAUTH_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.EMAIL_OAUTH_CLIENT_ID,
        clientSecret: process.env.EMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_OAUTH_REFRESH_TOKEN,
      },
    });
  }

  // Fallback to SMTP with app password (less secure, for dev only)
  console.warn('⚠️  Email OAuth2 not configured. Falling back to SMTP with app password. This is less secure and should not be used in production.');
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async (options) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"WorkHive Support" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;