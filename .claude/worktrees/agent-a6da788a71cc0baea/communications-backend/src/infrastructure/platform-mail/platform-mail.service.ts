import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  verifyEmailHtml,
  verifyEmailSubject,
} from './templates/verify-email.template';
import {
  resetPasswordHtml,
  resetPasswordSubject,
} from './templates/reset-password.template';

@Injectable()
export class PlatformMailService implements OnModuleInit {
  private readonly logger = new Logger(PlatformMailService.name);
  private transporter: Transporter;
  private readonly fromAddress: string;
  private readonly platformName: string;
  private isReady = false;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('PLATFORM_SMTP_HOST', '');
    const port = config.get<number>('PLATFORM_SMTP_PORT', 587);
    const secure = config.get<string>('PLATFORM_SMTP_SECURE', 'false') === 'true';
    const user = config.get<string>('PLATFORM_SMTP_USER', '');
    const pass = config.get<string>('PLATFORM_SMTP_PASS', '');
    const fromEmail = config.get<string>('PLATFORM_SMTP_FROM_EMAIL', '');
    const fromName = config.get<string>('PLATFORM_SMTP_FROM_NAME', 'Communication Platform');

    this.fromAddress = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    this.platformName = fromName;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async onModuleInit(): Promise<void> {
    const host = this.config.get<string>('PLATFORM_SMTP_HOST', '');

    if (!host) {
      this.logger.warn(
        'PLATFORM_SMTP_HOST is not configured — modules emails will not be sent. ' +
          'Set PLATFORM_SMTP_* variables to enable email verification and password reset.',
      );
      return;
    }

    try {
      await this.transporter.verify();
      this.isReady = true;
      this.logger.log(`Platform SMTP connected (${host})`);
    } catch (err: any) {
      // Non-fatal: log the warning and continue. Auth flows will degrade gracefully.
      this.logger.warn(
        `Platform SMTP verification failed: ${err?.message}. ` +
          'Email verification and password reset emails will not be delivered.',
      );
    }
  }

  async sendEmailVerification(
    to: string,
    firstName: string,
    verificationUrl: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: verifyEmailSubject(this.platformName),
      html: verifyEmailHtml({ firstName, verificationUrl, platformName: this.platformName }),
    });
  }

  async sendPasswordReset(
    to: string,
    firstName: string,
    resetUrl: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: resetPasswordSubject(this.platformName),
      html: resetPasswordHtml({ firstName, resetUrl, platformName: this.platformName }),
    });
  }

  private async send(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.isReady) {
      this.logger.warn(
        `Platform mail not ready — skipping send to ${params.to} (subject: "${params.subject}")`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to send platform email to ${params.to}: ${err?.message}`,
        err?.stack,
      );
    }
  }
}
