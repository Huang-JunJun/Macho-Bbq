import { Body, Controller, Post } from '@nestjs/common';
import { MpAuthService } from './mp-auth.service';
import { MpLoginDto } from './dto/mp-login.dto';

@Controller('mp/auth')
export class MpAuthController {
  constructor(private readonly service: MpAuthService) {}

  @Post('login')
  async login(@Body() dto: MpLoginDto) {
    return await this.service.loginWithCode(dto.code);
  }
}

