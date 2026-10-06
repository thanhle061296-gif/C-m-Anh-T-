import React, { useState } from 'react';
import {
  Contract,
  DatabaseState,
  ContractStatus,
  AssetType,
  User,
} from '../types';
import { calculateContractInterest, formatVND, formatDate } from '../utils/interest';
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  Car,
  Smartphone,
  Laptop,
  Coins,
  ShieldCheck,
  Flame,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';

interface ContractsViewProps {
  dbState: DatabaseState;
  currentUser: User;
  onOpenCreateContract: () => void;
  onOpenContractDetail: (contractId: string) => void;
  onOpenCollectInterest: (contract: Contract) => void;
  onOpenExtend: (contract: Contract) => void;
  onOpenRedeem: (contract: Contract) => void;
  onOpenLiquidate: (contract: Contract) => void;
  onEditContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({
  dbState,
  currentUser,
  onOpenCreateContract,
  onOpenContractDetail,
  onOpenCollectInterest,
  onOpenExtend,
  onOpenRedeem,
  onOpenLiquidate,
  onEditContract,
  onDeleteContract,
}) => {
  const { contracts, assets, settings } = dbState;
  const rules = settings.interestCalculationRules || {
    halfMonthDaysThreshold: 15,
    fullMonthDaysThreshold: 15,
    nextMonthsRule: 'by_month',
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const canDelete = currentUser.role === 'admin' || currentUser.permissions.canDeleteContract;
  const canLiquidate = currentUser.role === 'admin' || currentUser.permissions.canLiquidate;

  // Filter logic
  const filteredContracts = contracts.filter((c) => {
    const calc = calculateContractInterest(c, rules);

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue' && !calc.isOverdue) return false;
      if (statusFilter === 'debt' && calc.remainingInterest <= 0) return false;
      if (statusFilter !== 'overdue' && statusFilter !== 'debt' && c.status !== statusFilter) return false;
    }

    // Asset type filter
    if (typeFilter !== 'all' && c.assetType !== typeFilter) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = c.code.toLowerCase().includes(q);
      const nameMatch = c.customerName.toLowerCase().includes(q);
      const phoneMatch = c.customerPhone.includes(q);
      const plateMatch = c.licensePlate?.toLowerCase().includes(q);
      const assetMatch = c.assetName.toLowerCase().includes(q);
      const cccdMatch = c.customerIdCard?.includes(q);
      if (!codeMatch && !nameMatch && !phoneMatch && !plateMatch && !assetMatch && !cccdMatch) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Top action & title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-rose-500" />
            <span>QUẢN LÝ HỢP ĐỒNG CẦM ĐỒ</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tổng cộng: <strong className="text-white">{contracts.length}</strong> hợp đồng • Hiển thị: <strong className="text-amber-400">{filteredContracts.length}</strong>
          </p>
        </div>

        <button
          onClick={onOpenCreateContract}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-sm shadow-xl shadow-rose-950/50 active:scale-95 transition"
        >
          <PlusCircle className="h-5 w-5 text-amber-300" />
          <span>+ TẠO HỢP ĐỒNG MỚI</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Mã HĐ, Tên khách, SĐT, CCCD, Biển số xe, Tên tài sản..."
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400 shrink-0 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-xs text-white focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang cầm</option>
              <option value="debt">Nợ lãi</option>
              <option value="overdue">🔴 Quá hạn</option>
              <option value="paid_interest">Đã thu lãi</option>
              <option value="extended">Đã gia hạn</option>
              <option value="redeemed">Đã chuộc</option>
              <option value="liquidated">Đã thanh lý</option>
            </select>

            {/* Asset Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-xs text-white focus:outline-none"
            >
              <option value="all">Tất cả loại tài sản</option>
              <option value="motorbike">🛵 Xe máy</option>
              <option value="car">🚗 Ô tô</option>
              <option value="phone">📱 Điện thoại</option>
              <option value="laptop">💻 Laptop / Mac</option>
              <option value="other">📦 Tài sản khác</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contracts List / Cards */}
      {filteredContracts.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/60 rounded-3xl border border-dashed border-zinc-800 p-6">
          <p className="text-zinc-400 text-sm">Không tìm thấy hợp đồng nào phù hợp bộ lọc.</p>
          {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContracts.map((contract) => {
            const calc = calculateContractInterest(contract, rules);

            return (
              <div
                key={contract.id}
                onClick={() => onOpenContractDetail(contract.id)}
                className="group relative rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 sm:p-5 transition shadow-sm hover:shadow-md cursor-pointer"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-200 shrink-0">
                      {contract.assetType === 'car' ? (
                        <Car className="h-6 w-6 text-amber-400" />
                      ) : contract.assetType === 'motorbike' ? (
                        <span className="text-2xl">🛵</span>
                      ) : contract.assetType === 'phone' ? (
                        <Smartphone className="h-6 w-6 text-blue-400" />
                      ) : (
                        <Laptop className="h-6 w-6 text-purple-400" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-white text-base tracking-wide font-mono">
                          #{contract.code}
                        </span>
                        <span className="font-bold text-zinc-200 text-sm">{contract.customerName}</span>
                        <span className="text-xs text-zinc-400 font-mono">({contract.customerPhone})</span>

                        {contract.licensePlate && (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 font-mono text-xs font-bold border border-amber-500/20">
                            {contract.licensePlate}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-300">
                        {contract.assetName} • Kho: <strong className="text-emerald-400">{contract.warehouseLocation}</strong>
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 pt-0.5">
                        <span>Cầm: {formatDate(contract.startDate)}</span>
                        <span>•</span>
                        <span className={calc.isOverdue ? 'text-rose-400 font-bold' : ''}>
                          Đến hạn: {formatDate(contract.dueDate)}
                        </span>
                        <span>•</span>
                        <span>{calc.daysPassed} ngày</span>
                        <span>•</span>
                        <span>NV: {contract.staffName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Status tags */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-800">
                    <div className="text-left lg:text-right">
                      <div className="text-base sm:text-lg font-black text-white">
                        {formatVND(contract.loanAmount)}
                      </div>
                      <div className="text-xs text-amber-400 font-semibold">
                        Lãi {contract.interestRate}% ({formatVND(calc.currentPeriodInterest)}/tháng)
                      </div>
                      {calc.remainingInterest > 0 && (
                        <div className="text-[11px] text-rose-400 font-medium">
                          Nợ lãi: {formatVND(calc.remainingInterest)}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-bold ${
                          contract.status === 'redeemed'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : contract.status === 'liquidated'
                            ? 'bg-zinc-700 text-zinc-300'
                            : calc.isOverdue
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {contract.status === 'redeemed'
                          ? 'Đã chuộc'
                          : contract.status === 'liquidated'
                          ? 'Đã thanh lý'
                          : calc.isOverdue
                          ? `Quá hạn ${calc.daysOverdue} ngày`
                          : 'Đang cầm'}
                      </span>

                      {/* Quick Action buttons */}
                      {contract.status !== 'redeemed' && contract.status !== 'liquidated' && (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onOpenCollectInterest(contract)}
                            className="px-2.5 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500 hover:text-black text-xs font-bold transition"
                            title="Thu lãi"
                          >
                            Thu lãi
                          </button>
                          <button
                            onClick={() => onOpenExtend(contract)}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500 hover:text-white text-xs font-bold transition"
                            title="Gia hạn"
                          >
                            Gia hạn
                          </button>
                          <button
                            onClick={() => onOpenRedeem(contract)}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-white text-xs font-bold transition"
                            title="Chuộc tài sản"
                          >
                            Chuộc
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
