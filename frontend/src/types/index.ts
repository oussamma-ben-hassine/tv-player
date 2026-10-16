export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  ssoId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
  preferences?: {
    volume: number;
    muted: boolean;
    theme: string;
    lastChannelId?: string;
    favoriteCategoryId?: string;
  };
  favoriteChannelIds?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sortOrder: number;
  channelCount: number;
}

export interface Channel {
  id: string;
  name: string;
  logoUrl?: string;
  streamUrl: string;
  streamType: string;
  categoryId?: string;
  category?: Category;
  sourceId?: string;
  sourceChannelId?: string;
  epgId?: string;
  language?: string;
  country?: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  isPublic: boolean;
  minRole: Role;
  isFavorite?: boolean;
}

export interface PlaybackSession {
  sessionToken: string;
  channelId: string;
  channelName: string;
  logoUrl?: string;
  streamUrl: string;
  streamType: string;
  expiresAt: string;
}

export interface EpgProgram {
  id?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  progressPercent: number;
}

export interface ChannelEpgResponse {
  channelId: string;
  hasEpg: boolean;
  current: EpgProgram | null;
  next: EpgProgram | null;
}

export interface AdminStats {
  totalChannels: number;
  activeChannels: number;
  totalCategories: number;
  totalSources: number;
  totalUsers: number;
  categoryDistribution: { id: string; name: string; channelCount: number }[];
  recentErrors: {
    id: string;
    channelId: string;
    channelName: string;
    errorMessage: string;
    errorCode?: string;
    createdAt: string;
  }[];
  sources: {
    id: string;
    name: string;
    type: string;
    url?: string;
    lastSyncAt?: string;
    lastSyncStatus?: string;
    lastSyncError?: string;
    _count: { channels: number };
  }[];
}

export interface VodItem {
  id: string;
  title: string;
  type: 'MOVIE' | 'SERIES';
  posterUrl?: string;
  backdropUrl?: string;
  streamUrl: string;
  streamType: string;
  genre?: string;
  year?: number;
  duration?: string;
  rating?: string;
  overview?: string;
  sourceId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
