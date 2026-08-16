import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/role.constants';

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsIn([Role.EMPLOYEE, Role.MANAGER, Role.GUEST])
  role: string = Role.EMPLOYEE;
}

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;
}
