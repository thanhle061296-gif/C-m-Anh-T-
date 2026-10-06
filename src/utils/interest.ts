import { Contract, InterestCalculation, InterestRules } from '../types';

/**
 * Tính toán tiền lãi và gốc tự động theo quy tắc cấu hình
 */
export function calculateContractInterest(
  contract: Contract,
  rules: InterestRules,
  asOfDate: Date = new Date()
): InterestCalculation {
  const principal = contract.loanAmount;
  const rate = contract.interestRate / 100; // e.g. 0.03 for 3%

  const startDate = new Date(contract.startDate);
  startDate.setHours(0, 0, 0, 0);

  const targetDate = new Date(asOfDate);
  targetDate.setHours(0, 0, 0, 0);

  const dueDate = new Date(contract.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  // Số ngày đã cầm
  const diffTime = Math.max(0, targetDate.getTime() - startDate.getTime());
  const daysPassed = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Tính số tháng tính lãi theo quy tắc
  // Mặc định: 1–15 ngày = 0.5 tháng; >15 ngày <= 30 ngày = 1 tháng; các tháng tiếp theo tính thêm
  const fullMonths = Math.floor(daysPassed / 30);
  const remainingDays = daysPassed % 30;

  let partialMonth = 0;
  if (remainingDays > 0) {
    if (remainingDays <= (rules.halfMonthDaysThreshold || 15)) {
      partialMonth = 0.5;
    } else {
      partialMonth = 1.0;
    }
  }

  const effectiveMonths = fullMonths + partialMonth;
  // Lãi mỗi tháng = Gốc * (lãi suất % / 100)
  const monthlyInterest = principal * rate;
  // Tổng lãi tích lũy đến hiện tại
  const totalAccruedInterest = Math.round(monthlyInterest * effectiveMonths);

  const totalInterestPaid = contract.totalInterestPaid || 0;
  const remainingInterest = Math.max(0, totalAccruedInterest - totalInterestPaid);
  const totalPayableForRedemption = principal + remainingInterest;

  // Lãi kỳ hiện tại (1 tháng)
  const currentPeriodInterest = Math.round(monthlyInterest);

  const isOverdue = targetDate > dueDate && contract.status !== 'redeemed' && contract.status !== 'liquidated';
  const daysOverdue = isOverdue ? Math.ceil((targetDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return {
    principal,
    interestRate: contract.interestRate,
    daysPassed,
    monthsPassed: effectiveMonths,
    periodsCount: Math.ceil(effectiveMonths),
    currentPeriodInterest,
    totalAccruedInterest,
    totalInterestPaid,
    remainingInterest,
    totalPayableForRedemption,
    isOverdue,
    daysOverdue,
  };
}

/**
 * Định dạng tiền tệ VNĐ (ví dụ: 10.000.000 đ)
 */
export function formatVND(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

/**
 * Định dạng số không có chữ đ
 */
export function formatNumber(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
}

/**
 * Định dạng ngày dd/mm/yyyy
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Định dạng ngày giờ dd/mm/yyyy HH:mm
 */
export function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
