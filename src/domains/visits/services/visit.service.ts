import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Visit } from "../entities/visit.entity";
import { LessThan, MoreThan, Repository } from "typeorm";
import { CreateVisitDto } from "../dtos/visit.dto";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";

@Injectable()
export class VisitService {
    constructor(
        @InjectRepository(Visit)
        private readonly visitRepository: Repository<Visit>,
        @InjectRepository(Customer)
        private readonly customerRepository: Repository<Customer>,
    ) { }

    async create(user: User, dto: CreateVisitDto): Promise<Visit> {
        const customer = await this.customerRepository.findOne({
            where: { id: dto.customerId, user: { id: user.id } },
        });

        if (!customer) {
            throw new NotFoundException("Cliente não encontrado.");
        }

        const startsAt = new Date(dto.startsAt);
        const endsAt = new Date(dto.endsAt);

        if (startsAt >= endsAt) {
            throw new ConflictException("A data de término deve ser posterior à data de início.");
        }

        const conflictingVisits = await this.visitRepository.find({
            where: {
                user: { id: user.id },
                startsAt: LessThan(endsAt),
                endsAt: MoreThan(startsAt),
            },
            relations: ["customer"],
        });

        if (conflictingVisits.length > 0) {
            throw new ConflictException(
                `Já existe uma visita agendada neste horário para o cliente ${conflictingVisits[0].customer?.name || "desconhecido"}.`
            );
        }

        const visit = this.visitRepository.create({
            user,
            customer,
            address: dto.address,
            reference: dto.reference || null,
            startsAt,
            endsAt,
        });

        return await this.visitRepository.save(visit);
    }

    async findAll(user: User): Promise<Visit[]> {
        return this.visitRepository.find({
            where: { user: { id: user.id } },
            order: { startsAt: "DESC" },
            relations: ["customer"]
        });
    }

    async findByCustomer(user: User, customerId: string): Promise<Visit[]> {
        return this.visitRepository.find({
            where: {
                user: { id: user.id },
                customer: { id: customerId },
            },
            order: { startsAt: "DESC" },
        });
    }
}
