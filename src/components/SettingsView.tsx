import React, { useState } from 'react';
import { DatabaseState, SystemSettings, User } from '../types';
import { formatDateTime } from '../utils/interest';
import {
  Settings,
  Store,
  Percent,
  Calculator,
  Warehouse,
  Save,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Check,
  ShieldAlert,
  Image as ImageIcon,
} from 'lucide-react';

interface SettingsViewProps {
  dbState: DatabaseState;
  currentUser: User;
  onUpdateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  onCreateBackup: () => Promise<void>;
  onRestoreBackup: (backupData: DatabaseState) => Promise<void>;
  onClearDemoData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  dbState,
  currentUser,
  onUpdateSettings,
  onCreateBackup,
  onRestoreBackup,
  onClearDemoData,
}) => {
  const { settings } = dbState;
  const isAdmin = currentUser.role === 'admin';

  // Shop Info State
  const [shopName, setShopName] = useState(settings.shopName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [bankName, setBankName] = useState(settings.bankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(settings.bankAccountNumber);
  const [bankAccountName, setBankAccountName] = useState(settings.bankAccountName);

  // Interest Rate (Spec #8)
  const [defaultInterestRate, setDefaultInterestRate] = useState<number>(settings.defaultInterestRate);

  // Interest Rules (Spec #9)
  const [halfMonthDays, setHalfMonthDays] = useState<number>(
    settings.interestCalculationRules?.halfMonthDaysThreshold || 15
  );
  const [fullMonthDays, setFullMonthDays] = useState<number>(
    settings.interestCalculationRules?.fullMonthDaysThreshold || 15
  );

  // Warehouse locations
  const [locations, setLocations] = useState<string[]>(settings.warehouseLocations);
  const [newLocationName, setNewLocationName] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Custom Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (url) {
        setLogoUrl(url);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddLocation = () => {
    if (!newLocationName.trim()) return;
    if (locations.includes(newLocationName.trim())) {
      alert('Vị trí này đã tồn tại.');
      return;
    }
    setLocations([...locations, newLocationName.trim()]);
    setNewLocationName('');
  };

  const handleRemoveLocation = (loc: string) => {
    if (locations.length <= 1) {
      alert('Cần ít nhất 1 vị trí kho.');
      return;
    }
    setLocations(locations.filter((l) => l !== loc));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateSettings({
        shopName: shopName.trim(),
        logoUrl,
        phone: phone.trim(),
        address: address.trim(),
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim(),
        defaultInterestRate: Number(defaultInterestRate),
        interestCalculationRules: {
          halfMonthDaysThreshold: Number(halfMonthDays),
          fullMonthDaysThreshold: Number(fullMonthDays),
          nextMonthsRule: 'by_month',
        },
        warehouseLocations: locations,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Lỗi lưu cấu hình: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Restore backup from file
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Bạn có chắc chắn muốn khôi phục dữ liệu từ file này? Dữ liệu hiện tại sẽ được thay thế bằng dữ liệu từ bản sao lưu.')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await onRestoreBackup(json);
        alert('Khôi phục dữ liệu thành công!');
      } catch (err) {
        alert('File sao lưu không đúng định dạng JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-zinc-300" />
            <span>CÀI ĐẶT HỆ THỐNG</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cấu hình thông tin tiệm, điều chỉnh lãi suất, quy tắc tính lãi và sao lưu dữ liệu an toàn
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold animate-in fade-in">
            <Check className="h-4 w-4" />
            <span>Đã lưu thành công!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Section 1: Thông tin tiệm & Logo (Spec #1 & #29) */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span>1. THÔNG TIN TIỆM CẦM ĐỒ & LOGO THƯƠNG HIỆU</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Customizer */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-center space-y-3">
              <span className="text-xs font-bold text-zinc-300">Logo hiển thị</span>
              <div className="relative group">
                <img
                  src={logoUrl || '/logo.jpg'}
                  alt="Logo Tiệm"
                  className="h-28 w-28 rounded-2xl object-cover border-2 border-amber-500/40 shadow-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.jpg';
                  }}
                />
              </div>

              <div className="flex flex-col w-full gap-2 pt-2">
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 cursor-pointer transition">
                  <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>Tải ảnh Logo mới</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setLogoUrl('/logo.jpg')}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300"
                >
                  Dùng logo gốc Anh Tú
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Tên tiệm cầm đồ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Số điện thoại Hotline <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-amber-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Địa chỉ tiệm</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              {/* Bank Account for receiving payments */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <span className="text-xs font-bold text-blue-400 block">Tài khoản nhận tiền chuyển khoản:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Ngân hàng</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="MB Bank"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Số tài khoản</label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="0969905234"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Tên chủ tài khoản</label>
                    <input
                      type="text"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="CẦM ĐỒ ANH TÚ"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white uppercase font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Lãi suất & Quy tắc tính lãi (Spec #8 & #9) */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span>2. LÃI SUẤT HỆ THỐNG & QUY TẮC TÍNH TỰ ĐỘNG</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lãi suất mặc định */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">Lãi suất mặc định (% / tháng)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  Admin tùy chỉnh
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={defaultInterestRate}
                  onChange={(e) => setDefaultInterestRate(Number(e.target.value))}
                  className="w-32 rounded-xl bg-zinc-900 border border-amber-500/60 px-4 py-2.5 text-lg font-black text-amber-400"
                />
                <span className="text-sm text-zinc-300 font-bold">%/tháng</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[1, 2, 2.5, 3, 3.5, 4, 5].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setDefaultInterestRate(rate)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      defaultInterestRate === rate
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-zinc-400 pt-2 border-t border-zinc-900 leading-relaxed">
                ℹ️ <strong>LƯU Ý QUAN TRỌNG (Spec #8):</strong> Mức lãi suất này tự động điền khi tạo hợp đồng mới. Mọi hợp đồng đã tạo trước đó sẽ giữ nguyên mức lãi suất riêng đã lưu của chúng, không bị ảnh hưởng.
              </p>
            </div>

            {/* Quy tắc tính lãi (Spec #9) */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">Quy tắc phân đoạn ngày tính lãi</span>
                <Calculator className="h-4 w-4 text-zinc-400" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Từ 1 đến ngày thứ:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="29"
                      value={halfMonthDays}
                      onChange={(e) => setHalfMonthDays(Number(e.target.value))}
                      className="w-16 rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-white text-center font-bold"
                    />
                    <span className="text-zinc-400">➔ Tính 1/2 tháng (0.5 kỳ)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Trên ngày thứ {halfMonthDays}:</span>
                  <span className="text-amber-400 font-bold">➔ Tính đủ 1 tháng (1.0 kỳ)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Các tháng tiếp theo:</span>
                  <span className="text-emerald-400 font-bold">➔ Tính theo chu kỳ tròn tháng</span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 pt-2 border-t border-zinc-900 leading-relaxed">
                ✓ Hệ thống tự động tính: Gốc, lãi, số ngày, lãi đã đóng và lãi còn thiếu khi nhân viên mở thu lãi hoặc chuộc.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Vị trí kho tài sản (Spec #20) */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              <span>3. QUẢN LÝ DANH MỤC VỊ TRÍ KHO TÀI SẢN</span>
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <div
                  key={loc}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                >
                  <span>📍 {loc}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(loc)}
                    className="text-zinc-500 hover:text-rose-400"
                    title="Xóa vị trí"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 max-w-sm pt-2">
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Nhập tên khu vực / tủ kho..."
                className="flex-1 rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddLocation}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs"
              >
                + Thêm
              </button>
            </div>
          </div>
        </div>

        {/* Save button for settings */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm shadow-xl shadow-rose-950/60 transition active:scale-95 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            <span>{isSaving ? 'Đang lưu...' : 'LƯU TẤT CẢ CÀI ĐẶT'}</span>
          </button>
        </div>
      </form>

      {/* Section 4: Sao lưu & Khôi phục dữ liệu (Spec #35) */}
      <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>4. SAO LƯU & KHÔI PHỤC DỮ LIỆU BỀN VỮNG</span>
          </h3>
          <span className="text-xs text-zinc-400">
            Lần sao lưu gần nhất: <strong className="text-white">{formatDateTime(settings.lastBackupTime)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Download JSON */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <span className="text-xs font-bold text-white block">Tải bản sao lưu về máy</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Xuất toàn bộ cơ sở dữ liệu (Khách hàng, Hợp đồng, Tài sản, Hình ảnh, Thu chi) thành file JSON để lưu trữ an toàn.
            </p>
            <a
              href="/api/backup/export"
              download
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
            >
              <Download className="h-4 w-4" />
              <span>Tải file backup (.JSON)</span>
            </a>
          </div>

          {/* Create Server Snapshot */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <span className="text-xs font-bold text-white block">Tạo snapshot trên máy chủ</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Tạo ngay một bản sao lưu cục bộ tức thời lưu trữ vĩnh viễn trong thư mục data/backups/ trên máy chủ.
            </p>
            <button
              type="button"
              onClick={onCreateBackup}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs border border-zinc-700 transition"
            >
              Tạo bản sao lưu ngay
            </button>
          </div>

          {/* Restore JSON */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <span className="text-xs font-bold text-white block">Khôi phục từ file JSON</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Nhập lại toàn bộ dữ liệu từ bản sao lưu trước đó nếu thiết bị hoặc dữ liệu gặp sự cố.
            </p>
            <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 cursor-pointer transition">
              <Upload className="h-4 w-4 text-blue-400" />
              <span>Chọn file JSON để khôi phục</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Section 5: Xóa dữ liệu Demo (Spec #33) */}
      {isAdmin && (
        <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-600/20 text-rose-500 flex items-center justify-center">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400">
                5. XÓA DỮ LIỆU DEMO / DỌN DẸP HỆ THỐNG
              </h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                Chuyển từ giai đoạn xem thử sang bắt đầu nhập liệu thực tế cho tiệm Cầm đồ Anh Tú
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300 space-y-2">
            <p className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Thao tác này sẽ xóa toàn bộ các hợp đồng, khách hàng và giao dịch thử nghiệm. <strong>Tài khoản Admin, cấu hình lãi suất và thông tin tiệm sẽ được giữ nguyên 100%.</strong>
              </span>
            </p>
            <p className="text-zinc-400 text-[11px]">
              Trước khi xóa, hệ thống sẽ tự động tạo một bản sao lưu an toàn trong máy chủ.
            </p>
          </div>

          <button
            type="button"
            onClick={onClearDemoData}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
            <span>XÓA SẠCH DỮ LIỆU DEMO</span>
          </button>
        </div>
      )}
    </div>
  );
};
