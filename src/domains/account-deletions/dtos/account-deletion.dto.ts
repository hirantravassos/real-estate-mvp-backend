import { Equals, IsString } from "class-validator";

/** The broker types the word so a stray click never erases an account. */
export const ACCOUNT_DELETION_CONFIRMATION = "EXCLUIR";

export class AccountDeletionDto {
  @IsString()
  @Equals(ACCOUNT_DELETION_CONFIRMATION, {
    message: `Digite ${ACCOUNT_DELETION_CONFIRMATION} para confirmar a exclusão da conta`,
  })
  confirmation: string;
}
