import { IsNotEmpty, IsString } from 'class-validator';

export class MpLoginDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

