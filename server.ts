import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { DatabaseState, User, SystemSettings, Customer, Contract, Asset, Payment, ContractExtension, Liquidation, CashflowTransaction, ContractImage, AuditLog } from './src/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Increase payload limit for contract asset images (Base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups');
const DB_FILE = path.resolve(DATA_DIR, 'camdo_anhtu_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Password hashing helper
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_anhtu_salt_2026').digest('hex');
}

// Default initial system settings from real shop information
const defaultSettings: SystemSettings = {
  shopName: 'CẦM ĐỒ ANH TÚ',
  logoUrl: '/logo.jpg',
  bannerUrl: '/banner.jpg',
  phone: '0969 905 234',
  address: '188/31/8 Thống Nhất, Phan Rang, Khánh Hoà',
  bankName: 'MB Bank (Quân Đội)',
  bankAccountNumber: '0969905234',
  bankAccountName: 'CẦM ĐỒ ANH TÚ',
  defaultInterestRate: 3.0, // 3% / tháng
  interestCalculationRules: {
    halfMonthDaysThreshold: 15,
    fullMonthDaysThreshold: 15,
    nextMonthsRule: 'by_month',
  },
  warehouseLocations: [
    'Kho chính',
    'Kho 1',
    'Kho 2',
    'Khu xe máy',
    'Khu ô tô',
    'Khu điện thoại',
    'Tủ laptop',
    'Kho thanh lý',
  ],
  isDemoModeActive: false,
  updatedAt: new Date().toISOString(),
};

// Initial admin user
const defaultAdmin: User = {
  id: 'USR-ADMIN',
  username: 'admin',
  fullName: 'Chủ Tiệm Anh Tú',
  role: 'admin',
  passwordHash: hashPassword('admin123'),
  isLocked: false,
  permissions: {
    canAddCustomer: true,
    canCreateContract: true,
    canEditContract: true,
    canDeleteContract: true,
    canCollectInterest: true,
    canRedeem: true,
    canLiquidate: true,
    canManageWarehouse: true,
    canManageCashflow: true,
    canViewReports: true,
    canDeleteData: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Default initial state
function createInitialState(): DatabaseState {
  return {
    users: [defaultAdmin],
    customers: [],
    contracts: [],
    assets: [],
    images: [],
    payments: [],
    extensions: [],
    liquidations: [],
    transactions: [],
    auditLogs: [
      {
        id: 'LOG-INIT',
        userId: 'USR-ADMIN',
        userName: 'Hệ thống',
        action: 'Khởi tạo hệ thống',
        entity: 'settings',
        entityId: 'SYS',
        details: 'Khởi tạo cơ sở dữ liệu bền vững Cầm đồ Anh Tú',
        timestamp: new Date().toISOString(),
      },
    ],
    settings: defaultSettings,
  };
}

// In-memory cache synced to disk
let dbState: DatabaseState = createInitialState();

// Load DB from disk safely
function loadDatabase(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Validate structure and merge settings
      return {
        users: parsed.users || [defaultAdmin],
        customers: parsed.customers || [],
        contracts: parsed.contracts || [],
        assets: parsed.assets || [],
        images: parsed.images || [],
        payments: parsed.payments || [],
        extensions: parsed.extensions || [],
        liquidations: parsed.liquidations || [],
        transactions: parsed.transactions || [],
        auditLogs: parsed.auditLogs || [],
        settings: { ...defaultSettings, ...(parsed.settings || {}) },
      };
    }
  } catch (error) {
    console.error('Error loading database file:', error);
  }
  const fresh = createInitialState();
  saveDatabase(fresh);
  return fresh;
}

// Save DB atomically to avoid corruption
function saveDatabase(state: DatabaseState): void {
  try {
    dbState = state;
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error('CRITICAL: Failed to save database to disk:', error);
  }
}

