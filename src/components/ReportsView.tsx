import React, { useState } from 'react';
import { DatabaseState } from '../types';
import { calculateContractInterest, formatVND, formatDate } from '../utils/interest';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  PieChart,
  Coins,
  Wallet,
} from 'lucide-react';

interface ReportsViewProps {
  dbState: DatabaseState;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ dbState }) => {
  const { contracts, assets, transactions, settings } = dbState;
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month' | 'last_month' | 'custom'>('month');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(todayStr);

  const rules = settings.interestCalculationRules || {
    halfMonthDaysThreshold: 15,
    fullMonthDaysThreshold: 15,
    nextMonthsRule: 'by_month',
  };

  const handleSelectTimeRange = (range: typeof timeRange) => {
    setTimeRange(range);
    const today = new Date();
    if (range === 'today') {
      const s = today.toISOString().split('T')[0];
      setStartDate(s);
      setEndDate(s);
    } else if (range === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (range === 'month') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(s);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (range === 'last_month') {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const e = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(s);
      setEndDate(e);
    }
  };

  // Filtered transactions within range
  const rangedTransactions = transactions.filter((t) => {
    return t.date >= startDate && t.date <= endDate;
  });

  const totalIncomeInRange = rangedTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenseInRange = rangedTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // Filtered contracts created within range
  const rangedContracts = contracts.filter((c) => {
    return c.startDate >= startDate && c.startDate <= endDate;
  });

  // Current Active Portfolio Totals (all time currently outstanding)
  const activeContracts = contracts.filter((c) => c.status !== 'redeemed' && c.status !== 'liquidated');
  const totalOutstandingLoan = activeContracts.reduce((acc, c) => acc + c.loanAmount, 0);

  let totalAccruedInterest = 0;
  let totalCollectedInterest = 0;
  let totalRemainingInterest = 0;

  activeContracts.forEach((c) => {
    const calc = calculateContractInterest(c, rules);
    totalAccruedInterest += calc.totalAccruedInterest;
    totalCollectedInterest += calc.totalInterestPaid;
    totalRemainingInterest += calc.remainingInterest;
  });

  // Breakdown by asset type
  const motorbikeCount = contracts.filter((c) => c.assetType === 'motorbike').length;
  const carCount = contracts.filter((c) => c.assetType === 'car').length;
  const phoneCount = contracts.filter((c) => c.assetType === 'phone').length;
  const laptopCount = contracts.filter((c) => c.assetType === 'laptop').length;
  const otherCount = contracts.filter((c) => c.assetType === 'other').length;

  const redeemedCount = contracts.filter((c) => c.status === 'redeemed').length;
  const liquidatedCount = contracts.filter((c) => c.status === 'liquidated').length;

  // Export report to CSV
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        ['BÁO CÁO HOẠT ĐỘNG KINH DOANH - CẦM ĐỒ ANH TÚ'],
        [`Thời gian: Từ ${startDate} đến ${endDate}`],
        [],
        ['CHỈ SỐ', 'GIÁ TRỊ'],
        ['Tổng vốn đang cho vay', `${totalOutstandingLoan} đ`],
        ['Số hợp đồng đang cầm', `${activeContracts.length}`],
        ['Tổng lãi phát sinh tồn đọng', `${totalRemainingInterest} đ`],
        ['Doanh thu Thu trong kỳ', `${totalIncomeInRange} đ`],
        ['Chi phí Chi trong kỳ', `${totalExpenseInRange} đ`],
        ['Lợi nhuận ròng trong kỳ', `${totalIncomeInRange - totalExpenseInRange} đ`],
        ['Số hợp đồng mới tạo trong kỳ', `${rangedContracts.length}`],
      ]
        .map((e) => e.join(','))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BaoCao_CamDoAnhTu_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-400" />
            <span>BÁO CÁO & THỐNG KÊ TÀI CHÍNH</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tổng hợp dữ liệu kinh doanh, dòng tiền và cơ cấu danh mục tài sản
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 transition"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Xuất Excel / CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 transition"
          >
            <Printer className="h-4 w-4" />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* Filter range presets */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSelectTimeRange('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              timeRange === 'today' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => handleSelectTimeRange('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              timeRange === '7days' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            7 ngày gần nhất
          </button>
          <button
            onClick={() => handleSelectTimeRange('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              timeRange === 'month' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => handleSelectTimeRange('last_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              timeRange === 'last_month' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            Tháng trước
          </button>
        </div>

        {/* Date pickers */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-zinc-400">Từ ngày:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setTimeRange('custom');
            }}
            className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-white"
          />
          <span className="text-zinc-400">Đến ngày:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setTimeRange('custom');
            }}
            className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-white"
          />
        </div>
      </div>

      {/* In-Range Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400">Thu trong kỳ lọc</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{formatVND(totalIncomeInRange)}</p>
          <span className="text-[11px] text-zinc-500">{rangedTransactions.filter((t) => t.type === 'income').length} giao dịch thu</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400">Chi trong kỳ lọc</span>
          <p className="text-2xl font-black text-rose-400 mt-1">{formatVND(totalExpenseInRange)}</p>
          <span className="text-[11px] text-zinc-500">{rangedTransactions.filter((t) => t.type === 'expense').length} giao dịch chi</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400">Thuần trong kỳ (Thu - Chi)</span>
          <p className={`text-2xl font-black mt-1 ${totalIncomeInRange - totalExpenseInRange >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {formatVND(totalIncomeInRange - totalExpenseInRange)}
          </p>
          <span className="text-[11px] text-zinc-500">Dòng tiền thuần giai đoạn này</span>
        </div>
      </div>

      {/* Macro Portfolio Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Outstanding Loan & Interest Breakdown */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Coins className="h-4 w-4" />
            <span>TỔNG QUAN DƯ NỢ CẦM HIỆN TẠI</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">Tổng vốn gốc đang cho khách cầm:</span>
              <strong className="text-rose-400 text-sm">{formatVND(totalOutstandingLoan)}</strong>
            </div>

            <div className="flex justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">Lãi tồn đọng chưa thu:</span>
              <strong className="text-amber-400 text-sm">{formatVND(totalRemainingInterest)}</strong>
            </div>

            <div className="flex justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">Lãi lũy kế đã thu toàn bộ hệ thống:</span>
              <strong className="text-emerald-400 text-sm">{formatVND(totalCollectedInterest)}</strong>
            </div>

            <div className="flex justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">Số lượng hợp đồng đang cầm:</span>
              <strong className="text-white text-sm">{activeContracts.length} hợp đồng</strong>
            </div>
          </div>
        </div>

        {/* Asset Category Distribution */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span>CƠ CẤU TÀI SẢN TRONG HỆ THỐNG</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-300">🛵 Xe máy:</span>
              <strong className="text-white">{motorbikeCount} món</strong>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-300">🚗 Ô tô:</span>
              <strong className="text-white">{carCount} món</strong>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-300">📱 Điện thoại:</span>
              <strong className="text-white">{phoneCount} món</strong>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-300">💻 Laptop / MacBook:</span>
              <strong className="text-white">{laptopCount} món</strong>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-300">📦 Khác:</span>
              <strong className="text-white">{otherCount} món</strong>
            </div>

            <div className="flex justify-between items-center pt-2 text-[11px] text-zinc-400 border-t border-zinc-800">
              <span>Đã chuộc: <strong className="text-purple-400">{redeemedCount}</strong></span>
              <span>Đã thanh lý: <strong className="text-orange-400">{liquidatedCount}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
