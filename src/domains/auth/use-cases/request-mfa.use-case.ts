import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { MfaTokenRepository } from '../repositories';

@Injectable()
export class RequestMfaUseCase {
  private readonly logger = new Logger(RequestMfaUseCase.name);

  constructor(
    private readonly mfaTokenRepository: MfaTokenRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async execute(userId: string, email: string): Promise<void> {
    await this.mfaTokenRepository.invalidateAllForUser(userId);

    const tokenLength = this.configService.get<number>(
      'auth.mfaTokenLength',
      6,
    );
    const expirationMinutes = this.configService.get<number>(
      'auth.mfaTokenExpirationMinutes',
      5,
    );

    const token = this.generateNumericToken(tokenLength);
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    await this.mfaTokenRepository.create({
      userId,
      token,
      expiresAt,
      isUsed: false,
    });

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Código de verificação - CRM Imobiliário',
        text: `Seu código de verificação é: ${token}\n\nEste código expira em ${expirationMinutes} minutos.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1890ff;">Código de Verificação</h2>
            <p>Seu código de verificação é:</p>
            <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px;">
              ${token}
            </div>
            <p style="color: #888; font-size: 14px; margin-top: 15px;">
              Este código expira em ${expirationMinutes} minutos.
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar e-mail MFA para ${email}. Token no console: ${token}`,
      );
      this.logger.debug(`[DEV] Token MFA para ${email}: ${token}`);
    }
  }

  private generateNumericToken(length: number): string {
    const digits = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return result;
  }
}
