import { KanbanService } from "../services/kanban.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { KanbanCreateDto } from "../dtos/kanban-create.dto";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { KanbanMapper } from "../mappers/kanban.mapper";
import { PaginationQueryDto } from "../../../shared/types/pagination-query.dto";

@Controller("kanbans")
@UseGuards(JwtGuard)
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get()
  async findAll(
    @GetUser() user: User,
    @Query() pagination: PaginationQueryDto,
  ) {
    const result = await this.kanbanService.findAll(user, pagination);

    return {
      ...result,
      data: KanbanMapper.toListDto(result.data),
    };
  }

  @Get(":id")
  async findOne(@GetUser() user: User, @Param("id") id: string) {
    return KanbanMapper.toDto(await this.kanbanService.findOne(user, id));
  }

  @Post()
  async create(@GetUser() user: User, @Body() dto: KanbanCreateDto) {
    return KanbanMapper.toDto(await this.kanbanService.save(user, dto));
  }

  @Patch(":id")
  async update(
    @GetUser() user: User,
    @Param("id") id: string,
    @Body() dto: KanbanCreateDto,
  ) {
    return KanbanMapper.toDto(await this.kanbanService.save(user, dto, id));
  }

  @Delete(":id")
  remove(@GetUser() user: User, @Param("id") id: string) {
    return this.kanbanService.remove(user, id);
  }
}