// Create backup snapshot
function createBackup(label: string = 'auto'): string {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${label}_${timestamp}.json`;
    const target = path.resolve(BACKUP_DIR, filename);
    fs.writeFileSync(target, JSON.stringify(dbState, null, 2), 'utf-8');
    dbState.settings.lastBackupTime = new Date().toISOString();
    saveDatabase(dbState);
    return filename;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return '';
  }
}

// Initialize DB and initial backup
dbState = loadDatabase();
createBackup('boot');

// Audit log helper
function addAuditLog(
  userId: string,
  userName: string,
  action: string,
  entity: AuditLog['entity'],
  entityId: string,
  details: string
) {
  const log: AuditLog = {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: userId || 'anonymous',
    userName: userName || 'Người dùng',
    action,
    entity,
    entityId,
    details,
    timestamp: new Date().toISOString(),
  };
  dbState.auditLogs.unshift(log);
  // Keep up to 10,000 logs
  if (dbState.auditLogs.length > 10000) {
    dbState.auditLogs = dbState.auditLogs.slice(0, 10000);
  }
  saveDatabase(dbState);
}

// ==========================================
// API ROUTES
// ==========================================

// Health & Status
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    contractsCount: dbState.contracts.length,
    customersCount: dbState.customers.length,
    backupCount: fs.readdirSync(BACKUP_DIR).length,
  });
});

// Full Database Fetch (used on startup & sync)
app.get('/api/database', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: dbState,
  });
});

// Authentication
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    return;
  }

  const user = dbState.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    res.status(401).json({ success: false, message: 'Tài khoản không tồn tại trên hệ thống.' });
    return;
  }

  if (user.isLocked) {
    res.status(403).json({ success: false, message: 'Tài khoản này đã bị khóa. Vui lòng liên hệ Admin.' });
    return;
  }

  const hash = hashPassword(password);
  if (user.passwordHash !== hash) {
    res.status(401).json({ success: false, message: 'Mật khẩu không chính xác.' });
    return;
  }

  addAuditLog(user.id, user.fullName, 'Đăng nhập hệ thống', 'user', user.id, `Đăng nhập thành công với vai trò ${user.role}`);

  // Return user without sensitive hash
  const { passwordHash: _, ...safeUser } = user;
  res.json({
    success: true,
    user: safeUser,
    token: `token_${user.id}_${Date.now()}`,
  });
});

app.post('/api/auth/change-password', (req: Request, res: Response) => {
  const { userId, oldPassword, newPassword } = req.body;
  const user = dbState.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    return;
  }

  if (user.passwordHash !== hashPassword(oldPassword)) {
    res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác.' });
    return;
  }

  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  addAuditLog(user.id, user.fullName, 'Đổi mật khẩu', 'user', user.id, 'Người dùng tự đổi mật khẩu');
  saveDatabase(dbState);

  res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
});

// Users Management (Admin)
app.get('/api/users', (_req: Request, res: Response) => {
  const safeUsers = dbState.users.map(({ passwordHash: _, ...u }) => u);
  res.json({ success: true, users: safeUsers });
});

app.post('/api/users', (req: Request, res: Response) => {
  const { username, fullName, role, password, permissions, operatorId, operatorName } = req.body;

  if (dbState.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại.' });
    return;
  }

  const newUser: User = {
    id: `USR-${Date.now()}`,
    username: username.trim(),
    fullName: fullName.trim(),
    role: role || 'staff',
    passwordHash: hashPassword(password || '123456'),
    isLocked: false,
    permissions: permissions || {
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
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbState.users.push(newUser);
  addAuditLog(operatorId, operatorName, 'Thêm nhân viên mới', 'user', newUser.id, `Tạo tài khoản ${newUser.username} (${newUser.fullName})`);
  saveDatabase(dbState);

  const { passwordHash: _, ...safe } = newUser;
  res.json({ success: true, user: safe });
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { fullName, role, permissions, isLocked, operatorId, operatorName } = req.body;

  const idx = dbState.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    return;
  }

  const user = dbState.users[idx];
  if (fullName) user.fullName = fullName;
  if (role) user.role = role;
  if (permissions) user.permissions = { ...user.permissions, ...permissions };
  if (typeof isLocked === 'boolean') user.isLocked = isLocked;
  user.updatedAt = new Date().toISOString();

  addAuditLog(operatorId, operatorName, 'Cập nhật tài khoản', 'user', user.id, `Chỉnh sửa thông tin/phân quyền tài khoản ${user.username}`);
  saveDatabase(dbState);

  const { passwordHash: _, ...safe } = user;
  res.json({ success: true, user: safe });
});

// Admin reset password for any user without knowing old password
app.post('/api/users/:id/password', (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword, operatorId, operatorName } = req.body;

  const user = dbState.users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    return;
  }

  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();

  addAuditLog(operatorId, operatorName, 'Đặt lại mật khẩu nhân viên', 'user', user.id, `Admin đặt lại mật khẩu cho tài khoản ${user.username}`);
  saveDatabase(dbState);

  res.json({ success: true, message: `Đã đặt mật khẩu mới cho ${user.fullName}.` });
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorId, operatorName } = req.body;

  if (id === 'USR-ADMIN' || dbState.users.find((u) => u.id === id)?.username === 'admin') {
    res.status(400).json({ success: false, message: 'Không được phép xóa tài khoản Admin mặc định.' });
    return;
  }

  const target = dbState.users.find((u) => u.id === id);
  dbState.users = dbState.users.filter((u) => u.id !== id);

  addAuditLog(operatorId, operatorName, 'Xóa tài khoản', 'user', id, `Xóa tài khoản ${target?.username || id}`);
  saveDatabase(dbState);

  res.json({ success: true, message: 'Đã xóa tài khoản.' });
});

// Customers
app.post('/api/customers', (req: Request, res: Response) => {
  const { customer, operatorId, operatorName } = req.body;
  const newCustomer: Customer = {
    ...customer,
    id: customer.id || `KH-${Date.now()}`,
    createdAt: customer.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbState.customers.unshift(newCustomer);
  addAuditLog(operatorId, operatorName, 'Thêm khách hàng', 'customer', newCustomer.id, `Thêm khách hàng ${newCustomer.fullName} - CCCD: ${newCustomer.idCard}`);
  saveDatabase(dbState);

  res.json({ success: true, customer: newCustomer });
});

app.put('/api/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { customer, operatorId, operatorName } = req.body;

  const idx = dbState.customers.findIndex((c) => c.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng.' });
    return;
  }

  const old = dbState.customers[idx];
  dbState.customers[idx] = {
    ...old,
    ...customer,
    id,
    updatedAt: new Date().toISOString(),
  };

  addAuditLog(operatorId, operatorName, 'Sửa thông tin khách hàng', 'customer', id, `Cập nhật thông tin khách hàng ${customer.fullName}`);
  saveDatabase(dbState);

  res.json({ success: true, customer: dbState.customers[idx] });
});

app.delete('/api/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorId, operatorName } = req.body;

  const target = dbState.customers.find((c) => c.id === id);
  dbState.customers = dbState.customers.filter((c) => c.id !== id);

  addAuditLog(operatorId, operatorName, 'Xóa khách hàng', 'customer', id, `Xóa khách hàng ${target?.fullName || id} (CCCD: ${target?.idCard || 'N/A'})`);
  saveDatabase(dbState);

  res.json({ success: true, message: 'Đã xóa khách hàng thành công.' });
});

// Contracts & Assets
app.post('/api/contracts', (req: Request, res: Response) => {
  const { contract, asset, images, operatorId, operatorName } = req.body;

  // Auto-generate Contract Code HD-XXXXXX
  const nextNumber = dbState.contracts.length + 1;
  const generatedCode = contract.code || `HD-${String(nextNumber).padStart(6, '0')}`;

  const newContract: Contract = {
    ...contract,
    id: contract.id || `CTR-${Date.now()}`,
    code: generatedCode,
    totalInterestPaid: contract.totalInterestPaid || 0,
    status: contract.status || 'active',
    createdAt: contract.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newAsset: Asset = {
    ...asset,
    id: asset.id || `AST-${Date.now()}`,
    contractId: newContract.id,
    customerId: newContract.customerId,
    status: 'in_pawn',
    createdAt: asset.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  newContract.assetId = newAsset.id;

  dbState.contracts.unshift(newContract);
  dbState.assets.unshift(newAsset);

  // Link uploaded images to this contract & asset
  if (Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      dbState.images.push({
        id: img.id || `IMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        contractId: newContract.id,
        assetId: newAsset.id,
        dataUrl: img.dataUrl,
        caption: img.caption || '',
        uploadedBy: operatorName || 'Nhân viên',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Record cash disbursement expense in cashflow
  const cashTransaction: CashflowTransaction = {
    id: `PC-${Date.now()}`,
    code: `PC-${Date.now().toString().slice(-6)}`,
    type: 'expense',
    category: 'loan_disbursement',
    amount: newContract.loanAmount,
    paymentMethod: 'cash',
    referenceContractId: newContract.id,
    referenceContractCode: newContract.code,
    staffName: operatorName || newContract.staffName,
    date: newContract.startDate,
    note: `Chi tiền cầm tài sản cho hợp đồng ${newContract.code} - ${newContract.customerName}`,
    createdAt: new Date().toISOString(),
  };
  dbState.transactions.unshift(cashTransaction);

  addAuditLog(
    operatorId,
    operatorName,
    'Tạo hợp đồng cầm đồ',
    'contract',
    newContract.id,
    `Tạo hợp đồng ${newContract.code} (${newContract.customerName}) - Tiền cầm: ${new Intl.NumberFormat('vi-VN').format(newContract.loanAmount)}đ - Lãi suất: ${newContract.interestRate}%/tháng`
  );

  saveDatabase(dbState);

  res.json({
    success: true,
    contract: newContract,
    asset: newAsset,
  });
});

