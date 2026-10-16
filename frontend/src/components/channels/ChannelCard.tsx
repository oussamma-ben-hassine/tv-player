import React from 'react';
import { Star } from 'lucide-react';
import { Channel } from '../../types';

interface ChannelCardProps {
  channel: Channel;
  isSelected: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (channelId: string, e: React.MouseEvent) => void;
  isFavorite: boolean;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isSelected,
  onSelect,
  onToggleFavorite,
  isFavorite,
}) => {
  return (
    <div
      onClick={() => onSelect(channel)}
      className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${
        isSelected
          ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/10'
          : 'bg-[#131b2e]/60 border-gray-800/80 hover:bg-[#1a233a] hover:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Logo de la chaîne */}
        <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center overflow-hidden p-1">
          {channel.logoUrl ? (
            <img
              src={channel.logoUrl}
              alt={channel.name}
              className="w-full h-full object-contain"
              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
            />
          ) : (
            <span className="text-xs font-bold text-gray-400">
              {channel.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          {isSelected && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-[#0b0f19]" />
          )}
        </div>

        {/* Informations */}
        <div className="min-w-0 flex-1">
          <h4
            className={`text-sm font-semibold truncate transition-colors ${
              isSelected ? 'text-blue-400' : 'text-gray-200 group-hover:text-white'
            }`}
          >
            {channel.name}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
            <span>{channel.category?.name || 'Généraliste'}</span>
            {channel.country && <span>• {channel.country}</span>}
          </div>
        </div>
      </div>

      {/* Bouton Favori */}
      <button
        onClick={(e) => onToggleFavorite(channel.id, e)}
        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
          isFavorite
            ? 'text-yellow-400 hover:text-yellow-300'
            : 'text-gray-500 hover:text-gray-300 opacity-60 group-hover:opacity-100'
        }`}
        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
};
