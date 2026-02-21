export class CustomerResponseDto {
  readonly id!: string;
  readonly name!: string;
  readonly phone!: string;
  readonly comments!: string | null;
  readonly minBudget!: number | null;
  readonly maxBudget!: number | null;
  readonly kanbanSectionId!: string | null;
  readonly kanbanOrder!: number;
  readonly createdAt!: string;
}
