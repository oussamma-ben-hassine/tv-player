import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Channel, Category, User, VodItem } from './types';
import { api } from './services/api';
import { Header } from './components/layout/Header';
import { VideoPlayer } from './components/player/VideoPlayer';
import { ChannelList } from './components/channels/ChannelList';
import { AdminModal } from './components/admin/AdminModal';
import { VodCatalog } from './components/vod/VodCatalog';
import { VodPlayerModal } from './components/vod/VodPlayerModal';
import { Tv, ShieldCheck, Zap, Lock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState<'live' | 'vod'>('live');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // États VOD
  const [vodItems, setVodItems] = useState<VodItem[]>([]);
  const [vodGenres, setVodGenres] = useState<string[]>([]);
  const [vodSearchQuery, setVodSearchQuery] = useState<string>('');
  const [selectedVodType, setSelectedVodType] = useState<'all' | 'movie' | 'series'>('all');
  const [selectedVodGenre, setSelectedVodGenre] = useState<string>('all');
  const [activePlayingVod, setActivePlayingVod] = useState<VodItem | null>(null);
  const [isVodLoading, setIsVodLoading] = useState<boolean>(false);

  const savePrefsTimeoutRef = useRef<any>(null);

  // 1. Charger l'état utilisateur et l'authentification
  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        setIsAuthenticated(res.authenticated);
        if (res.authenticated && res.user) {
          setUser(res.user);
          setFavoriteIds(res.user.favoriteChannelIds || []);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  // 2. Charger les chaînes et catégories
  const loadCatalog = useCallback(() => {
    if (!isAuthenticated) return;

    Promise.all([
      api.getCategories(),
      api.getChannels({
        search: searchQuery,
        categoryId: selectedCategory,
        onlyFavorites: showFavoritesOnly,
      }),
    ])
      .then(([cats, chs]) => {
        setCategories(cats);
        setChannels(chs);

        // Sélectionner la chaîne initiale
        if (chs.length > 0 && !selectedChannel) {
          const lastId = user?.preferences?.lastChannelId;
          const found = chs.find((c) => c.id === lastId);
          setSelectedChannel(found || chs[0]);
        }
      })
      .catch((err) => {
        console.error('Erreur de chargement du catalogue:', err);
      });
  }, [isAuthenticated, searchQuery, selectedCategory, showFavoritesOnly, user]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // 3. Charger le catalogue VOD
  const loadVod = useCallback(() => {
    if (!isAuthenticated) return;
    setIsVodLoading(true);
    Promise.all([
      api.getVodGenres(),
      api.getVodItems({
        type: selectedVodType,
        genre: selectedVodGenre,
        search: vodSearchQuery,
      }),
    ])
      .then(([genres, items]) => {
        setVodGenres(genres);
        setVodItems(items);
      })
      .catch((err) => {
        console.error('Erreur chargement VOD:', err);
      })
      .finally(() => {
        setIsVodLoading(false);
      });
  }, [isAuthenticated, selectedVodType, selectedVodGenre, vodSearchQuery]);

  useEffect(() => {
    if (activeSection === 'vod') {
      loadVod();
    }
  }, [activeSection, loadVod]);

  // Basculer l'état favori d'une chaîne
  const handleToggleFavorite = async (channelId: string) => {
    const isFav = favoriteIds.includes(channelId);
    // Optimistic update
    if (isFav) {
      setFavoriteIds((prev) => prev.filter((id) => id !== channelId));
      await api.removeFavorite(channelId).catch(() => {
        setFavoriteIds((prev) => [...prev, channelId]);
      });
    } else {
      setFavoriteIds((prev) => [...prev, channelId]);
      await api.addFavorite(channelId).catch(() => {
        setFavoriteIds((prev) => prev.filter((id) => id !== channelId));
      });
    }
  };

  // Sélection d'une chaîne
  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    // Sauvegarder dans les préférences avec debounce
    if (savePrefsTimeoutRef.current) clearTimeout(savePrefsTimeoutRef.current);
    savePrefsTimeoutRef.current = setTimeout(() => {
      api.updatePreferences({ lastChannelId: channel.id });
    }, 1500);
  };

  // Changement de volume
  const handleVolumeChange = (volume: number, muted: boolean) => {
    if (savePrefsTimeoutRef.current) clearTimeout(savePrefsTimeoutRef.current);
    savePrefsTimeoutRef.current = setTimeout(() => {
      api.updatePreferences({ volume, muted });
    }, 2000);
  };

  // Affichage d'attente
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-center p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-semibold text-gray-300">Chargement de TV Player...</h2>
      </div>
    );
  }

  // Écran d'accueil si non authentifié
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col">
        <Header
          user={null}
          onOpenAdmin={() => {}}
          onToggleSidebar={() => {}}
          isSidebarOpen={false}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#11192b] border border-gray-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto text-white shadow-lg shadow-blue-500/30">
              <Tv className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Bienvenue sur TV Player</h2>
              <p className="text-sm text-gray-400 mt-2">
                Plateforme de streaming TV direct et haute fidélité HLS pour l'écosystème oussamma.tn.
              </p>
            </div>

            {new URLSearchParams(window.location.search).get('error') && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl text-left">
                <strong>Erreur SSO :</strong> {decodeURIComponent(new URLSearchParams(window.location.search).get('error') || '')}
              </div>
            )}

            <div className="space-y-3 text-left text-xs text-gray-300 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Authentification centralisée OIDC avec PKCE</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Flux live adaptatifs ultra-fluides sans coupure</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>Sessions de lecture sécurisées & gestion des favoris</span>
              </div>
            </div>

            <a
              href="/auth/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-blue-600/30 active:scale-95"
            >
              <span>Se connecter via SSO</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-screen bg-[#0b0f19] flex flex-col overflow-hidden select-none">
      {/* Barre supérieure */}
      <Header
        user={user}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Vue VOD (Films & Séries) */}
      {activeSection === 'vod' ? (
        <div className="flex-1 flex overflow-hidden">
          <VodCatalog
            items={vodItems}
            genres={vodGenres}
            selectedGenre={selectedVodGenre}
            onSelectGenre={setSelectedVodGenre}
            selectedType={selectedVodType}
            onSelectType={setSelectedVodType}
            searchQuery={vodSearchQuery}
            onSearchChange={setVodSearchQuery}
            onSelectItem={(item) => setActivePlayingVod(item)}
            loading={isVodLoading}
          />
        </div>
      ) : (
        /* Vue Direct TV : Bureau & Mobile */
        <div className="flex-1 flex overflow-hidden relative">
          {/* Colonne Gauche : Liste des Chaînes (Desktop & Drawer Mobile) */}
          <div
            className={`fixed inset-y-14 left-0 z-20 w-80 max-w-[85vw] h-[calc(100vh-3.5rem)] transform transition-transform duration-300 ease-in-out lg:static lg:h-full lg:translate-x-0 shrink-0 flex flex-col overflow-hidden ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
            }`}
          >
            <ChannelList
              channels={channels}
              categories={categories}
              selectedChannel={selectedChannel}
              onSelectChannel={(ch) => {
                handleSelectChannel(ch);
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
              onToggleFavorite={handleToggleFavorite}
              favoriteIds={favoriteIds}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              showFavoritesOnly={showFavoritesOnly}
              onToggleFavoritesOnly={() => setShowFavoritesOnly(!showFavoritesOnly)}
            />
          </div>

          {/* Backdrop pour mobile lorsque le drawer est ouvert */}
          {isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-10 lg:hidden backdrop-blur-xs"
            />
          )}

          {/* Zone Droite : Lecteur TV */}
          <main className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4">
            {/* Bouton de repli pour la colonne sur desktop */}
            <div className="hidden lg:flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white bg-gray-900/60 hover:bg-gray-800 border border-gray-800 transition"
                title={isSidebarOpen ? 'Replier la liste des chaînes' : 'Afficher la liste des chaînes'}
              >
                {isSidebarOpen ? (
                  <>
                    <PanelLeftClose className="w-4 h-4" />
                    <span>Replier le panneau</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="w-4 h-4" />
                    <span>Afficher les chaînes</span>
                  </>
                )}
              </button>

              {selectedChannel && (
                <span className="text-xs text-gray-400 font-medium">
                  Lecture en cours : <strong className="text-gray-200">{selectedChannel.name}</strong>
                </span>
              )}
            </div>

            {/* Lecteur Vidéo */}
            <div className="w-full max-w-6xl mx-auto">
              <VideoPlayer
                channel={selectedChannel}
                initialVolume={user?.preferences?.volume ?? 80}
                initialMuted={user?.preferences?.muted ?? false}
                onVolumeChange={handleVolumeChange}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={selectedChannel ? favoriteIds.includes(selectedChannel.id) : false}
              />
            </div>

            {/* Fiche descriptive de la chaîne active */}
            {selectedChannel && (
              <div className="w-full max-w-6xl mx-auto bg-[#11192b] border border-gray-800 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedChannel.logoUrl ? (
                    <img
                      src={selectedChannel.logoUrl}
                      alt={selectedChannel.name}
                      className="w-12 h-12 object-contain bg-gray-900 rounded-lg p-1 border border-gray-800 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-blue-600/30 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                      {selectedChannel.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{selectedChannel.name}</h3>
                      {selectedChannel.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 font-semibold">
                          {selectedChannel.category.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                      {selectedChannel.description || 'Flux direct haute définition retransmis sans interruption.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400 shrink-0">
                  {selectedChannel.language && (
                    <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-lg">
                      {selectedChannel.language}
                    </span>
                  )}
                  {selectedChannel.country && (
                    <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-lg">
                      {selectedChannel.country}
                    </span>
                  )}
                  <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 rounded-lg font-mono font-bold text-xs">
                    DIRECT LIVE
                  </span>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Lecteur Modal VOD grand écran */}
      {activePlayingVod && (
        <VodPlayerModal
          item={activePlayingVod}
          onClose={() => setActivePlayingVod(null)}
        />
      )}

      {/* Modal d'Administration Back-Office */}
      {user?.role === 'ADMIN' && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          categories={categories}
          onRefreshData={() => {
            loadCatalog();
            loadVod();
          }}
        />
      )}
    </div>
  );
};
