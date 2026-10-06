import React, { useState } from 'react';
import { Contract, SystemSettings, User } from '../types';
import { calculateContractInterest, formatVND } from '../utils/interest';
import { ShieldCheck, X, Check, Banknote, CreditCard, AlertCircle } from 'lucide-react';

interface RedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  settings: SystemSettings;
  currentUser: User;
  onConfirm: (data: {
    contractId: string;
    redemptionAmount: number;
    unpaidInterest: number;
    paymentMethod: 'cash' | 'bank_transfer';
    date: string;
    note: string;
  }) => Promise<void>;
}

export const RedemptionModal: React.FC<RedemptionModalProps> = ({
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

  const [principal] = useState<number>(contract.loanAmount);
  const [unpaidInterest, setUnpaidInterest] = useState<number>(calc.remainingInterest);
  const [totalAmount, setTotalAmount] = useState<number>(contract.loanAmount + calc.remainingInterest);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('Khách thanh toán đủ tiền gốc + lãi để chuộc tài sản về');
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recalculate total if unpaid interest is adjusted (e.g. discount given by admin)
  const handleUnpaidInterestChange = (val: number) => {
    setUnpaidInterest(val);
    setTotalAmount(principal + val);
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) {
      alert('Tổng tiền chuộc phải lớn hơn 0.');
      return;
    }
    setIsConfirmStep(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({
        contractId: contract.id,
        redemptionAmount: totalAmount,
        unpaidInterest,
        paymentMethod,
        date,
        note,
      });
      setIsConfirmStep(false);
      onClose();
    } catch (err: any) {
      alert('Lỗi chuộc tài sản: ' + err.message);
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
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Khách Chuộc Tài Sản</h3>
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

        {!isConfirmStep ? (
          <form onSubmit={handleProceed} className="p-6 space-y-5">
            {/* Asset Notice */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-zinc-400 block">Tài sản bàn giao:</span>
                <strong className="text-white text-sm">{contract.assetName}</strong>
                {contract.licensePlate && (
                  <span className="text-amber-400 font-mono ml-2">[{contract.licensePlate}]</span>
                )}
              </div>
              <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-[11px]">
                {contract.warehouseLocation}
              </span>
            </div>

            {/* Calculations Breakdown */}
            <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800 space-y-3 text-xs">
              <div className="flex justify-between items-center text-zinc-300">
                <span>1. Tiền gốc cần chuộc:</span>
                <strong className="text-white text-sm">{formatVND(principal)}</strong>
              </div>

              <div>
                <div className="flex justify-between items-center text-zinc-300 mb-1">
                  <span>2. Lãi tồn đọng tính đến nay:</span>
                  <span className="text-orange-400 font-semibold">{formatVND(calc.remainingInterest)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">Thực thu lãi:</span>
                  <input
                    type="number"
                    step="10000"
                    value={unpaidInterest}
                    onChange={(e) => handleUnpaidInterestChange(Number(e.target.value))}
                    className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-sm font-bold text-white">TỔNG TIỀN THANH TOÁN:</span>
                <span className="text-xl font-black text-purple-400">{formatVND(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Phương thức thanh toán</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'cash'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
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
                <label className="block text-xs font-medium text-zinc-300 mb-1">Ngày chuộc</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Ghi chú chuộc</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-950/50"
              >
                Tiếp tục xác nhận chuộc →
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation step */
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-200 space-y-1">
                <p className="font-bold text-sm text-white">Xác nhận hoàn tất chuộc tài sản</p>
                <p>
                  Sau khi xác nhận: Hợp đồng sẽ chuyển sang trạng thái <strong>Đã chuộc</strong>, tài sản chuyển sang <strong>Đã trả khách</strong>, và số tiền {formatVND(totalAmount)} được ghi nhận vào quỹ thu.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Tài sản bàn giao:</span>
                <strong className="text-white">{contract.assetName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Khách nhận tài sản:</span>
                <span className="text-white font-bold">{contract.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Tổng tiền thu:</span>
                <span className="font-black text-purple-400 text-base">{formatVND(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Người thực hiện:</span>
                <span className="text-white">{currentUser.fullName}</span>
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
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-950/50 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận & Bàn giao'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
