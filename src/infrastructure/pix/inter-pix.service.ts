import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

interface InterPixResponse {
  txid: string;
  pixCopiaECola: string;
  valor: {
    original: string;
  };
}

@Injectable()
export class InterPixService {
  private axiosInstance: any;

  constructor(private readonly configService: ConfigService) {
    this.initAxios();
  }

  private initAxios() {
    const certPathEnv = this.configService.get<string>('INTER_CERT_PATH');
    const keyPathEnv = this.configService.get<string>('INTER_KEY_PATH');

    if (!certPathEnv || !keyPathEnv) {
      console.warn(
        'PIX Certificate paths not defined in .env. Inter PIX Service will not be initialized.',
      );
      return;
    }

    const certPath = path.resolve(certPathEnv);
    const keyPath = path.resolve(keyPathEnv);

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.warn(
        'PIX Certificate files not found at provided paths. Inter PIX Service will not be initialized.',
      );
      return;
    }

    if (
      fs.lstatSync(certPath).isDirectory() ||
      fs.lstatSync(keyPath).isDirectory()
    ) {
      console.error(
        'PIX Certificate paths point to a directory instead of a file. Please check your .env configuration.',
      );
      return;
    }

    const httpsAgent = new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      rejectUnauthorized: true,
    });

    this.axiosInstance = axios.create({
      httpsAgent,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createImmediateCharge(
    txid: string,
    amount: string,
  ): Promise<InterPixResponse> {
    if (!this.axiosInstance) {
      throw new InternalServerErrorException(
        'A integração com o banco Inter PIX não foi configurada corretamente neste ambiente.',
      );
    }

    const clientId = this.configService.get<string>('INTER_CLIENT_ID');
    const clientSecret = this.configService.get<string>('INTER_CLIENT_SECRET');
    const pixKey = this.configService.get<string>('INTER_PIX_KEY');

    try {
      // 1. Get Access Token (OAuth2 with mTLS)
      const tokenResponse = await this.axiosInstance.post(
        'https://cdp.inter.co/oauth/v2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'pix.write pix.read',
          client_id: clientId!,
          client_secret: clientSecret!,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const accessToken = tokenResponse.data.access_token;

      // 2. Create Charge (Cobrança)
      const chargeResponse = await this.axiosInstance.put(
        `https://cdp.inter.co/pix/v2/cob/${txid}`,
        {
          calendario: { expiração: 3600 },
          valor: { original: amount },
          chave: pixKey,
          solicitacaoPagador: 'Plano Sistema Imobiliário',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      return chargeResponse.data;
    } catch (error: any) {
      console.error('Inter PIX Error:', error.response?.data || error.message);
      throw new InternalServerErrorException(
        'Erro ao gerar cobrança PIX no Inter Bank',
      );
    }
  }

  async getCharge(txid: string): Promise<any> {
    // Implementation for checking status...
    return null;
  }
}
