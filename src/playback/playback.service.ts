import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../types/enums';
import * as crypto from 'crypto';

@Injectable()
export class PlaybackService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string, userRole: Role, channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { category: true },
    });

    if (!channel || (!channel.active && userRole !== Role.ADMIN)) {
      throw new NotFoundException('Chaîne non disponible ou inactive.');
    }

    if (channel.minRole === Role.ADMIN && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Accès non autorisé à cette chaîne.');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 6 * 3600 * 1000); // 6 heures

    await this.prisma.playbackSession.create({
      data: {
        token,
        userId,
        channelId: channel.id,
        streamUrl: channel.streamUrl,
        expiresAt,
      },
    });

    // Mettre à jour la dernière chaîne regardée dans les préférences
    await this.prisma.preference.upsert({
      where: { userId },
      update: { lastChannelId: channel.id },
      create: { userId, lastChannelId: channel.id },
    });

    return {
      sessionToken: token,
      channelId: channel.id,
      channelName: channel.name,
      logoUrl: channel.logoUrl,
      streamUrl: channel.streamUrl,
      streamType: channel.streamType,
      expiresAt,
    };
  }

  async reportError(channelId: string, errorMessage: string, errorCode?: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { name: true },
    });

    return this.prisma.playbackError.create({
      data: {
        channelId,
        channelName: channel?.name || 'Inconnue',
        errorMessage: (errorMessage || 'Erreur inconnue').substring(0, 500),
        errorCode: errorCode || null,
      },
    });
  }
}
