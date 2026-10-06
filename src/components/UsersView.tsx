import React, { useState } from 'react';
import { User, UserPermissions } from '../types';
import { formatDate } from '../utils/interest';
import {
  UserCog,
  PlusCircle,
  KeyRound,
  Lock,
  Unlock,
  Trash2,
  Edit,
  X,
  Check,
  Shield,
  ShieldAlert,
} from 'lucide-react';

interface UsersViewProps {
  users: User[];
  currentUser: User;
  onCreateUser: (userData: any) => Promise<void>;
  onUpdateUser: (id: string, userData: any) => Promise<void>;
  onResetPassword: (id: string, newPass: string) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

const defaultStaffPermissions: UserPermissions = {
  canAddCustomer: true,
  canCreateContract: true,
  canEditContract: true,
  canDeleteContract: false,
  canCollectInterest: true,
  canRedeem: true,
  canLiquidate: false,
  canManageWarehouse: true,
  canManageCashflow: false,
  canViewReports: false,
  canDeleteData: false,
};

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onResetPassword,
  onDeleteUser,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Modal State for Create/Edit User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<UserPermissions>(defaultStaffPermissions);

  // Password reset modal
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setRole('staff');
    setPassword('123456');
    setPermissions(defaultStaffPermissions);
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.fullName);
    setRole(u.role);
    setPermissions(u.permissions);
    setIsModalOpen(true);
  };

  const handleToggleLock = async (u: User) => {
    if (u.id === currentUser.id) {
      alert('Không thể tự khóa tài khoản đang đăng nhập.');
      return;
    }
    await onUpdateUser(u.id, { isLocked: !u.isLocked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) {
      alert('Vui lòng nhập đầy đủ tên đăng nhập và họ tên.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, {
          fullName: fullName.trim(),
          role,
          permissions,
        });
      } else {
        await onCreateUser({
          username: username.trim(),
          fullName: fullName.trim(),
          role,
          password: password || '123456',
          permissions,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Lỗi lưu tài khoản: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword.trim()) return;
    setIsSubmitting(true);
    try {
      await onResetPassword(resetModalUser.id, newPassword.trim());
      setResetModalUser(null);
      setNewPassword('');
    } catch (err: any) {
      alert('Lỗi đặt lại mật khẩu: ' + err.message);
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
            <UserCog className="h-6 w-6 text-sky-400" />
            <span>QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Admin có toàn quyền cấp phát tài khoản, phân quyền thao tác và đặt lại mật khẩu nhân viên
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm shadow-xl shadow-sky-950/50 active:scale-95 transition"
          >
            <PlusCircle className="h-5 w-5" />
            <span>+ THÊM NHÂN VIÊN MỚI</span>
          </button>
        )}
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => {
          const isMe = u.id === currentUser.id;

          return (
            <div
              key={u.id}
              className={`p-5 rounded-2xl border transition shadow-sm space-y-3 ${
                u.isLocked
                  ? 'bg-zinc-950/50 border-rose-900/50 opacity-75'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-white text-base">{u.fullName}</strong>
                    {isMe && (
                      <span className="text-[10px] bg-rose-600/30 text-rose-300 px-1.5 py-0.5 rounded font-bold">
                        (Bạn)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">@{u.username}</span>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    u.role === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {u.role === 'admin' ? 'Chủ Tiệm (Admin)' : 'Nhân Viên'}
                </span>
              </div>

              {/* Status & permissions indicator */}
              <div className="p-3 rounded-xl bg-zinc-950 text-xs space-y-1 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Trạng thái:</span>
                  <span className={u.isLocked ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {u.isLocked ? '🔒 Đã khóa tài khoản' : '✓ Đang hoạt động'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Ngày tạo:</span>
                  <span>{formatDate(u.createdAt)}</span>
                </div>
                <div className="pt-1 border-t border-zinc-850 flex flex-wrap gap-1">
                  {u.role === 'admin' ? (
                    <span className="text-[10px] text-amber-300">★ Toàn quyền hệ thống</span>
                  ) : (
                    <>
                      {u.permissions.canCreateContract && (
                        <span className="text-[10px] px-1.5 bg-zinc-850 rounded text-zinc-300">Tạo HĐ</span>
                      )}
                      {u.permissions.canCollectInterest && (
                        <span className="text-[10px] px-1.5 bg-zinc-850 rounded text-zinc-300">Thu lãi</span>
                      )}
                      {u.permissions.canRedeem && (
                        <span className="text-[10px] px-1.5 bg-zinc-850 rounded text-zinc-300">Chuộc</span>
                      )}
                      {u.permissions.canDeleteData && (
                        <span className="text-[10px] px-1.5 bg-rose-950/60 text-rose-300 rounded">Xóa dữ liệu</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons (Admin only) */}
              {isAdmin && (
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                  <button
                    onClick={() => {
                      setResetModalUser(u);
                      setNewPassword('123456');
                    }}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
                    title="Đặt lại mật khẩu mới trực tiếp mà không cần mật khẩu cũ"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Đổi mật khẩu</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      title="Sửa quyền"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    {!isMe && (
                      <>
                        <button
                          onClick={() => handleToggleLock(u)}
                          className={`p-1.5 rounded-lg transition ${
                            u.isLocked ? 'text-emerald-400 hover:bg-emerald-950/40' : 'text-amber-400 hover:bg-amber-950/40'
                          }`}
                          title={u.isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                        >
                          {u.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </button>

                        <button
                          onClick={() => onDeleteUser(u.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 transition"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">
                {editingUser ? 'Chỉnh sửa tài khoản & Phân quyền' : 'Thêm Nhân viên mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="nhanvien1"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Trần Văn Nam"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Vai trò</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
                >
                  <option value="staff">Nhân viên (Theo quyền cấp bên dưới)</option>
                  <option value="admin">Chủ tiệm / Admin (Toàn quyền)</option>
                </select>
              </div>

              {/* Permissions matrix for staff (Spec #5) */}
              {role === 'staff' && (
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <span className="font-bold text-amber-400 block mb-1">Danh sách quyền được cấp:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canCreateContract}
                        onChange={(e) => setPermissions({ ...permissions, canCreateContract: e.target.checked })}
                        className="rounded"
                      />
                      <span>Tạo hợp đồng mới</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canEditContract}
                        onChange={(e) => setPermissions({ ...permissions, canEditContract: e.target.checked })}
                        className="rounded"
                      />
                      <span>Sửa hợp đồng</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canCollectInterest}
                        onChange={(e) => setPermissions({ ...permissions, canCollectInterest: e.target.checked })}
                        className="rounded"
                      />
                      <span>Thu tiền lãi</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canRedeem}
                        onChange={(e) => setPermissions({ ...permissions, canRedeem: e.target.checked })}
                        className="rounded"
                      />
                      <span>Ghi nhận chuộc tài sản</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canLiquidate}
                        onChange={(e) => setPermissions({ ...permissions, canLiquidate: e.target.checked })}
                        className="rounded"
                      />
                      <span>Thanh lý tài sản</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canManageWarehouse}
                        onChange={(e) => setPermissions({ ...permissions, canManageWarehouse: e.target.checked })}
                        className="rounded"
                      />
                      <span>Xem & chuyển kho</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canManageCashflow}
                        onChange={(e) => setPermissions({ ...permissions, canManageCashflow: e.target.checked })}
                        className="rounded"
                      />
                      <span>Lập phiếu thu - chi</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.canDeleteData}
                        onChange={(e) => setPermissions({ ...permissions, canDeleteData: e.target.checked })}
                        className="rounded text-rose-500"
                      />
                      <span className="text-rose-400 font-semibold">Quyền xóa dữ liệu</span>
                    </label>
                  </div>
                </div>
              )}

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
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal (Spec #27) */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-sky-400" />
                <span>Đặt lại mật khẩu</span>
              </h3>
              <button onClick={() => setResetModalUser(null)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-zinc-300">
                Admin đang đặt lại mật khẩu cho tài khoản: <strong className="text-white">{resetModalUser.fullName}</strong> (@{resetModalUser.username})
              </p>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Nhập mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Đặt mật khẩu mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
