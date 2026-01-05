import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @MinLength(1)
  @Matches(/^[^\u4e00-\u9fff]+$/, { message: '账号不能包含中文' })
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  roleId?: string;
}
