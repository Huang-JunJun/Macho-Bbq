import { IsOptional, IsString } from 'class-validator';

export class AgentPullDto {
  @IsString()
  printerId!: string;

  @IsOptional()
  max?: number;
}
