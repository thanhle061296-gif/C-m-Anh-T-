import React, { useState } from 'react';
import { User, SystemSettings } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { Lock, User as UserIcon, Shield, AlertCircle, ArrowRight, Phone } from 'lucide-react';

interface LoginScreenProps {
  settings: SystemSettings;
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ settings, onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const json = await res.json();
      if (json.success && json.user) {
        localStorage.setItem('CamDoAnhTu_User', JSON.stringify(json.user));
        onLoginSuccess(json.user);
      } else {
        setError(json.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      console.warn('Network error during login, attempting local fallback check', err);
      // Fallback if offline
      if (username.trim() === 'admin' && password === 'admin123') {
        const fallbackAdmin: User = {
          id: 'USR-ADMIN',
          username: 'admin',
          fullName: 'Chủ Tiệm Anh Tú',
          role: 'admin',
          isLocked: false,
          permissions: {
            canAddCustomer: true,
            canCreateContract: true,
            canEditContract: true,
            canDeleteContract: true,
            canCollectInterest: true,
            canRedeem: true,
            canLiquidate: true,
            canManageWarehouse: true,
            canManageCashflow: true,
            canViewReports: true,
            canDeleteData: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        onLoginSuccess(fallbackAdmin);
      } else {
        setError('Không thể kết nối máy chủ. Kiểm tra kết nối mạng của bạn.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-600/15 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/15 blur-3xl rounded-full pointer-events-none" />

      {/* Top PWA Install badge */}
      <div className="absolute top-4 right-4 z-20">
        <PWAInstallButton />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="relative inline-block group">
            <img
              src={settings.logoUrl || '/logo.jpg'}
              alt="Cầm Đồ Anh Tú"
              className="h-28 w-28 mx-auto rounded-3xl object-cover border-2 border-amber-500/50 shadow-2xl shadow-amber-500/20 group-hover:scale-105 transition"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.jpg';
              }}
            />
            <div className="absolute -bottom-2 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-wider shadow">
              Hệ Thống Quản Lý
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase drop-shadow-md">
              {settings.shopName || 'CẦM ĐỒ ANH TÚ'}
            </h1>
            <p className="text-xs text-zinc-400 mt-1 flex items-center justify-center gap-1">
              <span>📍 {settings.address}</span>
            </p>
            <p className="text-xs text-amber-400 font-bold mt-0.5 flex items-center justify-center gap-1">
              <Phone className="h-3 w-3" />
              <span>Hotline: {settings.phone}</span>
            </p>
          </div>
        </div>

        {/* Login Form Box */}
        <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-7 shadow-2xl backdrop-blur-md space-y-5">
          <div className="text-center">
            <h2 className="text-base font-bold text-white">Đăng nhập tài khoản</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Dành cho Chủ tiệm & Nhân viên tiệm cầm đồ</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Tên đăng nhập</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700/80 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700/80 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm shadow-xl shadow-rose-950/60 active:scale-95 transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Đang xác thực...' : 'ĐĂNG NHẬP HỆ THỐNG'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Initial admin badge reminder */}
          <div className="pt-3 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
            <span>Tài khoản Admin ban đầu: </span>
            <code className="text-amber-400 font-mono font-bold bg-zinc-950 px-1.5 py-0.5 rounded">
              admin
            </code>
            <span> / </span>
            <code className="text-amber-400 font-mono font-bold bg-zinc-950 px-1.5 py-0.5 rounded">
              admin123
            </code>
          </div>
        </div>

        {/* Bottom copyright */}
        <p className="text-center text-[11px] text-zinc-500 mt-6">
          © {new Date().getFullYear()} Cầm Đồ Anh Tú • Bảo mật cao • Không mất dữ liệu
        </p>
      </div>
    </div>
  );
};
