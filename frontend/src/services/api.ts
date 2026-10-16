import { User, Category, Channel, PlaybackSession, AdminStats, VodItem } from '../types';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = 'Erreur serveur';
      try {
        const errorData = await res.json();
        errorMsg = errorData.message || errorData.error || `Erreur HTTP ${res.status}`;
      } catch {
        errorMsg = `Erreur HTTP ${res.status}`;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // --- Auth & User ---
  async getMe(): Promise<{ authenticated: boolean; user: User | null }> {
    return this.request<{ authenticated: boolean; user: User | null }>('/api/v1/me');
  }

  async updatePreferences(prefs: {
    lastChannelId?: string;
    favoriteCategoryId?: string;
    volume?: number;
    muted?: boolean;
    theme?: string;
  }) {
    return this.request('/api/v1/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  }

  // --- Channels & Categories ---
  async getChannels(params?: {
    search?: string;
    categoryId?: string;
    onlyFavorites?: boolean;
  }): Promise<Channel[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.onlyFavorites) query.set('onlyFavorites', 'true');

    return this.request<Channel[]>(`/api/v1/channels?${query.toString()}`);
  }

  async getChannel(id: string): Promise<Channel> {
    return this.request<Channel>(`/api/v1/channels/${id}`);
  }

  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/api/v1/categories');
  }

  // --- Favorites ---
  async getFavorites(): Promise<Channel[]> {
    return this.request<Channel[]>('/api/v1/favorites');
  }

  async addFavorite(channelId: string) {
    return this.request('/api/v1/favorites', {
      method: 'POST',
      body: JSON.stringify({ channelId }),
    });
  }

  async removeFavorite(channelId: string) {
    return this.request(`/api/v1/favorites/${channelId}`, {
      method: 'DELETE',
    });
  }

  // --- Playback & EPG ---
  async createPlaybackSession(channelId: string): Promise<PlaybackSession> {
    return this.request<PlaybackSession>('/api/v1/playback-sessions', {
      method: 'POST',
      body: JSON.stringify({ channelId }),
    });
  }

  async reportPlaybackError(channelId: string, errorMessage: string, errorCode?: string) {
    return this.request('/api/v1/playback-errors', {
      method: 'POST',
      body: JSON.stringify({ channelId, errorMessage, errorCode }),
    });
  }

  // --- Admin ---
  async getAdminDashboard(): Promise<AdminStats> {
    return this.request<AdminStats>('/api/v1/admin/dashboard');
  }

  async adminListChannels(params?: { search?: string; categoryId?: string }): Promise<Channel[]> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    return this.request<Channel[]>(`/api/v1/admin/channels?${q.toString()}`);
  }

  async adminCreateChannel(data: Partial<Channel>): Promise<Channel> {
    return this.request<Channel>('/api/v1/admin/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminUpdateChannel(id: string, data: Partial<Channel>): Promise<Channel> {
    return this.request<Channel>(`/api/v1/admin/channels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminDeleteChannel(id: string) {
    return this.request(`/api/v1/admin/channels/${id}`, {
      method: 'DELETE',
    });
  }

  async adminBatchDeleteChannels(ids: string[]): Promise<{ count: number }> {
    return this.request<{ count: number }>('/api/v1/admin/channels/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async adminToggleChannel(id: string) {
    return this.request(`/api/v1/admin/channels/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  async adminPreviewM3u(data: { url?: string; content?: string }) {
    return this.request<{
      totalChannels: number;
      categories: string[];
      sample: any[];
      allChannels: any[];
    }>('/api/v1/admin/sources/m3u/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminImportM3u(data: {
    sourceName?: string;
    sourceUrl?: string;
    autoSync?: boolean;
    syncIntervalHours?: number;
    channels: any[];
  }): Promise<{ added: number; updated: number; totalProcessed: number }> {
    return this.request<{ added: number; updated: number; totalProcessed: number }>('/api/v1/admin/sources/m3u/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminTestIptv(data: {
    url: string;
    authMethod?: 'NONE' | 'TOKEN' | 'BASIC' | 'XTREAM';
    apiToken?: string;
    username?: string;
    password?: string;
  }): Promise<{
    success: boolean;
    httpStatus?: number;
    responseTimeMs?: number;
    detectedChannels?: number;
    sample?: any[];
    error?: string;
  }> {
    return this.request('/api/v1/admin/sources/test-iptv', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminListSources(): Promise<any[]> {
    return this.request<any[]>('/api/v1/admin/sources');
  }

  async adminCreateSource(data: {
    name: string;
    type: 'MANUAL' | 'M3U_URL' | 'M3U_FILE' | 'IPTV_SERVER';
    url?: string;
    autoSync?: boolean;
    syncIntervalHours?: number;
    config?: any;
  }) {
    return this.request('/api/v1/admin/sources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminDeleteSource(id: string) {
    return this.request(`/api/v1/admin/sources/${id}`, {
      method: 'DELETE',
    });
  }

  async adminUpdateSource(
    id: string,
    data: {
      name?: string;
      autoSync?: boolean;
      syncIntervalHours?: number;
      url?: string;
      config?: any;
    },
  ) {
    return this.request(`/api/v1/admin/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminSyncSource(sourceId: string): Promise<{ success: boolean; syncedCount?: number; error?: string }> {
    return this.request<{ success: boolean; syncedCount?: number; error?: string }>(`/api/v1/admin/sources/${sourceId}/sync`, {
      method: 'POST',
    });
  }

  async adminSyncIptv(sourceId: string): Promise<{ success: boolean; syncedCount?: number; error?: string }> {
    return this.request<{ success: boolean; syncedCount?: number; error?: string }>(`/api/v1/admin/sources/${sourceId}/sync-iptv`, {
      method: 'POST',
    });
  }

  async adminCreateCategory(data: { name: string; icon?: string; sortOrder?: number }) {
    return this.request('/api/v1/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminDeleteCategory(id: string) {
    return this.request(`/api/v1/admin/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // --- VOD (Films & Séries) ---
  async getVodItems(params?: { type?: string; genre?: string; search?: string }): Promise<VodItem[]> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.genre) query.set('genre', params.genre);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<VodItem[]>(`/api/v1/vod${qs}`);
  }

  async getVodGenres(): Promise<string[]> {
    return this.request<string[]>('/api/v1/vod/genres');
  }

  async getVodById(id: string): Promise<VodItem> {
    return this.request<VodItem>(`/api/v1/vod/${id}`);
  }

  async adminListAllVod(params?: { search?: string; type?: string }): Promise<VodItem[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.type) query.set('type', params.type);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<VodItem[]>(`/api/v1/admin/vod${qs}`);
  }

  async adminCreateVod(data: Partial<VodItem>): Promise<VodItem> {
    return this.request<VodItem>('/api/v1/admin/vod', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminUpdateVod(id: string, data: Partial<VodItem>): Promise<VodItem> {
    return this.request<VodItem>(`/api/v1/admin/vod/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adminDeleteVod(id: string) {
    return this.request(`/api/v1/admin/vod/${id}`, {
      method: 'DELETE',
    });
  }

  async adminBatchDeleteVod(ids: string[]): Promise<{ count: number }> {
    return this.request<{ count: number }>('/api/v1/admin/vod/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }
}

export const api = new ApiService();
