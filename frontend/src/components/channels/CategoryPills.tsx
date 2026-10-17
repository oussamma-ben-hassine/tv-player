import React from 'react';
import { Category } from '../../types';
import { Layers, Star } from 'lucide-react';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  favoritesCount: number;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  favoritesCount,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
      {/* Bouton Favoris */}
      <button
        onClick={onToggleFavoritesOnly}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
          showFavoritesOnly
            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm'
            : 'bg-[#1e293b]/60 text-gray-400 hover:text-gray-200 border border-gray-800'
        }`}
      >
        <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-current text-yellow-400' : ''}`} />
        <span>Favoris</span>
        {favoritesCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 bg-yellow-500/30 text-yellow-300 text-[10px] rounded-full">
            {favoritesCount}
          </span>
        )}
      </button>

      {/* Toutes les chaînes */}
      <button
        onClick={() => {
          if (showFavoritesOnly) onToggleFavoritesOnly();
          onSelectCategory('all');
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
          !showFavoritesOnly && selectedCategoryId === 'all'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'bg-[#1e293b]/60 text-gray-400 hover:text-gray-200 border border-gray-800'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>Toutes</span>
      </button>

      {/* Catégories dynamiques (uniquement si elles contiennent au moins 1 chaîne) */}
      {categories
        .filter((cat) => (cat.channelCount ?? 0) > 0)
        .map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              if (showFavoritesOnly) onToggleFavoritesOnly();
              onSelectCategory(cat.id);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              !showFavoritesOnly && selectedCategoryId === cat.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-[#1e293b]/60 text-gray-400 hover:text-gray-200 border border-gray-800'
            }`}
          >
            <span>{cat.name}</span>
            <span className="text-[10px] opacity-70">({cat.channelCount})</span>
          </button>
        ))}
    </div>
  );
};
