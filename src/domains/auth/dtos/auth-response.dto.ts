export interface UserResponseDto {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly isMfaEnabled: boolean;
  readonly createdAt: string;
}

export interface LoginResponseDto {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly requiresMfa: boolean;
  readonly user: UserResponseDto;
}

export interface MfaResponseDto {
  readonly message: string;
}
