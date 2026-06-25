/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppData, Customer, CustomerTransaction } from '../types';
import { generateId, formatCurrency } from '../utils';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  DollarSign, 
  Clipboard, 
  CheckCircle, 
  AlertCircle,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Phone
} from 'lucide-react';

interface CustomersProps {
  data: AppData;
  activeCurrency: 'USD' | 'IQD';
  currentUserRole: 'admin' | 'delegate';
  currentUsername: string;
  onUpdateCustomers: (customers: Customer[]) => void;
  onAddCustomerTransaction: (tx: CustomerTransaction) => void;
}

export default function Customers({
  data,
  activeCurrency,
  currentUserRole,
  currentUsername,
  onUpdateCustomers,
  onAddCustomerTransaction
}: CustomersProps) {
  const rate = data.companyInfo.exchangeRate;

  // ---------------- State ----------------
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form State
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    balance: 0 // starting debt
  });

  // Debt collection payment form state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ---------------- CRUD Actions ----------------
  const openAddCustomerModal = () => {
    setSelectedCustomer(null);
    setCustomerForm({
      name: '',
      phone: '',
      balance: 0
    });
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    if (currentUserRole !== 'admin') {
      showToast('عذراً، هذه الصلاحية للمسؤولين فقط', 'error');
      return;
    }
    setSelectedCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      balance: customer.balance
    });
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.phone) {
      showToast('يرجى كتابة الاسم ورقم الهاتف للعميل', 'error');
      return;
    }

    if (selectedCustomer) {
      // Edit
      const updated = data.customers.map(c => {
        if (c.id === selectedCustomer.id) {
          return {
            ...c,
            name: customerForm.name,
            phone: customerForm.phone
          };
        }
        return c;
      });
      onUpdateCustomers(updated);
      showToast('تم تعديل بيانات العميل بنجاح');
    } else {
      // Add
      const newCustomer: Customer = {
        id: generateId('cust'),
        name: customerForm.name,
        phone: customerForm.phone,
        balance: customerForm.balance
      };
      onUpdateCustomers([...data.customers, newCustomer]);

      // If they had a starting balance, log starting transaction
      if (customerForm.balance !== 0) {
        const tx: CustomerTransaction = {
          id: generateId('ct'),
          customerId: newCustomer.id,
          type: 'sale_invoice',
          amount: customerForm.balance,
          balanceAfter: customerForm.balance,
          date: new Date().toISOString(),
          notes: 'رصيد ديني افتتاحي مستحق عند إضافة الحساب'
        };
        onAddCustomerTransaction(tx);
      }
      showToast('تم إضافة العميل الجديد للمنظومة');
    }
    setIsCustomerModalOpen(false);
  };

  const handleDeleteCustomer = (customerId: string, name: string) => {
    if (currentUserRole !== 'admin') {
      showToast('عذراً، هذه الصلاحية للمسؤولين فقط', 'error');
      return;
    }

    const customer = data.customers.find(c => c.id === customerId);
    if (customer && Math.abs(customer.balance) > 10) {
      showToast(`لا يمكن حذف العميل "${name}" لوجود ذمم مالية أو ديون غير مسواة بقيمة ${formatCurrency(customer.balance, 'IQD', rate)}!`, 'error');
      return;
    }

    if (confirm(`هل أنت متأكد من حذف حساب العميل "${name}" نهائياً من الدفاتر؟`)) {
      const filtered = data.customers.filter(c => c.id !== customerId);
      onUpdateCustomers(filtered);
      showToast('تم حذف حساب العميل بنجاح');
    }
  };

  // ---------------- DEBT COLLECTION (تحصيل دين) ----------------
  const openPaymentModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(Math.max(0, customer.balance)); // default to full debt
    setPaymentNotes('تسديد نقدي مقبوض في الصندوق');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (paymentAmount <= 0) {
      showToast('يرجى تحديد مبلغ دفع صحيح أكبر من الصفر', 'error');
      return;
    }

    const collectionInIqd = paymentAmount; // payment is assumed in IQD cash box!

    // Deduct from customer balance
    const updatedCustomers = data.customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          balance: c.balance - collectionInIqd
        };
      }
      return c;
    });
    onUpdateCustomers(updatedCustomers);

    // Create Transaction history
    const tx: CustomerTransaction = {
      id: generateId('ct'),
      customerId: selectedCustomer.id,
      type: 'payment',
      amount: -collectionInIqd, // Negative to decrease debt!
      balanceAfter: selectedCustomer.balance - collectionInIqd,
      date: new Date().toISOString(),
      notes: paymentNotes || 'دفعة نقدية مستلمة لتسديد الديون'
    };
    onAddCustomerTransaction(tx);

    setIsPaymentModalOpen(false);
    setSelectedCustomer(null);
    showToast(`تم تحصيل مبلغ ${formatCurrency(collectionInIqd, 'IQD', rate)} وقيدها في رصيد المقبوضات.`);
  };

  // ---------------- Search & Filter ----------------
  const filteredCustomers = data.customers.filter(c => {
    return c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           c.phone.includes(searchTerm);
  });

  const getCustomerTransactions = (customerId: string) => {
    return data.customerTransactions.filter(tx => tx.customerId === customerId);
  };

  return (
    <div className="space-y-6" id="customers_panel">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 left-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 text-white animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">إدارة حسابات العملاء والديون المتراكمة</h2>
          <p className="text-slate-500 text-xs mt-1">تتبع كشوفات العملاء، تدوير المديونيات الآجلة، وتحصيل الديون النقدية وتوثيق الدفعات</p>
        </div>

        <div>
          <button
            onClick={openAddCustomerModal}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1 transition-all"
          >
            <Plus size={16} />
            إضافة عميل جديد
          </button>
        </div>
      </div>

      {/* Search & Statistics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="lg:col-span-2 bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ابحث باسم العميل أو برقم هاتفه لاستعراض الكشف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Stat Card: Total Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">عدد العملاء المقيدين:</span>
            <span className="text-base font-bold text-slate-800">{data.customers.length} عملاء</span>
          </div>
          <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500">
            <Users size={18} />
          </div>
        </div>

        {/* Stat Card: Total Debts */}
        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-xs flex justify-between items-center text-xs">
          <div>
            <span className="text-rose-600 font-medium block mb-0.5">إجمالي ديون المستودع المستحقة:</span>
            <span className="text-base font-bold text-rose-700">
              {formatCurrency(data.customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0), activeCurrency, rate)}
            </span>
          </div>
          <div className="w-9 h-9 bg-rose-100/50 rounded-lg flex items-center justify-center text-rose-600">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* Customers Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                <th className="p-3.5">اسم حساب العميل</th>
                <th className="p-3.5">رقم الهاتف الكاش</th>
                <th className="p-3.5">الرصيد المالي الحالي والمديونية</th>
                <th className="p-3.5">حالة المديونية</th>
                <th className="p-3.5 text-left">التحصيل والعمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.map(c => {
                const hasDebts = c.balance > 0;
                const creditBalance = c.balance < 0;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block text-sm">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">رقم الحساب: {c.id}</span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1 font-mono text-slate-500">
                        <Phone size={12} className="text-slate-300" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold font-mono text-sm">
                      <span className={hasDebts ? 'text-rose-600' : creditBalance ? 'text-emerald-600' : 'text-slate-500'}>
                        {formatCurrency(c.balance, activeCurrency, rate)}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {hasDebts ? (
                        <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-100">
                          مطلوب (عليه ديون ⚠️)
                        </span>
                      ) : creditBalance ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                          دائن (له مبالغ زائدة)
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          مسوى بالكامل ✓
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsHistoryModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          كشف الحركات المحاسبية
                        </button>
                        
                        {hasDebts && (
                          <button
                            onClick={() => openPaymentModal(c)}
                            className="px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-md transition-colors"
                          >
                            تحصيل دفعة مالية $
                          </button>
                        )}

                        {currentUserRole === 'admin' && (
                          <>
                            <button
                              onClick={() => openEditCustomerModal(c)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(c.id, c.name)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================== MODAL: ADD/EDIT CUSTOMER ==================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-md">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {selectedCustomer ? 'تعديل بيانات حساب العميل' : 'إضافة حساب عميل جديد بالدفتر'}
              </h3>
              <button 
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">اسم حساب العميل الكامل <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700"
                  placeholder="مثال: شركة أسواق بغداد الكبرى"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">رقم هاتف العميل الكاش المعتمد <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                  placeholder="مثال: 07701234567"
                />
              </div>

              {!selectedCustomer && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">رصيد مديونية افتتاحي سابق <span className="text-slate-400">(أضف مديونية إن وجدت)</span></label>
                  <input
                    type="number"
                    value={customerForm.balance}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                    placeholder="مثال: 500000 دينار مستحقة سابقاً"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">يُسجل هذا المبلغ كديون مستحقة سابقة على العميل بالعملة العراقية (د.ع)</span>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-blue-600 text-white font-bold rounded-lg"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================== MODAL: DEBT COLLECTION ENTRY ==================================== */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-md">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">تسجيل دفعة قبض مالي وتحصيل دين</h3>
              <button 
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsPaymentModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                <div>حساب العميل المسدد: <span className="font-bold text-slate-800">{selectedCustomer.name}</span></div>
                <div>المديونية الإجمالية الحالية: <span className="font-bold text-rose-600">{formatCurrency(selectedCustomer.balance, 'IQD', rate)}</span></div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">المبلغ المقبوض نقداً (بالدينار د.ع) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedCustomer.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                  placeholder="اكتب القيمة المقبوضة..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">بيان الحركة / رقم السند أو الوصل</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700"
                  placeholder="مثال: تسديد بموجب وصل استلام رقم 4421"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setIsPaymentModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-emerald-600 text-white font-bold rounded-lg shadow-sm"
                >
                  تأكيد قبض وترحيل المبلغ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================== MODAL: CUSTOMER LEDGER DETAIL (كشف حساب) ==================================== */}
      {isHistoryModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-800 text-sm">الكشف الحسابي المحاسبي للعميل: {selectedCustomer.name}</h3>
              <button 
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsHistoryModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">معلومات الاتصال:</span>
                  <span className="font-bold text-slate-800 block text-sm">{selectedCustomer.name}</span>
                  <span className="text-slate-500 font-mono block mt-1">هاتف: {selectedCustomer.phone}</span>
                </div>
                <div className="text-left">
                  <span className="text-slate-400 block mb-0.5">الرصيد النهائي المستحق حالياً:</span>
                  <span className={`text-lg font-bold font-mono ${selectedCustomer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(selectedCustomer.balance, 'IQD', rate)}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-1">بالدينار العراقي (د.ع)</p>
                </div>
              </div>

              {/* Transactions list */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 block">سجل العمليات والدفعات التاريخي:</span>
                
                {getCustomerTransactions(selectedCustomer.id).length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs border rounded-lg border-dashed">لم يتم تسجيل أي حركات مالية سابقة على هذا الحساب.</div>
                ) : (
                  <div className="border border-slate-100 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-right text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          <th className="p-2.5">التاريخ</th>
                          <th className="p-2.5">العملية</th>
                          <th className="p-2.5">قيمة العملية</th>
                          <th className="p-2.5">الرصيد بعد الحركة</th>
                          <th className="p-2.5">الملاحظات والبيان</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                        {getCustomerTransactions(selectedCustomer.id).slice().reverse().map(tx => {
                          const isCredit = tx.amount > 0; // debit/invoice increases debt
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-mono text-slate-400 text-[10px]">
                                {new Date(tx.date).toLocaleDateString('ar-IQ')}
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  tx.type === 'sale_invoice' ? 'bg-rose-50 text-rose-700' : tx.type === 'payment' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                                }`}>
                                  {tx.type === 'sale_invoice' ? 'فاتورة مبيعات' : tx.type === 'payment' ? 'قبض نقدي' : 'مرتجع مبيعات'}
                                </span>
                              </td>
                              <td className={`p-2.5 font-bold font-mono ${isCredit ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {isCredit ? '+' : ''}{formatCurrency(tx.amount, 'IQD', rate)}
                              </td>
                              <td className="p-2.5 font-mono font-semibold text-slate-700">
                                {formatCurrency(tx.balanceAfter, 'IQD', rate)}
                              </td>
                              <td className="p-2.5 text-slate-500 text-[10px] max-w-xs truncate" title={tx.notes}>
                                {tx.notes}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setIsHistoryModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  إغلاق الكشف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
