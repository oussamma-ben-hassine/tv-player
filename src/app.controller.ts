import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Santé & Système')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Healthcheck pour Coolify et Traefik' })
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'tv-player',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
