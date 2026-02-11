/**
 * UserProfileModal - Modal para editar perfil de usuario
 * Permite cambiar nombre, foto de perfil y ver información básica
 */

import React, { useState, useRef } from 'react';
import { X, Camera, User, Mail, Calendar, Trophy, Save, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useDebateHistoryStore } from '../../store/debateHistoryStore';

interface UserProfileModalProps {
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const { user, logout } = useAuthStore();
  const { debates } = useDebateHistoryStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    setIsEditing(false);
    // Aquí se actualizaría el usuario en el store
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const wins = debates.filter(d => d.winner !== 'draw').length;
  const totalDebates = debates.length;
  const winRate = totalDebates > 0 ? Math.round((wins / totalDebates) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-[#00E5FF] to-[#FF6B00]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div className="absolute -bottom-12 left-6">
            <button
              onClick={handleAvatarClick}
              className={`relative w-24 h-24 rounded-full border-4 border-slate-800 overflow-hidden ${
                isEditing ? 'cursor-pointer hover:opacity-80' : ''
              }`}
            >
              {avatar ? (
                <img 
                  src={avatar} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#00E5FF] to-[#FF6B00] flex items-center justify-center text-white text-3xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
              
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 px-6 pb-6">
          {/* User Info */}
          <div className="mb-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#4A5568]"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white">{user?.name || 'Usuario'}</h2>
                <p className="text-slate-400 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalDebates}</p>
              <p className="text-xs text-slate-400">Debates</p>
            </div>
            
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <Trophy className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{wins}</p>
              <p className="text-xs text-slate-400">Victorias</p>
            </div>
            
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <Trophy className="w-5 h-5 text-[#00E5FF] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{winRate}%</p>
              <p className="text-xs text-slate-400">Win Rate</p>
            </div>
          </div>

          {/* Member Since */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <Calendar className="w-4 h-4" />
            <span>Miembro desde {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(user?.name || '');
                    setAvatar(user?.avatar || '');
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40 text-white rounded-lg hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50 transition-all border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.4)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40 text-white rounded-lg hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50 disabled:opacity-50 flex items-center justify-center gap-2 border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.4)]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 px-4 py-2 bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40 text-white rounded-lg hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50 transition-all border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.4)]"
                >
                  Editar Perfil
                </button>
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="px-4 py-2 bg-gradient-to-br from-[#1F2A33]/60 to-[#1F2A33]/30 text-white/90 rounded-lg hover:from-[#1F2A33]/70 hover:to-[#1F2A33]/40 transition-all border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.3)]"
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
