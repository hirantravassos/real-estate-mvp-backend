export class SubscriptionResponseDto {
    readonly id!: string;
    readonly planName!: string;
    readonly isActive!: boolean;
    readonly activatedAt!: string | null;
    readonly expiresAt!: string | null;
    readonly createdAt!: string;
}
