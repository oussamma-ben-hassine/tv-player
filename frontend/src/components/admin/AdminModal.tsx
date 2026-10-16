import React, { useEffect, useState } from 'react';
import {
  X,
  LayoutDashboard,
  Tv,
  Radio,
  FolderTree,
  Plus,
  Trash2,
  Edit,
  Power,
  RotateCw,
  Upload,
  CheckCircle,
  AlertTriangle,
  Play,
  FileText,
  Server,
} from 'lucide-react';
import { Channel, Category, AdminStats } from '../../types';
import { api } from '../../services/api';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onRefreshData: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'channels' | 'sources' | 'categories'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formulaire d'ajout / édition de chaîne
  const [editingChannel, setEditingChannel] = useState<Partial<Channel> | null>(null);
  const [isChannelFormOpen, setIsChannelFormOpen] = useState<boolean>(false);

  // Formulaire d'import M3U
  const [m3uUrl, setM3uUrl] = useState<string>('');
  const [m3uContent, setM3uContent] = useState<string>('');
  const [m3uSourceName, setM3uSourceName] = useState<string>('Playlist M3U Importée');
  const [m3uPreview, setM3uPreview] = useState<any | null>(null);
  const [selectedM3uIndices, setSelectedM3uIndices] = useState<number[]>([]);

  // Formulaire catégorie
  const [newCatName, setNewCatName] = useState<string>('');

  // Formulaire IPTV Server
  const [iptvServerUrl, setIptvServerUrl] = useState<string>('https://iptv.oussamma.tn/api/v1/channels');
  const [iptvSourceName, setIptvSourceName] = useState<string>('Serveur IPTV Principal');
  const [iptvAuthMethod, setIptvAuthMethod] = useState<'NONE' | 'TOKEN' | 'BASIC' | 'XTREAM'>('NONE');
  const [iptvApiToken, setIptvApiToken] = useState<string>('');
  const [iptvUsername, setIptvUsername] = useState<string>('');
  const [iptvPassword, setIptvPassword] = useState<string>('');
  const [iptvAutoSync, setIptvAutoSync] = useState<boolean>(true);
  const [iptvTesting, setIptvTesting] = useState<boolean>(false);
  const [iptvSyncing, setIptvSyncing] = useState<boolean>(false);
  const [iptvTestResult, setIptvTestResult] = useState<{
    success: boolean;
    detectedChannels?: number;
    httpStatus?: number;
    responseTimeMs?: number;
    sample?: any[];
    error?: string;
  } | null>(null);
  const [existingSources, setExistingSources] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      loadChannels();
      loadSources();
    }
  }, [isOpen]);

  const loadSources = async () => {
    try {
      const list = await api.adminListSources();
      setExistingSources(list);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getAdminDashboard();
      setStats(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadChannels = async () => {
    try {
      const list = await api.adminListChannels();
      setChannels(list);
    } catch (err: any) {
      console.error(err);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggleChannel = async (id: string) => {
    try {
      await api.adminToggleChannel(id);
      loadChannels();
      loadStats();
      onRefreshData();
      showFeedback('success', 'Statut de la chaîne mis à jour.');
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette chaîne ?')) return;
    try {
      await api.adminDeleteChannel(id);
      loadChannels();
      loadStats();
      onRefreshData();
      showFeedback('success', 'Chaîne supprimée.');
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel?.name || !editingChannel?.streamUrl) {
      showFeedback('error', 'Le nom et l\'URL du flux sont obligatoires.');
      return;
    }

    try {
      if (editingChannel.id) {
        await api.adminUpdateChannel(editingChannel.id, editingChannel);
        showFeedback('success', 'Chaîne mise à jour avec succès.');
      } else {
        await api.adminCreateChannel(editingChannel);
        showFeedback('success', 'Chaîne ajoutée avec succès.');
      }
      setIsChannelFormOpen(false);
      setEditingChannel(null);
      loadChannels();
      loadStats();
      onRefreshData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handlePreviewM3u = async () => {
    if (!m3uUrl && !m3uContent) {
      showFeedback('error', 'Veuillez saisir une URL ou coller le contenu M3U.');
      return;
    }
    setLoading(true);
    try {
      const preview = await api.adminPreviewM3u({ url: m3uUrl || undefined, content: m3uContent || undefined });
      setM3uPreview(preview);
      // Sélectionner tout par défaut
      setSelectedM3uIndices(preview.allChannels.map((_: any, idx: number) => idx));
      showFeedback('success', `${preview.totalChannels} chaînes détectées dans la playlist.`);
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportM3u = async () => {
    if (!m3uPreview || selectedM3uIndices.length === 0) return;
    setLoading(true);
    try {
      const channelsToImport = selectedM3uIndices.map((idx) => m3uPreview.allChannels[idx]);
      const res: any = await api.adminImportM3u({
        sourceName: m3uSourceName,
        sourceUrl: m3uUrl || undefined,
        channels: channelsToImport,
      });
      showFeedback('success', `Import réussi : ${res.added} ajoutées, ${res.updated} mises à jour.`);
      setM3uPreview(null);
      setM3uContent('');
      setM3uUrl('');
      loadChannels();
      loadStats();
      onRefreshData();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestIptvConnection = async () => {
    if (!iptvServerUrl) {
      showFeedback('error', 'Veuillez renseigner l\'URL du serveur IPTV.');
      return;
    }
    setIptvTesting(true);
    setIptvTestResult(null);
    try {
      const res = await api.adminTestIptv({
        url: iptvServerUrl,
        authMethod: iptvAuthMethod,
        apiToken: iptvApiToken || undefined,
        username: iptvUsername || undefined,
        password: iptvPassword || undefined,
      });
      setIptvTestResult(res);
      if (res.success) {
        showFeedback('success', `Connexion réussie : ${res.detectedChannels} chaînes détectées (${res.responseTimeMs}ms)`);
      } else {
        showFeedback('error', `Échec de connexion : ${res.error || 'Erreur HTTP ' + res.httpStatus}`);
      }
    } catch (err: any) {
      setIptvTestResult({ success: false, error: err.message });
      showFeedback('error', err.message);
    } finally {
      setIptvTesting(false);
    }
  };

  const handleSaveAndSyncIptv = async () => {
    if (!iptvServerUrl || !iptvSourceName) {
      showFeedback('error', 'Nom et URL de la source requis.');
      return;
    }
    setIptvSyncing(true);
    try {
      const createdSource: any = await api.adminCreateSource({
        name: iptvSourceName,
        type: 'IPTV_SERVER',
        url: iptvServerUrl,
        autoSync: iptvAutoSync,
        syncIntervalHours: 24,
        config: {
          authMethod: iptvAuthMethod,
          apiToken: iptvApiToken || undefined,
          username: iptvUsername || undefined,
          password: iptvPassword || undefined,
        },
      });

      const syncRes = await api.adminSyncIptv(createdSource.id);
      if (syncRes.success) {
        showFeedback('success', `Serveur IPTV configuré et ${syncRes.syncedCount || 0} chaînes synchronisées !`);
      } else {
        showFeedback('error', `Source créée mais erreur de synchronisation : ${syncRes.error}`);
      }

      loadSources();
      loadChannels();
      loadStats();
      onRefreshData();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIptvSyncing(false);
    }
  };

  const handleSyncSourceNow = async (sourceId: string) => {
    try {
      showFeedback('success', 'Synchronisation en cours...');
      const res = await api.adminSyncIptv(sourceId);
      if (res.success) {
        showFeedback('success', `Synchronisation terminée : ${res.syncedCount || 0} chaînes mises à jour.`);
      } else {
        showFeedback('error', `Erreur de synchronisation : ${res.error}`);
      }
      loadSources();
      loadChannels();
      loadStats();
      onRefreshData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!window.confirm('Supprimer cette source ? Les chaînes associées seront également retirées.')) return;
    try {
      await api.adminDeleteSource(sourceId);
      showFeedback('success', 'Source supprimée.');
      loadSources();
      loadChannels();
      loadStats();
      onRefreshData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.adminCreateCategory({ name: newCatName.trim() });
      setNewCatName('');
      loadStats();
      onRefreshData();
      showFeedback('success', 'Catégorie créée.');
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Supprimer cette catégorie ? Les chaînes associées ne seront pas supprimées.')) return;
    try {
      await api.adminDeleteCategory(id);
      loadStats();
      onRefreshData();
      showFeedback('success', 'Catégorie supprimée.');
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-gray-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* En-tête du modal */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-[#111c33]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Back-Office Administrateur</h2>
              <p className="text-xs text-gray-400">Gestion des flux, playlists M3U, catégories et droits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message de notification */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-green-600/20 text-green-400 border-b border-green-600/30'
                : 'bg-red-600/20 text-red-400 border-b border-red-600/30'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Barre d'onglets */}
        <div className="flex border-b border-gray-800 bg-[#0d1424] px-6 gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition ${
              activeTab === 'channels'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Chaînes ({channels.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition ${
              activeTab === 'sources'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Sources & M3U</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition ${
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Catégories</span>
          </button>
        </div>

        {/* Corps principal défilant */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#090e1a]">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Grille de cartes statistiques */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#131d31] border border-gray-800">
                  <span className="text-xs text-gray-400 font-medium">Total Chaînes</span>
                  <div className="text-2xl font-bold text-white mt-1">{stats.totalChannels}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#131d31] border border-gray-800">
                  <span className="text-xs text-gray-400 font-medium">Chaînes Actives</span>
                  <div className="text-2xl font-bold text-green-400 mt-1">{stats.activeChannels}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#131d31] border border-gray-800">
                  <span className="text-xs text-gray-400 font-medium">Catégories</span>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{stats.totalCategories}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#131d31] border border-gray-800">
                  <span className="text-xs text-gray-400 font-medium">Sources Connectées</span>
                  <div className="text-2xl font-bold text-purple-400 mt-1">{stats.totalSources}</div>
                </div>
              </div>

              {/* Répartition par catégorie */}
              <div className="p-5 rounded-xl bg-[#131d31] border border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-gray-200">Répartition par catégorie</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {stats.categoryDistribution.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 bg-gray-900/60 rounded-lg border border-gray-800/80 flex items-center justify-between"
                    >
                      <span className="text-xs text-gray-300 font-medium">{cat.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold">
                        {cat.channelCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Erreurs de lecture récentes */}
              <div className="p-5 rounded-xl bg-[#131d31] border border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Erreurs de lecture récentes</span>
                </h3>
                {stats.recentErrors.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Aucune erreur de lecture signalée.</p>
                ) : (
                  <div className="space-y-2">
                    {stats.recentErrors.map((err) => (
                      <div
                        key={err.id}
                        className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/30 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-red-400">{err.channelName}</span>
                          <span className="text-gray-400 ml-2">{err.errorMessage}</span>
                        </div>
                        <span className="text-gray-500 font-mono text-[10px]">
                          {new Date(err.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GESTION DES CHAÎNES */}
          {activeTab === 'channels' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-200">Liste des chaînes TV</h3>
                <button
                  onClick={() => {
                    setEditingChannel({
                      name: '',
                      streamUrl: '',
                      streamType: 'HLS',
                      active: true,
                      isPublic: true,
                      minRole: 'USER',
                    });
                    setIsChannelFormOpen(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter une chaîne</span>
                </button>
              </div>

              {/* Formulaire modal interne pour ajouter/éditer */}
              {isChannelFormOpen && editingChannel && (
                <form
                  onSubmit={handleSaveChannel}
                  className="p-4 bg-[#141e33] border border-blue-500/40 rounded-xl space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    {editingChannel.id ? 'Modifier la chaîne' : 'Nouvelle chaîne TV'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 font-medium">Nom de la chaîne *</label>
                      <input
                        type="text"
                        required
                        value={editingChannel.name || ''}
                        onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                        placeholder="Ex: France 24"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-medium">URL du flux HLS (.m3u8) *</label>
                      <input
                        type="url"
                        required
                        value={editingChannel.streamUrl || ''}
                        onChange={(e) => setEditingChannel({ ...editingChannel, streamUrl: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                        placeholder="https://.../playlist.m3u8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-medium">URL du Logo (optionnel)</label>
                      <input
                        type="url"
                        value={editingChannel.logoUrl || ''}
                        onChange={(e) => setEditingChannel({ ...editingChannel, logoUrl: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                        placeholder="https://.../logo.png"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-medium">Catégorie</label>
                      <select
                        value={editingChannel.categoryId || ''}
                        onChange={(e) => setEditingChannel({ ...editingChannel, categoryId: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                      >
                        <option value="">-- Sans catégorie --</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-medium">Identifiant EPG (tvg-id)</label>
                      <input
                        type="text"
                        value={editingChannel.epgId || ''}
                        onChange={(e) => setEditingChannel({ ...editingChannel, epgId: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                        placeholder="Ex: france24.fr"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-medium">Restriction d'accès</label>
                      <select
                        value={editingChannel.minRole || 'USER'}
                        onChange={(e) => setEditingChannel({ ...editingChannel, minRole: e.target.value as any })}
                        className="w-full mt-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                      >
                        <option value="USER">Tous les utilisateurs authentifiés</option>
                        <option value="ADMIN">Réservé aux Administrateurs</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsChannelFormOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              )}

              {/* Tableau des chaînes */}
              <div className="bg-[#11192b] border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#162138] text-gray-400 uppercase font-mono border-b border-gray-800">
                    <tr>
                      <th className="p-3">Chaîne</th>
                      <th className="p-3 hidden sm:table-cell">Catégorie</th>
                      <th className="p-3 hidden md:table-cell">Flux</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {channels.map((ch) => (
                      <tr key={ch.id} className="hover:bg-gray-800/30 transition">
                        <td className="p-3 flex items-center gap-2.5">
                          {ch.logoUrl ? (
                            <img
                              src={ch.logoUrl}
                              alt={ch.name}
                              className="w-7 h-7 object-contain bg-gray-900 rounded p-0.5 border border-gray-800"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded bg-blue-600/30 flex items-center justify-center text-[10px] font-bold text-blue-400">
                              {ch.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold text-gray-100">{ch.name}</span>
                        </td>
                        <td className="p-3 hidden sm:table-cell text-gray-400">
                          {ch.category?.name || 'Généraliste'}
                        </td>
                        <td className="p-3 hidden md:table-cell text-gray-400 truncate max-w-xs font-mono text-[11px]">
                          {ch.streamUrl}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleChannel(ch.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                              ch.active
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {ch.active ? 'Actif' : 'Inactif'}
                          </button>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingChannel(ch);
                              setIsChannelFormOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-400 rounded transition"
                            title="Modifier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteChannel(ch.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 rounded transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SOURCES & M3U */}
          {activeTab === 'sources' && (
            <div className="space-y-6">
              {/* Import Playlist M3U */}
              <div className="p-5 rounded-xl bg-[#131d31] border border-gray-800 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>Importer une Playlist M3U / M3U8</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-medium">Nom de la source</label>
                    <input
                      type="text"
                      value={m3uSourceName}
                      onChange={(e) => setM3uSourceName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                      placeholder="Ex: Chaînes TNT / Bouquet M3U"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium">URL de la playlist M3U</label>
                    <input
                      type="url"
                      value={m3uUrl}
                      onChange={(e) => setM3uUrl(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                      placeholder="https://fournisseur.com/playlist.m3u"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium">
                    Ou coller le contenu M3U brut (#EXTM3U)
                  </label>
                  <textarea
                    rows={4}
                    value={m3uContent}
                    onChange={(e) => setM3uContent(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono text-white"
                    placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-id=&quot;tf1&quot; group-title=&quot;Généraliste&quot;,TF1&#10;https://.../stream.m3u8"
                  />
                </div>

                <button
                  onClick={handlePreviewM3u}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>{loading ? 'Analyse...' : 'Prévisualiser les chaînes'}</span>
                </button>

                {/* Prévisualisation M3U */}
                {m3uPreview && (
                  <div className="pt-4 border-t border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-300">
                        {m3uPreview.totalChannels} chaînes détectées — {selectedM3uIndices.length} sélectionnées
                      </span>
                      <button
                        onClick={handleImportM3u}
                        disabled={loading || selectedM3uIndices.length === 0}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Valider et Importer dans le catalogue
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto bg-gray-900/80 rounded-lg border border-gray-800 divide-y divide-gray-800 text-xs">
                      {m3uPreview.allChannels.map((c: any, index: number) => {
                        const isChecked = selectedM3uIndices.includes(index);
                        return (
                          <div key={index} className="p-2 flex items-center gap-3 hover:bg-gray-800/40">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedM3uIndices(selectedM3uIndices.filter((i) => i !== index));
                                } else {
                                  setSelectedM3uIndices([...selectedM3uIndices, index]);
                                }
                              }}
                              className="rounded accent-blue-600"
                            />
                            <span className="font-semibold text-gray-200">{c.name}</span>
                            <span className="text-gray-400">({c.categoryName || 'Généraliste'})</span>
                            <span className="text-gray-500 font-mono text-[10px] truncate max-w-xs ml-auto">
                              {c.streamUrl}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Connecteur IPTV Server */}
              <div className="p-5 rounded-xl bg-[#131d31] border border-gray-800 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                    <Server className="w-4 h-4 text-purple-400" />
                    <span>Connecteur IPTV Server (Optionnel)</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Source C Découplée
                  </span>
                </div>

                <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl text-xs text-purple-200 leading-relaxed">
                  💡 <strong>Architecture résiliente :</strong> La connexion à un serveur IPTV externe est 100% optionnelle et asynchrone. Si le serveur IPTV est indisponible ou hors ligne, vos autres flux (M3U, ajout manuel, seed légal) continuent de fonctionner sans aucune interruption.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-medium">Nom du connecteur</label>
                    <input
                      type="text"
                      value={iptvSourceName}
                      onChange={(e) => setIptvSourceName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                      placeholder="Ex: IPTV Server VPS / Bouquet Privé"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium">URL de l'API / Catalogue IPTV</label>
                    <input
                      type="url"
                      value={iptvServerUrl}
                      onChange={(e) => setIptvServerUrl(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                      placeholder="https://iptv.example.com/api/v1/channels"
                    />
                  </div>
                </div>

                {/* Méthode d'authentification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-medium">Méthode d'authentification</label>
                    <select
                      value={iptvAuthMethod}
                      onChange={(e: any) => setIptvAuthMethod(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="NONE">Aucune (API publique / Flux direct)</option>
                      <option value="TOKEN">Jeton Bearer / Clé API</option>
                      <option value="BASIC">Authentification HTTP Basic</option>
                      <option value="XTREAM">Xtream Codes API (player_api.php)</option>
                    </select>
                  </div>

                  {iptvAuthMethod === 'TOKEN' && (
                    <div>
                      <label className="text-xs text-gray-400 font-medium">Jeton d'accès (Bearer Token)</label>
                      <input
                        type="password"
                        value={iptvApiToken}
                        onChange={(e) => setIptvApiToken(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                        placeholder="eyJhbGciOi..."
                      />
                    </div>
                  )}

                  {(iptvAuthMethod === 'BASIC' || iptvAuthMethod === 'XTREAM') && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400 font-medium">Utilisateur</label>
                        <input
                          type="text"
                          value={iptvUsername}
                          onChange={(e) => setIptvUsername(e.target.value)}
                          className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                          placeholder="Nom d'utilisateur"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-medium">Mot de passe</label>
                        <input
                          type="password"
                          value={iptvPassword}
                          onChange={(e) => setIptvPassword(e.target.value)}
                          className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                          placeholder="Mot de passe"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="iptv-autosync"
                    checked={iptvAutoSync}
                    onChange={(e) => setIptvAutoSync(e.target.checked)}
                    className="rounded accent-purple-600"
                  />
                  <label htmlFor="iptv-autosync" className="text-xs text-gray-300">
                    Synchronisation automatique quotidienne (intervalle 24h)
                  </label>
                </div>

                {/* Boutons d'action */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestIptvConnection}
                    disabled={iptvTesting || iptvSyncing}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {iptvTesting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span>Test en cours...</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5 text-purple-400" />
                        <span>Tester la connexion & Prévisualiser</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndSyncIptv}
                    disabled={iptvSyncing || iptvTesting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-purple-600/20"
                  >
                    {iptvSyncing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Synchronisation en cours...</span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Enregistrer et Synchroniser le catalogue</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Résultat du test */}
                {iptvTestResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      iptvTestResult.success
                        ? 'bg-green-950/40 border-green-800/60 text-green-200'
                        : 'bg-red-950/40 border-red-800/60 text-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {iptvTestResult.success ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                      <span>
                        {iptvTestResult.success
                          ? `Connexion établie (HTTP ${iptvTestResult.httpStatus || 200} en ${iptvTestResult.responseTimeMs || 0}ms)`
                          : `Échec du test de connexion`}
                      </span>
                    </div>

                    {iptvTestResult.success ? (
                      <p className="text-gray-300">
                        <strong>{iptvTestResult.detectedChannels || 0}</strong> chaînes détectées et prêtes à être importées dans le catalogue.
                      </p>
                    ) : (
                      <p className="text-red-300">
                        {iptvTestResult.error || 'Impossible de joindre le serveur IPTV distant.'}
                      </p>
                    )}

                    {iptvTestResult.sample && iptvTestResult.sample.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-800/80 space-y-1">
                        <span className="font-semibold text-[11px] text-gray-400">Exemple de chaînes détectées :</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                          {iptvTestResult.sample.slice(0, 4).map((s: any, idx: number) => (
                            <div key={idx} className="p-1.5 bg-gray-900/60 rounded border border-gray-800 flex items-center justify-between truncate">
                              <span className="font-medium text-gray-200 truncate">{s.name}</span>
                              <span className="text-[10px] text-gray-500 ml-2">{s.category || 'Direct'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sources IPTV déjà configurées */}
                <div className="pt-3 border-t border-gray-800 space-y-3">
                  <h4 className="text-xs font-bold text-gray-300">Sources IPTV Server configurées</h4>
                  {existingSources.filter((s: any) => s.type === 'IPTV_SERVER').length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Aucun serveur IPTV configuré pour le moment.</p>
                  ) : (
                    <div className="space-y-2">
                      {existingSources
                        .filter((s: any) => s.type === 'IPTV_SERVER')
                        .map((s: any) => (
                          <div
                            key={s.id}
                            className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-200">{s.name}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    s.lastSyncStatus === 'SUCCESS'
                                      ? 'bg-green-500/20 text-green-400'
                                      : s.lastSyncStatus === 'FAILED'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-gray-800 text-gray-400'
                                  }`}
                                >
                                  {s.lastSyncStatus || 'NON SYNCHRO'}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 truncate max-w-sm font-mono">{s.url}</p>
                              <div className="text-[10px] text-gray-500 flex gap-3">
                                <span>{s._count?.channels || 0} chaînes liées</span>
                                {s.lastSyncAt && <span>Synchro: {new Date(s.lastSyncAt).toLocaleString('fr-FR')}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSyncSourceNow(s.id)}
                                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs flex items-center gap-1 transition"
                                title="Synchroniser maintenant"
                              >
                                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                                <span>Synchroniser</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSource(s.id)}
                                className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg transition"
                                title="Supprimer la source"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CATÉGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nom de la nouvelle catégorie..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 bg-[#131d31] border border-gray-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <span className="text-sm font-semibold text-gray-200">{cat.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({cat.channelCount} chaînes)</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 rounded transition"
                      title="Supprimer la catégorie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
