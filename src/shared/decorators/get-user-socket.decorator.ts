import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "../../domains/users/entities/user.entity";
import { AuthenticatedSocket } from "../types/authenticated-socket.type";

export const GetUserSocket = createParamDecorator(
  (data: keyof User | undefined, context: ExecutionContext) => {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const user = client.user;

    return data ? user?.[data] : user;
  },
);
