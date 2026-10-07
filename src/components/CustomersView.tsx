import React, { useState } from 'react';
import { Customer, DatabaseState, User } from '../types';
import { formatVND, formatDate } from '../utils/interest';
import {
  Users,
  PlusCircle,
  Search,
  Phone,
  MapPin,
  FileText,
  Clock,
  Trash2,
  Edit,
  X,
  Check,
  ChevronRight,
  ShieldCheck,
  Coins,
  History,
} from 'lucide-react';

interface CustomersViewProps {
  dbState: DatabaseState;
  currentUser: User;
  onOpenContractDetail: (contractId: string) => void;
  onCreateCustomer: (customer: Partial<Customer>) => Promise<void>;
  onUpdateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  dbState,
  currentUser,
  onOpenContractDetail,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const { customers, contracts, payments, assets } = dbState;
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const canDelete = currentUser.role === 'admin' || currentUser.permissions.canDeleteData;

  const openAddModal = () => {
    setEditingCustomer(null);
    setFullName('');
    setPhone('');
    setIdCard('');
    setAddress('');
    setNotes('');
    setCustomerError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCustomer(c);
    setFullName(c.fullName);
    setPhone(c.phone);
    setIdCard(c.idCard);
    setAddress(c.address);
    setNotes(c.notes || '');
    setCustomerError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError(null);
    if (!fullName.trim() || !phone.trim()) {
      setCustomerError('Vui lòng nhập họ tên và số điện thoại.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await onUpdateCustomer(editingCustomer.id, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          idCard: idCard.trim(),
          address: address.trim(),
          notes: notes.trim(),
        });
      } else {
        await onCreateCustomer({
          fullName: fullName.trim(),
          phone: phone.trim(),
          idCard: idCard.trim(),
          address: address.trim(),
          notes: notes.trim(),
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setCustomerError('Lỗi lưu khách hàng: ' + (err.message || 'Thao tác không thành công'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search filter
  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = c.fullName.toLowerCase().includes(q);
    const phoneMatch = c.phone.includes(q);
    const idCardMatch = c.idCard.includes(q);

    // Also search in customer's contracts or license plates
    const customerContracts = contracts.filter((ct) => ct.customerId === c.id);
    const contractMatch = customerContracts.some(
      (ct) =>
        ct.code.toLowerCase().includes(q) ||
        ct.licensePlate?.toLowerCase().includes(q) ||
        ct.assetName.toLowerCase().includes(q)
    );

    return nameMatch || phoneMatch || idCardMatch || contractMatch;
  });

  // Get full lifecycle timeline for selected customer (Spec #6)
  const customerContracts = selectedCustomer
    ? contracts.filter((c) => c.customerId === selectedCustomer.id || c.customerPhone === selectedCustomer.phone)
    : [];

  const customerPayments = selectedCustomer
    ? payments.filter((p) => p.customerId === selectedCustomer.id || customerContracts.some((c) => c.id === p.contractId))
    : [];

  const totalBorrowed = customerContracts.reduce((acc, c) => acc + c.loanAmount, 0);
  const totalPaidInterest = customerPayments
    .filter((p) => p.type === 'interest')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-5 pb-12">
      {/* Top action & title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            <span>QUẢN LÝ KHÁCH HÀNG</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Danh bạ: <strong className="text-white">{customers.length}</strong> khách hàng • Tra cứu toàn bộ lịch sử giao dịch
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/50 active:scale-95 transition"
        >
          <PlusCircle className="h-5 w-5" />
          <span>+ THÊM KHÁCH HÀNG</span>
        </button>
      </div>

      {/* Search bar */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Tên khách, SĐT, CCCD, Mã hợp đồng, Biển số xe..."
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Grid: Left list, Right Customer Detailed Journey */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Customer List */}
        <div className={`${selectedCustomer ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-zinc-900/60 border border-dashed border-zinc-800 text-zinc-400 text-xs">
              Chưa có thông tin khách hàng nào phù hợp.
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const countContracts = contracts.filter((ct) => ct.customerId === c.id || ct.customerPhone === c.phone).length;
              const isSelected = selectedCustomer?.id === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-zinc-850 border-emerald-500/80 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-sm truncate">{c.fullName}</strong>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-emerald-400 font-bold">
                        {countContracts} HĐ
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="font-mono text-zinc-300">📞 {c.phone}</span>
                      {c.idCard && <span>• CCCD: {c.idCard}</span>}
                    </div>

                    {c.address && (
                      <p className="text-[11px] text-zinc-500 truncate max-w-xs">
                        📍 {c.address}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => openEditModal(c, e)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      title="Sửa"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => onDeleteCustomer(c.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-zinc-500 ml-1" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Customer Complete History & Journey (Spec #6) */}
        {selectedCustomer && (
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 sm:p-6 shadow-xl space-y-5">
              {/* Profile Card Header */}
              <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{selectedCustomer.fullName}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                      Khách hàng thân thiết
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-300">
                    <p>📞 SĐT: <strong className="text-white font-mono">{selectedCustomer.phone}</strong></p>
                    <p>🆔 CCCD / CMND: <strong className="text-white font-mono">{selectedCustomer.idCard || 'Chưa cập nhật'}</strong></p>
                    <p>📍 Địa chỉ: <span className="text-zinc-200">{selectedCustomer.address || 'Chưa cập nhật'}</span></p>
                    {selectedCustomer.notes && (
                      <p className="text-zinc-400 italic">📝 Ghi chú: {selectedCustomer.notes}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400">Tổng tiền đã cầm:</span>
                  <p className="text-base font-black text-rose-500 mt-1">{formatVND(totalBorrowed)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400">Tổng tiền lãi đã đóng:</span>
                  <p className="text-base font-black text-emerald-400 mt-1">{formatVND(totalPaidInterest)}</p>
                </div>
              </div>

              {/* The Whole Journey: Khách hàng -> Hợp đồng -> Tài sản -> Thanh toán -> Gia hạn -> Chuộc / Thanh lý */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-3">
                  <History className="h-4 w-4" />
                  <span>TOÀN BỘ LỊCH SỬ GIAO DỊCH ({customerContracts.length} HỢP ĐỒNG)</span>
                </h4>

                {customerContracts.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-4">Khách hàng chưa có hợp đồng nào.</p>
                ) : (
                  <div className="space-y-3">
                    {customerContracts.map((contract) => (
                      <div
                        key={contract.id}
                        onClick={() => onOpenContractDetail(contract.id)}
                        className="p-4 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs font-mono">#{contract.code}</span>
                            <span className="text-xs text-zinc-300 font-semibold">{contract.assetName}</span>
                            {contract.licensePlate && (
                              <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                                {contract.licensePlate}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                              contract.status === 'redeemed'
                                ? 'bg-purple-500/20 text-purple-300'
                                : contract.status === 'liquidated'
                                ? 'bg-zinc-700 text-zinc-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {contract.status === 'redeemed'
                              ? 'Đã chuộc'
                              : contract.status === 'liquidated'
                              ? 'Đã thanh lý'
                              : 'Đang cầm'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>Cầm: {formatDate(contract.startDate)} ➔ Hạn: {formatDate(contract.dueDate)}</span>
                          <span className="font-bold text-white">{formatVND(contract.loanAmount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">
                {editingCustomer ? 'Chỉnh sửa Khách hàng' : 'Thêm Khách hàng mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {customerError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {customerError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Họ và tên khách <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Số CCCD / CMND</label>
                <input
                  type="text"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  placeholder="05609600xxxx"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Phan Rang, Ninh Thuận..."
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Khách quen, thanh toán đúng hạn..."
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
