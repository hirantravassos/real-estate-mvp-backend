import { BadRequestException, NotFoundException } from "@nestjs/common";
import sharp from "sharp";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { User } from "../entities/user.entity";
import { profileImagePathOf } from "../helpers/profile-image.helper";
import { UserRepository } from "../repositories/user.repository";
import { UserProfileImageService } from "./user-profile-image.service";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const OLD_FILE = "33333333-3333-4333-8333-333333333333.webp";

const userOf = (id: string, profileImage: string | null = null) =>
  ({ id, active: true, profileImage }) as User;

const buildService = (users: User[]) => {
  const objects = new Map<string, Buffer>();
  const userRepository = {
    findOneBy: jest.fn((criteria: { id: string }) =>
      Promise.resolve(users.find((user) => user.id === criteria.id) ?? null),
    ),
    update: jest.fn((criteria: { id: string }, values: Partial<User>) => {
      const user = users.find((candidate) => candidate.id === criteria.id);
      if (user) Object.assign(user, values);
      return Promise.resolve({ affected: user ? 1 : 0 });
    }),
  } as unknown as UserRepository;
  const deleteObject = jest.fn((s3Key: string) => {
    objects.delete(s3Key);
    return Promise.resolve();
  });
  const storageService = {
    deleteObject,
    uploadBuffer: jest.fn((s3Key: string, buffer: Buffer) => {
      objects.set(s3Key, buffer);
      return Promise.resolve();
    }),
    downloadObject: jest.fn((s3Key: string) => {
      const object = objects.get(s3Key);
      return object
        ? Promise.resolve(object)
        : Promise.reject(new Error("missing"));
    }),
  } as unknown as StorageService;

  return {
    service: new UserProfileImageService(userRepository, storageService),
    objects,
    deleteObject,
  };
};

const photo = () =>
  sharp({
    create: {
      width: 900,
      height: 600,
      channels: 3,
      background: { r: 200, g: 120, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();

describe("UserProfileImageService", () => {
  it("redraws the photo as a 512 pixel webp under the owner's folder", async () => {
    const owner = userOf(OWNER_ID, `profile-images/${OWNER_ID}/${OLD_FILE}`);
    const other = userOf(OTHER_ID);
    const { service, objects, deleteObject } = buildService([owner, other]);
    objects.set(`profile-images/${OWNER_ID}/${OLD_FILE}`, Buffer.from("old"));

    const result = await service.replace(OWNER_ID, await photo());

    expect(result.profileImage).toMatch(
      new RegExp(`^profile-images/${OWNER_ID}/[0-9a-f-]{36}\\.webp$`),
    );
    const stored = objects.get(result.profileImage as string) as Buffer;
    const metadata = await sharp(stored).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 512, height: 512 });
    expect(metadata.exif).toBeUndefined();
    expect(deleteObject).toHaveBeenCalledWith(
      `profile-images/${OWNER_ID}/${OLD_FILE}`,
    );
    expect(other.profileImage).toBeNull();
  });

  it("refuses a file that is not a picture", async () => {
    const { service, objects } = buildService([userOf(OWNER_ID)]);

    await expect(
      service.replace(OWNER_ID, Buffer.from("<svg onload=alert(1)>")),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(objects.size).toBe(0);
  });

  it("serves only the photo each broker currently uses", async () => {
    const owner = userOf(OWNER_ID);
    const other = userOf(OTHER_ID);
    const { service } = buildService([owner, other]);
    const saved = await service.replace(OWNER_ID, await photo());
    const fileName = (saved.profileImage as string).split("/").pop() as string;

    await expect(service.read(OWNER_ID, fileName)).resolves.toBeInstanceOf(
      Buffer,
    );
    // The same file under another broker, a bad name or a path never resolve.
    await expect(service.read(OTHER_ID, fileName)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.read(OWNER_ID, "../../documents/secret.pdf"),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.read(OWNER_ID, OLD_FILE)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("removes only the caller's photo", async () => {
    const owner = userOf(OWNER_ID);
    const other = userOf(OTHER_ID);
    const { service } = buildService([owner, other]);
    await service.replace(OWNER_ID, await photo());
    await service.replace(OTHER_ID, await photo());

    const result = await service.remove(OWNER_ID);

    expect(result.profileImage).toBeNull();
    expect(other.profileImage).not.toBeNull();
  });
});

describe("profileImagePathOf", () => {
  it("answers the public path only for keys the app wrote", () => {
    expect(profileImagePathOf(`profile-images/${OWNER_ID}/${OLD_FILE}`)).toBe(
      `/profile-images/${OWNER_ID}/${OLD_FILE}`,
    );
    expect(profileImagePathOf("https://example.com/me.jpg")).toBeNull();
    expect(profileImagePathOf(null)).toBeNull();
  });
});
