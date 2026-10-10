import { CustomerAvatar } from "../../customers/dtos/customer-avatar.dto";

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  profileImage!: string | null;
  avatar!: CustomerAvatar | null;
  createdAt!: string;
  updatedAt!: string;
}
