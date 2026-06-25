/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  username: string;
  name: string;
  role: 'admin' | 'delegate';
  passwordHash: string; // Simulated password
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  minStock: number;
  location: string;
  supplierId: string;
  status: 'active' | 'inactive' | 'expired';
  imageUrl?: string;
  qrCode?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  companyName: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number; // Current debt (negative or positive balance)
}

export interface Delegate {
  id: string;
  name: string;
  phone: string;
  commissionRate: number; // percentage, e.g., 5 for 5%
  balance: number; // Current net balance (total commission - total advances)
  totalSales: number;
  totalCommission: number;
  totalAdvances: number;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  delegateId?: string;
  delegateName?: string;
  date: string;
  items: InvoiceItem[];
  discountValue: number;
  discountType: 'percentage' | 'value';
  paymentMethod: 'cash' | 'credit' | 'card';
  currency: 'IQD' | 'USD';
  total: number;
  netTotal: number;
  isReturned: boolean;
  returnDate?: string;
  notes?: string;
  createdBy: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  paymentMethod: 'cash' | 'credit' | 'card';
  currency: 'IQD' | 'USD';
  total: number;
  netTotal: number;
  notes?: string;
  createdBy: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in_purchase' | 'out_sale' | 'in_manual' | 'out_manual' | 'in_returned' | 'out_returned' | 'adjustment';
  quantity: number;
  date: string;
  previousQty: number;
  currentQty: number;
  notes: string;
  createdBy: string;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  type: 'sale_invoice' | 'payment' | 'return';
  amount: number; // Positive for invoice (debt increases), negative for payment (debt decreases)
  balanceAfter: number;
  date: string;
  invoiceId?: string;
  notes: string;
}

export interface DelegateTransaction {
  id: string;
  delegateId: string;
  type: 'commission' | 'advance' | 'payout';
  amount: number; // Positive for commission earned, negative for advance/payout
  balanceAfter: number;
  date: string;
  invoiceId?: string;
  notes: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
  exchangeRate: number; // 1 USD = X IQD (e.g. 1500)
}

export interface AppData {
  users: User[];
  products: Product[];
  categories: Category[];
  units: Unit[];
  suppliers: Supplier[];
  customers: Customer[];
  delegates: Delegate[];
  invoices: Invoice[];
  purchaseInvoices: PurchaseInvoice[];
  stockMovements: StockMovement[];
  customerTransactions: CustomerTransaction[];
  delegateTransactions: DelegateTransaction[];
  companyInfo: CompanyInfo;
}
