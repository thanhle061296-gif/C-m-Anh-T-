import React from 'react';
import { SyncStatus } from '../services/api';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface OfflineIndicatorProps {
  status: SyncStatus;
  pendingCount: number;
  onManualSync: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  status,
  pendingCount,
  onManualSync,
}) => {
  return (
    <>
      {/* Floating Offline Alert Banner when offline */}
      {status === 'offline' && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-500 text-black px-4 py-2.5 text-xs font-bold shadow-2xl shadow-amber-950/50 animate-in slide-in-from-bottom duration-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Chế độ Ngoại tuyến — Dữ liệu đang được lưu an toàn trên thiết bị.</span>
        </div>
      )}

      {/* Header Sync Status Pill */}
      <div className="flex items-center gap-1.5 text-xs font-medium">
        {status === 'synced' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Đã đồng bộ</span>
          </span>
        )}

        {status === 'syncing' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-semibold">
            <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
            <span>Đang đồng bộ...</span>
          </span>
        )}

        {status === 'offline' && (
          <button
            onClick={onManualSync}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-[11px] font-semibold transition"
            title="Nhấn để thử đồng bộ lại"
          >
            <WifiOff className="h-3 w-3 text-amber-400" />
            <span>Chưa đồng bộ ({pendingCount})</span>
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={onManualSync}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition"
          >
            <AlertCircle className="h-3 w-3" />
            <span>Lỗi đồng bộ</span>
          </button>
        )}
      </div>
    </>
  );
};
