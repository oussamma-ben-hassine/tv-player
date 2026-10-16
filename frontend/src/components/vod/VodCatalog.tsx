import React, { useState } from 'react';
import { Search, Film, Tv, Star, Play, Clock, Calendar } from 'lucide-react';
import { VodItem } from '../../types';

interface VodCatalogProps {
  items: VodItem[];
  genres: string[];
  selectedItem: VodItem | null;
  onSelectItem: (item: VodItem) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: 'ALL' | 'MOVIE' | 'SERIES';
  onSelectType: (type: 'ALL' | 'MOVIE' | 'SERIES') => void;
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

export const VodCatalog: React.FC<VodCatalogProps> = ({
  items,
  genres,
  selectedItem,
  onSelectItem,
  searchQuery,
  onSearchChange,
  selectedType,
  onSelectType,
  selectedGenre,
  onSelectGenre,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#0b0f19] overflow-hidden">
      {/* Barre de navigation VOD : Types, Recherche et Genres */}
      <div className="p-4 sm:p-6 bg-[#0d1322] border-b border-gray-800/80 space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sélecteur de type : Tous, Films, Séries */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-900/80 rounded-xl border border-gray-800 shrink-0">
            <button
              onClick={() => onSelectType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedType === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => onSelectType('MOVIE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedType === 'MOVIE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Films</span>
            </button>
            <button
              onClick={() => onSelectType('SERIES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedType === 'SERIES'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Séries</span>
            </button>
          </div>

          {/* Recherche */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un film, une série, un genre..."
              className="w-full bg-[#162033] border border-gray-700/60 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filtres par genre (défilant horizontalement) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => onSelectGenre('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
              selectedGenre === 'ALL'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                : 'bg-gray-900/60 text-gray-400 hover:text-gray-200 border border-gray-800'
            }`}
          >
            Tous les genres
          </button>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => onSelectGenre(g)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                selectedGenre === g
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                  : 'bg-gray-900/60 text-gray-400 hover:text-gray-200 border border-gray-800'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des films & séries */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
        {items.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6 text-gray-500">
            <Film className="w-12 h-12 mb-3 opacity-30 text-blue-400" />
            <p className="text-base font-bold text-gray-300">Aucun titre trouvé</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Essayez de modifier votre recherche ou de sélectionner une autre catégorie.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {items.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className={`group relative flex flex-col bg-[#111827] border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-blue-500/10 ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/50'
                      : 'border-gray-800/80 hover:border-gray-700'
                  }`}
                >
                  {/* Affiche (Poster) */}
                  <div className="aspect-[2/3] w-full bg-gray-900 relative overflow-hidden">
                    {item.posterUrl ? (
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-t from-gray-900 to-gray-800">
                        <Film className="w-8 h-8 text-gray-600 mb-2" />
                        <span className="text-xs font-bold text-gray-400 line-clamp-2">{item.title}</span>
                      </div>
                    )}

                    {/* Badge Note */}
                    {item.rating && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-amber-500/30 flex items-center gap-1 text-[10px] font-bold text-amber-400 shadow">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{item.rating}</span>
                      </div>
                    )}

                    {/* Badge Type (Film / Série) */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-gray-700/60 text-[9px] font-bold uppercase tracking-wider text-blue-400">
                      {item.type === 'SERIES' ? 'Série' : 'Film'}
                    </div>

                    {/* Overlay au survol avec bouton Play */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/50 transform scale-75 group-hover:scale-100 transition duration-300">
                        <Play className="w-6 h-6 ml-0.5 fill-white" />
                      </div>
                    </div>
                  </div>

                  {/* Métadonnées en bas */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-100 group-hover:text-blue-400 transition truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 truncate">{item.genre || 'Général'}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-800/60">
                      {item.year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{item.year}</span>
                        </span>
                      )}
                      {item.duration && (
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{item.duration}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
