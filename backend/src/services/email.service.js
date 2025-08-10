const config = require('../config/environment');
const path = require('path');

async function sendInviteEmail({ to, inviteUrl, tenantName, invitedByName }) {
  const subject = `You're invited to join ${tenantName} on TeamHub`;
  const logoUrl = process.env.EMAIL_LOGO_URL || `${config.frontend.url}/logo.png`;
  const html = `
  <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 30px; color: #333;">
    <table align="center" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <tr>
        <td style="padding: 30px; text-align: center; background-color: #4f46e5; color: #ffffff;">
          <img src="${logoUrl}" alt="TeamHub Logo" style="width: 50px; margin-bottom: 10px;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 600;">You're Invited!</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px; font-size: 15px; line-height: 1.6;">
          <p style="margin: 0 0 10px;">Hi,</p>
          <p style="margin: 0 0 15px;">
            <strong>${invitedByName}</strong> has invited you to join 
            <strong>${tenantName}</strong> on <strong>TeamHub</strong>.
          </p>
          <p style="margin: 0 0 20px;">Click below to accept your invitation and start collaborating.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${inviteUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 13px; color: #777;">This link expires in ${config.invitation.expiresInDays} days.</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px; background-color: #f9fafb; font-size: 12px; color: #999; text-align: center;">
          TeamHub © ${new Date().getFullYear()} • Bringing teams together
        </td>
      </tr>
    </table>
  </div>
`;
  const text = `You were invited by ${invitedByName} to join ${tenantName} on TeamHub.
Accept: ${inviteUrl}
This link expires in ${config.invitation.expiresInDays} days.`;

  // Helper: detect free webmail domains which typically fail DMARC when sent via ESPs (gmail, yahoo, outlook, hotmail)
  const isFreeWebmail = (email) => /@(gmail\.com|yahoo\.com|ymail\.com|outlook\.com|hotmail\.com|live\.com)$/i.test(email || '');

  const senderEmail = config.email.from.address;
  const senderName = config.email.from.name;
  const replyTo = process.env.REPLY_TO_ADDRESS;

  // Prefer Brevo only when we have an API key AND sender is NOT a free webmail domain
  if (process.env.BREVO_API_KEY && !isFreeWebmail(senderEmail)) {
    try {
      const Brevo = require('@getbrevo/brevo');
      const api = new Brevo.TransactionalEmailsApi();
      api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

      if (!senderEmail) {
        console.warn('Email not sent: EMAIL_FROM_ADDRESS not configured.');
        return false;
      }

      const response = await api.sendTransacEmail({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        replyTo: replyTo ? { email: replyTo } : undefined
      });

      const messageId = response?.body?.messageId || response?.messageId || 'unknown';
      console.info(`Brevo invite email queued successfully. messageId=${messageId} to=${to}`);
      return true;
    } catch (err) {
      console.error('Brevo invite email failed:', err?.response?.body || err.message || err);
      throw err;
    }
  }

  // Fallback: SMTP via nodemailer (works with Gmail when you use an App Password)
  try {
    const nodemailer = require('nodemailer');

    if (!config.email.user || !config.email.password) {
      console.warn('Email not sent: SMTP credentials not configured (EMAIL_USER/EMAIL_PASSWORD).');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: !!config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });

    const info = await transporter.sendMail({
      from: `${senderName} <${senderEmail || config.email.user}>`,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || undefined
    });

    console.info(`SMTP invite email sent. messageId=${info.messageId} to=${to}`);
    return true;
  } catch (smtpErr) {
    console.error('SMTP invite email failed:', smtpErr.message || smtpErr);
    return false;
  }
}

module.exports = { sendInviteEmail };