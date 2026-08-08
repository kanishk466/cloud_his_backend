import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface ActivationEmailInput {
  hospitalName: string;
  hospitalCode: string;
  adminEmail: string;
  adminPassword: string;
  loginUrl: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.resend.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: { user: 'resend', pass: process.env.RESEND_API_KEY ?? '' },
  });

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? 'MediOps <noreply@mediops.in>',
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
    }
  }

  async sendHospitalActivation(
    input: ActivationEmailInput & { to: string },
  ): Promise<void> {
    const html = buildActivationEmail(input);
    await this.sendMail(
      input.to,
      'Your MediOps Hospital Account is Ready',
      html,
    );
  }
}

function buildActivationEmail(input: ActivationEmailInput): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

  <!-- HEADER -->
  <tr>
    <td style="background:#0f172a;padding:24px 32px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:12px;">
            <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="36" height="36" rx="9" fill="#1e293b"/>
              <circle cx="13" cy="11" r="5" fill="none" stroke="#818cf8" stroke-width="1.8"/>
              <path d="M13 16 Q13 26 19 26 Q25 26 25 20 Q25 16 21 16" fill="none" stroke="#818cf8" stroke-width="1.8" stroke-linecap="round"/>
              <circle cx="21" cy="16" r="2.5" fill="#818cf8"/>
            </svg>
          </td>
          <td>
            <span style="color:#f8fafc;font-weight:800;font-size:20px;">Medi<span style="color:#818cf8;">Ops</span></span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="padding:32px;">

      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Your hospital is ready! 🎉</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
        <strong>${input.hospitalName}</strong> has been successfully activated on the MediOps platform.
      </p>

      <!-- Hospital Code Box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Hospital Code</div>
            <div style="font-family:monospace;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:4px;">${input.hospitalCode}</div>
          </td>
        </tr>
      </table>

      <!-- Credentials -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;">
            <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Login Credentials</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:12px;color:#94a3b8;">Email</span><br>
            <span style="font-size:14px;color:#0f172a;font-weight:500;">${input.adminEmail}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;">
            <span style="font-size:12px;color:#94a3b8;">Temporary Password</span><br>
            <span style="font-family:monospace;font-size:16px;color:#0f172a;font-weight:700;letter-spacing:2px;">${input.adminPassword}</span>
          </td>
        </tr>
      </table>

      <!-- Warning -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:12px 16px;font-size:13px;color:#854d0e;">
            ⚠️ Please change your password immediately after your first login.
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#0f172a;border-radius:8px;">
            <a href="${input.loginUrl}" style="display:inline-block;padding:14px 32px;color:#f8fafc;font-size:14px;font-weight:600;text-decoration:none;">
              Login to Dashboard →
            </a>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">
        © 2026 MediOps · This is an automated email, please do not reply.<br>
        If you did not request this, contact <a href="mailto:support@mediops.in" style="color:#818cf8;">support@mediops.in</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
