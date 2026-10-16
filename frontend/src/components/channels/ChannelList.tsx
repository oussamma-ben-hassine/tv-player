import React, { useState } from 'react';
import { Search, X, Tv } from 'lucide-react';
import { Channel, Category } from '../../types';
import { ChannelCard } from './ChannelCard';
import { CategoryPills } from './CategoryPills';

interface ChannelListProps {
  channels: Channel[];
  categories: Category[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onToggleFavorite: (channelId: string) => void;
  favoriteIds: string[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  categories,
  selectedChannel,
  onSelectChannel,
  onToggleFavorite,
  favoriteIds,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  showFavoritesOnly,
  onToggleFavoritesOnly,
}) => {
  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0d1322] border-r border-gray-800/80 overflow-hidden">
      {/* Zone de recherche */}
      <div className="p-3 border-b border-gray-800/80 space-y-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une chaîne..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#172033] border border-gray-700/60 rounded-xl pl-9 pr-8 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtres de catégories */}
        <CategoryPills
          categories={categories}
          selectedCategoryId={selectedCategory}
          onSelectCategory={onSelectCategory}
          showFavoritesOnly={showFavoritesOnly}
          onToggleFavoritesOnly={onToggleFavoritesOnly}
          favoritesCount={favoriteIds.length}
        />
      </div>

      {/* Liste des chaînes défilante indépendante */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
        {channels.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-gray-500">
            <Tv className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">Aucune chaîne trouvée</p>
            <p className="text-xs text-gray-600 mt-1">
              Essayez de modifier votre recherche ou de changer de filtre.
            </p>
          </div>
        ) : (
          channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isSelected={selectedChannel?.id === channel.id}
              onSelect={onSelectChannel}
              onToggleFavorite={(id, e) => {
                e.stopPropagation();
                onToggleFavorite(id);
              }}
              isFavorite={favoriteIds.includes(channel.id)}
            />
          ))
        )}
      </div>

      {/* Pied de liste : compteur */}
      <div className="p-2.5 text-xs text-center text-gray-500 border-t border-gray-800/80 bg-[#090d18] shrink-0">
        {channels.length} {channels.length > 1 ? 'chaînes disponibles' : 'chaîne disponible'}
      </div>
    </div>
  );
};
