export class CustomerResponseDto {
    readonly id!: string;
    readonly name!: string;
    readonly phone!: string;
    readonly comments!: string | null;
    readonly budget!: number | null;
    readonly kanbanSectionId!: string | null;
    readonly kanbanOrder!: number;
    readonly createdAt!: string;
}
