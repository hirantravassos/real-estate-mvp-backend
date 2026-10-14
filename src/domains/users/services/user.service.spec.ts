import { NotFoundException } from "@nestjs/common";
import { User } from "../entities/user.entity";
import { UserRepository } from "../repositories/user.repository";
import { UserService } from "./user.service";

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "22222222-2222-2222-2222-222222222222";

const buildService = (users: User[]) => {
  const update = jest.fn((criteria: { id: string }, values: Partial<User>) => {
    const user = users.find((candidate) => candidate.id === criteria.id);
    if (user) Object.assign(user, values);
    return Promise.resolve({ affected: user ? 1 : 0 });
  });
  const userRepository = {
    findOneBy: jest.fn((criteria: { id: string }) =>
      Promise.resolve(users.find((user) => user.id === criteria.id) ?? null),
    ),
    update,
  } as unknown as UserRepository;

  return { service: new UserService(userRepository), update };
};

const userOf = (id: string, tutorialCompletedAt: Date | null = null) =>
  ({ id, slug: `corretor-${id.slice(0, 4)}`, tutorialCompletedAt }) as User;

describe("UserService.completeTutorial", () => {
  it("stamps the tour as seen for the broker in the token only", async () => {
    const owner = userOf(OWNER_ID);
    const other = userOf(OTHER_ID);
    const { service, update } = buildService([owner, other]);

    const result = await service.completeTutorial(OWNER_ID);

    expect(result.tutorialCompletedAt).toBeInstanceOf(Date);
    expect(update).toHaveBeenCalledWith(
      { id: OWNER_ID },
      { tutorialCompletedAt: expect.any(Date) as Date },
    );
    expect(other.tutorialCompletedAt).toBeNull();
  });

  it("keeps the first time when called again", async () => {
    const firstTime = new Date("2026-10-01T12:00:00Z");
    const { service, update } = buildService([userOf(OWNER_ID, firstTime)]);

    const result = await service.completeTutorial(OWNER_ID);

    expect(result.tutorialCompletedAt).toBe(firstTime);
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses an unknown broker", async () => {
    const { service } = buildService([]);

    await expect(service.completeTutorial(OWNER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
