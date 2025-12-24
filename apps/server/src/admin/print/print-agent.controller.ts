import { Body, Controller, Headers, Post } from '@nestjs/common';
import { PrintService } from '../../print/print.service';
import { AgentPullDto } from './dto/agent-pull.dto';
import { AgentReportDto } from './dto/agent-report.dto';

@Controller('admin/print/agent')
export class PrintAgentController {
  constructor(private print: PrintService) {}

  @Post('pull')
  async pull(@Headers('x-agent-key') agentKey: string, @Body() dto: AgentPullDto) {
    const printer = await this.print.validateAgent(dto.printerId, agentKey);
    const jobs = await this.print.pullJobs(printer.id, Number(dto.max ?? 5));
    return {
      jobs: jobs.map((j) => ({
        jobId: j.id,
        type: j.type,
        content: j.content,
        sessionId: j.sessionId,
        orderId: j.orderId,
        createdAt: j.createdAt
      }))
    };
  }

  @Post('report')
  async report(@Headers('x-agent-key') agentKey: string, @Body() dto: AgentReportDto) {
    const printer = await this.print.validateAgent(dto.printerId, agentKey);
    return this.print.reportJob(printer.id, dto.jobId, dto.ok, dto.errorMessage);
  }
}
