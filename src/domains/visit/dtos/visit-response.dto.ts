export class VisitResponseDto {
  readonly id!: string;
  readonly customerId!: string;
  readonly title!: string;
  readonly description!: string | null;
  readonly location!: string;
  readonly scheduledAt!: string;
  readonly endAt!: string;
  readonly feedback!: string | null;
  readonly rating!: number | null;
  readonly createdAt!: string;
}
