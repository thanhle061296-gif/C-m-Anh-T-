import React, { useState } from 'react';
import {
  Contract,
  Asset,
  Payment,
  ContractExtension,
  Liquidation,
  ContractImage,
  DatabaseState,
  User,
} from '../types';
import { calculateContractInterest, formatVND, formatDate, formatDateTime } from '../utils/interest';
import { CameraCaptureModal } from './CameraCaptureModal';
import {
  X,
  Calendar,
  DollarSign,
  Coins,
  ShieldCheck,
  Flame,
  Clock,
  Camera,
  Image as ImageIcon,
  Trash2,
  Edit,
  Car,
  Smartphone,
  Laptop,
  CheckCircle,
  AlertTriangle,
  Eye,
  MapPin,
  User as UserIcon,
  Phone,
  FileCheck,
} from 'lucide-react';

interface ContractDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  dbState: DatabaseState;
  currentUser: User;
  onOpenCollectInterest: (contract: Contract) => void;
  onOpenExtend: (contract: Contract) => void;
  onOpenRedeem: (contract: Contract) => void;
  onOpenLiquidate: (contract: Contract) => void;
  onEditContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
  onAddImage: (contractId: string, assetId: string, dataUrl: string, caption: string) => Promise<void>;
  onDeleteImage: (imageId: string) => Promise<void>;
}

