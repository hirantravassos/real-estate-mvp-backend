import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { ProposalService, ProposalCreateDto, ProposalUpdateDto, ProposalUpdateStatusDto } from "../services/proposal.service";

@Controller("proposals")
@UseGuards(JwtGuard)
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Get()
  async findAll(@GetUser() user: User) {
    return this.proposalService.findAll(user);
  }

  @Get(":id")
  async findOne(@GetUser() user: User, @Param("id") id: string) {
    return this.proposalService.findOne(user, id);
  }

  @Post()
  async create(@GetUser() user: User, @Body() dto: ProposalCreateDto) {
    return this.proposalService.create(user, dto);
  }

  @Patch(":id")
  async update(
    @GetUser() user: User,
    @Param("id") id: string,
    @Body() dto: ProposalUpdateDto,
  ) {
    return this.proposalService.update(user, id, dto);
  }

  @Patch(":id/status")
  async updateStatus(
    @GetUser() user: User,
    @Param("id") id: string,
    @Body() dto: ProposalUpdateStatusDto,
  ) {
    return this.proposalService.updateStatus(user, id, dto);
  }

  @Delete(":id")
  async remove(@GetUser() user: User, @Param("id") id: string) {
    await this.proposalService.remove(user, id);
  }
}
