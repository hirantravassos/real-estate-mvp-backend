import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { NotificationService } from "../services/notification.service";

@Controller("notifications")
@UseGuards(JwtGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    async findAll(@GetUser() user: User) {
        return this.notificationService.findUnreadNotifications(user);
    }

    @Get("count")
    async count(@GetUser() user: User) {
        return this.notificationService.countUnreadNotifications(user);
    }
}
