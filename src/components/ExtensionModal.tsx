import React, { useState } from 'react';
import { Contract, SystemSettings, User } from '../types';
import { calculateContractInterest, formatVND, formatDate } from '../utils/interest';
import { Clock, X, Check, Calendar } from 'lucide-react';

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  settings: SystemSettings;
  currentUser: User;
  onConfirm: (data: {
    contractId: string;
    newDueDate: string;
    extensionDays: number;
    interestCollected: number;
    note: string;
  }) => Promise<void>;
}

export const ExtensionModal: React.FC<ExtensionModalProps> = ({
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

  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [newDueDate, setNewDueDate] = useState<string>(() => {
    const base = new Date(contract.dueDate);
    base.setDate(base.getDate() + 30);
    return base.toISOString().split('T')[0];
  });
  const [interestCollected, setInterestCollected] = useState<number>(calc.currentPeriodInterest);
  const [note, setNote] = useState('Khách đóng tiền lãi và xin gia hạn thêm');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectDays = (days: number) => {
    setExtensionDays(days);
    const base = new Date(contract.dueDate);
    base.setDate(base.getDate() + days);
    setNewDueDate(base.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm({
        contractId: contract.id,
        newDueDate,
        extensionDays: Number(extensionDays),
        interestCollected: Number(interestCollected),
        note,
      });
      onClose();
    } catch (err: any) {
      alert('Lỗi gia hạn: ' + err.message);
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
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Gia Hạn Hợp Đồng</h3>
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
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Ngày đến hạn hiện tại:</span>
              <strong className="text-white font-mono">{formatDate(contract.dueDate)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Tiền gốc:</span>
              <span className="text-white font-bold">{formatVND(contract.loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Lãi 1 tháng (ước tính):</span>
              <span className="text-amber-400 font-semibold">{formatVND(calc.currentPeriodInterest)}</span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">Chọn thời gian gia hạn thêm</label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleSelectDays(days)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    extensionDays === days
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  +{days} ngày
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Số ngày gia hạn</label>
              <input
                type="number"
                min="1"
                required
                value={extensionDays}
                onChange={(e) => handleSelectDays(Number(e.target.value))}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-sm text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Ngày đến hạn mới</label>
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-blue-500/60 px-3 py-2.5 text-sm text-blue-300 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Thu lãi kỳ này khi gia hạn (VNĐ)
            </label>
            <input
              type="number"
              step="10000"
              value={interestCollected}
              onChange={(e) => setInterestCollected(Number(e.target.value))}
              className="w-full rounded-xl bg-zinc-950 border border-amber-500/60 px-3 py-2.5 text-base font-bold text-amber-400"
            />
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Bằng chữ: <strong className="text-white">{formatVND(interestCollected)}</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Ghi chú gia hạn</label>
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
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-950/50 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận gia hạn'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
