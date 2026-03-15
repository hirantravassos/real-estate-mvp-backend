import { CustomerComment } from "../entities/customer-comments.entity";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";

export interface CustomerCommentDto {
  id: string;
  comment: string;
  createdAt: Date;
}

export interface CustomerCommentListDto {
  id: string;
  comment: string;
  createdAt: Date;
}

export class CustomerCommentCreateDto {
  @ValidateLongText()
  comment: string;
}

export class CustomerCommentMapper {
  static toEntity(dto: CustomerCommentCreateDto, id?: string) {
    const entity = new CustomerComment();
    entity.comment = dto.comment;
    if (id) entity.id = id;
    return entity;
  }

  static toDto(entity: CustomerComment): CustomerCommentDto {
    return {
      id: entity.id,
      comment: entity.comment,
      createdAt: entity.createdAt,
    };
  }

  static toListDto(entities: CustomerComment[]): CustomerCommentListDto[] {
    return entities.map((entity) => ({
      id: entity.id,
      comment: entity.comment,
      createdAt: entity.createdAt,
    }));
  }
}
