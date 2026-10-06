import React, { useState, useEffect } from 'react';
import {
  DatabaseState,
  User,
  Contract,
  Customer,
  Asset,
  SystemSettings,
  CashflowTransaction,
} from './types';
import { apiService, SyncStatus } from './services/api';
import { Dashboard } from './components/Dashboard';
import { ContractsView } from './components/ContractsView';
import { CustomersView } from './components/CustomersView';
import { WarehouseView } from './components/WarehouseView';
import { CashflowView } from './components/CashflowView';
import { ReportsView } from './components/ReportsView';
import { UsersView } from './components/UsersView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsView } from './components/SettingsView';
import { ContractModal } from './components/ContractModal';
import { ContractDetailModal } from './components/ContractDetailModal';
import { CollectInterestModal } from './components/CollectInterestModal';
import { RedemptionModal } from './components/RedemptionModal';
import { ExtensionModal } from './components/ExtensionModal';
import { LiquidationModal } from './components/LiquidationModal';
import { ConfirmModal } from './components/ConfirmModal';
import { LoginScreen } from './components/LoginScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  LayoutDashboard,
  FileText,
  Users,
  Warehouse,
  Wallet,
  BarChart3,
  UserCog,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Phone,
  Shield,
  Search,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('CamDoAnhTu_User');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [dbState, setDbState] = useState<DatabaseState | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [isCreateContractOpen, setIsCreateContractOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [contractForInterest, setContractForInterest] = useState<Contract | null>(null);
  const [contractForExtend, setContractForExtend] = useState<Contract | null>(null);
  const [contractForRedeem, setContractForRedeem] = useState<Contract | null>(null);
  const [contractForLiquidate, setContractForLiquidate] = useState<Contract | null>(null);
  const [contractForEdit, setContractForEdit] = useState<Contract | null>(null);

  // Confirm delete modal state
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: 'Xác nhận xóa',
    message: '',
    onConfirm: async () => {},
  });

  // Initialize data and sync listeners
  useEffect(() => {
    const unsub = apiService.onSyncStatusChange((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
    });

    apiService
      .loadInitialState()
      .then(({ state }) => {
        setDbState(state);
      })
      .catch((err) => {
        console.error('Initialization error:', err);
      });

    return () => unsub();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('CamDoAnhTu_User');
    setCurrentUser(null);
  };

  const reloadDatabase = async () => {
    const updated = await apiService.loadInitialState();
    setDbState(updated.state);
  };

  if (!currentUser) {
    return (
      <LoginScreen
        settings={
          dbState?.settings || {
            shopName: 'CẦM ĐỒ ANH TÚ',
            logoUrl: '/logo.jpg',
            bannerUrl: '/banner.jpg',
            phone: '0969 905 234',
            address: '188/31/8 Thống Nhất, Phan Rang, Khánh Hoà',
            bankName: 'MB Bank',
            bankAccountNumber: '0969905234',
            bankAccountName: 'CẦM ĐỒ ANH TÚ',
            defaultInterestRate: 3.0,
            interestCalculationRules: {
              halfMonthDaysThreshold: 15,
              fullMonthDaysThreshold: 15,
              nextMonthsRule: 'by_month',
            },
            warehouseLocations: ['Kho chính', 'Khu xe máy', 'Khu ô tô'],
            isDemoModeActive: false,
            updatedAt: new Date().toISOString(),
          }
        }
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          reloadDatabase();
        }}
      />
    );
  }

  if (!dbState) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="h-16 w-16 rounded-3xl border-4 border-rose-600 border-t-transparent animate-spin mb-4" />
        <h2 className="text-lg font-bold text-white">Đang tải dữ liệu Cầm Đồ Anh Tú...</h2>
        <p className="text-xs text-zinc-400 mt-1">Khởi tạo cơ sở dữ liệu an toàn & đồng bộ thiết bị</p>
      </div>
    );
  }

  const { settings, contracts } = dbState;
  const operator = { id: currentUser.id, name: currentUser.fullName };
  const selectedContract = contracts.find((c) => c.id === selectedContractId) || null;

  // Global search filtering if search term entered
  const isSearchActive = !!searchTerm.trim();

  // Handler implementations
  const handleCreateContractSubmit = async (
    contractData: Partial<Contract>,
    assetData: Partial<Asset>,
    images: { dataUrl: string; caption?: string }[]
  ) => {
    if (contractForEdit) {
      await apiService.updateContract(contractForEdit.id, contractData, assetData, operator);
      setContractForEdit(null);
    } else {
      await apiService.createContract(contractData, assetData, images, operator);
    }
    await reloadDatabase();
  };

  const handleDeleteContract = (id: string) => {
    const target = contracts.find((c) => c.id === id);
    setConfirmDelete({
      isOpen: true,
      title: 'Bạn có chắc chắn muốn xóa dữ liệu này?',
      message: `Hành động này sẽ xóa vĩnh viễn hợp đồng #${target?.code || id} (${target?.customerName || ''}) cùng toàn bộ tài sản và hình ảnh liên kết.\n\nThao tác xóa sẽ được lưu lại trong Lịch sử hoạt động (Audit Log).`,
      onConfirm: async () => {
        await apiService.deleteContract(id, operator);
        setSelectedContractId(null);
        setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        await reloadDatabase();
      },
    });
  };

  const handleCollectInterest = async (data: any) => {
    await apiService.collectInterest({ ...data, operatorId: operator.id, operatorName: operator.name });
    await reloadDatabase();
  };

  const handleRedeem = async (data: any) => {
    await apiService.redeemContract({ ...data, operatorId: operator.id, operatorName: operator.name });
    await reloadDatabase();
  };

  const handleExtend = async (data: any) => {
    await apiService.extendContract({ ...data, operatorId: operator.id, operatorName: operator.name });
    await reloadDatabase();
  };

  const handleLiquidate = async (data: any) => {
    await apiService.liquidateContract({ ...data, operatorId: operator.id, operatorName: operator.name });
    await reloadDatabase();
  };

  const handleAddImage = async (contractId: string, assetId: string, dataUrl: string, caption: string) => {
    await apiService.addImage(contractId, assetId, dataUrl, caption, operator.name);
    await reloadDatabase();
  };

  const handleDeleteImage = async (imageId: string) => {
    setConfirmDelete({
      isOpen: true,
      title: 'Bạn có chắc chắn muốn xóa dữ liệu này?',
      message: 'Ảnh tài sản này sẽ bị xóa khỏi hợp đồng. Bạn có muốn tiếp tục?',
      onConfirm: async () => {
        await apiService.deleteImage(imageId, operator);
        setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        await reloadDatabase();
      },
    });
  };

  const handleCreateCustomer = async (data: Partial<Customer>) => {
    await apiService.createCustomer(data, operator);
    await reloadDatabase();
  };

  const handleUpdateCustomer = async (id: string, data: Partial<Customer>) => {
    await apiService.updateCustomer(id, data, operator);
    await reloadDatabase();
  };

  const handleDeleteCustomer = async (id: string) => {
    const c = dbState.customers.find((cust) => cust.id === id);
    setConfirmDelete({
      isOpen: true,
      title: 'Bạn có chắc chắn muốn xóa dữ liệu này?',
      message: `Xóa thông tin khách hàng ${c?.fullName || id}. Thao tác này sẽ ghi nhận vào Audit Log.`,
      onConfirm: async () => {
        await apiService.deleteCustomer(id, operator);
        setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        await reloadDatabase();
      },
    });
  };

  const handleMoveAsset = async (assetId: string, newLocation: string) => {
    const asset = dbState.assets.find((a) => a.id === assetId);
    if (asset) {
      asset.warehouseLocation = newLocation;
      await apiService.updateContract(asset.contractId, { warehouseLocation: newLocation }, { warehouseLocation: newLocation }, operator);
      await reloadDatabase();
    }
  };

  const handleCreateTransaction = async (data: Partial<CashflowTransaction>) => {
    await apiService.createTransaction(data, operator);
    await reloadDatabase();
  };

  const handleDeleteTransaction = async (id: string) => {
    setConfirmDelete({
      isOpen: true,
      title: 'Bạn có chắc chắn muốn xóa dữ liệu này?',
      message: 'Phiếu thu/chi này sẽ bị xóa khỏi sổ quỹ. Thao tác xóa được lưu vào Audit Log.',
      onConfirm: async () => {
        await apiService.deleteTransaction(id, operator);
        setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        await reloadDatabase();
      },
    });
  };

  const handleUpdateSettings = async (settingsData: Partial<SystemSettings>) => {
    await apiService.updateSettings(settingsData, operator);
    await reloadDatabase();
  };

  const handleCreateUser = async (userData: any) => {
    await apiService.createUser(userData, operator);
    await reloadDatabase();
  };

  const handleUpdateUser = async (id: string, userData: any) => {
    await apiService.updateUser(id, userData, operator);
    await reloadDatabase();
  };

  const handleResetPassword = async (id: string, newPass: string) => {
    await apiService.adminResetPassword(id, newPass, operator);
    alert('Đã đổi mật khẩu thành công!');
    await reloadDatabase();
  };

  const handleDeleteUser = async (id: string) => {
    setConfirmDelete({
      isOpen: true,
      title: 'Bạn có chắc chắn muốn xóa dữ liệu này?',
      message: 'Tài khoản nhân viên này sẽ bị xóa hoàn toàn khỏi hệ thống.',
      onConfirm: async () => {
        await apiService.deleteUser(id, operator);
        setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        await reloadDatabase();
      },
    });
  };

  const handleManualBackup = async () => {
    const res = await apiService.createBackup(operator);
    if (res.success) {
      alert(`Đã tạo bản sao lưu an toàn trên máy chủ: ${res.filename}`);
      await reloadDatabase();
    }
  };

  const handleRestoreBackup = async (backupData: DatabaseState) => {
    const res = await apiService.restoreBackup(backupData, operator);
    if (res.success) {
      await reloadDatabase();
    }
  };

  const handleClearDemoData = async () => {
    setConfirmDelete({
      isOpen: true,
      title: 'XÁC NHẬN XÓA DỮ LIỆU DEMO?',
      message:
        'Hệ thống sẽ xóa toàn bộ hợp đồng, khách hàng và giao dịch thử nghiệm để bạn bắt đầu nhập liệu thực tế cho tiệm Cầm đồ Anh Tú.\n\nCài đặt tiệm, lãi suất và tài khoản Admin sẽ được giữ nguyên 100%. Bạn có chắc chắn muốn thực hiện?',
      onConfirm: async () => {
        await apiService.clearDemoData(operator);
        setConfirmDelete((prev) => ({ ...prev, isOpen: false }));
        await reloadDatabase();
        alert('Đã xóa dữ liệu demo. Hệ thống đã sẵn sàng sử dụng thực tế!');
      },
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Info */}
          <div
            onClick={() => {
              setActiveTab('dashboard');
              setSearchTerm('');
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src={settings.logoUrl || '/logo.jpg'}
              alt="Logo"
              className="h-10 w-10 rounded-xl object-cover border border-amber-500/40 shadow-md group-hover:scale-105 transition"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.jpg';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base text-white tracking-wide uppercase">
                  {settings.shopName}
                </span>
                <span className="text-[10px] bg-rose-600/30 text-rose-300 font-bold px-1.5 py-0.2 rounded border border-rose-500/30">
                  {settings.defaultInterestRate}%/tháng
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Hotline: <strong className="text-amber-400 font-mono">{settings.phone}</strong>
              </p>
            </div>
          </div>

          {/* Center/Right Nav Controls */}
          <div className="flex items-center gap-3">
            {/* Sync Status Badge */}
            <OfflineIndicator
              status={syncStatus}
              pendingCount={pendingCount}
              onManualSync={() => apiService.syncPendingData()}
            />

            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-800 text-xs">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-rose-700 to-amber-600 flex items-center justify-center font-bold text-white text-xs">
                {currentUser.fullName.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-white block">{currentUser.fullName}</span>
                <span className="text-[10px] text-zinc-400">
                  {currentUser.role === 'admin' ? 'Chủ Tiệm (Admin)' : 'Nhân Viên'}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row px-4 sm:px-6 pt-5 gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 space-y-1.5 pb-8">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setSearchTerm('');
            }}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Trang chủ</span>
          </button>

          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
              activeTab === 'contracts'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4" />
              <span>Hợp đồng</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold">
              {contracts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
              activeTab === 'customers'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4" />
              <span>Khách hàng</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold">
              {dbState.customers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('warehouse')}
            className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
              activeTab === 'warehouse'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Warehouse className="h-4 w-4" />
              <span>Kho tài sản</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold">
              {dbState.assets.filter((a) => a.status === 'in_pawn').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cashflow')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
              activeTab === 'cashflow'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Thu - Chi</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
              activeTab === 'reports'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Báo cáo</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
                activeTab === 'users'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <UserCog className="h-4 w-4" />
              <span>Tài khoản</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
              activeTab === 'audit_logs'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Nhật ký (Audit)</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
                activeTab === 'settings'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Cài đặt</span>
            </button>
          )}
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <span className="font-bold text-white text-base">Menu Điều Hướng</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-zinc-400">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2 text-sm font-bold">
              {[
                { id: 'dashboard', label: 'Trang chủ', icon: LayoutDashboard },
                { id: 'contracts', label: `Hợp đồng (${contracts.length})`, icon: FileText },
                { id: 'customers', label: 'Khách hàng', icon: Users },
                { id: 'warehouse', label: 'Kho tài sản', icon: Warehouse },
                { id: 'cashflow', label: 'Thu - Chi', icon: Wallet },
                { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
                { id: 'users', label: 'Tài khoản', icon: UserCog, adminOnly: true },
                { id: 'audit_logs', label: 'Nhật ký (Audit)', icon: History },
                { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings, adminOnly: true },
              ]
                .filter((item) => !item.adminOnly || currentUser.role === 'admin')
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition ${
                      activeTab === item.id ? 'bg-rose-600 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
            </div>

            <button
              onClick={handleLogout}
              className="mt-auto flex items-center justify-center gap-2 p-3 rounded-2xl bg-zinc-900 text-rose-400 border border-zinc-800 font-bold text-xs"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        )}

        {/* Content View Routing */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <Dashboard
              dbState={dbState}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenCreateContract={() => {
                setContractForEdit(null);
                setIsCreateContractOpen(true);
              }}
              onOpenContractDetail={(id) => setSelectedContractId(id)}
              onOpenCollectInterest={(c) => setContractForInterest(c)}
              searchTerm={searchTerm}
              setSearchTerm={(term) => {
                setSearchTerm(term);
                if (term.trim()) {
                  setActiveTab('contracts');
                }
              }}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractsView
              dbState={dbState}
              currentUser={currentUser}
              onOpenCreateContract={() => {
                setContractForEdit(null);
                setIsCreateContractOpen(true);
              }}
              onOpenContractDetail={(id) => setSelectedContractId(id)}
              onOpenCollectInterest={(c) => setContractForInterest(c)}
              onOpenExtend={(c) => setContractForExtend(c)}
              onOpenRedeem={(c) => setContractForRedeem(c)}
              onOpenLiquidate={(c) => setContractForLiquidate(c)}
              onEditContract={(c) => {
                setContractForEdit(c);
                setIsCreateContractOpen(true);
              }}
              onDeleteContract={handleDeleteContract}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              dbState={dbState}
              currentUser={currentUser}
              onOpenContractDetail={(id) => setSelectedContractId(id)}
              onCreateCustomer={handleCreateCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeTab === 'warehouse' && (
            <WarehouseView
              dbState={dbState}
              currentUser={currentUser}
              onOpenContractDetail={(id) => setSelectedContractId(id)}
              onMoveAssetLocation={handleMoveAsset}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashflowView
              dbState={dbState}
              currentUser={currentUser}
              onCreateTransaction={handleCreateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'reports' && <ReportsView dbState={dbState} />}

          {activeTab === 'users' && currentUser.role === 'admin' && (
            <UsersView
              users={dbState.users}
              currentUser={currentUser}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onResetPassword={handleResetPassword}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeTab === 'audit_logs' && <AuditLogView logs={dbState.auditLogs} />}

          {activeTab === 'settings' && currentUser.role === 'admin' && (
            <SettingsView
              dbState={dbState}
              currentUser={currentUser}
              onUpdateSettings={handleUpdateSettings}
              onCreateBackup={handleManualBackup}
              onRestoreBackup={handleRestoreBackup}
              onClearDemoData={handleClearDemoData}
            />
          )}
        </main>
      </div>

      {/* Floating Action for Mobile (Create Contract button) */}
      <div className="lg:hidden fixed bottom-4 right-4 z-30">
        <button
          onClick={() => {
            setContractForEdit(null);
            setIsCreateContractOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white font-extrabold text-xs shadow-2xl shadow-rose-950/80 active:scale-95 border border-rose-400/30 transition"
        >
          <span>+ TẠO HĐ</span>
        </button>
      </div>

      {/* Modals Mounting */}
      <ContractModal
        isOpen={isCreateContractOpen}
        onClose={() => {
          setIsCreateContractOpen(false);
          setContractForEdit(null);
        }}
        onSubmit={handleCreateContractSubmit}
        existingContract={contractForEdit}
        existingAsset={dbState.assets.find((a) => a.id === contractForEdit?.assetId) || null}
        existingImages={dbState.images.filter((i) => i.contractId === contractForEdit?.id)}
        existingCustomers={dbState.customers}
        settings={settings}
        currentUser={currentUser}
      />

      <ContractDetailModal
        isOpen={!!selectedContractId}
        onClose={() => setSelectedContractId(null)}
        contract={selectedContract}
        dbState={dbState}
        currentUser={currentUser}
        onOpenCollectInterest={(c) => setContractForInterest(c)}
        onOpenExtend={(c) => setContractForExtend(c)}
        onOpenRedeem={(c) => setContractForRedeem(c)}
        onOpenLiquidate={(c) => setContractForLiquidate(c)}
        onEditContract={(c) => {
          setContractForEdit(c);
          setSelectedContractId(null);
          setIsCreateContractOpen(true);
        }}
        onDeleteContract={handleDeleteContract}
        onAddImage={handleAddImage}
        onDeleteImage={handleDeleteImage}
      />

      <CollectInterestModal
        isOpen={!!contractForInterest}
        onClose={() => setContractForInterest(null)}
        contract={contractForInterest}
        settings={settings}
        currentUser={currentUser}
        onConfirm={handleCollectInterest}
      />

      <RedemptionModal
        isOpen={!!contractForRedeem}
        onClose={() => setContractForRedeem(null)}
        contract={contractForRedeem}
        settings={settings}
        currentUser={currentUser}
        onConfirm={handleRedeem}
      />

      <ExtensionModal
        isOpen={!!contractForExtend}
        onClose={() => setContractForExtend(null)}
        contract={contractForExtend}
        settings={settings}
        currentUser={currentUser}
        onConfirm={handleExtend}
      />

      <LiquidationModal
        isOpen={!!contractForLiquidate}
        onClose={() => setContractForLiquidate(null)}
        contract={contractForLiquidate}
        settings={settings}
        currentUser={currentUser}
        onConfirm={handleLiquidate}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={confirmDelete.title}
        message={confirmDelete.message}
        onConfirm={confirmDelete.onConfirm}
        onCancel={() => setConfirmDelete((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
