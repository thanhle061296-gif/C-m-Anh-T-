import React, { useState } from 'react';
import { AuditLog } from '../types';
import { formatDateTime } from '../utils/interest';
import { ShieldCheck, Search, Filter, History, Trash2, Edit, Plus, Coins, Shield } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const filteredLogs = logs.filter((log) => {
    if (entityFilter !== 'all' && log.entity !== entityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchId = log.entityId.toLowerCase().includes(q);
      if (!matchAction && !matchUser && !matchDetails && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <History className="h-6 w-6 text-amber-500" />
            <span>NHẬT KÝ HOẠT ĐỘNG (AUDIT LOG)</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Lịch sử bất biến ghi lại mọi thao tác tạo, sửa, thu tiền, gia hạn, chuộc, thanh lý và xóa dữ liệu
          </p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
          Tổng cộng: <strong className="text-amber-400">{logs.length}</strong> nhật ký
        </span>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo người thực hiện, hành động, ID đối tượng, chi tiết..."
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-xs text-white focus:outline-none"
        >
          <option value="all">Tất cả đối tượng</option>
          <option value="contract">Hợp đồng</option>
          <option value="payment">Thu tiền / Thanh toán</option>
          <option value="customer">Khách hàng</option>
          <option value="user">Tài khoản</option>
          <option value="settings">Cài đặt / Lãi suất</option>
          <option value="liquidation">Thanh lý</option>
          <option value="cashflow">Thu - Chi</option>
        </select>
      </div>

      {/* Logs Table / List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-16 rounded-3xl bg-zinc-900/60 border border-dashed border-zinc-800 text-zinc-400 text-xs">
          Chưa có nhật ký hoạt động nào.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const isDelete = log.action.toUpperCase().includes('XÓA');
            const isInterest = log.action.includes('Thu') || log.action.includes('tiền');

            return (
              <div
                key={log.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isDelete
                    ? 'bg-rose-950/20 border-rose-900/40'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        isDelete
                          ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                          : 'bg-zinc-800 text-amber-300'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-zinc-400 font-mono text-[11px]">ID: {log.entityId}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-300 font-semibold">{log.userName}</span>
                  </div>

                  <p className="text-zinc-300 text-xs leading-relaxed">{log.details}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-zinc-500 font-mono block">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