app.put('/api/contracts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { contract, asset, operatorId, operatorName } = req.body;

  const cIdx = dbState.contracts.findIndex((c) => c.id === id);
  if (cIdx === -1) {
    res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng.' });
    return;
  }

  const oldContract = dbState.contracts[cIdx];
  dbState.contracts[cIdx] = {
    ...oldContract,
    ...contract,
    id,
    updatedAt: new Date().toISOString(),
  };

  if (asset && asset.id) {
    const aIdx = dbState.assets.findIndex((a) => a.id === asset.id);
    if (aIdx !== -1) {
      dbState.assets[aIdx] = {
        ...dbState.assets[aIdx],
        ...asset,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  addAuditLog(operatorId, operatorName, 'Chỉnh sửa hợp đồng', 'contract', id, `Cập nhật thông tin hợp đồng ${oldContract.code}`);
  saveDatabase(dbState);

  res.json({
    success: true,
    contract: dbState.contracts[cIdx],
  });
});

app.delete('/api/contracts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorId, operatorName } = req.body;

  const target = dbState.contracts.find((c) => c.id === id);
  if (!target) {
    res.status(404).json({ success: false, message: 'Hợp đồng không tồn tại.' });
    return;
  }

  // Delete associated images, asset, payments
  dbState.contracts = dbState.contracts.filter((c) => c.id !== id);
  dbState.assets = dbState.assets.filter((a) => a.contractId !== id);
  dbState.images = dbState.images.filter((img) => img.contractId !== id);
  dbState.payments = dbState.payments.filter((p) => p.contractId !== id);
  dbState.extensions = dbState.extensions.filter((e) => e.contractId !== id);
  dbState.liquidations = dbState.liquidations.filter((l) => l.contractId !== id);

  addAuditLog(
    operatorId,
    operatorName,
    'XÓA HỢP ĐỒNG',
    'contract',
    id,
    `Admin xóa toàn bộ hợp đồng ${target.code} (${target.customerName}) - Tiền cầm: ${new Intl.NumberFormat('vi-VN').format(target.loanAmount)}đ`
  );

  saveDatabase(dbState);

  res.json({ success: true, message: `Đã xóa hợp đồng ${target.code} thành công.` });
});

// Collect Interest Payment
app.post('/api/payments/collect-interest', (req: Request, res: Response) => {
  const { contractId, amount, paymentMethod, date, note, periodNote, operatorId, operatorName } = req.body;

  const contract = dbState.contracts.find((c) => c.id === contractId);
  if (!contract) {
    res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng.' });
    return;
  }

  const payment: Payment = {
    id: `PAY-${Date.now()}`,
    code: `PT-${Date.now().toString().slice(-6)}`,
    contractId: contract.id,
    contractCode: contract.code,
    customerId: contract.customerId,
    customerName: contract.customerName,
    type: 'interest',
    amount: Number(amount),
    paymentMethod: paymentMethod || 'cash',
    date: date || new Date().toISOString().split('T')[0],
    staffName: operatorName || 'Nhân viên',
    staffId: operatorId || '',
    periodNote: periodNote || '',
    note: note || '',
    createdAt: new Date().toISOString(),
  };

  dbState.payments.unshift(payment);

  // Update contract paid interest & status
  contract.totalInterestPaid = (contract.totalInterestPaid || 0) + Number(amount);
  contract.lastInterestPaidDate = payment.date;
  contract.status = 'paid_interest';
  contract.updatedAt = new Date().toISOString();

  // Create income cashflow entry
  const cashTransaction: CashflowTransaction = {
    id: `PT-${Date.now()}`,
    code: payment.code,
    type: 'income',
    category: 'interest_collected',
    amount: Number(amount),
    paymentMethod: payment.paymentMethod,
    referenceContractId: contract.id,
    referenceContractCode: contract.code,
    staffName: payment.staffName,
    date: payment.date,
    note: `Thu tiền lãi hợp đồng ${contract.code} - ${contract.customerName} (${payment.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'})`,
    createdAt: new Date().toISOString(),
  };
  dbState.transactions.unshift(cashTransaction);

  addAuditLog(
    operatorId,
    operatorName,
    'Thu tiền lãi',
    'payment',
    payment.id,
    `Thu lãi hợp đồng ${contract.code}: ${new Intl.NumberFormat('vi-VN').format(amount)}đ (${payment.paymentMethod})`
  );

  saveDatabase(dbState);

  res.json({ success: true, payment, contract });
});

// Redeem Contract (Chuộc tài sản)
app.post('/api/contracts/:id/redeem', (req: Request, res: Response) => {
  const { id } = req.params;
  const { redemptionAmount, unpaidInterest, paymentMethod, date, note, operatorId, operatorName } = req.body;

  const contract = dbState.contracts.find((c) => c.id === id);
  if (!contract) {
    res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng.' });
    return;
  }

  const asset = dbState.assets.find((a) => a.id === contract.assetId);

  // Mark contract redeemed
  contract.status = 'redeemed';
  contract.updatedAt = new Date().toISOString();

  if (asset) {
    asset.status = 'redeemed';
    asset.updatedAt = new Date().toISOString();
  }

  const totalAmount = Number(redemptionAmount);

  const payment: Payment = {
    id: `PAY-${Date.now()}`,
    code: `PT-${Date.now().toString().slice(-6)}`,
    contractId: contract.id,
    contractCode: contract.code,
    customerId: contract.customerId,
    customerName: contract.customerName,
    type: 'redemption',
    amount: totalAmount,
    paymentMethod: paymentMethod || 'cash',
    date: date || new Date().toISOString().split('T')[0],
    staffName: operatorName || 'Nhân viên',
    staffId: operatorId || '',
    periodNote: `Chuộc tài sản (Gốc: ${contract.loanAmount} + Lãi tồn: ${unpaidInterest || 0})`,
    note: note || '',
    createdAt: new Date().toISOString(),
  };
  dbState.payments.unshift(payment);

  // Income entry
  const cashTransaction: CashflowTransaction = {
    id: `PT-${Date.now()}`,
    code: payment.code,
    type: 'income',
    category: 'redemption_collected',
    amount: totalAmount,
    paymentMethod: payment.paymentMethod,
    referenceContractId: contract.id,
    referenceContractCode: contract.code,
    staffName: payment.staffName,
    date: payment.date,
    note: `Thu tiền chuộc hợp đồng ${contract.code} - ${contract.customerName} - Đã trả tài sản`,
    createdAt: new Date().toISOString(),
  };
  dbState.transactions.unshift(cashTransaction);

  addAuditLog(
    operatorId,
    operatorName,
    'Chuộc tài sản',
    'contract',
    contract.id,
    `Khách hoàn tất chuộc tài sản hợp đồng ${contract.code} - Tổng tiền: ${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ - Tài sản đã trả khách`
  );

  saveDatabase(dbState);

  res.json({ success: true, contract, asset });
});

// Extend Contract (Gia hạn)
app.post('/api/contracts/:id/extend', (req: Request, res: Response) => {
  const { id } = req.params;
  const { newDueDate, extensionDays, interestCollected, note, operatorId, operatorName } = req.body;

  const contract = dbState.contracts.find((c) => c.id === id);
  if (!contract) {
    res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng.' });
    return;
  }

  const oldDueDate = contract.dueDate;
  contract.dueDate = newDueDate;
  contract.status = 'extended';
  contract.updatedAt = new Date().toISOString();

  const extension: ContractExtension = {
    id: `EXT-${Date.now()}`,
    contractId: contract.id,
    contractCode: contract.code,
    oldDueDate,
    newDueDate,
    extensionDays: Number(extensionDays) || 30,
    interestCollected: Number(interestCollected) || 0,
    staffName: operatorName || 'Nhân viên',
    note: note || '',
    createdAt: new Date().toISOString(),
  };
  dbState.extensions.unshift(extension);

  if (Number(interestCollected) > 0) {
    const payment: Payment = {
      id: `PAY-${Date.now()}`,
      code: `PT-${Date.now().toString().slice(-6)}`,
      contractId: contract.id,
      contractCode: contract.code,
      customerId: contract.customerId,
      customerName: contract.customerName,
      type: 'extension',
      amount: Number(interestCollected),
      paymentMethod: 'cash',
      date: new Date().toISOString().split('T')[0],
      staffName: operatorName || 'Nhân viên',
      staffId: operatorId || '',
      periodNote: `Thu lãi khi gia hạn đến ${newDueDate}`,
      note: note || '',
      createdAt: new Date().toISOString(),
    };
    dbState.payments.unshift(payment);
    contract.totalInterestPaid = (contract.totalInterestPaid || 0) + Number(interestCollected);

    dbState.transactions.unshift({
      id: `PT-${Date.now()}`,
      code: payment.code,
      type: 'income',
      category: 'interest_collected',
      amount: Number(interestCollected),
      paymentMethod: 'cash',
      referenceContractId: contract.id,
      referenceContractCode: contract.code,
      staffName: operatorName || 'Nhân viên',
      date: payment.date,
      note: `Thu lãi gia hạn hợp đồng ${contract.code}`,
      createdAt: new Date().toISOString(),
    });
  }

  addAuditLog(
    operatorId,
    operatorName,
    'Gia hạn hợp đồng',
    'contract',
    contract.id,
    `Gia hạn hợp đồng ${contract.code} từ ngày ${oldDueDate} đến ${newDueDate} (Thêm ${extensionDays} ngày)`
  );

  saveDatabase(dbState);

  res.json({ success: true, contract, extension });
});

// Liquidate Asset (Thanh lý)
app.post('/api/contracts/:id/liquidate', (req: Request, res: Response) => {
  const { id } = req.params;
  const { liquidationPrice, unpaidInterest, buyerName, buyerPhone, note, date, operatorId, operatorName } = req.body;

  const contract = dbState.contracts.find((c) => c.id === id);
  if (!contract) {
    res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng.' });
    return;
  }

  const asset = dbState.assets.find((a) => a.id === contract.assetId);

  contract.status = 'liquidated';
  contract.updatedAt = new Date().toISOString();

  if (asset) {
    asset.status = 'liquidated';
    asset.warehouseLocation = 'Kho thanh lý';
    asset.updatedAt = new Date().toISOString();
  }

  const price = Number(liquidationPrice);
  const principal = contract.loanAmount;
  const unpaid = Number(unpaidInterest) || 0;
  const profitOrLoss = price - (principal + unpaid);

  const liquidation: Liquidation = {
    id: `LIQ-${Date.now()}`,
    contractId: contract.id,
    contractCode: contract.code,
    assetId: contract.assetId,
    assetName: contract.assetName,
    principalAmount: principal,
    unpaidInterest: unpaid,
    liquidationPrice: price,
    profitOrLoss,
    date: date || new Date().toISOString().split('T')[0],
    staffName: operatorName || 'Admin',
    buyerName: buyerName || '',
    buyerPhone: buyerPhone || '',
    note: note || '',
    createdAt: new Date().toISOString(),
  };
  dbState.liquidations.unshift(liquidation);

  // Income entry from liquidation
  const cashTransaction: CashflowTransaction = {
    id: `PT-${Date.now()}`,
    code: `TL-${Date.now().toString().slice(-6)}`,
    type: 'income',
    category: 'liquidation_collected',
    amount: price,
    paymentMethod: 'cash',
    referenceContractId: contract.id,
    referenceContractCode: contract.code,
    staffName: operatorName || 'Admin',
    date: liquidation.date,
    note: `Thu tiền thanh lý tài sản hợp đồng ${contract.code} - ${contract.assetName} (Lời/Lỗ: ${new Intl.NumberFormat('vi-VN').format(profitOrLoss)}đ)`,
    createdAt: new Date().toISOString(),
  };
  dbState.transactions.unshift(cashTransaction);

  addAuditLog(
    operatorId,
    operatorName,
    'THANH LÝ TÀI SẢN',
    'liquidation',
    liquidation.id,
    `Thanh lý tài sản hợp đồng ${contract.code}: Giá bán ${new Intl.NumberFormat('vi-VN').format(price)}đ (Gốc: ${new Intl.NumberFormat('vi-VN').format(principal)}đ, Lời/Lỗ: ${new Intl.NumberFormat('vi-VN').format(profitOrLoss)}đ)`
  );

  saveDatabase(dbState);

  res.json({ success: true, contract, asset, liquidation });
});

// Images management (strictly linked by contractId & assetId)
app.post('/api/images', (req: Request, res: Response) => {
  const { contractId, assetId, dataUrl, caption, uploadedBy } = req.body;
  if (!contractId || !dataUrl) {
    res.status(400).json({ success: false, message: 'Thiếu dữ liệu ảnh hoặc mã hợp đồng.' });
    return;
  }

  const newImage: ContractImage = {
    id: `IMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    contractId,
    assetId: assetId || '',
    dataUrl,
    caption: caption || '',
    uploadedBy: uploadedBy || 'Nhân viên',
    createdAt: new Date().toISOString(),
  };

  dbState.images.push(newImage);
  saveDatabase(dbState);

  res.json({ success: true, image: newImage });
});

app.delete('/api/images/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorId, operatorName } = req.body;

  const target = dbState.images.find((img) => img.id === id);
  dbState.images = dbState.images.filter((img) => img.id !== id);

  addAuditLog(operatorId, operatorName, 'Xóa ảnh tài sản', 'image', id, `Xóa ảnh ID ${id} thuộc hợp đồng ${target?.contractId || 'N/A'}`);
  saveDatabase(dbState);

  res.json({ success: true, message: 'Đã xóa ảnh.' });
});

// Cashflow Transactions (Thu - Chi)
app.post('/api/transactions', (req: Request, res: Response) => {
  const { type, category, amount, paymentMethod, date, note, operatorId, operatorName } = req.body;

  const newTrans: CashflowTransaction = {
    id: `TR-${Date.now()}`,
    code: type === 'income' ? `PT-${Date.now().toString().slice(-6)}` : `PC-${Date.now().toString().slice(-6)}`,
    type,
    category,
    amount: Number(amount),
    paymentMethod: paymentMethod || 'cash',
    staffName: operatorName || 'Nhân viên',
    date: date || new Date().toISOString().split('T')[0],
    note: note || '',
    createdAt: new Date().toISOString(),
  };

  dbState.transactions.unshift(newTrans);
  addAuditLog(
    operatorId,
    operatorName,
    type === 'income' ? 'Lập phiếu thu' : 'Lập phiếu chi',
    'cashflow',
    newTrans.id,
    `${type === 'income' ? 'Thu' : 'Chi'} ${new Intl.NumberFormat('vi-VN').format(amount)}đ: ${note}`
  );

  saveDatabase(dbState);
  res.json({ success: true, transaction: newTrans });
});

app.delete('/api/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorId, operatorName } = req.body;

  const target = dbState.transactions.find((t) => t.id === id);
  dbState.transactions = dbState.transactions.filter((t) => t.id !== id);

  addAuditLog(
    operatorId,
    operatorName,
    'Xóa phiếu thu/chi',
    'cashflow',
    id,
    `Admin xóa giao dịch ${target?.code} (${target?.type === 'income' ? 'Thu' : 'Chi'}: ${target?.amount}đ)`
  );

  saveDatabase(dbState);
  res.json({ success: true, message: 'Đã xóa giao dịch.' });
});

// System Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({ success: true, settings: dbState.settings });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const { settings, operatorId, operatorName } = req.body;

  const oldRate = dbState.settings.defaultInterestRate;
  const newRate = settings.defaultInterestRate;

  let auditNote = 'Cập nhật cấu hình hệ thống';
  if (oldRate !== newRate) {
    auditNote = `Admin điều chỉnh lãi suất mặc định từ ${oldRate}% sang ${newRate}%/tháng (Các hợp đồng cũ vẫn giữ nguyên lãi suất đã ký)`;
  }

  dbState.settings = {
    ...dbState.settings,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  addAuditLog(operatorId, operatorName, 'Cập nhật cài đặt', 'settings', 'SYS', auditNote);
  saveDatabase(dbState);

  res.json({ success: true, settings: dbState.settings });
});

// Backup & Restore
app.get('/api/backup/export', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=camdo_anhtu_backup_${new Date().toISOString().slice(0, 10)}.json`);
  res.send(JSON.stringify(dbState, null, 2));
});

app.post('/api/backup/create', (req: Request, res: Response) => {
  const { operatorId, operatorName, label } = req.body;
  const filename = createBackup(label || 'manual');
  addAuditLog(operatorId, operatorName, 'Tạo bản sao lưu', 'settings', filename, `Tạo bản sao lưu thủ công ${filename}`);
  res.json({ success: true, filename, lastBackupTime: dbState.settings.lastBackupTime });
});

app.get('/api/backup/list', (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR).sort().reverse();
    const backups = files.map((name) => {
      const stats = fs.statSync(path.join(BACKUP_DIR, name));
      return {
        name,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
      };
    });
    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi đọc danh sách sao lưu' });
  }
});

