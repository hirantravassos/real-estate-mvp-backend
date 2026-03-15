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
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import {
  CustomerCommentCreateDto,
  CustomerCommentMapper,
} from "../mappers/customer-comment.mapper";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { CustomerCommentService } from "../services/customer-comment.service";

@Controller("customers/:customerId/comments")
@UseGuards(JwtGuard)
export class CustomerCommentController {
  constructor(
    private readonly customerCommentService: CustomerCommentService,
  ) {}

  @Get()
  async findAll(
    @GetUser() user: User,
    @Param("customerId") customerId: string,
    @Query() pagination: PaginationRequestDto,
  ) {
    const result = await this.customerCommentService.findAll(
      user,
      customerId,
      pagination,
    );

    return {
      ...result,
      data: CustomerCommentMapper.toListDto(result.data),
    };
  }

  @Get(":id")
  async findOne(
    @GetUser() user: User,
    @Param("customerId") customerId: string,
    @Param("id") id: string,
  ) {
    return CustomerCommentMapper.toDto(
      await this.customerCommentService.findOne(user, customerId, id),
    );
  }

  @Post()
  async create(
    @GetUser() user: User,
    @Param("customerId") customerId: string,
    @Body() dto: CustomerCommentCreateDto,
  ) {
    return CustomerCommentMapper.toDto(
      await this.customerCommentService.save(user, customerId, dto),
    );
  }

  @Patch(":id")
  async update(
    @GetUser() user: User,
    @Param("customerId") customerId: string,
    @Param("id") id: string,
    @Body() dto: CustomerCommentCreateDto,
  ) {
    return CustomerCommentMapper.toDto(
      await this.customerCommentService.save(user, customerId, dto, id),
    );
  }

  @Delete(":id")
  remove(
    @GetUser() user: User,
    @Param("customerId") customerId: string,
    @Param("id") id: string,
  ) {
    return this.customerCommentService.remove(user, customerId, id);
  }
}
