import { IsString } from 'class-validator';

export class MoveTableDto {
  @IsString()
  fromTableId!: string;

  @IsString()
  toTableId!: string;
}
