import React, { useState } from 'react';
import { Contract, SystemSettings, User } from '../types';
import { calculateContractInterest, formatVND } from '../utils/interest';
import { Coins, X, Check, ShieldAlert, CreditCard, Banknote } from 'lucide-react';

interface CollectInterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  settings: SystemSettings;
  currentUser: User;
  onConfirm: (data: {
    contractId: string;
    amount: number;
    paymentMethod: 'cash' | 'bank_transfer';
    date: string;
    periodNote: string;
    note: string;
  }) => Promise<void>;
}

export const CollectInterestModal: React.FC<CollectInterestModalProps> = ({
  isOpen,
  onClose,
  contract,
  settings,
  currentUser,
  onConfirm,
}) => {
  if (!isOpen || !contract) return null;

  const rules = settings.interestCalculationRules || {
    halfMonthDaysThreshold: 15,
    fullMonthDaysThreshold: 15,
    nextMonthsRule: 'by_month',
  };
  const calc = calculateContractInterest(contract, rules);

  // Default collect amount: current monthly interest or remaining accrued interest
  const defaultAmount = calc.remainingInterest > 0 ? calc.remainingInterest : calc.currentPeriodInterest;
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodNote, setPeriodNote] = useState(`Thu lãi kỳ tháng (${calc.periodsCount} kỳ)`);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (amount <= 0) {
      setError('Số tiền thu phải lớn hơn 0.');
      return;
    }
    setIsConfirmStep(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        contractId: contract.id,
        amount: Number(amount),
        paymentMethod,
        date,
        periodNote,
        note,
      });
      setIsConfirmStep(false);
      onClose();
    } catch (err: any) {
      setError('Lỗi thu lãi: ' + (err.message || 'Thao tác không thành công'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Thu Tiền Lãi Cầm Đồ</h3>
              <p className="text-xs text-zinc-400">
                HĐ #{contract.code} • {contract.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {!isConfirmStep ? (
          <form onSubmit={handleProceed} className="p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}
            {/* Automatic interest breakdown (Spec #9 & #11) */}
            <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Tiền gốc đang cầm:</span>
                <strong className="text-white">{formatVND(contract.loanAmount)}</strong>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Lãi suất hợp đồng:</span>
                <span className="text-amber-400 font-bold">{contract.interestRate}% / tháng</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Lãi định kỳ 1 tháng:</span>
                <span className="text-white font-semibold">{formatVND(calc.currentPeriodInterest)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Số ngày đã cầm:</span>
                <span>{calc.daysPassed} ngày ({calc.monthsPassed} tháng)</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Tổng lãi tích lũy đến nay:</span>
                <span className="text-white">{formatVND(calc.totalAccruedInterest)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Lãi khách đã trả trước:</span>
                <span className="text-emerald-400 font-semibold">{formatVND(calc.totalInterestPaid)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm">
                <span className="font-bold text-zinc-200">Lãi còn thiếu (cần thu):</span>
                <span className="font-black text-rose-400">{formatVND(calc.remainingInterest)}</span>
              </div>
            </div>

            {/* Form Inputs */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Số tiền thu đợt này (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                step="10000"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-xl bg-zinc-950 border border-amber-500/60 px-4 py-3 text-lg font-black text-amber-400 focus:outline-none"
              />
              <span className="text-[11px] text-zinc-400 mt-1 block">
                Bằng chữ: <strong className="text-white">{formatVND(amount)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Phương thức thanh toán</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    <span>Tiền mặt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'bank_transfer'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Chuyển khoản</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Ngày thu</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {paymentMethod === 'bank_transfer' && (
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs space-y-1 text-blue-200">
                <p className="font-bold">Tài khoản nhận tiền tiệm:</p>
                <p>Ngân hàng: <strong>{settings.bankName}</strong></p>
                <p>Số tài khoản: <strong className="font-mono text-white text-sm">{settings.bankAccountNumber}</strong></p>
                <p>Chủ TK: <strong>{settings.bankAccountName}</strong></p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Ghi chú phiếu thu</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Khách đóng lãi tháng 10, gửi tiền mặt..."
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-950/50"
              >
                Tiếp tục xác nhận →
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Step (Spec #12: Protected financial transaction) */
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-200 space-y-1">
                <p className="font-bold text-sm text-white">Xác nhận thu tiền lãi</p>
                <p>
                  Giao dịch sau khi xác nhận sẽ được ghi vào sổ quỹ Thu - Chi và lưu vết Lịch sử hoạt động (Audit Log).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Hợp đồng:</span>
                <span className="font-bold text-white">#{contract.code} - {contract.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Số tiền thu:</span>
                <span className="font-black text-amber-400 text-base">{formatVND(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Hình thức:</span>
                <span className="font-semibold text-white">
                  {paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản ngân hàng'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Người thực hiện:</span>
                <span className="text-white">{currentUser.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Ngày thu:</span>
                <span className="text-white">{date}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmStep(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-300"
              >
                ← Quay lại sửa
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận thu tiền'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
