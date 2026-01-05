import { IsString, MinLength } from 'class-validator';

export class UpdateStaffRoleDto {
  @IsString()
  @MinLength(1)
  roleId!: string;
}
