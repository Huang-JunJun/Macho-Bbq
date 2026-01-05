import { IsArray, IsString } from 'class-validator';

export class UpdateRoleMenusDto {
  @IsArray()
  @IsString({ each: true })
  menuKeys!: string[];
}
