import { CustomerService } from "../services/customer.service";
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
import { CustomerCreateDto } from "../dtos/customer-create.dto";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { CustomerMapper } from "../mappers/customer.mapper";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";

@Controller("customers")
@UseGuards(JwtGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async findAll(
    @GetUser() user: User,
    @Query() pagination: PaginationRequestDto,
  ) {
    const result = await this.customerService.findAll(user, pagination);

    return {
      ...result,
      data: CustomerMapper.toListDto(result.data),
    };
  }

  @Get(":id")
  async findOne(@GetUser() user: User, @Param("id") id: string) {
    return CustomerMapper.toDto(await this.customerService.findOne(user, id));
  }

  @Post()
  async create(@GetUser() user: User, @Body() dto: CustomerCreateDto) {
    return CustomerMapper.toDto(await this.customerService.save(user, dto));
  }

  @Patch(":id")
  async update(
    @GetUser() user: User,
    @Param("id") id: string,
    @Body() dto: CustomerCreateDto,
  ) {
    return CustomerMapper.toDto(await this.customerService.save(user, dto, id));
  }

  @Delete(":id")
  remove(@GetUser() user: User, @Param("id") id: string) {
    return this.customerService.remove(user, id);
  }
}
