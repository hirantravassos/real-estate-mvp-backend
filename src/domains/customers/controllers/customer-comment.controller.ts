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
import { CustomerCommentMapper } from "../mappers/customer-comment.mapper";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import {
  CustomerCommentCreateDto,
  CustomerCommentService,
} from "../services/customer-comment.service";

@Controller("customer-comments/:customerId")
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

  @Get("comments/:id")
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

  @Patch("comments/:id")
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

  @Delete("comments/:id")
  remove(
    @GetUser() user: User,
    @Param("customerId") customerId: string,
    @Param("id") id: string,
  ) {
    return this.customerCommentService.remove(user, customerId, id);
  }
}
