import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { VisitService } from "../services/visit.service";
import { CreateVisitDto } from "../dtos/visit.dto";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { VisitMapper } from "../mappers/visit.mapper";

@Controller("visits")
@UseGuards(JwtGuard)
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  async create(@GetUser() user: User, @Body() dto: CreateVisitDto) {
    return VisitMapper.toDto(await this.visitService.create(user, dto));
  }

  @Get()
  async findAll(@GetUser() user: User) {
    const visits = await this.visitService.findAll(user);
    return VisitMapper.toListDto(visits);
  }

  @Get("customer/:customerId")
  async findByCustomer(
    @GetUser() user: User,
    @Param("customerId") customerId: string,
  ) {
    const visits = await this.visitService.findByCustomer(user, customerId);
    return VisitMapper.toListDto(visits);
  }
}
