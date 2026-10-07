import React, { useState, useEffect } from 'react';
import {
  Contract,
  Asset,
  Customer,
  AssetType,
  SystemSettings,
  ContractImage,
} from '../types';
import { formatVND } from '../utils/interest';
import { CameraCaptureModal } from './CameraCaptureModal';
import {
  X,
  Camera,
  Image as ImageIcon,
  Trash2,
  Car,
  Smartphone,
  Laptop,
  HelpCircle,
  Upload,
  Check,
  Eye,
} from 'lucide-react';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contract: Partial<Contract>, asset: Partial<Asset>, images: { dataUrl: string; caption?: string }[]) => Promise<void>;
  existingContract?: Contract | null;
  existingAsset?: Asset | null;
  existingImages?: ContractImage[];
  existingCustomers: Customer[];
  settings: SystemSettings;
  currentUser: { id: string; fullName: string; role: string };
  defaultCode?: string;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingContract,
  existingAsset,
  existingImages = [],
  existingCustomers,
  settings,
  currentUser,
  defaultCode,
}) => {
  const isEditing = !!existingContract;

  // Customer Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIdCard, setCustomerIdCard] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Asset Form State
  const [assetType, setAssetType] = useState<AssetType>('motorbike');
  const [assetName, setAssetName] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<number>(0);
  const [condition, setCondition] = useState('Nguyên bản, hoạt động tốt');
  const [warehouseLocation, setWarehouseLocation] = useState(settings.warehouseLocations[0] || 'Kho chính');

  // Asset Details Fields
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [frameNumber, setFrameNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [odo, setOdo] = useState('');
  // Car
  const [version, setVersion] = useState('');
  const [seats, setSeats] = useState('5');
  // Phone
  const [storage, setStorage] = useState('128GB');
  const [imei, setImei] = useState('');
  const [batteryHealth, setBatteryHealth] = useState('88%');
  const [accessories, setAccessories] = useState('Sạc + Cáp');
  // Laptop
  const [cpu, setCpu] = useState('Apple M2 / Core i7');
  const [ram, setRam] = useState('16GB');
  const [ssd, setSsd] = useState('512GB');
  const [screen, setScreen] = useState('14 inch');
  const [serialNumber, setSerialNumber] = useState('');
  // Other
  const [customSpecs, setCustomSpecs] = useState('');

  // Contract Financials
  const [code, setCode] = useState(defaultCode || 'HD-000101');
  const [loanAmount, setLoanAmount] = useState<number>(10000000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  // Contract-specific interest rate (defaults to settings.defaultInterestRate, adjustable per contract)
  const [interestRate, setInterestRate] = useState<number>(settings.defaultInterestRate || 3.0);
  const [contractNotes, setContractNotes] = useState('');

  // Photos
  const [images, setImages] = useState<{ id?: string; dataUrl: string; caption?: string }[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize or populate form
  useEffect(() => {
    if (existingContract) {
      setCode(existingContract.code);
      setSelectedCustomerId(existingContract.customerId);
      setCustomerName(existingContract.customerName);
      setCustomerPhone(existingContract.customerPhone);
      setCustomerIdCard(existingContract.customerIdCard);
      setCustomerAddress(existingContract.customerAddress);
      setLoanAmount(existingContract.loanAmount);
      setStartDate(existingContract.startDate);
      setDueDate(existingContract.dueDate);
      setInterestRate(existingContract.interestRate);
      setWarehouseLocation(existingContract.warehouseLocation);
      setContractNotes(existingContract.notes || '');

      if (existingAsset) {
        setAssetType(existingAsset.type);
        setAssetName(existingAsset.name);
        setEstimatedValue(existingAsset.estimatedValue);
        setCondition(existingAsset.condition);
        const d = existingAsset.details || {};
        setBrand(d.brand || '');
        setModel(d.model || '');
        setYear(String(d.year || ''));
        setColor(d.color || '');
        setLicensePlate(d.licensePlate || '');
        setFrameNumber(d.frameNumber || '');
        setEngineNumber(d.engineNumber || '');
        setOdo(d.odo || '');
        setVersion(d.version || '');
        setSeats(String(d.seats || '5'));
        setStorage(d.storage || '');
        setImei(d.imei || '');
        setBatteryHealth(d.batteryHealth || '');
        setAccessories(d.accessories || '');
        setCpu(d.cpu || '');
        setRam(d.ram || '');
        setSsd(d.ssd || '');
        setScreen(d.screen || '');
        setSerialNumber(d.serialNumber || '');
        setCustomSpecs(d.customSpecs || '');
      }

      if (existingImages && existingImages.length > 0) {
        setImages(existingImages.map((img) => ({ id: img.id, dataUrl: img.dataUrl, caption: img.caption })));
      }
    } else {
      // New contract: reset
      setCode(defaultCode || `HD-${String(Date.now()).slice(-6)}`);
      setInterestRate(settings.defaultInterestRate || 3.0);
      setImages([]);
    }
  }, [existingContract, existingAsset, existingImages, defaultCode, settings.defaultInterestRate]);

  // When customer is selected from existing dropdown
  const handleSelectExistingCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const found = existingCustomers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.fullName);
      setCustomerPhone(found.phone);
      setCustomerIdCard(found.idCard);
      setCustomerAddress(found.address);
      setCustomerNotes(found.notes || '');
    }
  };

  // Multiple album photo upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setImages((prev) => [...prev, { dataUrl, caption: file.name }]);
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset file input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCaptureCamera = (base64Image: string) => {
    setImages((prev) => [...prev, { dataUrl: base64Image, caption: 'Chụp trực tiếp' }]);
  };

  const calculateMonthlyInterest = (amount: number, rate: number) => {
    return Math.round(amount * (rate / 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('Vui lòng nhập Tên và Số điện thoại khách hàng.');
      return;
    }
    if (!assetName.trim()) {
      setFormError('Vui lòng nhập Tên tài sản.');
      return;
    }
    if (loanAmount <= 0) {
      setFormError('Số tiền cầm phải lớn hơn 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const contractPayload: Partial<Contract> = {
        code,
        customerId: selectedCustomerId || `KH-${Date.now()}`,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerIdCard: customerIdCard.trim(),
        customerAddress: customerAddress.trim(),
        assetName: assetName.trim(),
        assetType,
        licensePlate: licensePlate.trim() || undefined,
        loanAmount: Number(loanAmount),
        startDate,
        dueDate,
        interestRate: Number(interestRate),
        staffName: currentUser.fullName,
        staffId: currentUser.id,
        warehouseLocation,
        notes: contractNotes.trim(),
      };

      const assetDetails = {
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        version: version.trim() || undefined,
        year: year.trim() || undefined,
        color: color.trim() || undefined,
        licensePlate: licensePlate.trim() || undefined,
        frameNumber: frameNumber.trim() || undefined,
        engineNumber: engineNumber.trim() || undefined,
        odo: odo.trim() || undefined,
        seats: seats.trim() || undefined,
        storage: storage.trim() || undefined,
        imei: imei.trim() || undefined,
        batteryHealth: batteryHealth.trim() || undefined,
        accessories: accessories.trim() || undefined,
        cpu: cpu.trim() || undefined,
        ram: ram.trim() || undefined,
        ssd: ssd.trim() || undefined,
        screen: screen.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        customSpecs: customSpecs.trim() || undefined,
      };

      const assetPayload: Partial<Asset> = {
        name: assetName.trim(),
        type: assetType,
        details: assetDetails,
        condition: condition.trim(),
        estimatedValue: Number(estimatedValue) || Number(loanAmount) * 1.3,
        warehouseLocation,
      };

      await onSubmit(contractPayload, assetPayload, images);
      onClose();
    } catch (err: any) {
      setFormError('Lỗi lưu hợp đồng: ' + (err.message || 'Thao tác không thành công'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-600/20 text-rose-500 flex items-center justify-center font-bold">
              {isEditing ? '✎' : '+'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? `Chỉnh sửa Hợp đồng #${code}` : 'Tạo Hợp Đồng Cầm Đồ Mới'}
              </h2>
              <p className="text-xs text-zinc-400">
                {settings.shopName} • Mã HĐ: <span className="font-mono text-amber-400 font-bold">{code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError(null)} className="text-zinc-400 hover:text-white ml-2">×</button>
            </div>
          )}

          {/* Section 1: Customer Info */}
          <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>1. THÔNG TIN KHÁCH HÀNG</span>
              </h3>
              {existingCustomers.length > 0 && !isEditing && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Khách cũ:</span>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                    className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-200 focus:outline-none"
                  >
                    <option value="">-- Chọn khách đã có --</option>
                    {existingCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} - {c.phone}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Họ và tên khách <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Số CCCD / CMND
                </label>
                <input
                  type="text"
                  value={customerIdCard}
                  onChange={(e) => setCustomerIdCard(e.target.value)}
                  placeholder="05609600xxxx"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Địa chỉ thường trú / tạm trú
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Phan Rang, Ninh Thuận / Khánh Hoà..."
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Asset Details */}
          <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              2. THÔNG TIN TÀI SẢN CẦM ĐỒ
            </h3>

            {/* Asset Type Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAssetType('motorbike')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  assetType === 'motorbike'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                }`}
              >
                <span>🛵 Xe Máy</span>
              </button>
              <button
                type="button"
                onClick={() => setAssetType('car')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  assetType === 'car'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                }`}
              >
                <Car className="h-4 w-4" />
                <span>Ô Tô</span>
              </button>
              <button
                type="button"
                onClick={() => setAssetType('phone')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  assetType === 'phone'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                }`}
              >
                <Smartphone className="h-4 w-4" />
                <span>Điện Thoại</span>
              </button>
              <button
                type="button"
                onClick={() => setAssetType('laptop')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  assetType === 'laptop'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                }`}
              >
                <Laptop className="h-4 w-4" />
                <span>Laptop / Mac</span>
              </button>
              <button
                type="button"
                onClick={() => setAssetType('other')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  assetType === 'other'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                }`}
              >
                <HelpCircle className="h-4 w-4" />
                <span>Khác</span>
              </button>
            </div>

            {/* Primary Asset Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Tên tài sản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder={
                    assetType === 'motorbike'
                      ? 'Honda SH 150i ABS 2023 Trắng'
                      : assetType === 'car'
                      ? 'Toyota Fortuner Legender 2022 Đen'
                      : assetType === 'phone'
                      ? 'iPhone 15 Pro Max 256GB Titan Tự Nhiên'
                      : assetType === 'laptop'
                      ? 'MacBook Pro 14 M2 Pro 16GB 512GB'
                      : 'Đồng hồ vàng / Dây chuyền / Thiết bị...'
                  }
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Vị trí cất giữ trong kho
                </label>
                <select
                  value={warehouseLocation}
                  onChange={(e) => setWarehouseLocation(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                >
                  {settings.warehouseLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Sub-fields according to Spec #19 */}
              {(assetType === 'motorbike' || assetType === 'car') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Biển số xe <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="85B1-123.45"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-amber-300 font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Số khung</label>
                    <input
                      type="text"
                      value={frameNumber}
                      onChange={(e) => setFrameNumber(e.target.value.toUpperCase())}
                      placeholder="RLHJF..."
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Số máy</label>
                    <input
                      type="text"
                      value={engineNumber}
                      onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                      placeholder="JF51E..."
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Hãng & Năm SX</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Honda / 2023"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Màu sơn / ODO (km)</label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Đen nhám / 12.000 km"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                </>
              )}

              {assetType === 'phone' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Số IMEI</label>
                    <input
                      type="text"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      placeholder="356789123456789"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-amber-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Dung lượng & Màu</label>
                    <input
                      type="text"
                      value={storage}
                      onChange={(e) => setStorage(e.target.value)}
                      placeholder="256GB / Titan Tự Nhiên"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Pin & Phụ kiện</label>
                    <input
                      type="text"
                      value={batteryHealth}
                      onChange={(e) => setBatteryHealth(e.target.value)}
                      placeholder="Pin 92% / Kèm cáp sạc zin"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                </>
              )}

              {assetType === 'laptop' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Số Serial</label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                      placeholder="C02G..."
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-amber-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Cấu hình CPU / RAM / SSD</label>
                    <input
                      type="text"
                      value={cpu}
                      onChange={(e) => setCpu(e.target.value)}
                      placeholder="M2 Pro / 16GB / 512GB SSD"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Màn hình / Tình trạng</label>
                    <input
                      type="text"
                      value={screen}
                      onChange={(e) => setScreen(e.target.value)}
                      placeholder="14.2 inch Liquid Retina / 99%"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                </>
              )}

              {assetType === 'other' && (
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Thông số / Quy cách tùy chỉnh</label>
                  <input
                    type="text"
                    value={customSpecs}
                    onChange={(e) => setCustomSpecs(e.target.value)}
                    placeholder="Trọng lượng 2 chỉ vàng 9999, kèm hóa đơn..."
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1">Tình trạng thực tế</label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="Máy zin keng, màn đẹp, không cấn móp, chìa khóa đủ..."
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Định giá ước tính</label>
                <input
                  type="number"
                  value={estimatedValue || ''}
                  onChange={(e) => setEstimatedValue(Number(e.target.value))}
                  placeholder="50000000"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Interest Rates (Spec #8 & #9) */}
          <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              3. TIỀN CẦM & LÃI SUẤT
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Số tiền cầm (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="100000"
                  value={loanAmount || ''}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-base text-rose-400 font-bold focus:outline-none focus:border-rose-500"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Bằng chữ: <strong className="text-white">{formatVND(loanAmount)}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Lãi suất hợp đồng (%/tháng) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full rounded-xl bg-zinc-900 border border-amber-500/50 px-3.5 py-2.5 text-base text-amber-300 font-bold focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    %/tháng
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Lãi ước tính: <strong className="text-amber-400">{formatVND(calculateMonthlyInterest(loanAmount, interestRate))}/tháng</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Ngày cầm</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Ngày đến hạn</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-4">
                <label className="block text-xs font-medium text-zinc-300 mb-1">Ghi chú hợp đồng</label>
                <input
                  type="text"
                  value={contractNotes}
                  onChange={(e) => setContractNotes(e.target.value)}
                  placeholder="Ghi chú thêm về phụ kiện đi kèm, thỏa thuận riêng với khách..."
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Photo Gallery according to Spec #16, #17, #18 */}
          <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Camera className="h-4 w-4" />
                  <span>4. HÌNH ẢNH THEO HỢP ĐỒNG ({images.length} ảnh)</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Kho ảnh riêng biệt cho hợp đồng này, liên kết chặt chẽ theo ID
                </p>
              </div>

              {/* Photo Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Direct Camera Button */}
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 active:scale-95 transition"
                >
                  <Camera className="h-4 w-4" />
                  <span>📷 Chụp ảnh</span>
                </button>

                {/* Album Upload Button */}
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

            {/* Photos Grid */}
            {images.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-xs">
                Chưa có ảnh nào. Bấm <strong>Chụp ảnh</strong> hoặc <strong>Chọn từ Album</strong> để thêm ảnh tài sản/CCCD.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900"
                  >
                    <img
                      src={img.dataUrl}
                      alt={`Ảnh ${idx + 1}`}
                      className="h-full w-full object-cover group-hover:scale-105 transition"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(img.dataUrl)}
                        className="p-1.5 rounded-lg bg-black/70 text-white hover:bg-black"
                        title="Xem phóng to"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="p-1.5 rounded-lg bg-rose-600/80 text-white hover:bg-rose-600"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {img.caption && (
                      <span className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-zinc-300 truncate">
                        {img.caption}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-xl shadow-rose-950/50 transition active:scale-95 disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
              <span>{isSubmitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo hợp đồng'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Direct Camera Capture Sub-Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureCamera}
      />

      {/* Lightbox Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setPreviewImage(null)}
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