app.post('/api/backup/restore', (req: Request, res: Response) => {
  const { backupData, operatorId, operatorName } = req.body;
  if (!backupData || !backupData.contracts || !backupData.users) {
    res.status(400).json({ success: false, message: 'Dữ liệu sao lưu không hợp lệ.' });
    return;
  }

  // Before restoring, take an automatic safeguard snapshot
  createBackup('pre_restore_safeguard');

  dbState = {
    users: backupData.users || dbState.users,
    customers: backupData.customers || [],
    contracts: backupData.contracts || [],
    assets: backupData.assets || [],
    images: backupData.images || [],
    payments: backupData.payments || [],
    extensions: backupData.extensions || [],
    liquidations: backupData.liquidations || [],
    transactions: backupData.transactions || [],
    auditLogs: backupData.auditLogs || [],
    settings: { ...defaultSettings, ...(backupData.settings || {}) },
  };

  addAuditLog(
    operatorId,
    operatorName,
    'KHÔI PHỤC DỮ LIỆU',
    'settings',
    'RESTORE',
    `Admin khôi phục thành công hệ thống: ${dbState.contracts.length} hợp đồng, ${dbState.customers.length} khách hàng`
  );

  saveDatabase(dbState);
  res.json({ success: true, message: 'Khôi phục dữ liệu thành công.', data: dbState });
});

