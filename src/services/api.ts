import {
  DatabaseState,
  User,
  Customer,
  Contract,
  Asset,
  Payment,
  ContractExtension,
  Liquidation,
  CashflowTransaction,
  ContractImage,
  SystemSettings,
  AuditLog,
} from '../types';
import {
  saveLocalState,
  getLocalState,
  addPendingMutation,
  getPendingMutations,
  clearPendingMutations,
  PendingMutation,
} from './indexedDb';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

class ApiService {
  private syncStatusListeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];
  private currentStatus: SyncStatus = 'synced';
  private pendingCount: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateSyncStatus('syncing');
        this.syncPendingData();
      });

      window.addEventListener('offline', () => {
        this.updateSyncStatus('offline');
      });

      // Background sync check every 15 seconds
      setInterval(() => {
        if (navigator.onLine && this.pendingCount > 0) {
          this.syncPendingData();
        }
      }, 15000);
    }
  }

  public onSyncStatusChange(cb: (status: SyncStatus, pendingCount: number) => void) {
    this.syncStatusListeners.push(cb);
    cb(this.currentStatus, this.pendingCount);
    return () => {
      this.syncStatusListeners = this.syncStatusListeners.filter((l) => l !== cb);
    };
  }

  private updateSyncStatus(status: SyncStatus) {
    this.currentStatus = status;
    this.syncStatusListeners.forEach((l) => l(this.currentStatus, this.pendingCount));
  }

  // Load database from Local IndexedDB first, then attempt server sync
  public async loadInitialState(): Promise<{ state: DatabaseState; fromServer: boolean }> {
    const local = await getLocalState();

    if (navigator.onLine) {
      try {
        this.updateSyncStatus('syncing');
        const res = await fetch('/api/database');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            await saveLocalState(json.data);
            this.updateSyncStatus('synced');
            return { state: json.data, fromServer: true };
          }
        }
      } catch (err) {
        console.warn('Cannot reach server, falling back to local database', err);
        this.updateSyncStatus('offline');
      }
    } else {
      this.updateSyncStatus('offline');
    }

    if (local) {
      return { state: local, fromServer: false };
    }

    // If completely empty and offline, return basic state without mocking
    throw new Error('Không thể kết nối cơ sở dữ liệu và không tìm thấy bản lưu cục bộ.');
  }

  // Synchronize offline mutations
  public async syncPendingData(): Promise<DatabaseState | null> {
    if (!navigator.onLine) {
      this.updateSyncStatus('offline');
      return null;
    }

    const pending = await getPendingMutations();
    this.pendingCount = pending.length;

    if (pending.length === 0) {
      this.updateSyncStatus('synced');
      return null;
    }

    this.updateSyncStatus('syncing');

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutations: pending }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          await clearPendingMutations(pending.map((p) => p.id));
          this.pendingCount = 0;
          await saveLocalState(json.data);
          this.updateSyncStatus('synced');
          return json.data;
        }
      }
      this.updateSyncStatus('error');
    } catch (err) {
      console.error('Failed to sync mutations:', err);
      this.updateSyncStatus('offline');
    }
    return null;
  }

  // Generic request with offline resilience
  private async mutate<T>(
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body: any,
    mutationType: string,
    optimisticUpdater: (state: DatabaseState) => DatabaseState
  ): Promise<{ success: boolean; data?: T; offline?: boolean }> {
    const local = await getLocalState();
    let updatedLocal: DatabaseState | null = null;
    if (local) {
      updatedLocal = optimisticUpdater(local);
      await saveLocalState(updatedLocal);
    }

    if (!navigator.onLine) {
      // Record mutation for sync
      const mutation: PendingMutation = {
        id: `MUT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: mutationType,
        payload: body,
        timestamp: new Date().toISOString(),
      };
      await addPendingMutation(mutation);
      this.pendingCount += 1;
      this.updateSyncStatus('offline');
      return { success: true, offline: true };
    }

    try {
      this.updateSyncStatus('syncing');
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Lỗi thao tác trên máy chủ.');
      }

      const json = await res.json();
      this.updateSyncStatus('synced');
      return { success: true, data: json };
    } catch (err: any) {
      console.warn('Network request failed, queueing mutation:', err);
      const mutation: PendingMutation = {
        id: `MUT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: mutationType,
        payload: body,
        timestamp: new Date().toISOString(),
      };
      await addPendingMutation(mutation);
      this.pendingCount += 1;
      this.updateSyncStatus('offline');
      return { success: true, offline: true };
    }
  }

  // Auth
  public async login(username: string, password: string):Promise<{ success: boolean; user?: User; message?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  }

  public async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    });
    return res.json();
  }

  // Contracts
  public async createContract(
    contract: Partial<Contract>,
    asset: Partial<Asset>,
    images: { dataUrl: string; caption?: string }[],
    operator: { id: string; name: string }
  ) {
    return this.mutate(
      '/api/contracts',
      'POST',
      { contract, asset, images, operatorId: operator.id, operatorName: operator.name },
      'CREATE_CONTRACT',
      (state) => {
        const c: Contract = {
          ...contract,
          id: contract.id || `CTR-${Date.now()}`,
          code: contract.code || `HD-${String(state.contracts.length + 1).padStart(6, '0')}`,
          totalInterestPaid: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Contract;
        const a: Asset = {
          ...asset,
          id: asset.id || `AST-${Date.now()}`,
          contractId: c.id,
          customerId: c.customerId,
          status: 'in_pawn',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Asset;
        c.assetId = a.id;
        state.contracts.unshift(c);
        state.assets.unshift(a);
        return state;
      }
    );
  }

  public async updateContract(
    id: string,
    contract: Partial<Contract>,
    asset: Partial<Asset> | null,
    operator: { id: string; name: string }
  ) {
    return this.mutate(
      `/api/contracts/${id}`,
      'PUT',
      { contract, asset, operatorId: operator.id, operatorName: operator.name },
      'UPDATE_CONTRACT',
      (state) => {
        const idx = state.contracts.findIndex((c) => c.id === id);
        if (idx !== -1) {
          state.contracts[idx] = { ...state.contracts[idx], ...contract, updatedAt: new Date().toISOString() };
        }
        return state;
      }
    );
  }

  public async deleteContract(id: string, operator: { id: string; name: string }) {
    const res = await fetch(`/api/contracts/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: operator.id, operatorName: operator.name }),
    });
    const json = await res.json();
    if (json.success) {
      const local = await getLocalState();
      if (local) {
        local.contracts = local.contracts.filter((c) => c.id !== id);
        local.assets = local.assets.filter((a) => a.contractId !== id);
        local.images = local.images.filter((i) => i.contractId !== id);
        await saveLocalState(local);
      }
    }
    return json;
  }

  // Customers
  public async createCustomer(customer: Partial<Customer>, operator: { id: string; name: string }) {
    return this.mutate(
      '/api/customers',
      'POST',
      { customer, operatorId: operator.id, operatorName: operator.name },
      'CREATE_CUSTOMER',
      (state) => {
        const newC: Customer = {
          ...customer,
          id: customer.id || `KH-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Customer;
        state.customers.unshift(newC);
        return state;
      }
    );
  }

  public async updateCustomer(id: string, customer: Partial<Customer>, operator: { id: string; name: string }) {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  public async deleteCustomer(id: string, operator: { id: string; name: string }) {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: operator.id, operatorName: operator.name }),
    });
    const json = await res.json();
    if (json.success) {
      const local = await getLocalState();
      if (local) {
        local.customers = local.customers.filter((c) => c.id !== id);
        await saveLocalState(local);
      }
    }
    return json;
  }

  // Collect Interest
  public async collectInterest(data: {
    contractId: string;
    amount: number;
    paymentMethod: 'cash' | 'bank_transfer';
    date?: string;
    periodNote?: string;
    note?: string;
    operatorId: string;
    operatorName: string;
  }) {
    const res = await fetch('/api/payments/collect-interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // Redeem
  public async redeemContract(data: {
    contractId: string;
    redemptionAmount: number;
    unpaidInterest: number;
    paymentMethod: 'cash' | 'bank_transfer';
    date?: string;
    note?: string;
    operatorId: string;
    operatorName: string;
  }) {
    const res = await fetch(`/api/contracts/${data.contractId}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // Extend
  public async extendContract(data: {
    contractId: string;
    newDueDate: string;
    extensionDays: number;
    interestCollected: number;
    note?: string;
    operatorId: string;
    operatorName: string;
  }) {
    const res = await fetch(`/api/contracts/${data.contractId}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // Liquidate
  public async liquidateContract(data: {
    contractId: string;
    liquidationPrice: number;
    unpaidInterest: number;
    buyerName?: string;
    buyerPhone?: string;
    date?: string;
    note?: string;
    operatorId: string;
    operatorName: string;
  }) {
    const res = await fetch(`/api/contracts/${data.contractId}/liquidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // Images
  public async addImage(contractId: string, assetId: string, dataUrl: string, caption: string, operatorName: string) {
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, assetId, dataUrl, caption, uploadedBy: operatorName }),
    });
    return res.json();
  }

  public async deleteImage(id: string, operator: { id: string; name: string }) {
    const res = await fetch(`/api/images/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  // Cashflow
  public async createTransaction(data: Partial<CashflowTransaction>, operator: { id: string; name: string }) {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  public async deleteTransaction(id: string, operator: { id: string; name: string }) {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  // Settings
  public async updateSettings(settings: Partial<SystemSettings>, operator: { id: string; name: string }) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  // User Management
  public async createUser(userData: any, operator: { id: string; name: string }) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  public async updateUser(id: string, userData: any, operator: { id: string; name: string }) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  public async adminResetPassword(id: string, newPassword: string, operator: { id: string; name: string }) {
    const res = await fetch(`/api/users/${id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword, operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  public async deleteUser(id: string, operator: { id: string; name: string }) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  // Backups
  public async createBackup(operator: { id: string; name: string }, label?: string) {
    const res = await fetch('/api/backup/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: operator.id, operatorName: operator.name, label }),
    });
    return res.json();
  }

  public async getBackupsList() {
    const res = await fetch('/api/backup/list');
    return res.json();
  }

  public async restoreBackup(backupData: DatabaseState, operator: { id: string; name: string }) {
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupData, operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }

  public async clearDemoData(operator: { id: string; name: string }) {
    const res = await fetch('/api/demo/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: operator.id, operatorName: operator.name }),
    });
    return res.json();
  }
}

export const apiService = new ApiService();
