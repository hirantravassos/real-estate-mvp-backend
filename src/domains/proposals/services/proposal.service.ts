import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { User } from "../../users/entities/user.entity";
import { Proposal, ProposalCommissionType, ProposalStatus } from "../entities/proposal.entity";
import { ProposalParty, ProposalPartyKind, ProposalPartyRole } from "../entities/proposal-party.entity";
import { ProposalMapper } from "../mappers/proposal.mapper";

export class ProposalPartyCreateDto {
  @IsEnum(ProposalPartyRole)
  role: ProposalPartyRole;

  @IsEnum(ProposalPartyKind)
  kind: ProposalPartyKind;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(20)
  cpfCnpj: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;
}

export class ProposalCreateDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  salePrice: string;

  @IsEnum(ProposalCommissionType)
  commissionType: ProposalCommissionType;

  @IsString()
  commissionValue: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalPartyCreateDto)
  buyers: ProposalPartyCreateDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalPartyCreateDto)
  sellers: ProposalPartyCreateDto[];
}

export class ProposalUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  salePrice?: string;

  @IsOptional()
  @IsEnum(ProposalCommissionType)
  commissionType?: ProposalCommissionType;

  @IsOptional()
  @IsString()
  commissionValue?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalPartyCreateDto)
  buyers?: ProposalPartyCreateDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalPartyCreateDto)
  sellers?: ProposalPartyCreateDto[];
}

export class ProposalUpdateStatusDto {
  @IsEnum(ProposalStatus)
  status: ProposalStatus;
}

@Injectable()
export class ProposalService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepository: Repository<Proposal>,
    @InjectRepository(ProposalParty)
    private readonly partyRepository: Repository<ProposalParty>,
  ) {}

  async findAll(user: User) {
    const proposals = await this.proposalRepository.find({
      where: { userId: user.id, active: true },
      relations: { property: true, parties: true, documents: true },
      order: { createdAt: "DESC" },
    });
    return proposals.map((p) => ProposalMapper.toListDto(p));
  }

  async findOne(user: User, id: string) {
    const proposal = await this.proposalRepository
      .findOneOrFail({
        where: { id, userId: user.id, active: true },
        relations: { property: true, parties: true, documents: { party: true } },
      })
      .catch(() => {
        throw new NotFoundException("Proposta não encontrada.");
      });
    return ProposalMapper.toDto(proposal);
  }

  async create(user: User, dto: ProposalCreateDto) {
    this.validateParties(dto.buyers, dto.sellers);

    const proposal = new Proposal();
    proposal.userId = user.id;
    proposal.title = dto.title;
    proposal.salePrice = dto.salePrice.replace(/\D(?<!\,)/g, "").replace(",", ".").trim() || dto.salePrice;
    proposal.commissionType = dto.commissionType;
    proposal.commissionValue = dto.commissionValue;
    proposal.propertyId = dto.propertyId ?? null;
    proposal.notes = dto.notes ?? null;
    proposal.status = ProposalStatus.PROPOSAL;
    proposal.publicToken = randomUUID();

    const allParties = [
      ...dto.buyers.map((b, i) => this.buildParty(b, ProposalPartyRole.BUYER, i + 1)),
      ...dto.sellers.map((s, i) => this.buildParty(s, ProposalPartyRole.SELLER, i + 1)),
    ];
    proposal.parties = allParties;
    proposal.documents = [];

    const saved = await this.proposalRepository.save(proposal);
    return this.findOne(user, saved.id);
  }

  async update(user: User, id: string, dto: ProposalUpdateDto) {
    const existing = await this.proposalRepository
      .findOneOrFail({ where: { id, userId: user.id, active: true } })
      .catch(() => { throw new NotFoundException("Proposta não encontrada."); });

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.salePrice !== undefined) existing.salePrice = dto.salePrice;
    if (dto.commissionType !== undefined) existing.commissionType = dto.commissionType;
    if (dto.commissionValue !== undefined) existing.commissionValue = dto.commissionValue;
    if (dto.notes !== undefined) existing.notes = dto.notes ?? null;

    if (dto.buyers !== undefined || dto.sellers !== undefined) {
      const buyers = dto.buyers ?? [];
      const sellers = dto.sellers ?? [];
      this.validateParties(buyers, sellers);

      await this.partyRepository.delete({ proposalId: id });

      existing.parties = [
        ...buyers.map((b, i) => this.buildParty(b, ProposalPartyRole.BUYER, i + 1)),
        ...sellers.map((s, i) => this.buildParty(s, ProposalPartyRole.SELLER, i + 1)),
      ];
    }

    await this.proposalRepository.save(existing);
    return this.findOne(user, id);
  }

  async updateStatus(user: User, id: string, dto: ProposalUpdateStatusDto) {
    const existing = await this.proposalRepository
      .findOneOrFail({ where: { id, userId: user.id, active: true } })
      .catch(() => { throw new NotFoundException("Proposta não encontrada."); });

    existing.status = dto.status;
    await this.proposalRepository.save(existing);
    return this.findOne(user, id);
  }

  async remove(user: User, id: string) {
    await this.proposalRepository.update(
      { id, userId: user.id },
      { active: false },
    );
  }

  async findOneByToken(publicToken: string) {
    return this.proposalRepository
      .findOneOrFail({
        where: { publicToken, active: true },
        relations: { property: true, parties: true, documents: { party: true } },
      })
      .catch(() => { throw new NotFoundException("Proposta não encontrada."); });
  }

  private validateParties(buyers: ProposalPartyCreateDto[], sellers: ProposalPartyCreateDto[]) {
    if (!buyers.length || buyers.length > 2) {
      throw new BadRequestException("São necessários 1 ou 2 compradores.");
    }
    if (!sellers.length || sellers.length > 2) {
      throw new BadRequestException("São necessários 1 ou 2 vendedores.");
    }
  }

  private buildParty(dto: ProposalPartyCreateDto, role: ProposalPartyRole, order: number): ProposalParty {
    const party = new ProposalParty();
    party.role = role;
    party.kind = dto.kind;
    party.name = dto.name;
    party.cpfCnpj = dto.cpfCnpj.replace(/\D/g, "");
    party.email = dto.email ?? null;
    party.phone = dto.phone ? dto.phone.replace(/\D/g, "") : null;
    party.partyOrder = order;
    return party;
  }
}
