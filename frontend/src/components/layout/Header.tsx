import React from 'react';
import { Tv, Film, Shield, LogOut, Menu, User as UserIcon } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  user: User | null;
  onOpenAdmin: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  activeSection: 'live' | 'vod';
  onSectionChange: (section: 'live' | 'vod') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenAdmin,
  onToggleSidebar,
  activeSection,
  onSectionChange,
}) => {
  return (
    <header className="h-14 bg-[#0d1322] border-b border-gray-800/80 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0">
      {/* Gauche : Logo et Menu mobile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {activeSection === 'live' && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition lg:hidden"
            title="Menu des chaînes"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Tv className="w-4 h-4" />
          </div>
          <div className="hidden xs:block">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
              <span>TV</span>
              <span className="text-blue-500">PLAYER</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Centre : Commutateur Direct TV / VOD */}
      <div className="flex items-center gap-1 p-1 bg-gray-900/90 rounded-xl border border-gray-800">
        <button
          onClick={() => onSectionChange('live')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSection === 'live'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Direct TV</span>
        </button>
        <button
          onClick={() => onSectionChange('vod')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSection === 'vod'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Films & Séries</span>
        </button>
      </div>

      {/* Droite : Profil & Administration */}
      <div className="flex items-center gap-2 sm:gap-3">
        {user?.role === 'ADMIN' && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-semibold transition"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Administration</span>
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-gray-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 text-xs font-bold">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium text-gray-200 hidden md:inline truncate max-w-[120px]">
              {user.name}
            </span>
            <a
              href="/auth/logout"
              className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800/80 transition"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <a
            href="/auth/login"
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-md"
          >
            Connexion SSO
          </a>
        )}
      </div>
    </header>
  );
};
