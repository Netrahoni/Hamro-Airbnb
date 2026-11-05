import nodemailer from 'nodemailer';

/**
 * Create a nodemailer transporter
 */
function createTransporter() {
  const user = process.env.EMAIL_USER || process.env.ADMIN_GMAIL || '';
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '';

  if (user && pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  // Fallback to standard SMTP if SMTP_HOST is provided
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  return null;
}

/**
 * Send Password Reset Verification Email
 */
export async function sendPasswordResetEmail({ to, code, name, purpose = 'password_reset' }) {
  const isSignup = purpose === 'signup';
  const recipientName = name || 'Traveler';
  const senderEmail = process.env.EMAIL_USER || process.env.ADMIN_GMAIL || 'nepalstay.ai@gmail.com';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f6; margin: 0; padding: 20px; color: #202124; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e3e7df; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
        .brand-text { font-size: 20px; font-weight: 800; color: #17372f; letter-spacing: -0.5px; }
        .tag { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #b45309; letter-spacing: 1px; margin-bottom: 6px; }
        h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px; color: #17372f; }
        p { font-size: 14px; line-height: 1.6; color: #53647b; margin: 0 0 20px; }
        .code-box { background: #f0f5f2; border: 1.5px dashed #2b6e4f; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .code-digits { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #17372f; font-family: monospace; }
        .expiry-note { font-size: 12px; color: #65748a; margin-top: 8px; }
        .warning { font-size: 12px; color: #718096; border-top: 1px solid #eaede7; padding-top: 18px; margin-top: 24px; line-height: 1.5; }
        .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">
          <span style="font-size: 22px;">🏔️</span>
          <span class="brand-text">NepalStay AI</span>
        </div>
        <div class="tag">Security Verification</div>
        <h1>${isSignup ? 'Email Verification Code' : 'Password Reset Code'}</h1>
        <p>Namaste <strong>${recipientName}</strong>,</p>
        <p>${isSignup ? 'Use this 6-digit code to verify your email address and complete your NepalStay registration:' : 'We received a request to reset the password for your NepalStay account. Use the 6-digit verification code below to authorize this change:'}</p>
        
        <div class="code-box">
          <div class="code-digits">${code}</div>
          <div class="expiry-note">⏱️ Valid for ${isSignup ? '10' : '15'} minutes only</div>
        </div>

        <p>${isSignup ? 'If you did not request this verification code, you can ignore this email.' : 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged and your account remains secure.'}</p>
        
        <div class="warning">
          <strong>Security Tip:</strong> Never share this code with anyone. NepalStay staff will never ask for your verification code or password.
        </div>
      </div>
      <div class="footer">
        © 2026 NepalStay AI · Pokhara & Kathmandu, Nepal
      </div>
    </body>
    </html>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.warn('Email delivery is not configured; verification email was not sent.');
    return {
      sent: false,
      reason: 'EMAIL_PASS not configured in server/.env',
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"NepalStay Security" <${senderEmail}>`,
      to,
      subject: isSignup ? 'Verify your NepalStay email address' : 'Your NepalStay password reset code',
      text: isSignup ? `Your NepalStay email verification code is: ${code}. It expires in 10 minutes.` : `Your NepalStay password reset verification code is: ${code}. It expires in 15 minutes.`,
      html,
    });

    console.log(`✓ Email successfully delivered to ${to} (Message ID: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { sent: false, error: error.message, code };
  }
}

