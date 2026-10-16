import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Star,
  Film,
  Calendar,
  Clock,
} from 'lucide-react';
import { VodItem } from '../../types';

interface VodPlayerModalProps {
  item: VodItem | null;
  onClose: () => void;
}

export const VodPlayerModal: React.FC<VodPlayerModalProps> = ({ item, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'ArrowRight') seekRelative(10);
      if (e.key === 'ArrowLeft') seekRelative(-10);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val / 100;
      if (val === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl bg-[#0f172a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Lecteur Vidéo */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          className="relative aspect-video w-full bg-black flex items-center justify-center select-none overflow-hidden group"
        >
          <video
            ref={videoRef}
            src={item.streamUrl}
            autoPlay
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
                setIsLoading(false);
              }
            }}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
          />

          {/* Loader */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg" />
            </div>
          )}

          {/* Bouton Fermer flottant en haut à droite */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Titre flottant en haut à gauche */}
          <div
            className={`absolute top-4 left-4 z-30 flex items-center gap-2.5 transition duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span className="px-2 py-0.5 rounded bg-blue-600 text-[10px] font-bold text-white uppercase tracking-wider">
              {item.type}
            </span>
            <span className="text-sm font-bold text-white drop-shadow-md">{item.title}</span>
          </div>

          {/* Contrôles superposés en bas */}
          <div
            className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 space-y-2 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Barre de progression (Timeline seek) */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeekChange}
                className="w-full h-1.5 bg-gray-700/80 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
              />
            </div>

            {/* Rangée de boutons */}
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="p-1.5 hover:text-blue-400 transition" title="Lecture / Pause">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                </button>
                <button onClick={() => seekRelative(-10)} className="p-1.5 hover:text-blue-400 transition" title="Reculer de 10s">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => seekRelative(10)} className="p-1.5 hover:text-blue-400 transition" title="Avancer de 10s">
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Temps écoulé / total */}
                <span className="text-[11px] font-mono text-gray-300 ml-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Volume */}
                <div className="flex items-center gap-2 group/vol">
                  <button onClick={toggleMute} className="p-1.5 hover:text-blue-400 transition">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Plein écran */}
                <button onClick={toggleFullscreen} className="p-1.5 hover:text-blue-400 transition" title="Plein écran">
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fiche d'information du film / de la série sous le lecteur */}
        <div className="p-4 sm:p-6 bg-[#0f172a] space-y-3 overflow-y-auto max-h-48 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                {item.rating && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1 border border-amber-500/30">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{item.rating}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-400 font-medium">{item.genre}</p>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              {item.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.year}</span>
                </span>
              )}
              {item.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.duration}</span>
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-gray-800 font-mono text-[11px] text-gray-300">
                {item.streamType}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            {item.overview || 'Aucune description disponible pour ce programme.'}
          </p>
        </div>
      </div>
    </div>
  );
};
