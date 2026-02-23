export class CustomerResponseDto {
  readonly id!: string;
  readonly name!: string;
  readonly phone!: string;
  readonly comments!: string | null;
  readonly minBudget!: number | null;
  readonly maxBudget!: number | null;
  readonly category!: {
    id: string;
    userId: string;
    name: string;
    displayOrder: number;
    color: string;
  } | null;
  readonly createdAt!: string;
}
