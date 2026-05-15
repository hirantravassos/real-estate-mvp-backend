import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IsNotEmpty, IsString } from "class-validator";
import { User } from "../../users/entities/user.entity";
import { WhatsappAccountRepository } from "../repositories/whatsapp-account.repository";
import {
  WhatsappAccount,
  WhatsappConnectionStatus,
} from "../entities/whatsapp-account.entity";
import {
  MetaPhoneNumber,
  WhatsappApiService,
} from "./whatsapp-api.service";
import { decryptToken, encryptToken } from "../utils/encryption.util";

export class WhatsappConnectDto {
  @IsNotEmpty()
  @IsString()
  accessToken: string;
}

export class WhatsappSelectPhoneDto {
  @IsNotEmpty()
  @IsString()
  phoneNumberId: string;

  @IsNotEmpty()
  @IsString()
  wabaId: string;
}

export class WhatsappRequestOtpDto {
  @IsNotEmpty()
  @IsString()
  codeMethod: "SMS" | "VOICE";
}

export class WhatsappVerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class WhatsappSendMessageDto {
  @IsNotEmpty()
  @IsString()
  to: string;

  @IsNotEmpty()
  @IsString()
  text: string;
}

@Injectable()
export class WhatsappAccountService {
  constructor(
    private readonly accountRepository: WhatsappAccountRepository,
    private readonly apiService: WhatsappApiService,
    private readonly configService: ConfigService,
  ) {}

  private get encryptionKey(): string {
    return this.configService.getOrThrow<string>("whatsapp.encryptionKey");
  }

  private encrypt(token: string): string {
    return encryptToken(token, this.encryptionKey);
  }

  private decrypt(encrypted: string): string {
    return decryptToken(encrypted, this.encryptionKey);
  }

  async getAccount(user: User): Promise<WhatsappAccount | null> {
    return this.accountRepository.findOne({
      where: { userId: user.id, active: true },
    });
  }

  async connectFacebook(user: User, dto: WhatsappConnectDto): Promise<WhatsappAccount> {
    let longLivedToken: string;
    try {
      longLivedToken = await this.apiService.exchangeForLongLivedToken(
        dto.accessToken,
      );
    } catch {
      throw new BadRequestException("Failed to exchange Facebook access token");
    }

    const userInfo = await this.apiService.getUserInfo(longLivedToken);
    const encryptedToken = this.encrypt(longLivedToken);

    let account = await this.accountRepository.findOne({
      where: { userId: user.id },
    });

    if (!account) {
      account = this.accountRepository.create({
        userId: user.id,
        user,
      });
    }

    account.facebookUserId = userInfo.id;
    account.encryptedAccessToken = encryptedToken;
    account.connectionStatus = WhatsappConnectionStatus.PENDING;
    account.active = true;

    return this.accountRepository.save(account);
  }

  async getAvailablePhoneNumbers(user: User): Promise<MetaPhoneNumber[]> {
    const account = await this.requireAccount(user);
    const token = this.decryptAccountToken(account);

    const businesses = await this.apiService.getBusinessPortfolios(token);
    const allPhones: MetaPhoneNumber[] = [];

    for (const business of businesses) {
      const wabas = await this.apiService.getOwnedWabas(business.id, token);
      for (const waba of wabas) {
        const phones = await this.apiService.getPhoneNumbers(waba.id, token);
        allPhones.push(...phones);
      }
    }

    return allPhones;
  }

  async selectPhone(
    user: User,
    dto: WhatsappSelectPhoneDto,
  ): Promise<WhatsappAccount> {
    const account = await this.requireAccount(user);
    const token = this.decryptAccountToken(account);

    const phones = await this.apiService.getPhoneNumbers(dto.wabaId, token);
    const phone = phones.find((p) => p.id === dto.phoneNumberId);

    if (!phone) {
      throw new NotFoundException("Phone number not found in the given WABA");
    }

    account.wabaId = dto.wabaId;
    account.phoneNumberId = dto.phoneNumberId;
    account.displayPhoneNumber = phone.display_phone_number;
    account.verifiedName = phone.verified_name;

    return this.accountRepository.save(account);
  }

  async requestOtp(user: User, dto: WhatsappRequestOtpDto): Promise<void> {
    const account = await this.requireAccountWithPhone(user);
    const token = this.decryptAccountToken(account);

    try {
      await this.apiService.requestVerificationCode(
        account.phoneNumberId!,
        token,
        dto.codeMethod,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new UnprocessableEntityException(
        `Could not request OTP: ${message}`,
      );
    }
  }

  async verifyOtp(user: User, dto: WhatsappVerifyOtpDto): Promise<WhatsappAccount> {
    const account = await this.requireAccountWithPhone(user);
    const token = this.decryptAccountToken(account);

    try {
      await this.apiService.verifyCode(account.phoneNumberId!, token, dto.code);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`OTP verification failed: ${message}`);
    }

    account.connectionStatus = WhatsappConnectionStatus.ACTIVE;
    return this.accountRepository.save(account);
  }

  async disconnect(user: User): Promise<void> {
    const account = await this.requireAccount(user);
    account.active = false;
    account.connectionStatus = WhatsappConnectionStatus.ERROR;
    await this.accountRepository.save(account);
  }

  async getDecryptedToken(user: User): Promise<string> {
    const account = await this.requireAccount(user);
    return this.decryptAccountToken(account);
  }

  /** Used internally by other services */
  async findActiveAccountByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<WhatsappAccount | null> {
    return this.accountRepository.findOne({
      where: { phoneNumberId, active: true },
    });
  }

  decryptAccountToken(account: WhatsappAccount): string {
    if (!account.encryptedAccessToken) {
      throw new BadRequestException("No access token stored for this account");
    }
    return this.decrypt(account.encryptedAccessToken);
  }

  private async requireAccount(user: User): Promise<WhatsappAccount> {
    const account = await this.getAccount(user);
    if (!account) {
      throw new NotFoundException(
        "No WhatsApp account found. Please connect your Facebook account first.",
      );
    }
    return account;
  }

  private async requireAccountWithPhone(user: User): Promise<WhatsappAccount> {
    const account = await this.requireAccount(user);
    if (!account.phoneNumberId) {
      throw new BadRequestException(
        "No phone number selected. Please select a phone number first.",
      );
    }
    return account;
  }
}
