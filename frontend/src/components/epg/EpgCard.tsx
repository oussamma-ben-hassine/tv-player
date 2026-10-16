import React, { useEffect, useState } from 'react';
import { ChannelEpgResponse, Channel } from '../../types';
import { api } from '../../services/api';
import { Clock, Calendar, ChevronRight } from 'lucide-react';

interface EpgCardProps {
  channel: Channel | null;
}

export const EpgCard: React.FC<EpgCardProps> = ({ channel }) => {
  const [epgData, setEpgData] = useState<ChannelEpgResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!channel) {
      setEpgData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api
      .getEpg(channel.id)
      .then((data) => {
        if (isMounted) {
          setEpgData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    // Rafraîchir toutes les 2 minutes pour actualiser la progression
    const interval = setInterval(() => {
      if (channel) {
        api.getEpg(channel.id).then((d) => isMounted && setEpgData(d));
      }
    }, 120000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [channel]);

  if (!channel || !epgData) return null;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const current = epgData.current;
  const next = epgData.next;

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5" />
          <span>Guide des programmes (EPG)</span>
        </div>
        {current && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>
              {formatTime(current.startTime)} - {formatTime(current.endTime)}
            </span>
          </div>
        )}
      </div>

      {/* Programme en cours */}
      {current ? (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full inline-block mb-1">
                En cours
              </span>
              <h3 className="text-sm font-bold text-gray-100">{current.title}</h3>
              {current.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                  {current.description}
                </p>
              )}
            </div>
            <span className="text-xs font-mono text-blue-400 whitespace-nowrap font-medium">
              {current.progressPercent}%
            </span>
          </div>

          {/* Barre de progression */}
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${current.progressPercent}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">Informations de programme non disponibles.</p>
      )}

      {/* Programme suivant */}
      {next && (
        <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              À suivre
            </span>
            <span className="text-gray-300 font-medium truncate">{next.title}</span>
          </div>
          <span className="text-gray-500 font-mono whitespace-nowrap pl-2">
            {formatTime(next.startTime)}
          </span>
        </div>
      )}
    </div>
  );
};
