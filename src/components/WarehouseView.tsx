import React, { useState } from 'react';
import { Asset, DatabaseState, User } from '../types';
import { formatVND } from '../utils/interest';
import {
  Warehouse,
  Search,
  Filter,
  Car,
  Smartphone,
  Laptop,
  HelpCircle,
  MoveRight,
  Check,
  X,
} from 'lucide-react';

interface WarehouseViewProps {
  dbState: DatabaseState;
  currentUser: User;
  onOpenContractDetail: (contractId: string) => void;
  onMoveAssetLocation: (assetId: string, newLocation: string) => Promise<void>;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  dbState,
  currentUser,
  onOpenContractDetail,
  onMoveAssetLocation,
}) => {
  const { assets, contracts, settings } = dbState;
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('in_pawn');
  const [search, setSearch] = useState('');
  const [movingAsset, setMovingAsset] = useState<Asset | null>(null);
  const [targetLocation, setTargetLocation] = useState<string>(settings.warehouseLocations[0] || 'Kho chính');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locations = settings.warehouseLocations;

  const filteredAssets = assets.filter((asset) => {
    if (selectedLocation !== 'all' && asset.warehouseLocation !== selectedLocation) return false;
    if (statusFilter !== 'all' && asset.status !== statusFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const contract = contracts.find((c) => c.id === asset.contractId);
      const nameMatch = asset.name.toLowerCase().includes(q);
      const plateMatch = asset.details.licensePlate?.toLowerCase().includes(q);
      const imeiMatch = asset.details.imei?.toLowerCase().includes(q);
      const serialMatch = asset.details.serialNumber?.toLowerCase().includes(q);
      const codeMatch = contract?.code.toLowerCase().includes(q);
      const customerMatch = contract?.customerName.toLowerCase().includes(q);

      if (!nameMatch && !plateMatch && !imeiMatch && !serialMatch && !codeMatch && !customerMatch) {
        return false;
      }
    }
    return true;
  });

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingAsset) return;
    setIsSubmitting(true);
    try {
      await onMoveAssetLocation(movingAsset.id, targetLocation);
      setMovingAsset(null);
    } catch (err: any) {
      alert('Lỗi chuyển kho: ' + err.message);
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
            <Warehouse className="h-6 w-6 text-amber-500" />
            <span>QUẢN LÝ KHO TÀI SẢN</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tổng tài sản: <strong className="text-white">{assets.length}</strong> món • Trong kho đang cầm: <strong className="text-emerald-400">{assets.filter((a) => a.status === 'in_pawn').length}</strong> món
          </p>
        </div>
      </div>

      {/* Location Pills Filter */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
        <button
          onClick={() => setSelectedLocation('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            selectedLocation === 'all'
              ? 'bg-amber-500 text-black shadow-md'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
          }`}
        >
          Tất cả các kho ({assets.length})
        </button>

        {locations.map((loc) => {
          const count = assets.filter((a) => a.warehouseLocation === loc && a.status === 'in_pawn').length;
          return (
            <button
              key={loc}
              onClick={() => setSelectedLocation(loc)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedLocation === loc
                  ? 'bg-amber-500 text-black shadow-md font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
              }`}
            >
              {loc} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Mã HĐ, Tên khách, Biển số xe, IMEI, Serial, Tên tài sản..."
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-xs text-white focus:outline-none"
        >
          <option value="all">Tất cả tình trạng</option>
          <option value="in_pawn">Đang cầm trong kho</option>
          <option value="redeemed">Đã trả khách (Chuộc)</option>
          <option value="liquidated">Đã thanh lý</option>
        </select>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-16 rounded-3xl bg-zinc-900/60 border border-dashed border-zinc-800 text-zinc-400 text-xs">
          Không tìm thấy tài sản nào trong kho phù hợp điều kiện lọc.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const contract = contracts.find((c) => c.id === asset.contractId);

            return (
              <div
                key={asset.id}
                onClick={() => contract && onOpenContractDetail(contract.id)}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition space-y-3 cursor-pointer shadow-sm group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                      {asset.type === 'car' ? (
                        <Car className="h-5 w-5 text-amber-400" />
                      ) : asset.type === 'motorbike' ? (
                        <span className="text-xl">🛵</span>
                      ) : asset.type === 'phone' ? (
                        <Smartphone className="h-5 w-5 text-blue-400" />
                      ) : (
                        <Laptop className="h-5 w-5 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <strong className="text-white text-xs block truncate max-w-[170px]">{asset.name}</strong>
                      <span className="text-[11px] text-zinc-400">
                        HĐ: <strong className="text-amber-400 font-mono">#{contract?.code || 'N/A'}</strong>
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      asset.status === 'in_pawn'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : asset.status === 'redeemed'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {asset.status === 'in_pawn' ? 'Trong kho' : asset.status === 'redeemed' ? 'Đã trả khách' : 'Đã thanh lý'}
                  </span>
                </div>

                {/* Sub details */}
                <div className="p-2.5 rounded-xl bg-zinc-950 text-xs space-y-1 text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Khách gửi:</span>
                    <strong className="text-zinc-200">{contract?.customerName || 'N/A'}</strong>
                  </div>
                  {asset.details.licensePlate && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Biển số xe:</span>
                      <span className="font-mono text-amber-400 font-bold">{asset.details.licensePlate}</span>
                    </div>
                  )}
                  {asset.details.imei && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">IMEI:</span>
                      <span className="font-mono text-amber-300">{asset.details.imei}</span>
                    </div>
                  )}
                  {asset.details.serialNumber && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Serial:</span>
                      <span className="font-mono text-amber-300">{asset.details.serialNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Vị trí:</span>
                    <strong className="text-emerald-400">📍 {asset.warehouseLocation}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] text-zinc-400">
                    Định giá: {formatVND(asset.estimatedValue)}
                  </span>

                  <button
                    onClick={() => {
                      setMovingAsset(asset);
                      setTargetLocation(asset.warehouseLocation);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg transition"
                  >
                    <MoveRight className="h-3 w-3" />
                    <span>Đổi vị trí</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Move Location Modal */}
      {movingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">Chuyển vị trí kho</h3>
              <button onClick={() => setMovingAsset(null)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMoveSubmit} className="mt-4 space-y-4">
              <div className="text-xs text-zinc-300 space-y-1">
                <p>Tài sản: <strong className="text-white">{movingAsset.name}</strong></p>
                <p>Vị trí hiện tại: <span className="text-zinc-400">{movingAsset.warehouseLocation}</span></p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Chọn vị trí lưu kho mới:
                </label>
                <select
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovingAsset(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                >
                  {isSubmitting ? 'Đang chuyển...' : 'Lưu vị trí mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
