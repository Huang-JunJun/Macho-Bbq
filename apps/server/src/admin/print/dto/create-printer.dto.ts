import { IsString, MinLength } from 'class-validator';

export class CreatePrinterDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
