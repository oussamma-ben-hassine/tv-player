import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseM3uContent, ParsedM3uChannel } from './m3u.parser';
import { validateSafeUrl } from '../common/ssrf.validator';
import axios from 'axios';
import { SourceType, Role } from '@prisma/client';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listSources() {
    return this.prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { channels: true },
        },
      },
    });
  }

  async createSource(data: {
    name: string;
    type: SourceType;
    url?: string;
    autoSync?: boolean;
    syncIntervalHours?: number;
    config?: any;
  }) {
    if (data.url) {
      data.url = validateSafeUrl(data.url);
    }

    return this.prisma.source.create({
      data: {
        name: data.name,
        type: data.type,
        url: data.url,
        autoSync: data.autoSync || false,
        syncIntervalHours: data.syncIntervalHours || 24,
        configJson: data.config ? JSON.stringify(data.config) : null,
      },
    });
  }

  async deleteSource(id: string) {
    return this.prisma.source.delete({
      where: { id },
    });
  }

  async previewM3u(params: { url?: string; content?: string }): Promise<{
    totalChannels: number;
    categories: string[];
    sample: ParsedM3uChannel[];
    allChannels: ParsedM3uChannel[];
  }> {
    let rawContent = params.content || '';

    if (!rawContent && params.url) {
      const safeUrl = validateSafeUrl(params.url);
      try {
        const res = await axios.get(safeUrl, { timeout: 25000, responseType: 'text' });
        rawContent = res.data;
      } catch (err: any) {
        throw new BadRequestException(`Impossible de télécharger la playlist M3U: ${err.message}`);
      }
    }

    if (!rawContent) {
      throw new BadRequestException('Veuillez fournir une URL valide ou le contenu M3U.');
    }

    const parsed = parseM3uContent(rawContent);
    const categoriesSet = new Set<string>();
    parsed.forEach((c) => {
      if (c.categoryName) categoriesSet.add(c.categoryName);
    });

    return {
      totalChannels: parsed.length,
      categories: Array.from(categoriesSet),
      sample: parsed.slice(0, 50),
      allChannels: parsed,
    };
  }

  async importM3uChannels(params: {
    sourceId?: string;
    sourceName?: string;
    sourceUrl?: string;
    channels: ParsedM3uChannel[];
  }) {
    let sourceId = params.sourceId;

    if (!sourceId) {
      const source = await this.prisma.source.create({
        data: {
          name: params.sourceName || 'Playlist M3U Importée',
          type: SourceType.M3U,
          url: params.sourceUrl ? validateSafeUrl(params.sourceUrl) : null,
          lastSyncAt: new Date(),
          lastSyncStatus: 'SUCCESS',
        },
      });
      sourceId = source.id;
    }

    let added = 0;
    let updated = 0;

    for (const item of params.channels) {
      if (!item.name || !item.streamUrl) continue;

      // Catégorie
      const catName = item.categoryName || 'Généraliste';
      const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general';

      const category = await this.prisma.category.upsert({
        where: { slug: catSlug },
        update: {},
        create: {
          name: catName,
          slug: catSlug,
          icon: 'Tv',
        },
      });

      // Vérifier si la chaîne existe déjà dans cette source
      const existing = await this.prisma.channel.findFirst({
        where: {
          sourceId,
          OR: [{ streamUrl: item.streamUrl }, { name: item.name }],
        },
      });

      if (existing) {
        await this.prisma.channel.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            logoUrl: item.logoUrl || existing.logoUrl,
            categoryId: category.id,
            epgId: item.epgId || existing.epgId,
            country: item.country || existing.country,
            language: item.language || existing.language,
          },
        });
        updated++;
      } else {
        await this.prisma.channel.create({
          data: {
            name: item.name,
            streamUrl: item.streamUrl,
            logoUrl: item.logoUrl || null,
            categoryId: category.id,
            sourceId,
            epgId: item.epgId || null,
            country: item.country || null,
            language: item.language || null,
            active: true,
            isPublic: true,
            minRole: Role.USER,
          },
        });
        added++;
      }
    }

    await this.prisma.source.update({
      where: { id: sourceId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS',
        lastSyncError: null,
      },
    });

    return {
      sourceId,
      added,
      updated,
      totalProcessed: params.channels.length,
    };
  }

  async syncIptvServer(sourceId: string) {
    const source = await this.prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source || source.type !== SourceType.IPTV_SERVER) {
      throw new NotFoundException('Source IPTV Server introuvable.');
    }

    if (!source.url) {
      throw new BadRequestException('URL du serveur IPTV manquante.');
    }

    const safeUrl = validateSafeUrl(source.url);

    try {
      this.logger.log(`Synchronisation avec IPTV Server (${safeUrl})...`);
      let config: any = {};
      try {
        config = source.configJson ? JSON.parse(source.configJson) : {};
      } catch {}

      const headers: any = {};
      if (config.apiToken) {
        headers['Authorization'] = `Bearer ${config.apiToken}`;
      }

      // Requête au serveur IPTV
      const res = await axios.get(safeUrl, {
        headers,
        timeout: 15000,
      });

      const items = Array.isArray(res.data) ? res.data : res.data.channels || [];
      let syncedCount = 0;

      for (const item of items) {
        const streamUrl = item.streamUrl || item.url || item.stream_url;
        const name = item.name || item.title;
        if (!name || !streamUrl) continue;

        const catName = item.category || item.categoryName || 'IPTV Server';
        const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'iptv';

        const category = await this.prisma.category.upsert({
          where: { slug: catSlug },
          update: {},
          create: { name: catName, slug: catSlug, icon: 'Server' },
        });

        const existing = await this.prisma.channel.findFirst({
          where: {
            sourceId: source.id,
            OR: [
              { sourceChannelId: String(item.id || '') },
              { streamUrl: streamUrl },
            ],
          },
        });

        if (existing) {
          await this.prisma.channel.update({
            where: { id: existing.id },
            data: {
              name,
              streamUrl,
              logoUrl: item.logo || item.logoUrl || existing.logoUrl,
              categoryId: category.id,
              epgId: item.epgId || item.epg_id || existing.epgId,
              active: item.active !== false,
            },
          });
        } else {
          await this.prisma.channel.create({
            data: {
              name,
              streamUrl,
              logoUrl: item.logo || item.logoUrl || null,
              categoryId: category.id,
              sourceId: source.id,
              sourceChannelId: item.id ? String(item.id) : null,
              epgId: item.epgId || item.epg_id || null,
              active: item.active !== false,
              isPublic: true,
              minRole: Role.USER,
            },
          });
        }
        syncedCount++;
      }

      await this.prisma.source.update({
        where: { id: source.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'SUCCESS',
          lastSyncError: null,
        },
      });

      return { success: true, syncedCount };
    } catch (err: any) {
      const errMsg = `Erreur IPTV Server: ${err.message}`;
      this.logger.error(errMsg);
      await this.prisma.source.update({
        where: { id: source.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'FAILED',
          lastSyncError: errMsg,
        },
      });
      // Noter que l'erreur ne bloque pas le reste de l'application
      return { success: false, error: errMsg };
    }
  }
}
