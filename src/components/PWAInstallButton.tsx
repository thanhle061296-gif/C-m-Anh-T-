import React, { useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, hide
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-rose-950/40 transition active:scale-95 border border-rose-500/30"
          title="Cài đặt Cầm Đồ Anh Tú vào màn hình chính"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Cài đặt ứng dụng</span>
          <span className="sm:hidden">Cài App</span>
        </button>
      )}

      {isIOS && !isInstallable && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition border border-zinc-700"
          title="Hướng dẫn cài đặt trên iPhone/iPad"
        >
          <Smartphone className="w-4 h-4 text-rose-400" />
          <span className="hidden sm:inline">Cài đặt iOS</span>
          <span className="sm:hidden">iOS App</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-rose-500" />
                Cài đặt trên iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <div className="flex items-start gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600/20 text-rose-400 font-bold text-xs">
                  1
                </span>
                <p>
                  Nhấn nút <Share2 className="inline w-4 h-4 text-blue-400 mx-1" /> <strong>Chia sẻ (Share)</strong> trên thanh công cụ Safari.
                </p>
              </div>
              <div className="flex items-start gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600/20 text-rose-400 font-bold text-xs">
                  2
                </span>
                <p>
                  Cuộn xuống và chọn mục <strong>"Thêm vào Màn hình chính"</strong> (Add to Home Screen).
                </p>
              </div>
              <div className="flex items-start gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600/20 text-rose-400 font-bold text-xs">
                  3
                </span>
                <p>
                  Bấm <strong>Thêm</strong> ở góc trên bên phải. App sẽ xuất hiện trên màn hình như ứng dụng thông thường!
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 py-2.5 text-xs font-bold text-white transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
};
