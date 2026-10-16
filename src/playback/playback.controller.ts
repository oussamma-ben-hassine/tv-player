import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PlaybackService } from './playback.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserSession } from '../auth/auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Lecture Streaming')
@UseGuards(AuthGuard)
@Controller('api/v1')
export class PlaybackController {
  constructor(private readonly playbackService: PlaybackService) {}

  @ApiOperation({ summary: 'Créer une session de lecture sécurisée pour une chaîne' })
  @ApiResponse({ status: 201, description: 'Session de lecture créée avec URL utilisable' })
  @Post('playback-sessions')
  async createSession(@CurrentUser() user: UserSession, @Body() body: { channelId: string }) {
    return this.playbackService.createSession(user.id, user.role, body.channelId);
  }

  @ApiOperation({ summary: 'Signaler une erreur de lecture depuis le client' })
  @ApiResponse({ status: 201, description: 'Erreur enregistrée pour diagnostic' })
  @Post('playback-errors')
  async reportError(
    @Body()
    body: {
      channelId: string;
      errorMessage: string;
      errorCode?: string;
    },
  ) {
    return this.playbackService.reportError(body.channelId, body.errorMessage, body.errorCode);
  }
}
