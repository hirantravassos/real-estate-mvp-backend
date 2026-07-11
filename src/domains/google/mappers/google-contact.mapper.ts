import { GoogleContactDto } from "../dtos/google-contact.dto";
import { GooglePersonConnection } from "../interfaces/google-people-response.interface";

export class GoogleContactMapper {
  static toDto(connection: GooglePersonConnection): GoogleContactDto {
    const dto = new GoogleContactDto();

    dto.resourceName = connection.resourceName;
    dto.name = connection.names?.[0]?.displayName ?? null;
    dto.email = connection.emailAddresses?.[0]?.value ?? null;
    dto.phone = connection.phoneNumbers?.[0]?.value ?? null;
    dto.photoUrl = connection.photos?.[0]?.url ?? null;

    return dto;
  }

  static toDtoList(connections: GooglePersonConnection[]): GoogleContactDto[] {
    return connections.map((connection) => this.toDto(connection));
  }
}
