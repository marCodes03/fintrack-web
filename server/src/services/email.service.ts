import nodemailer from 'nodemailer';
import path from 'path';


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/"/g, '') : '', // strip quotes if any
  },
});

export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="vertical-align: middle; padding-right: 8px;">
              <img src="cid:logo" alt="FinTrack Logo" style="height: 40px; width: auto; object-fit: contain;" />  
            </td>
            <td style="vertical-align: middle; font-family: sans-serif; font-size: 24px; font-weight: bold; color: #10b981; line-height: 40px;">
              FinTrack
            </td>
          </tr>
        </table>
      </div>
      <h2 style="color: #0f172a; font-size: 1.25rem; margin-top: 0;">Reset Your Password</h2>
      <p>Hello,</p>
      <p>You requested to reset your password. Use the following 6-digit One-Time Password (OTP) to verify your request and set a new password:</p>
      <div style="margin: 24px 0; text-align: center;">
        <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #10b981; background-color: #f1f5f9; padding: 12px 24px; border: 1px dashed #cbd5e1; border-radius: 8px; display: inline-block;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 0.875rem; color: #64748b; line-height: 1.5;">This code will expire shortly. If you did not make this request, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"/>
      <p style="font-size: 0.75rem; color: #94a3b8; text-align: center; margin: 0;">FinTrack Transactional Mailer</p>
    </div>`;

  await transporter.sendMail({
    from: `"${process.env.SMTP_SENDER_NAME || 'FinTrack'}" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'FinTrack - Password Reset Verification Code',
    html: htmlBody,
    attachments: [{
      filename: 'logo.png',
      path: path.resolve(__dirname, '../../../public/logo.png'),
      cid: 'logo',
      contentDisposition: 'inline'
    }]
  });
}
