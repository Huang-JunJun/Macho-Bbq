import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AgentReportDto {
  @IsString()
  printerId!: string;

  @IsString()
  jobId!: string;

  @IsBoolean()
  ok!: boolean;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}
