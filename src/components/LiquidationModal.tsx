import React, { useState } from 'react';
import { Contract, SystemSettings, User } from '../types';
import { calculateContractInterest, formatVND } from '../utils/interest';
import { Flame, X, Check, AlertTriangle } from 'lucide-react';

interface LiquidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  settings: SystemSettings;
  currentUser: User;
  onConfirm: (data: {
    contractId: string;
    liquidationPrice: number;
    unpaidInterest: number;
    buyerName: string;
    buyerPhone: string;
    date: string;
    note: string;
  }) => Promise<void>;
}

export const LiquidationModal: React.FC<LiquidationModalProps> = ({
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

  const [liquidationPrice, setLiquidationPrice] = useState<number>(contract.loanAmount * 1.15);
  const [unpaidInterest, setUnpaidInterest] = useState<number>(calc.remainingInterest);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('Khách quá hạn lâu ngày không đóng lãi, tiến hành thanh lý thu hồi vốn');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profit / Loss calculation
  const totalCost = contract.loanAmount + unpaidInterest;
  const profitOrLoss = liquidationPrice - totalCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (liquidationPrice <= 0) {
      alert('Giá thanh lý phải lớn hơn 0.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm({
        contractId: contract.id,
        liquidationPrice: Number(liquidationPrice),
        unpaidInterest: Number(unpaidInterest),
        buyerName,
        buyerPhone,
        date,
        note,
      });
      onClose();
    } catch (err: any) {
      alert('Lỗi thanh lý tài sản: ' + err.message);
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
            <div className="h-10 w-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Thanh Lý Tài Sản Cầm Đồ</h3>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Warning */}
          <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/30 text-xs text-orange-200 flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
            <p>
              Thao tác này sẽ chuyển hợp đồng sang trạng thái <strong>Đã thanh lý</strong>, chuyển tài sản vào <strong>Kho thanh lý</strong> và ghi nhận số tiền bán vào quỹ thu tiệm.
            </p>
          </div>

          {/* Asset & Financials Breakdown */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Tài sản thanh lý:</span>
              <strong className="text-white">{contract.assetName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Tiền gốc cầm ban đầu:</span>
              <span className="text-white font-bold">{formatVND(contract.loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Lãi tồn đọng:</span>
              <span className="text-amber-400 font-semibold">{formatVND(unpaidInterest)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm">
              <span className="font-bold text-zinc-300">Tổng vốn + Lãi kẹt:</span>
              <strong className="text-white">{formatVND(totalCost)}</strong>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Giá bán thanh lý thực tế (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="100000"
              required
              value={liquidationPrice || ''}
              onChange={(e) => setLiquidationPrice(Number(e.target.value))}
              className="w-full rounded-xl bg-zinc-950 border border-orange-500/60 px-4 py-2.5 text-lg font-black text-orange-400 focus:outline-none"
            />
            <div className="mt-1 flex justify-between text-[11px]">
              <span className="text-zinc-400">Bằng chữ: <strong className="text-white">{formatVND(liquidationPrice)}</strong></span>
              <span className={profitOrLoss >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {profitOrLoss >= 0 ? `Lời: +${formatVND(profitOrLoss)}` : `Lỗ: ${formatVND(profitOrLoss)}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Họ tên người mua</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Cửa hàng xe / Người mua"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Số điện thoại người mua</label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="0988 123 456"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Ghi chú thanh lý</label>
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-lg shadow-orange-950/50 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận thanh lý'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
