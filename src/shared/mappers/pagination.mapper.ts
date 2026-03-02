import { PaginationRequestDto } from "../dtos/pagination-request.dto";

export class PaginationMapper {
  static toDto<T>(
    [entities, totalCount]: [T[], number],
    pagination: PaginationRequestDto,
  ) {
    return {
      data: entities,
      total: totalCount,
      page: pagination.page,
      limit: pagination.limit,
      totalPages:
        pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 0,
    };
  }
}
