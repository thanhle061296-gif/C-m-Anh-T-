import React, { useState } from 'react';
import { CashflowTransaction, DatabaseState, User } from '../types';
import { formatVND, formatDate } from '../utils/interest';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  X,
  Banknote,
  CreditCard,
} from 'lucide-react';

interface CashflowViewProps {
  dbState: DatabaseState;
  currentUser: User;
  onCreateTransaction: (transaction: Partial<CashflowTransaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const CashflowView: React.FC<CashflowViewProps> = ({
  dbState,
  currentUser,
  onCreateTransaction,
  onDeleteTransaction,
}) => {
  const { transactions } = dbState;
  const [tab, setTab] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState<string>('other_income');
  const [amount, setAmount] = useState<number>(500000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canDelete = currentUser.role === 'admin' || currentUser.permissions.canDeleteData;

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter((t) => {
    if (tab !== 'all' && t.type !== tab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = t.code.toLowerCase().includes(q);
      const noteMatch = t.note.toLowerCase().includes(q);
      const staffMatch = t.staffName.toLowerCase().includes(q);
      if (!codeMatch && !noteMatch && !staffMatch) return false;
    }
    return true;
  });

  const openAddModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setCategory(type === 'income' ? 'other_income' : 'operating_cost');
    setAmount(1000000);
    setNote('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (amount <= 0 || !note.trim()) {
      setFormError('Vui lòng nhập số tiền và nội dung.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreateTransaction({
        type: modalType,
        category: category as any,
        amount: Number(amount),
        paymentMethod,
        date,
        note: note.trim(),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError('Lỗi tạo phiếu: ' + (err.message || 'Thao tác không thành công'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top action & title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-teal-400" />
            <span>SỔ QUỸ THU - CHI TIỆM</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Theo dõi dòng tiền mặt & chuyển khoản ngân hàng minh bạch, chính xác
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddModal('income')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>+ Lập phiếu Thu</span>
          </button>
          <button
            onClick={() => openAddModal('expense')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>- Lập phiếu Chi</span>
          </button>
        </div>
      </div>

      {/* Cashflow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tổng tiền đã Thu</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
            {formatVND(totalIncome)}
          </p>
          <span className="text-[11px] text-zinc-500">Lãi, chuộc, thanh lý & khoản thu khác</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tổng tiền đã Chi</span>
            <ArrowUpRight className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
            {formatVND(totalExpense)}
          </p>
          <span className="text-[11px] text-zinc-500">Tiền giải ngân cầm đồ, phí vận hành</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Chênh lệch Quỹ thuần</span>
            <Wallet className="h-4 w-4 text-amber-400" />
          </div>
          <p className={`text-xl sm:text-2xl font-black mt-1 ${netBalance >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {formatVND(netBalance)}
          </p>
          <span className="text-[11px] text-zinc-500">Tổng thu trừ đi tổng chi</span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              tab === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tất cả ({transactions.length})
          </button>
          <button
            onClick={() => setTab('income')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              tab === 'income' ? 'bg-emerald-600/30 text-emerald-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Phiếu Thu ({transactions.filter((t) => t.type === 'income').length})
          </button>
          <button
            onClick={() => setTab('expense')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              tab === 'expense' ? 'bg-rose-600/30 text-rose-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Phiếu Chi ({transactions.filter((t) => t.type === 'expense').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã phiếu, nội dung..."
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-16 rounded-3xl bg-zinc-900/60 border border-dashed border-zinc-800 text-zinc-400 text-xs">
          Chưa có giao dịch thu chi nào.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {tx.type === 'income' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-mono">{tx.code}</span>
                    <span className="text-zinc-400">({formatDate(tx.date)})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {tx.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                    </span>
                  </div>
                  <p className="text-zinc-300 truncate max-w-sm sm:max-w-md">{tx.note}</p>
                  <p className="text-[11px] text-zinc-500">NV: {tx.staffName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-sm sm:text-base font-black ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}{formatVND(tx.amount)}
                </span>

                {canDelete && (
                  <button
                    onClick={() => onDeleteTransaction(tx.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition"
                    title="Xóa phiếu (Admin)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">
                {modalType === 'income' ? '+ Lập Phiếu Thu' : '- Lập Phiếu Chi'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Danh mục</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
                >
                  {modalType === 'income' ? (
                    <>
                      <option value="interest_collected">Thu tiền lãi</option>
                      <option value="redemption_collected">Thu tiền chuộc</option>
                      <option value="liquidation_collected">Thu thanh lý</option>
                      <option value="other_income">Thu khác ngoài luồng</option>
                    </>
                  ) : (
                    <>
                      <option value="loan_disbursement">Chi tiền cầm đồ (Giải ngân)</option>
                      <option value="operating_cost">Chi phí vận hành / Thuê mặt bằng / Điện nước</option>
                      <option value="repair">Chi sửa chữa / Bảo dưỡng tài sản</option>
                      <option value="transport">Chi vận chuyển xe / cẩu xe</option>
                      <option value="other_expense">Chi phí khác</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Số tiền (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="10000"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-base font-bold text-white"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Bằng chữ: <strong className="text-white">{formatVND(amount)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Hình thức</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="bank_transfer">Chuyển khoản</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Ngày lập</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Nội dung chi tiết <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi rõ lý do thu hoặc chi..."
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs ${
                    modalType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu phiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
