import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Socket } from "socket.io";
import { User } from "../../domains/users/entities/user.entity";

export const GetUserSocket = createParamDecorator(
  (data: keyof User | undefined, context: ExecutionContext) => {
    const client = context.switchToWs().getClient<Socket & { user?: User }>();
    const user = client.user;

    return data ? user?.[data] : user;
  },
);
