import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { EpgService } from './epg.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Guide TV (EPG)')
@UseGuards(AuthGuard)
@Controller('api/v1/epg')
export class EpgController {
  constructor(private readonly epgService: EpgService) {}

  @ApiOperation({ summary: 'Consulter le programme en cours et suivant d\'une chaîne' })
  @ApiResponse({ status: 200, description: 'Données EPG avec barre de progression' })
  @Get(':channelId')
  async getEpg(@Param('channelId') channelId: string) {
    return this.epgService.getChannelEpg(channelId);
  }
}
