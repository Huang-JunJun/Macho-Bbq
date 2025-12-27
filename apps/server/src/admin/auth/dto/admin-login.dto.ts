import { IsString, Matches, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @MinLength(1)
  @Matches(/^[^\u4e00-\u9fff]+$/, { message: '账号不能包含中文' })
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