export const ContractDetailModal: React.FC<ContractDetailModalProps> = ({
  isOpen,
  onClose,
  contract,
  dbState,
  currentUser,
  onOpenCollectInterest,
  onOpenExtend,
  onOpenRedeem,
  onOpenLiquidate,
  onEditContract,
  onDeleteContract,
  onAddImage,
  onDeleteImage,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'photos' | 'payments' | 'history'>('info');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  if (!isOpen || !contract) return null;

  const asset = dbState.assets.find((a) => a.id === contract.assetId);
  const contractImages = dbState.images.filter((img) => img.contractId === contract.id);
  const contractPayments = dbState.payments.filter((p) => p.contractId === contract.id);
  const contractExtensions = dbState.extensions.filter((e) => e.contractId === contract.id);
  const contractLiquidation = dbState.liquidations.find((l) => l.contractId === contract.id);

  const rules = dbState.settings.interestCalculationRules || {
    halfMonthDaysThreshold: 15,
    fullMonthDaysThreshold: 15,
    nextMonthsRule: 'by_month',
  };
  const calc = calculateContractInterest(contract, rules);

  const canDelete = currentUser.role === 'admin' || currentUser.permissions.canDeleteContract;
  const canLiquidate = currentUser.role === 'admin' || currentUser.permissions.canLiquidate;

  const handleCaptureCamera = async (dataUrl: string) => {
    await onAddImage(contract.id, contract.assetId, dataUrl, 'Chụp trực tiếp');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        if (url) {
          await onAddImage(contract.id, contract.assetId, url, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-600 to-red-800 text-white flex items-center justify-center font-black text-sm shadow-md">
              HĐ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  HỢP ĐỒNG #{contract.code}
                </h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
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
                    ? `Quá hạn ${calc.daysOverdue} ngày`
                    : 'Đang cầm'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Khách hàng: <strong className="text-zinc-200">{contract.customerName}</strong> • {contract.customerPhone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditContract(contract)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
              title="Chỉnh sửa thông tin"
            >
              <Edit className="h-4 w-4" />
            </button>
            {canDelete && (
              <button
                onClick={() => onDeleteContract(contract.id)}
                className="p-2 rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-400 transition"
                title="Xóa hợp đồng (Admin)"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 ${
              activeTab === 'info'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Thông tin chi tiết
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'photos'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Kho ảnh ({contractImages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span>Lịch sử thu lãi ({contractPayments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Gia hạn & Thanh lý</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: DETAILS */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Financial Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400 font-medium">Tiền gốc đã cầm</span>
                  <p className="text-base sm:text-lg font-black text-rose-500 mt-1">
                    {formatVND(contract.loanAmount)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400 font-medium">Lãi suất hợp đồng</span>
                  <p className="text-base sm:text-lg font-black text-amber-400 mt-1">
                    {contract.interestRate}% <span className="text-xs font-normal text-zinc-400">/ tháng</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400 font-medium">Lãi kỳ này (1 tháng)</span>
                  <p className="text-base sm:text-lg font-bold text-white mt-1">
                    {formatVND(calc.currentPeriodInterest)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400 font-medium">Lãi nợ còn thiếu</span>
                  <p className="text-base sm:text-lg font-bold text-orange-400 mt-1">
                    {formatVND(calc.remainingInterest)}
                  </p>
                </div>
              </div>

              {/* Total Payable if redeeming now */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-rose-950/20 to-zinc-900 border border-rose-500/30">
                <div>
                  <span className="text-xs text-zinc-400 font-medium">Tổng tiền cần thanh toán để CHUỘC hôm nay:</span>
                  <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                    {formatVND(calc.totalPayableForRedemption)}
                  </p>
                  <span className="text-[11px] text-zinc-400">
                    (Tiền gốc {formatVND(contract.loanAmount)} + Lãi còn thiếu {formatVND(calc.remainingInterest)})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Số ngày đã cầm:</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">{calc.daysPassed} ngày</span>
                </div>
              </div>

              {/* Customer & Asset Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer card */}
                <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800 p-4 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 pb-2 border-b border-zinc-800">
                    <UserIcon className="h-4 w-4" />
                    <span>HỒ SƠ KHÁCH HÀNG</span>
                  </h4>
                  <div className="text-xs space-y-1.5 text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Họ và tên:</span>
                      <strong className="text-white">{contract.customerName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Số điện thoại:</span>
                      <span className="font-mono text-amber-300 font-semibold">{contract.customerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">CCCD / CMND:</span>
                      <span className="font-mono text-white">{contract.customerIdCard || 'Chưa lưu'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Địa chỉ:</span>
                      <span className="text-right max-w-[200px] truncate">{contract.customerAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Asset details card */}
                <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800 p-4 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 pb-2 border-b border-zinc-800">
                    {contract.assetType === 'car' ? (
                      <Car className="h-4 w-4" />
                    ) : contract.assetType === 'motorbike' ? (
                      <span>🛵</span>
                    ) : contract.assetType === 'phone' ? (
                      <Smartphone className="h-4 w-4" />
                    ) : (
                      <Laptop className="h-4 w-4" />
                    )}
                    <span>TÀI SẢN ĐANG CẦM</span>
                  </h4>
                  <div className="text-xs space-y-1.5 text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Tên tài sản:</span>
                      <strong className="text-white text-right">{contract.assetName}</strong>
                    </div>
                    {contract.licensePlate && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Biển số xe:</span>
                        <span className="font-mono text-amber-400 font-bold bg-zinc-800 px-2 py-0.5 rounded">
                          {contract.licensePlate}
                        </span>
                      </div>
                    )}
                    {asset?.details.imei && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Số IMEI:</span>
                        <span className="font-mono text-amber-400">{asset.details.imei}</span>
                      </div>
                    )}
                    {asset?.details.serialNumber && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Số Serial:</span>
                        <span className="font-mono text-amber-400">{asset.details.serialNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Vị trí trong kho:</span>
                      <strong className="text-emerald-400">{contract.warehouseLocation}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Tình trạng:</span>
                      <span className="text-right text-zinc-300">{asset?.condition || 'Tốt'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline & Metadata */}
              <div className="rounded-2xl bg-zinc-950/40 border border-zinc-800 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-zinc-400">Ngày cầm:</span>
                  <p className="font-semibold text-white mt-0.5">{formatDate(contract.startDate)}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Ngày đến hạn:</span>
                  <p className={`font-bold mt-0.5 ${calc.isOverdue ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatDate(contract.dueDate)}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-400">Nhân viên phụ trách:</span>
                  <p className="font-semibold text-white mt-0.5">{contract.staffName}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Lãi đã trả trước đây:</span>
                  <p className="font-semibold text-emerald-400 mt-0.5">{formatVND(contract.totalInterestPaid)}</p>
                </div>
              </div>

              {contract.notes && (
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300">
                  <span className="text-zinc-400 block font-semibold mb-0.5">Ghi chú:</span>
                  {contract.notes}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PHOTO GALLERY (Spec #16, #17, #18) */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs text-zinc-400">
                  Toàn bộ ảnh chụp và giấy tờ gắn liền với hợp đồng #{contract.code}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 active:scale-95 transition"
                  >
                    <Camera className="h-4 w-4" />
                    <span>📷 Chụp ảnh</span>
                  </button>

                  <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 cursor-pointer active:scale-95 transition">
                    <ImageIcon className="h-4 w-4 text-amber-400" />
                    <span>🖼️ Chọn từ Album</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {contractImages.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                  Chưa có ảnh nào cho hợp đồng này. Bấm <strong>Chụp ảnh</strong> hoặc <strong>Chọn từ Album</strong> để thêm ảnh tài sản/CCCD.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {contractImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950"
                    >
                      <img
                        src={img.dataUrl}
                        alt="Hình ảnh hợp đồng"
                        className="h-full w-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          onClick={() => setLightboxImg(img.dataUrl)}
                          className="p-1.5 rounded-lg bg-black/80 text-white hover:bg-black"
                          title="Phóng to"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteImage(img.id)}
                          className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                          title="Xóa ảnh"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-zinc-300 truncate">
                        {img.caption || formatDate(img.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS HISTORY */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs text-zinc-400">
                  Lịch sử các lần thu lãi và thanh toán của hợp đồng này
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  Đã thu lũy kế: {formatVND(contract.totalInterestPaid)}
                </span>
              </div>

              {contractPayments.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                  Chưa có phiếu thu nào cho hợp đồng này.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {contractPayments.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono">{p.code}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            {p.type === 'interest' ? 'Thu lãi' : p.type === 'redemption' ? 'Thu chuộc' : 'Gia hạn'}
                          </span>
                          <span className="text-zinc-400">({p.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'})</span>
                        </div>
                        <p className="text-zinc-400 mt-1">
                          Ngày thu: {formatDate(p.date)} • Người thu: {p.staffName}
                          {p.note && ` • Ghi chú: ${p.note}`}
                        </p>
                      </div>
                      <span className="font-black text-emerald-400 text-sm">{formatVND(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXTENSIONS & LIQUIDATION */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  Lịch sử gia hạn ({contractExtensions.length})
                </h4>
                {contractExtensions.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-2">Hợp đồng này chưa từng gia hạn.</p>
                ) : (
                  <div className="space-y-2">
                    {contractExtensions.map((e) => (
                      <div key={e.id} className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white">
                            Gia hạn từ {formatDate(e.oldDueDate)} ➔ mới: <span className="text-amber-400">{formatDate(e.newDueDate)}</span>
                          </p>
                          <p className="text-zinc-400 mt-0.5">
                            Thêm {e.extensionDays} ngày • Người làm: {e.staffName} • {e.note}
                          </p>
                        </div>
                        {e.interestCollected > 0 && (
                          <span className="font-bold text-emerald-400">+{formatVND(e.interestCollected)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {contractLiquidation && (
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                    Biên bản thanh lý tài sản
                  </h4>
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Giá bán thanh lý:</span>
                      <strong className="text-white text-sm">{formatVND(contractLiquidation.liquidationPrice)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Tiền gốc + Lãi nợ khi thanh lý:</span>
                      <span>{formatVND(contractLiquidation.principalAmount + contractLiquidation.unpaidInterest)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Chênh lệch (Lời/Lỗ):</span>
                      <strong className={contractLiquidation.profitOrLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatVND(contractLiquidation.profitOrLoss)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Người mua:</span>
                      <span>{contractLiquidation.buyerName || 'Khách vãng lai'} ({contractLiquidation.buyerPhone || 'N/A'})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Ngày thanh lý:</span>
                      <span>{formatDate(contractLiquidation.date)} • {contractLiquidation.staffName}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions (Quick Access) */}
        <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {contract.status !== 'redeemed' && contract.status !== 'liquidated' && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenCollectInterest(contract)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs shadow-md active:scale-95 transition"
                >
                  <Coins className="h-4 w-4" />
                  <span>Thu lãi</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenExtend(contract)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
                >
                  <Clock className="h-4 w-4" />
                  <span>Gia hạn</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenRedeem(contract)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Chuộc tài sản</span>
                </button>

                {canLiquidate && (
                  <button
                    type="button"
                    onClick={() => onOpenLiquidate(contract)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
                  >
                    <Flame className="h-4 w-4" />
                    <span>Thanh lý</span>
                  </button>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Direct Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureCamera}
      />

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImg} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-2 right-2 rounded-full bg-black/80 p-2 text-white hover:bg-zinc-800"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
