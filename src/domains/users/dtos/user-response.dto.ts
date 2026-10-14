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
  /** Address of the public page, /corretor/{slug}. */
  slug!: string | null;
  /** The welcome tour, completedAt null means it was never finished. */
  tutorial!: {
    completedAt: string | null;
  };
  profile!: {
    city: string | null;
    phone: string | null;
    creci: string | null;
    bio: string | null;
    workingCities: string[];
    salesNiches: string[];
    targetClienteles: string[];
    aiMemory: string | null;
  };
  createdAt!: string;
  updatedAt!: string;
}
