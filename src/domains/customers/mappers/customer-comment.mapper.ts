import { CustomerComment } from "../entities/customer-comments.entity";
import { CustomerCommentCreateDto } from "../dtos/customer-comment-create.dto";

export class CustomerCommentMapper {
  static toEntity(dto: CustomerCommentCreateDto, id?: string) {
    const entity = new CustomerComment();
    entity.comment = dto.comment;
    if (id) entity.id = id;
    return entity;
  }

  static toDto(entity: CustomerComment) {
    return {
      id: entity.id,
      comments: entity.comment,
    };
  }

  static toListDto(entities: CustomerComment[]) {
    return entities?.map((entity) => ({
      id: entity.id,
      comment: entity.comment,
    }));
  }
}
