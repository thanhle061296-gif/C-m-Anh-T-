export type AssetType = 'motorbike' | 'car' | 'phone' | 'laptop' | 'other';

export type ContractStatus =
  | 'active' // Đang cầm
  | 'debt' // Đang nợ lãi
  | 'paid_interest' // Đã thu lãi
  | 'extended' // Đã gia hạn
  | 'redeemed' // Đã chuộc
  | 'liquidated' // Đã thanh lý
  | 'cancelled'; // Đã hủy

export interface UserPermissions {
  canAddCustomer: boolean;
  canCreateContract: boolean;
  canEditContract: boolean;
  canDeleteContract: boolean;
  canCollectInterest: boolean;
  canRedeem: boolean;
  canLiquidate: boolean;
  canManageWarehouse: boolean;
  canManageCashflow: boolean;
  canViewReports: boolean;
  canDeleteData: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'staff';
  passwordHash?: string;
  isLocked: boolean;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  idCard: string;
  address: string;
  birthDate?: string;
  notes?: string;
  idCardFrontPhoto?: string;
  idCardBackPhoto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDetails {
  // Xe máy & Ô tô
  brand?: string;
  model?: string;
  version?: string;
  year?: number | string;
  color?: string;
  licensePlate?: string;
  frameNumber?: string;
  engineNumber?: string;
  odo?: string;
  seats?: number | string;

  // Điện thoại
  storage?: string;
  imei?: string;
  batteryHealth?: string;
  accessories?: string;

  // Laptop / MacBook
  cpu?: string;
  ram?: string;
  ssd?: string;
  screen?: string;
  serialNumber?: string;

  // Khác
  customSpecs?: string;
}

export interface Asset {
  id: string;
  contractId: string;
  customerId: string;
  type: AssetType;
  name: string;
  details: AssetDetails;
  condition: string;
  estimatedValue: number;
  warehouseLocation: string;
  status: 'in_pawn' | 'redeemed' | 'liquidated';
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  code: string; // HD-000101
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerIdCard: string;
  customerAddress: string;
  assetId: string;
  assetName: string;
  assetType: AssetType;
  licensePlate?: string;
  loanAmount: number;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  interestRate: number; // Cố định theo hợp đồng, % / tháng
  staffName: string;
  staffId: string;
  warehouseLocation: string;
  status: ContractStatus;
  notes?: string;
  lastInterestPaidDate?: string;
  totalInterestPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContractImage {
  id: string;
  contractId: string;
  assetId?: string;
  dataUrl: string;
  caption?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  code: string; // PT-0001
  contractId: string;
  contractCode: string;
  customerId: string;
  customerName: string;
  type: 'interest' | 'principal' | 'redemption' | 'extension';
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer';
  date: string;
  staffName: string;
  staffId: string;
  periodNote?: string;
  note?: string;
  createdAt: string;
}

export interface ContractExtension {
  id: string;
  contractId: string;
  contractCode: string;
  oldDueDate: string;
  newDueDate: string;
  extensionDays: number;
  interestCollected: number;
  staffName: string;
  note?: string;
  createdAt: string;
}

export interface Liquidation {
  id: string;
  contractId: string;
  contractCode: string;
  assetId: string;
  assetName: string;
  principalAmount: number;
  unpaidInterest: number;
  liquidationPrice: number;
  profitOrLoss: number;
  date: string;
  staffName: string;
  buyerName?: string;
  buyerPhone?: string;
  note?: string;
  createdAt: string;
}

export interface CashflowTransaction {
  id: string;
  code: string; // PT-XXX or PC-XXX
  type: 'income' | 'expense';
  category:
    | 'loan_disbursement'
    | 'interest_collected'
    | 'redemption_collected'
    | 'liquidation_collected'
    | 'operating_cost'
    | 'repair'
    | 'transport'
    | 'other_income'
    | 'other_expense';
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer';
  referenceContractId?: string;
  referenceContractCode?: string;
  staffName: string;
  date: string;
  note: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: 'contract' | 'customer' | 'asset' | 'payment' | 'user' | 'settings' | 'liquidation' | 'cashflow' | 'image';
  entityId: string;
  details: string;
  timestamp: string;
}

export interface InterestRules {
  halfMonthDaysThreshold: number; // Mặc định 15
  fullMonthDaysThreshold: number; // Mặc định 15
  nextMonthsRule: 'by_month' | 'by_day';
}

export interface SystemSettings {
  shopName: string;
  logoUrl: string;
  bannerUrl: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  defaultInterestRate: number; // Mặc định 3.0 % / tháng
  interestCalculationRules: InterestRules;
  warehouseLocations: string[];
  isDemoModeActive: boolean;
  lastBackupTime?: string;
  updatedAt: string;
}

export interface DatabaseState {
  users: User[];
  customers: Customer[];
  contracts: Contract[];
  assets: Asset[];
  images: ContractImage[];
  payments: Payment[];
  extensions: ContractExtension[];
  liquidations: Liquidation[];
  transactions: CashflowTransaction[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

export interface InterestCalculation {
  principal: number;
  interestRate: number;
  daysPassed: number;
  monthsPassed: number;
  periodsCount: number;
  currentPeriodInterest: number;
  totalAccruedInterest: number;
  totalInterestPaid: number;
  remainingInterest: number;
  totalPayableForRedemption: number;
  isOverdue: boolean;
  daysOverdue: number;
}