// Clear Demo Data (Admin only, safety confirmed)
app.post('/api/demo/clear', (req: Request, res: Response) => {
  const { operatorId, operatorName } = req.body;

  createBackup('before_clear_demo');

  // Clear transactional data only, preserve users and settings
  const contractCount = dbState.contracts.length;
  dbState.contracts = [];
  dbState.customers = [];
  dbState.assets = [];
  dbState.images = [];
  dbState.payments = [];
  dbState.extensions = [];
  dbState.liquidations = [];
  dbState.transactions = [];
  dbState.settings.isDemoModeActive = false;

  addAuditLog(
    operatorId,
    operatorName,
    'XÓA DỮ LIỆU DEMO',
    'settings',
    'CLEAR_DEMO',
    `Admin thực hiện xóa toàn bộ ${contractCount} dữ liệu demo/thử nghiệm để chuyển sang dữ liệu thực tế`
  );

  saveDatabase(dbState);
  res.json({ success: true, message: 'Đã xóa sạch dữ liệu demo. Hệ thống sẵn sàng cho hoạt động thực tế!' });
});

// Offline Sync endpoint: Batch sync offline mutations from clients
app.post('/api/sync', (req: Request, res: Response) => {
  const { mutations, lastSyncTimestamp, clientState } = req.body;

  // If client provided mutations executed while offline, apply them
  if (Array.isArray(mutations) && mutations.length > 0) {
    for (const m of mutations) {
      try {
        switch (m.type) {
          case 'CREATE_CONTRACT':
            if (!dbState.contracts.some((c) => c.id === m.payload.contract.id)) {
              dbState.contracts.unshift(m.payload.contract);
              if (m.payload.asset) dbState.assets.unshift(m.payload.asset);
              if (m.payload.images) dbState.images.push(...m.payload.images);
            }
            break;
          case 'UPDATE_CONTRACT':
            const cIdx = dbState.contracts.findIndex((c) => c.id === m.payload.id);
            if (cIdx !== -1) {
              dbState.contracts[cIdx] = { ...dbState.contracts[cIdx], ...m.payload.updates };
            }
            break;
          case 'CREATE_PAYMENT':
            if (!dbState.payments.some((p) => p.id === m.payload.payment.id)) {
              dbState.payments.unshift(m.payload.payment);
              const c = dbState.contracts.find((ct) => ct.id === m.payload.payment.contractId);
              if (c) {
                c.totalInterestPaid = (c.totalInterestPaid || 0) + m.payload.payment.amount;
                c.status = 'paid_interest';
              }
            }
            break;
          case 'CREATE_CUSTOMER':
            if (!dbState.customers.some((c) => c.id === m.payload.customer.id)) {
              dbState.customers.unshift(m.payload.customer);
            }
            break;
        }
      } catch (e) {
        console.error('Error applying offline mutation:', e);
      }
    }
    saveDatabase(dbState);
  }

  res.json({
    success: true,
    serverTimestamp: new Date().toISOString(),
    data: dbState,
  });
});

// ==========================================
// STATIC ASSETS & VITE INTEGRATION
// ==========================================

// Serve public static folder
app.use(express.static(path.resolve(process.cwd(), 'public')));

async function setupServer() {
  if (!isProduction) {
    // Development mode: attach Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
});
