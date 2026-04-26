import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private fromAddress: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const smtp = this.configService.get('smtp');

    this.fromAddress = `"${smtp.fromName}" <${smtp.fromEmail}>`;

    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
      pool: true,
      maxConnections: 5,
    });

    this.verifyConnection();
  }

  async sendMail(options: SendMailOptions): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      });

      this.logger.log(`Email sent → ${options.to} | msgId: ${info.messageId}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}: ${err.message}`);
      return false;
    }
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
    } catch (err) {
      this.logger.warn(`SMTP connection could not be verified: ${err.message}`);
    }
  }
}
