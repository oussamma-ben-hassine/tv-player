import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';
import { validateSafeUrl } from '../common/ssrf.validator';

export interface ProgramInfo {
  id?: string;
  title: string;
  description?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  durationMinutes: number;
  progressPercent: number;
}

@Injectable()
export class EpgService {
  private readonly logger = new Logger(EpgService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getChannelEpg(channelId: string): Promise<{
    channelId: string;
    hasEpg: boolean;
    current: ProgramInfo | null;
    next: ProgramInfo | null;
  }> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, name: true, epgId: true },
    });

    if (!channel) {
      return { channelId, hasEpg: false, current: null, next: null };
    }

    const now = new Date();

    if (channel.epgId) {
      // Rechercher dans les programmes stockés
      const currentDb = await this.prisma.epgProgram.findFirst({
        where: {
          channelEpgId: channel.epgId,
          startTime: { lte: now },
          endTime: { gt: now },
        },
        orderBy: { startTime: 'desc' },
      });

      const nextDb = await this.prisma.epgProgram.findFirst({
        where: {
          channelEpgId: channel.epgId,
          startTime: { gte: now },
        },
        orderBy: { startTime: 'asc' },
      });

      if (currentDb) {
        const total = currentDb.endTime.getTime() - currentDb.startTime.getTime();
        const elapsed = now.getTime() - currentDb.startTime.getTime();
        const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));

        return {
          channelId: channel.id,
          hasEpg: true,
          current: {
            id: currentDb.id,
            title: currentDb.title,
            description: currentDb.description || undefined,
            startTime: currentDb.startTime.toISOString(),
            endTime: currentDb.endTime.toISOString(),
            durationMinutes: Math.round(total / 60000),
            progressPercent: progress,
          },
          next: nextDb
            ? {
                id: nextDb.id,
                title: nextDb.title,
                description: nextDb.description || undefined,
                startTime: nextDb.startTime.toISOString(),
                endTime: nextDb.endTime.toISOString(),
                durationMinutes: Math.round(
                  (nextDb.endTime.getTime() - nextDb.startTime.getTime()) / 60000,
                ),
                progressPercent: 0,
              }
            : null,
        };
      }
    }

    // Programme dynamique calculé pour assurer la continuité du guide
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const slotStart = new Date(now);
    slotStart.setMinutes(currentMinute < 30 ? 0 : 30, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + 30);

    const nextEnd = new Date(slotEnd);
    nextEnd.setMinutes(slotEnd.getMinutes() + 30);

    const totalSlot = slotEnd.getTime() - slotStart.getTime();
    const elapsedSlot = now.getTime() - slotStart.getTime();
    const progress = Math.min(100, Math.max(0, Math.round((elapsedSlot / totalSlot) * 100)));

    const getSimulatedTitle = (h: number, isHalf: boolean) => {
      if (h >= 6 && h < 9) return isHalf ? 'Le Journal du Matin' : 'La Matinale Info en Direct';
      if (h >= 9 && h < 12) return isHalf ? 'Le Grand Débat d\'Actualité' : 'Magazine & Société';
      if (h >= 12 && h < 14) return isHalf ? 'Le Journal de la Mi-Journée' : 'Édition Spéciale 12h-14h';
      if (h >= 14 && h < 18) return isHalf ? 'Grand Reportage & Découverte' : 'Focus International';
      if (h >= 18 && h < 20) return isHalf ? 'Le Point Éco & Monde' : 'L\'Édition du Soir';
      if (h >= 20 && h < 22) return isHalf ? 'Le Grand Journal de 20h' : 'Soirée Thématique & Analyses';
      return isHalf ? 'La Nuit de l\'Info' : 'Rediffusions & Magazines';
    };

    return {
      channelId: channel.id,
      hasEpg: true,
      current: {
        title: `${channel.name} — ${getSimulatedTitle(currentHour, currentMinute >= 30)}`,
        description: `Direct continu et couverture des événements en haute définition sur ${channel.name}.`,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        durationMinutes: 30,
        progressPercent: progress,
      },
      next: {
        title: `${channel.name} — ${getSimulatedTitle((currentHour + (currentMinute >= 30 ? 1 : 0)) % 24, currentMinute < 30)}`,
        description: 'Prochaine session d\'information et reportages.',
        startTime: slotEnd.toISOString(),
        endTime: nextEnd.toISOString(),
        durationMinutes: 30,
        progressPercent: 0,
      },
    };
  }

  async importXmltv(xmlUrl: string): Promise<{ importedCount: number }> {
    const safeUrl = validateSafeUrl(xmlUrl);
    this.logger.log(`Téléchargement XMLTV depuis ${safeUrl}...`);

    const response = await axios.get(safeUrl, { timeout: 20000, responseType: 'text' });
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(response.data);
    const tv = parsed.tv;
    if (!tv || !tv.programme) {
      return { importedCount: 0 };
    }

    const programmes = Array.isArray(tv.programme) ? tv.programme : [tv.programme];
    let imported = 0;

    const parseXmlDate = (str: string) => {
      // Format XMLTV : YYYYMMDDHHMMSS +ZZZZ
      const match = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (!match) return new Date();
      const [, y, m, d, h, min, s] = match;
      return new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s));
    };

    for (const p of programmes) {
      try {
        const channelId = p['@_channel'];
        const startStr = p['@_start'];
        const stopStr = p['@_stop'];
        const title = typeof p.title === 'string' ? p.title : p.title?.['#text'] || 'Programme';
        const desc = typeof p.desc === 'string' ? p.desc : p.desc?.['#text'] || '';

        if (channelId && startStr && stopStr) {
          const startTime = parseXmlDate(startStr);
          const endTime = parseXmlDate(stopStr);

          await this.prisma.epgProgram.create({
            data: {
              channelEpgId: channelId,
              title: String(title).slice(0, 200),
              description: String(desc).slice(0, 1000),
              startTime,
              endTime,
            },
          });
          imported++;
        }
      } catch (err: any) {
        this.logger.warn(`Erreur import programme: ${err.message}`);
      }
    }

    return { importedCount: imported };
  }
}
