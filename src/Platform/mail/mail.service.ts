import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface ActivationEmailInput {
  hospitalName: string;
  hospitalCode: string;
  adminEmail: string;
  adminPassword: string;
  loginUrl: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  /** Resend HTTP API key — when present, Resend is used as the primary sender. */
  private readonly resendApiKey?: string;
  /** SMTP credentials — used as fallback when Resend is not configured. */
  private readonly isSmtpConfigured: boolean;
  /** True when either Resend or SMTP can send mail. */
  private get isConfigured(): boolean {
    return Boolean(this.resendApiKey || this.isSmtpConfigured);
  }

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    this.resendApiKey = process.env.RESEND_API_KEY?.trim() || undefined;
    this.isSmtpConfigured = Boolean(user && pass);

    if (!this.isConfigured) {
      this.logger.error(
        '❌ Email is not configured: set RESEND_API_KEY (preferred) or SMTP_USER / SMTP_PASS in .env. ' +
        'Email sending (OTP, activation, password reset) will be skipped.',
      );
    } else if (this.resendApiKey) {
      this.logger.log('✅ MailService using Resend HTTP API');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465, // true for 465, false for 587/STARTTLS
      // Only attach auth when credentials exist — otherwise Gmail replies
      // "530-5.7.0 Authentication Required" on every send.
      ...(this.isConfigured ? { auth: { user, pass } } : {}),
      pool: true,          // Connection pooling
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  // App start hone par SMTP check karega (skipped when Resend is the sender)
  async onModuleInit() {
    if (this.resendApiKey) {
      // Resend needs no connection pre-check — its HTTP endpoint is stateless.
      return;
    }
    if (!this.isSmtpConfigured) {
      return;
    }
    try {
      await this.transporter.verify();
      this.logger.log('✅ Nodemailer SMTP Server connected successfully');
    } catch (error) {
      this.logger.error('❌ Nodemailer SMTP connection failed. Check your .env credentials', error);
    }
  }

  /* ========================================================================= */
  /* 1. CORE SENDER (Exact old signature: to, subject, html, optional text)   */
  /* ========================================================================= */
  async sendMail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    throwOnError = false,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`⚠️ Skipped email to ${to}: RESEND_API_KEY / SMTP credentials are not set in .env`);
      if (throwOnError) {
        throw new Error('Email transport is not configured (RESEND_API_KEY / SMTP credentials missing)');
      }
      return;
    }

    // Preferred transport: Resend HTTP API
    if (this.resendApiKey) {
      // Resend only accepts a verified domain, or its shared test sender
      // "onboarding@resend.dev". SMTP's MAIL_FROM (often a Gmail address) is
      // NOT valid here and returns 403 "domain is not verified".
      const resendFrom =
        process.env.RESEND_FROM?.trim() || '"MediOps" <onboarding@resend.dev>';
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: resendFrom, to, subject, html, text }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(`Resend API ${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`);
        }

        const data = (await res.json().catch(() => ({}))) as { id?: string };
        this.logger.log(`✉️ Email sent to ${to} via Resend [Id: ${data?.id ?? 'n/a'}]`);
        return;
      } catch (err) {
        this.logger.error(`❌ Resend failed to send email to ${to}`, err);
        // Only fall back when SMTP is actually configured.
        if (!this.isSmtpConfigured) {
          if (throwOnError) {
            throw err instanceof Error ? err : new Error(String(err));
          }
          return;
        }
        this.logger.warn(`↩️ Falling back to SMTP for ${to}`);
      }
    }

    // Fallback transport: SMTP (unchanged legacy behaviour)
    if (!this.isSmtpConfigured) {
      return;
    }
    const smtpFrom =
      process.env.MAIL_FROM || `"MediOps" <${process.env.SMTP_USER}>`;
    try {
      const info = await this.transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
        text,
      });

      this.logger.log(`✉️ Email sent to ${to} [MessageId: ${info.messageId}]`);
    } catch (err) {
      this.logger.error(`❌ Failed to send email to ${to}`, err);
      // Agar kisi background service ko crash hone se bachana hai to error throw na karein,
      // sirf error log karein.
      if (throwOnError) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  /* ========================================================================= */
  /* 2. EXISTING METHOD: HOSPITAL ACTIVATION (No changes, 100% same)          */
  /* ========================================================================= */
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

  /* ========================================================================= */
  /* 3. NEW METHOD: 2FA LOGIN OTP                                             */
  /* ========================================================================= */
  async sendOtpMail(to: string, otpCode: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; font-size: 20px; font-weight: bold; }
          .content { padding: 32px; }
          .otp-box { background: #f1f5f9; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0; border: 1px dashed #cbd5e1; }
          .otp-code { font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">MediOps Security</div>
          <div class="content">
            <h2 style="color: #0f172a; margin-top: 0;">Verification Code</h2>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
              Use the following One-Time Password (OTP) to complete your login:
            </p>
            <div class="otp-box">
              <span class="otp-code">${otpCode}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">
              ⏱️ This code will expire in <strong>5 minutes</strong>.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
              If you did not request this login, please notify your administrator.
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} MediOps. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendMail(
      to,
      `Your MediOps Verification Code: ${otpCode}`,
      html,
      `Your verification code is: ${otpCode}. It expires in 5 minutes.`,
      true, // throw on failure — a silent OTP failure locks the user out
    );
  }


  /* ========================================================================= */
  /* 3. NEW METHOD: OTP EMAIL (login + password reset)                         */
  /* ========================================================================= */
  async sendOtpMailHospital(to: string, otpCode: string, purpose: 'login' | 'password-reset' = 'login'): Promise<void> {
    const copy =
      purpose === 'password-reset'
        ? {
          heading: 'Password Reset Code',
          line: 'Use the following One-Time Password (OTP) to reset your password:',
          note: 'If you did not request a password reset, please notify your administrator immediately.',
        }
        : {
          heading: 'Verification Code',
          line: 'Use the following One-Time Password (OTP) to complete your login:',
          note: 'If you did not request this login, please notify your administrator.',
        };
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; font-size: 20px; font-weight: bold; }
          .content { padding: 32px; }
          .otp-box { background: #f1f5f9; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0; border: 1px dashed #cbd5e1; }
          .otp-code { font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">MediOps Security</div>
          <div class="content">
            <h2 style="color: #0f172a; margin-top: 0;">${copy.heading}</h2>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
              ${copy.line}
            </p>
            <div class="otp-box">
              <span class="otp-code">${otpCode}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">
              ⏱️ This code will expire in <strong>5 minutes</strong>.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
              ${copy.note}
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} MediOps. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendMail(
      to,
      `Your MediOps Verification Code: ${otpCode}`,
      html,
      `Your verification code is: ${otpCode}. It expires in 5 minutes.`,
      true, // throw on failure — a silent OTP failure locks the user out
    );
  }

  /* ========================================================================= */
  /* 4. NEW METHOD: FORGOT PASSWORD RESET LINK                                */
  /* ========================================================================= */
  async sendPasswordResetMail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a;">Password Reset Request</h2>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to proceed.
        </p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Reset My Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">
          This link will expire in 30 minutes. If you did not request this, please ignore this email.
        </p>
      </div>
    `;

    await this.sendMail(to, 'Reset Your MediOps Password', html);
  }
}

// ------------------- EXISTING TEMPLATE BUILDER (Untouched) -------------------

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
