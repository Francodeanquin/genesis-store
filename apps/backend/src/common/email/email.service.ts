import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  constructor(
    @Inject('RESEND_CLIENT') private readonly resend: Resend,
    @Inject() private readonly configService: ConfigService,
  ) {}

  async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) {
    const from = this.configService.get<string>('EMAIL_FROM');
    if (!from) {
      throw new Error('EMAIL_FROM must be configured');
    }

    return await this.resend.emails.send({
      from,
      to,
      subject,
      html,
    });
  }
}
