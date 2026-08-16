import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  /** 8+ chars with at least one letter and one digit. */
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain at least one letter and one digit',
  })
  password: string;

  /** Optional: create a new organization during signup. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  orgName?: string;
}
