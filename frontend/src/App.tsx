import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Channel, Category, User } from './types';
import { api } from './services/api';
import { Header } from './components/layout/Header';
import { VideoPlayer } from './components/player/VideoPlayer';
import { ChannelList } from './components/channels/ChannelList';
import { EpgCard } from './components/epg/EpgCard';
import { AdminModal } from './components/admin/AdminModal';
import { Tv, ShieldCheck, Zap, Lock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

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
                Plateforme de streaming TV direct, haute fidélité HLS et guide des programmes pour l'écosystème oussamma.tn.
              </p>
            </div>

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
    <div className="min-h-screen bg-[#0b0f19] flex flex-col overflow-hidden">
      {/* Barre supérieure */}
      <Header
        user={user}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Contenu principal : Bureau & Mobile */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Colonne Gauche : Liste des Chaînes (Desktop & Drawer Mobile) */}
        <div
          className={`fixed inset-y-14 left-0 z-20 w-80 max-w-[85vw] transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
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

        {/* Zone Droite : Lecteur TV & EPG */}
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

          {/* Guide des Programmes (EPG) & Métadonnées */}
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <EpgCard channel={selectedChannel} />
            </div>

            {/* Fiche descriptive de la chaîne */}
            {selectedChannel && (
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-lg space-y-2">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                  À propos de la chaîne
                </span>
                <h3 className="text-sm font-bold text-white">{selectedChannel.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {selectedChannel.description ||
                    'Flux direct haute définition retransmis sans interruption.'}
                </p>
                <div className="pt-2 border-t border-gray-800 flex flex-wrap gap-2 text-[11px] text-gray-400">
                  <span className="px-2 py-0.5 bg-gray-800 rounded">Format: HLS</span>
                  {selectedChannel.language && (
                    <span className="px-2 py-0.5 bg-gray-800 rounded">
                      Langue: {selectedChannel.language}
                    </span>
                  )}
                  {selectedChannel.country && (
                    <span className="px-2 py-0.5 bg-gray-800 rounded">
                      Pays: {selectedChannel.country}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal d'Administration Back-Office */}
      {user?.role === 'ADMIN' && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          categories={categories}
          onRefreshData={loadCatalog}
        />
      )}
    </div>
  );
};
