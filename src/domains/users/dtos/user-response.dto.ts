import { CustomerAvatar } from "../../customers/dtos/customer-avatar.dto";

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  profileImage!: string | null;
  avatar!: CustomerAvatar | null;
  terms!: {
    acceptedVersion: string | null;
    acceptedAt: string | null;
    currentVersion: string;
  };
  createdAt!: string;
  updatedAt!: string;
}
