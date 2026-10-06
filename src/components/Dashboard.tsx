import React from 'react';
import {
  Contract,
  DatabaseState,
  InterestRules,
} from '../types';
import { calculateContractInterest, formatVND } from '../utils/interest';
import {
  PlusCircle,
  Users,
  FileText,
  Warehouse,
  Coins,
  ShieldCheck,
  Flame,
  Wallet,
  BarChart3,
  UserCog,
  Settings,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  PhoneCall,
  Car,
  Smartphone,
  Laptop,
  CheckCircle2,
} from 'lucide-react';

interface DashboardProps {
  dbState: DatabaseState;
  onNavigate: (tab: string) => void;
  onOpenCreateContract: () => void;
  onOpenContractDetail: (contractId: string) => void;
  onOpenCollectInterest: (contract: Contract) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  dbState,
  onNavigate,
  onOpenCreateContract,
  onOpenContractDetail,
  onOpenCollectInterest,
  searchTerm,
  setSearchTerm,
}) => {
  const { contracts, assets, transactions, settings } = dbState;
  const rules = settings.interestCalculationRules || {
    halfMonthDaysThreshold: 15,
    fullMonthDaysThreshold: 15,
    nextMonthsRule: 'by_month',
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Active contracts (excluding redeemed and liquidated)
  const activeContracts = contracts.filter(
    (c) => c.status !== 'redeemed' && c.status !== 'liquidated' && c.status !== 'cancelled'
  );

  // Financial aggregates
  let totalLoanPrincipal = 0;
  let totalExpectedMonthlyInterest = 0;
  let totalAccruedInterest = 0;
  let totalInterestPaid = 0;
  let totalRemainingInterest = 0;

  // Alerts
  const overdueContracts: { contract: Contract; daysOverdue: number; calc: any }[] = [];
  const upcomingContracts: { contract: Contract; daysRemaining: number; calc: any }[] = [];
  const debtContracts: { contract: Contract; unpaid: number; calc: any }[] = [];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  activeContracts.forEach((c) => {
    totalLoanPrincipal += c.loanAmount;
    const calc = calculateContractInterest(c, rules, now);

    totalExpectedMonthlyInterest += calc.currentPeriodInterest;
    totalAccruedInterest += calc.totalAccruedInterest;
    totalInterestPaid += calc.totalInterestPaid;
    totalRemainingInterest += calc.remainingInterest;

    if (calc.isOverdue) {
      overdueContracts.push({ contract: c, daysOverdue: calc.daysOverdue, calc });
    } else {
      const due = new Date(c.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 5 && diffDays >= 0) {
        upcomingContracts.push({ contract: c, daysRemaining: diffDays, calc });
      }
    }

    if (calc.remainingInterest > 0) {
      debtContracts.push({ contract: c, unpaid: calc.remainingInterest, calc });
    }
  });

  // Today's cash flow
  const todayTransactions = transactions.filter((t) => t.date === todayStr);
  const todayIncome = todayTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const todayExpense = todayTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // Warehouse breakdown
  const inPawnAssets = assets.filter((a) => a.status === 'in_pawn').length;
  const liquidatedAssets = assets.filter((a) => a.status === 'liquidated').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Brand Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-amber-500/20 shadow-2xl p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 text-center md:text-left">
            <div className="relative group">
              <img
                src={settings.logoUrl || '/logo.jpg'}
                alt="Logo Cầm Đồ Anh Tú"
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border-2 border-amber-500/40 shadow-xl shadow-amber-500/20"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 rounded-2xl border border-amber-400/30 pointer-events-none" />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ★ HỆ THỐNG QUẢN LÝ TIỆM
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  LÃI SUẤT {settings.defaultInterestRate}%/THÁNG
                </span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white uppercase drop-shadow-md">
                {settings.shopName || 'CẦM ĐỒ ANH TÚ'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1">
                <span>📍 {settings.address}</span>
                <span className="text-amber-400 font-bold">
                  📞 <a href={`tel:${settings.phone}`} className="hover:underline">{settings.phone}</a>
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={onOpenCreateContract}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-rose-950/60 border border-rose-400/30 active:scale-95 transition"
            >
              <PlusCircle className="h-5 w-5 text-amber-300" />
              <span>+ TẠO HỢP ĐỒNG MỚI</span>
            </button>
          </div>
        </div>

        {/* Global Quick Search Bar */}
        <div className="relative mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm nhanh toàn hệ thống: Tên khách hàng, SĐT, CCCD, Biển số xe, IMEI, Mã HĐ..."
            className="w-full rounded-2xl bg-zinc-900/90 border border-zinc-700/80 pl-12 pr-4 py-3.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white bg-zinc-800 px-2 py-1 rounded-md"
            >
              Xóa tìm
            </button>
          )}
        </div>
      </div>

      {/* Primary Action Buttons (Responsive Grid for Mobile & Desktop - Spec #38) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 px-1">
          CHỨC NĂNG THAO TÁC NHANH
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            onClick={onOpenCreateContract}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-rose-900/50 to-zinc-900 border border-rose-500/40 text-rose-300 hover:bg-rose-900/70 hover:border-rose-400 transition active:scale-95 shadow-lg group"
          >
            <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-400 group-hover:scale-110 transition">
              <PlusCircle className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-white tracking-wide text-center">TẠO HỢP ĐỒNG</span>
          </button>

          <button
            onClick={() => onNavigate('contracts')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
              <FileText className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">HỢP ĐỒNG ({contracts.length})</span>
          </button>

          <button
            onClick={() => onNavigate('customers')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
              <Users className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">KHÁCH HÀNG</span>
          </button>

          <button
            onClick={() => onNavigate('warehouse')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
              <Warehouse className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">KHO TÀI SẢN ({inPawnAssets})</span>
          </button>

          <button
            onClick={() => onNavigate('contracts')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 group-hover:scale-110 transition">
              <Coins className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">THU LÃI</span>
          </button>

          <button
            onClick={() => onNavigate('contracts')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">CHUỘC TÀI SẢN</span>
          </button>

          <button
            onClick={() => onNavigate('contracts')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 group-hover:scale-110 transition">
              <Flame className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">THANH LÝ ({liquidatedAssets})</span>
          </button>

          <button
            onClick={() => onNavigate('cashflow')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 group-hover:scale-110 transition">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">THU - CHI</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">BÁO CÁO</span>
          </button>

          <button
            onClick={() => onNavigate('users')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition">
              <UserCog className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">TÀI KHOẢN</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition active:scale-95 shadow-md group"
          >
            <div className="p-2.5 rounded-xl bg-zinc-700/50 text-zinc-300 group-hover:scale-110 transition">
              <Settings className="h-6 w-6" />
            </div>
            <span className="mt-2 text-xs font-bold text-zinc-200 tracking-wide text-center">CÀI ĐẶT</span>
          </button>
        </div>
      </div>

      {/* Critical Alert Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overdue Alert */}
        <div className="rounded-2xl bg-rose-950/20 border border-rose-500/30 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-bold text-sm">Hợp đồng quá hạn ({overdueContracts.length})</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
              🔴 Cần xử lý
            </span>
          </div>

          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {overdueContracts.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">Không có hợp đồng nào quá hạn</p>
            ) : (
              overdueContracts.map(({ contract, daysOverdue, calc }) => (
                <div
                  key={contract.id}
                  onClick={() => onOpenContractDetail(contract.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-rose-500/20 cursor-pointer transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{contract.code}</span>
                      <span className="text-xs text-zinc-300 truncate max-w-[120px]">{contract.customerName}</span>
                    </div>
                    <p className="text-[11px] text-rose-400 font-medium">
                      Quá hạn {daysOverdue} ngày • Gốc {formatVND(contract.loanAmount)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCollectInterest(contract);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600/30 text-rose-300 hover:bg-rose-600 hover:text-white text-[11px] font-bold"
                  >
                    Thu lãi
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Due soon alert */}
        <div className="rounded-2xl bg-amber-950/20 border border-amber-500/30 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="h-5 w-5" />
              <span className="font-bold text-sm">Sắp đến hạn ({upcomingContracts.length})</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
              ⚠️ Trong 5 ngày
            </span>
          </div>

          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {upcomingContracts.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">Không có hợp đồng sắp đến hạn</p>
            ) : (
              upcomingContracts.map(({ contract, daysRemaining, calc }) => (
                <div
                  key={contract.id}
                  onClick={() => onOpenContractDetail(contract.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-amber-500/20 cursor-pointer transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{contract.code}</span>
                      <span className="text-xs text-zinc-300 truncate max-w-[120px]">{contract.customerName}</span>
                    </div>
                    <p className="text-[11px] text-amber-400 font-medium">
                      Còn {daysRemaining} ngày • Gốc {formatVND(contract.loanAmount)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCollectInterest(contract);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-600/30 text-amber-300 hover:bg-amber-600 hover:text-white text-[11px] font-bold"
                  >
                    Nhắc phí
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unpaid Interest Debt */}
        <div className="rounded-2xl bg-orange-950/20 border border-orange-500/30 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-orange-500/20">
            <div className="flex items-center gap-2 text-orange-400">
              <Coins className="h-5 w-5" />
              <span className="font-bold text-sm">Khách chưa đóng lãi ({debtContracts.length})</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300">
              🟠 Nợ lãi
            </span>
          </div>

          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {debtContracts.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">Tất cả khách đã hoàn tất đóng lãi</p>
            ) : (
              debtContracts.slice(0, 5).map(({ contract, unpaid }) => (
                <div
                  key={contract.id}
                  onClick={() => onOpenContractDetail(contract.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-orange-500/20 cursor-pointer transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{contract.code}</span>
                      <span className="text-xs text-zinc-300 truncate max-w-[120px]">{contract.customerName}</span>
                    </div>
                    <p className="text-[11px] text-orange-400 font-medium">
                      Lãi nợ: {formatVND(unpaid)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCollectInterest(contract);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-orange-600/30 text-orange-300 hover:bg-orange-600 hover:text-white text-[11px] font-bold"
                  >
                    Thu
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main KPI Statistics Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 px-1">
          TỔNG QUAN TÀI CHÍNH & VỐN
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Vốn đang cho cầm */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-sm">
            <span className="text-xs font-medium text-zinc-400">Tổng vốn đang cầm</span>
            <p className="text-xl sm:text-2xl font-black text-rose-500 mt-1">{formatVND(totalLoanPrincipal)}</p>
            <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>{activeContracts.length} hợp đồng đang cầm</span>
            </div>
          </div>

          {/* Lãi dự kiến tháng */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-sm">
            <span className="text-xs font-medium text-zinc-400">Lãi dự kiến / tháng</span>
            <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
              {formatVND(totalExpectedMonthlyInterest)}
            </p>
            <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Theo mức lãi {settings.defaultInterestRate}%</span>
            </div>
          </div>

          {/* Lãi đã thu */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-sm">
            <span className="text-xs font-medium text-zinc-400">Tổng lãi đã thu</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {formatVND(totalInterestPaid)}
            </p>
            <div className="mt-2 text-[11px] text-zinc-400">Lũy kế toàn bộ hệ thống</div>
          </div>

          {/* Lãi còn phải thu */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-sm">
            <span className="text-xs font-medium text-zinc-400">Lãi còn phải thu</span>
            <p className="text-xl sm:text-2xl font-black text-orange-400 mt-1">
              {formatVND(totalRemainingInterest)}
            </p>
            <div className="mt-2 text-[11px] text-zinc-400">Lãi tồn tích lũy đến nay</div>
          </div>

          {/* Thu hôm nay */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
              <span>Thu hôm nay</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-emerald-400 mt-1">{formatVND(todayIncome)}</p>
          </div>

          {/* Chi hôm nay */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
              <span>Chi hôm nay</span>
              <ArrowUpRight className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-rose-400 mt-1">{formatVND(todayExpense)}</p>
          </div>

          {/* Tài sản trong kho */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-sm">
            <span className="text-xs font-medium text-zinc-400">Tài sản trong kho</span>
            <p className="text-lg sm:text-xl font-bold text-white mt-1">{inPawnAssets} món</p>
            <div className="mt-2 text-[11px] text-zinc-400">Xe, điện thoại, laptop...</div>
          </div>

          {/* Đã thanh lý */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-sm">
            <span className="text-xs font-medium text-zinc-400">Tài sản đã thanh lý</span>
            <p className="text-lg sm:text-xl font-bold text-zinc-300 mt-1">{liquidatedAssets} món</p>
            <div className="mt-2 text-[11px] text-zinc-400">Đã thu hồi vốn thanh lý</div>
          </div>
        </div>
      </div>

      {/* Recent Contracts List */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-rose-500" />
            Hợp đồng mới nhất
          </h3>
          <button
            onClick={() => onNavigate('contracts')}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
          >
            Xem tất cả ({contracts.length}) →
          </button>
        </div>

        {contracts.length === 0 ? (
          <div className="text-center py-10 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
            <p className="text-zinc-400 text-sm">Chưa có hợp đồng nào trong hệ thống.</p>
            <button
              onClick={onOpenCreateContract}
              className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
            >
              + Tạo hợp đồng đầu tiên
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {contracts.slice(0, 5).map((contract) => {
              const calc = calculateContractInterest(contract, rules);
              return (
                <div
                  key={contract.id}
                  onClick={() => onOpenContractDetail(contract.id)}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-850/60 px-2 rounded-xl transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                      {contract.assetType === 'car' ? (
                        <Car className="h-5 w-5 text-amber-400" />
                      ) : contract.assetType === 'motorbike' ? (
                        <span className="text-lg">🛵</span>
                      ) : contract.assetType === 'phone' ? (
                        <Smartphone className="h-5 w-5 text-blue-400" />
                      ) : (
                        <Laptop className="h-5 w-5 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{contract.code}</span>
                        <span className="text-xs text-zinc-300 font-medium">{contract.customerName}</span>
                        {contract.licensePlate && (
                          <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                            {contract.licensePlate}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {contract.assetName} • Vị trí: {contract.warehouseLocation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{formatVND(contract.loanAmount)}</p>
                      <p className="text-[11px] text-amber-400">
                        Lãi {contract.interestRate}% ({formatVND(calc.currentPeriodInterest)}/tháng)
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        contract.status === 'redeemed'
                          ? 'bg-purple-500/20 text-purple-300'
                          : contract.status === 'liquidated'
                          ? 'bg-zinc-700 text-zinc-300'
                          : calc.isOverdue
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {contract.status === 'redeemed'
                        ? 'Đã chuộc'
                        : contract.status === 'liquidated'
                        ? 'Đã thanh lý'
                        : calc.isOverdue
                        ? 'Quá hạn'
                        : 'Đang cầm'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
