import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  RotateCcw,
  AlertCircle,
  Radio,
  Sliders,
  PictureInPicture,
} from 'lucide-react';
import { Channel } from '../../types';
import { api } from '../../services/api';

interface VideoPlayerProps {
  channel: Channel | null;
  initialVolume?: number;
  initialMuted?: boolean;
  onVolumeChange?: (volume: number, muted: boolean) => void;
  onToggleFavorite?: (channelId: string) => void;
  isFavorite?: boolean;
}

interface QualityLevel {
  id: number;
  label: string;
  height: number;
  bitrate: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  initialVolume = 80,
  initialMuted = false,
  onVolumeChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(initialVolume);
  const [isMuted, setIsMuted] = useState<boolean>(initialMuted);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<any>(null);

  // Gérer l'apparition et la disparition des commandes
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showQualityMenu) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Récupérer la session de streaming autorisée
  useEffect(() => {
    if (!channel) {
      setStreamUrl(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .createPlaybackSession(channel.id)
      .then((session) => {
        if (isMounted) {
          setStreamUrl(session.streamUrl);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setIsLoading(false);
          setError(err.message || 'Impossible d\'initialiser le flux');
          api.reportPlaybackError(channel.id, err.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [channel]);

  // Initialisation et gestion HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setError(null);
    setQualities([]);
    setCurrentQuality(-1);

    // Nettoyage de l'instance précédente
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        fragLoadingMaxRetry: 5,
        fragLoadingRetryDelay: 1000,
      });

      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        const levels: QualityLevel[] = data.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height,
          label: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`,
          bitrate: lvl.bitrate,
        }));
        setQualities(levels);

        video.play().catch(() => {
          // Si l'autoplay est bloqué par le navigateur, muter et réessayer
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(hls.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsLoading(false);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Erreur réseau lors de la récupération du flux vidéo.');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Erreur de décodage du flux vidéo.');
              hls.recoverMediaError();
              break;
            default:
              setError('Flux vidéo indisponible ou format incompatible.');
              hls.destroy();
              if (channel) {
                api.reportPlaybackError(channel.id, data.details, data.type);
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Fallback natif Safari / iOS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      });

      video.addEventListener('error', () => {
        setIsLoading(false);
        setError('Impossible de lire le flux avec le lecteur natif.');
      });
    } else {
      setIsLoading(false);
      setError('Votre navigateur ne prend pas en charge la lecture des flux HLS.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  // Synchronisation du volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Écoute des changements de plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onVolumeChange?.(volume, newMuted);
  };

  const handleVolumeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
    onVolumeChange?.(newVol, false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const handleQualitySelect = (qualityId: number) => {
    if (!hlsRef.current) return;
    if (qualityId === -1) {
      hlsRef.current.currentLevel = -1; // Auto
      setCurrentQuality(-1);
    } else {
      hlsRef.current.currentLevel = qualityId;
      setCurrentQuality(qualityId);
    }
    setShowQualityMenu(false);
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error', e);
    }
  };

  const handleRetry = () => {
    if (channel) {
      setError(null);
      setIsLoading(true);
      api
        .createPlaybackSession(channel.id)
        .then((s) => setStreamUrl(s.streamUrl))
        .catch((e) => {
          setIsLoading(false);
          setError(e.message);
        });
    }
  };

  if (!channel) {
    return (
      <div className="w-full aspect-video bg-[#0f172a] rounded-xl flex flex-col items-center justify-center p-6 text-center border border-gray-800 shadow-2xl">
        <Radio className="w-16 h-16 text-blue-500 mb-4 animate-pulse opacity-60" />
        <h3 className="text-xl font-semibold text-gray-200">Sélectionnez une chaîne</h3>
        <p className="text-sm text-gray-400 mt-2 max-w-sm">
          Choisissez une chaîne dans la liste à gauche pour lancer le streaming direct en haute définition.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group border border-gray-800 select-none"
    >
      {/* Balise vidéo principale */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      />

      {/* Spinner de chargement */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-gray-300">Connexion au flux direct...</p>
        </div>
      )}

      {/* Affichage des erreurs avec bouton de reconnexion */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center z-20">
          <AlertCircle className="w-14 h-14 text-red-500 mb-3" />
          <h4 className="text-lg font-semibold text-gray-100 mb-1">Erreur de lecture</h4>
          <p className="text-sm text-gray-400 max-w-md mb-5">{error}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-lg active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Reconnexion
          </button>
        </div>
      )}

      {/* Overlay supérieur : Logo, Nom de chaîne et Badge LIVE */}
      <div
        className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          {channel.logoUrl ? (
            <img
              src={channel.logoUrl}
              alt={channel.name}
              className="w-9 h-9 object-contain bg-gray-900/80 rounded-md p-1 border border-gray-700"
              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
            />
          ) : (
            <div className="w-9 h-9 rounded-md bg-blue-600/30 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
              {channel.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-white drop-shadow-md leading-tight">
              {channel.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span>{channel.category?.name || 'Généraliste'}</span>
              {channel.language && <span>• {channel.language}</span>}
            </div>
          </div>
        </div>

        {/* Badge LIVE */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold uppercase tracking-wider shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-live-pulse" />
            LIVE
          </div>
        </div>
      </div>

      {/* Overlay inférieur : Commandes du lecteur */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Gauche : Play/Pause & Volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 text-white hover:text-blue-400 rounded-lg hover:bg-white/10 transition"
              title={isPlaying ? 'Pause (Espace)' : 'Lecture (Espace)'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
            </button>

            {/* Contrôle du Volume */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={toggleMute}
                className="p-2 text-white hover:text-blue-400 rounded-lg hover:bg-white/10 transition"
                title={isMuted ? 'Activer le son' : 'Couper le son'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : volume < 50 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeSlider}
                className="w-16 sm:w-24 h-1.5 bg-gray-600 accent-blue-500 rounded-lg cursor-pointer"
                title={`Volume : ${isMuted ? 0 : volume}%`}
              />
              <span className="text-xs text-gray-300 w-7 text-right font-mono hidden sm:inline-block">
                {isMuted ? 0 : volume}%
              </span>
            </div>
          </div>

          {/* Droite : Qualité, PiP & Plein écran */}
          <div className="flex items-center gap-2">
            {/* Menu Qualité */}
            {qualities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-200 bg-white/10 hover:bg-white/20 transition"
                  title="Sélection de la qualité vidéo"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {currentQuality === -1
                      ? 'Auto'
                      : qualities.find((q) => q.id === currentQuality)?.label || 'Qualité'}
                  </span>
                </button>

                {showQualityMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-32 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl overflow-hidden z-30 py-1 text-xs">
                    <button
                      onClick={() => handleQualitySelect(-1)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-600/30 transition ${
                        currentQuality === -1 ? 'text-blue-400 font-bold bg-blue-600/20' : 'text-gray-300'
                      }`}
                    >
                      <span>Auto</span>
                      {currentQuality === -1 && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    </button>
                    {qualities.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleQualitySelect(q.id)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-600/30 transition ${
                          currentQuality === q.id ? 'text-blue-400 font-bold bg-blue-600/20' : 'text-gray-300'
                        }`}
                      >
                        <span>{q.label}</span>
                        {currentQuality === q.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PiP */}
            <button
              onClick={togglePip}
              className="p-2 text-white hover:text-blue-400 rounded-lg hover:bg-white/10 transition hidden sm:inline-block"
              title="Image dans l'image (PiP)"
            >
              <PictureInPicture className="w-5 h-5" />
            </button>

            {/* Plein écran */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:text-blue-400 rounded-lg hover:bg-white/10 transition"
              title={isFullscreen ? 'Quitter le plein écran (F)' : 'Plein écran (F)'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
