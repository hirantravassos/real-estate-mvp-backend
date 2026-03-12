import {
  CustomerCreateDto,
  CustomerFilterDto,
  CustomerService,
} from "../services/customer.service";
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
import { CustomerFilterQueryDto } from "../dtos/customer-filter-query.dto";
import { CustomerMapper } from "../mappers/customer.mapper";

@Controller("customers")
@UseGuards(JwtGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async findAll(
    @GetUser() user: User,
    @Query() pagination: CustomerFilterQueryDto,
    @Query() filter: CustomerFilterDto,
  ) {
    return await this.customerService.findAll(user, filter, pagination);
  }

  @Get("pending")
  async findAllPending(
    @GetUser() user: User,
    @Query() pagination: CustomerFilterQueryDto,
  ) {
    return await this.customerService.findAllPending(user, pagination);
  }

  @Get(":id")
  async findOne(@GetUser() user: User, @Param("id") id: string) {
    return await this.customerService.findOne(user, id);
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

  @Post(":id/ignore")
  async ignore(@GetUser() user: User, @Param("id") customerId: string) {
    return await this.customerService.ignore(user, customerId);
  }

  @Post(":id/accept")
  async accept(@GetUser() user: User, @Param("id") customerId: string) {
    return await this.customerService.accept(user, customerId);
  }

  @Patch(":id/move")
  async moveToKanban(
    @GetUser() user: User,
    @Param("id") customerId: string,
    @Body() body: { kanbanId: string | null },
  ) {
    return this.customerService.moveToKanban(user, customerId, body.kanbanId);
  }

  @Delete(":id")
  remove(@GetUser() user: User, @Param("id") id: string) {
    return this.customerService.remove(user, id);
  }
}
