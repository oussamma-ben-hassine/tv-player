import { Injectable, Logger, BadRequestException, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseM3uContent, ParsedM3uChannel } from './m3u.parser';
import { validateSafeUrl } from '../common/ssrf.validator';
import axios from 'axios';
import { SourceType, Role } from '@prisma/client';

@Injectable()
export class SourcesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SourcesService.name);
  private autoSyncTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    this.logger.log('Démarrage du planificateur de synchronisation automatique...');
    // Vérification toutes les 5 minutes
    this.autoSyncTimer = setInterval(() => {
      this.checkAndAutoSyncSources().catch((err) => {
        this.logger.error(`Erreur vérification auto-sync: ${err.message}`);
      });
    }, 5 * 60 * 1000);

    // Première vérification 20 secondes après le démarrage
    setTimeout(() => {
      this.checkAndAutoSyncSources().catch(() => {});
    }, 20 * 1000);
  }

  async checkAndAutoSyncSources() {
    const sources = await this.prisma.source.findMany({
      where: { autoSync: true },
    });

    for (const source of sources) {
      const intervalHours = source.syncIntervalHours || 24;
      const lastSync = source.lastSyncAt ? source.lastSyncAt.getTime() : 0;
      const now = Date.now();
      const elapsedHours = (now - lastSync) / (1000 * 60 * 60);

      if (elapsedHours >= intervalHours) {
        this.logger.log(
          `[Auto-Sync] Synchronisation automatique déclenchée pour "${source.name}" (intervalle: ${intervalHours}h, écoulé: ${elapsedHours.toFixed(1)}h)`,
        );
        try {
          await this.syncSource(source.id);
        } catch (err: any) {
          this.logger.error(`[Auto-Sync] Erreur pour "${source.name}": ${err.message}`);
        }
      }
    }
  }

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

  async updateSource(
    id: string,
    data: {
      name?: string;
      autoSync?: boolean;
      syncIntervalHours?: number;
      url?: string;
      config?: any;
    },
  ) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.autoSync !== undefined) updateData.autoSync = data.autoSync;
    if (data.syncIntervalHours !== undefined) {
      const hours = Number(data.syncIntervalHours);
      if (hours > 0) {
        updateData.syncIntervalHours = hours;
      }
    }
    if (data.url !== undefined) updateData.url = validateSafeUrl(data.url);
    if (data.config !== undefined) updateData.configJson = JSON.stringify(data.config);

    return this.prisma.source.update({
      where: { id },
      data: updateData,
    });
  }

  async syncSource(sourceId: string) {
    const source = await this.prisma.source.findUnique({ where: { id: sourceId } });
    if (!source) throw new NotFoundException('Source introuvable.');

    if (source.type === SourceType.IPTV_SERVER) {
      return this.syncIptvServer(sourceId);
    } else if (source.url) {
      return this.syncM3uSource(sourceId);
    }
    return { success: false, error: 'Source non synchronisable automatiquement.' };
  }

  async syncM3uSource(sourceId: string) {
    const source = await this.prisma.source.findUnique({ where: { id: sourceId } });
    if (!source || !source.url) {
      throw new BadRequestException('Source M3U sans URL valide.');
    }

    try {
      const preview = await this.previewM3u({ url: source.url });
      const result = await this.importM3uChannels({
        sourceId: source.id,
        channels: preview.allChannels,
      });

      await this.prisma.source.update({
        where: { id: source.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'SUCCESS',
          lastSyncError: null,
        },
      });

      return { success: true, syncedCount: result.added + result.updated };
    } catch (err: any) {
      await this.prisma.source.update({
        where: { id: source.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'FAILED',
          lastSyncError: err.message,
        },
      });
      return { success: false, error: err.message };
    }
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
    autoSync?: boolean;
    syncIntervalHours?: number;
    channels: ParsedM3uChannel[];
  }) {
    let sourceId = params.sourceId;

    if (!sourceId) {
      const source = await this.prisma.source.create({
        data: {
          name: params.sourceName || 'Playlist M3U Importée',
          type: SourceType.M3U,
          url: params.sourceUrl ? validateSafeUrl(params.sourceUrl) : null,
          autoSync: params.autoSync || false,
          syncIntervalHours: params.syncIntervalHours ? Number(params.syncIntervalHours) : 24,
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

  async testIptvServer(params: {
    url: string;
    authMethod?: 'NONE' | 'TOKEN' | 'BASIC' | 'XTREAM';
    apiToken?: string;
    username?: string;
    password?: string;
  }) {
    const safeUrl = validateSafeUrl(params.url);
    const headers: any = {};
    let targetUrl = safeUrl;

    if (params.authMethod === 'TOKEN' && params.apiToken) {
      headers['Authorization'] = `Bearer ${params.apiToken}`;
    } else if (params.authMethod === 'BASIC' && params.username) {
      const basic = Buffer.from(`${params.username}:${params.password || ''}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    } else if (params.authMethod === 'XTREAM' && params.username) {
      const u = new URL(targetUrl);
      if (!u.pathname.includes('player_api.php')) {
        u.pathname = u.pathname.replace(/\/$/, '') + '/player_api.php';
      }
      u.searchParams.set('username', params.username);
      u.searchParams.set('password', params.password || '');
      u.searchParams.set('action', 'get_live_streams');
      targetUrl = u.toString();
    }

    try {
      const start = Date.now();
      const res = await axios.get(targetUrl, {
        headers,
        timeout: 15000,
        responseType: 'text',
      });
      const responseTimeMs = Date.now() - start;

      let channelCount = 0;
      let sampleChannels: any[] = [];
      const raw = res.data;

      if (typeof raw === 'string' && raw.includes('#EXTM3U')) {
        const parsed = parseM3uContent(raw);
        channelCount = parsed.length;
        sampleChannels = parsed.slice(0, 10).map((c) => ({
          name: c.name,
          category: c.categoryName,
          streamUrl: c.streamUrl,
          logoUrl: c.logoUrl,
        }));
      } else {
        try {
          const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const items = Array.isArray(json) ? json : json.channels || json.streams || [];
          channelCount = items.length;
          sampleChannels = items.slice(0, 10).map((item: any) => ({
            name: item.name || item.title,
            category: item.category || item.categoryName || 'IPTV Server',
            streamUrl: item.streamUrl || item.url || item.stream_url,
            logoUrl: item.logo || item.logoUrl,
          }));
        } catch {
          channelCount = 0;
        }
      }

      return {
        success: true,
        httpStatus: res.status,
        responseTimeMs,
        detectedChannels: channelCount,
        sample: sampleChannels,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
        httpStatus: err.response?.status,
      };
    }
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
      let targetUrl = safeUrl;

      if (config.authMethod === 'TOKEN' && config.apiToken) {
        headers['Authorization'] = `Bearer ${config.apiToken}`;
      } else if (config.authMethod === 'BASIC' && config.username) {
        const basic = Buffer.from(`${config.username}:${config.password || ''}`).toString('base64');
        headers['Authorization'] = `Basic ${basic}`;
      } else if (config.apiToken) {
        headers['Authorization'] = `Bearer ${config.apiToken}`;
      }

      // Requête au serveur IPTV
      const res = await axios.get(targetUrl, {
        headers,
        timeout: 20000,
        responseType: 'text',
      });

      let items: any[] = [];
      const raw = res.data;

      if (typeof raw === 'string' && raw.includes('#EXTM3U')) {
        const parsed = parseM3uContent(raw);
        items = parsed.map((c) => ({
          name: c.name,
          category: c.categoryName || 'IPTV Server',
          streamUrl: c.streamUrl,
          logo: c.logoUrl,
          epgId: c.epgId,
          active: true,
        }));
      } else {
        try {
          const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
          items = Array.isArray(json) ? json : json.channels || json.streams || [];
        } catch {
          items = [];
        }
      }
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
