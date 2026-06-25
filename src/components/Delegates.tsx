/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppData, Delegate, DelegateTransaction } from '../types';
import { generateId, formatCurrency } from '../utils';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  DollarSign, 
  Briefcase, 
  CheckCircle, 
  AlertCircle,
  X,
  TrendingUp,
  Percent,
  Coins
} from 'lucide-react';

interface DelegatesProps {
  data: AppData;
  activeCurrency: 'USD' | 'IQD';
  currentUserRole: 'admin' | 'delegate';
  currentUsername: string;
  onUpdateDelegates: (delegates: Delegate[]) => void;
  onAddDelegateTransaction: (tx: DelegateTransaction) => void;
}

export default function Delegates({
  data,
  activeCurrency,
  currentUserRole,
  currentUsername,
  onUpdateDelegates,
  onAddDelegateTransaction
}: DelegatesProps) {
  const rate = data.companyInfo.exchangeRate;

  // ---------------- State ----------------
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(null);

  // Form State
  const [delegateForm, setDelegateForm] = useState({
    name: '',
    phone: '',
    commissionRate: 5 // Default 5%
  });

  // Advance / payout state
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [advanceNotes, setAdvanceNotes] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ---------------- CRUD Actions ----------------
  const openAddDelegateModal = () => {
    setSelectedDelegate(null);
    setDelegateForm({
      name: '',
      phone: '',
      commissionRate: 5
    });
    setIsDelegateModalOpen(true);
  };

  const openEditDelegateModal = (delegate: Delegate) => {
    if (currentUserRole !== 'admin') {
      showToast('عذراً، هذه الصلاحية للمسؤولين فقط', 'error');
      return;
    }
    setSelectedDelegate(delegate);
    setDelegateForm({
      name: delegate.name,
      phone: delegate.phone,
      commissionRate: delegate.commissionRate
    });
    setIsDelegateModalOpen(true);
  };

  const handleSaveDelegate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateForm.name || !delegateForm.phone) {
      showToast('يرجى ملء جميع الحقول الإجبارية للمندوب', 'error');
      return;
    }

    if (delegateForm.commissionRate < 0 || delegateForm.commissionRate > 100) {
      showToast('نسبة العمولة يجب أن تكون بين 0% و 100%', 'error');
      return;
    }

    if (selectedDelegate) {
      // Edit
      const updated = data.delegates.map(d => {
        if (d.id === selectedDelegate.id) {
          return {
            ...d,
            name: delegateForm.name,
            phone: delegateForm.phone,
            commissionRate: delegateForm.commissionRate
          };
        }
        return d;
      });
      onUpdateDelegates(updated);
      showToast('تم تعديل بيانات المندوب بنجاح');
    } else {
      // Add
      const newDelegate: Delegate = {
        id: generateId('del'),
        name: delegateForm.name,
        phone: delegateForm.phone,
        commissionRate: delegateForm.commissionRate,
        balance: 0,
        totalSales: 0,
        totalCommission: 0,
        totalAdvances: 0
      };
      onUpdateDelegates([...data.delegates, newDelegate]);
      showToast('تم إضافة المندوب المبيعات الجديد');
    }
    setIsDelegateModalOpen(false);
  };

  const handleDeleteDelegate = (delegateId: string, name: string) => {
    if (currentUserRole !== 'admin') {
      showToast('عذراً، هذه الصلاحية للمسؤولين فقط', 'error');
      return;
    }

    const delegate = data.delegates.find(d => d.id === delegateId);
    if (delegate && delegate.balance > 10) {
      showToast(`لا يمكن حذف المندوب "${name}" لوجود مستحقات عمولة معلقة لم تُدفع بقيمة ${formatCurrency(delegate.balance, 'IQD', rate)}!`, 'error');
      return;
    }

    if (confirm(`هل أنت متأكد من حذف حساب المندوب "${name}"؟`)) {
      const filtered = data.delegates.filter(d => d.id !== delegateId);
      onUpdateDelegates(filtered);
      showToast('تم حذف حساب المندوب');
    }
  };

  // ---------------- RECORD ADVANCE / PAYOUT (تسجيل سلفة / تصفية عمولات) ----------------
  const openAdvanceModal = (delegate: Delegate) => {
    setSelectedDelegate(delegate);
    setAdvanceAmount(Math.max(0, delegate.balance)); // default to their entire remaining balance
    setAdvanceNotes('سلفة مالية مستلمة على الحساب نقداً');
    setIsAdvanceModalOpen(true);
  };

  const handleSaveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelegate) return;
    if (advanceAmount <= 0) {
      showToast('يرجى كتابة قيمة سلفة صحيحة أكبر من الصفر', 'error');
      return;
    }

    const paymentAmountIqd = advanceAmount;

    // Deduct advance from delegate balance & add to total advances
    const updatedDelegates = data.delegates.map(d => {
      if (d.id === selectedDelegate.id) {
        return {
          ...d,
          balance: d.balance - paymentAmountIqd,
          totalAdvances: d.totalAdvances + paymentAmountIqd
        };
      }
      return d;
    });
    onUpdateDelegates(updatedDelegates);

    // Create Delegate transaction history
    const tx: DelegateTransaction = {
      id: generateId('dt'),
      delegateId: selectedDelegate.id,
      type: 'advance',
      amount: -paymentAmountIqd, // Negative to decrease remaining balance!
      balanceAfter: selectedDelegate.balance - paymentAmountIqd,
      date: new Date().toISOString(),
      notes: advanceNotes || 'صرف سلفة مالية نقدية'
    };
    onAddDelegateTransaction(tx);

    setIsAdvanceModalOpen(false);
    setSelectedDelegate(null);
    showToast(`تم صرف سلفة للمندوب بقيمة ${formatCurrency(paymentAmountIqd, 'IQD', rate)} وتعديل الحساب.`);
  };

  // ---------------- Search & Filter ----------------
  const filteredDelegates = data.delegates.filter(d => {
    return d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           d.phone.includes(searchTerm);
  });

  const getDelegateTransactions = (delegateId: string) => {
    return data.delegateTransactions.filter(tx => tx.delegateId === delegateId);
  };

  return (
    <div className="space-y-6" id="delegates_panel">
      
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
          <h2 className="text-xl font-bold text-slate-800">إدارة مندوبي المبيعات والعمولات</h2>
          <p className="text-slate-500 text-xs mt-1">تسجيل المندوبين، إسناد نسب العمولات تلقائياً من المبيعات، ومتابعة سلف المندوبين والذمم</p>
        </div>

        <div>
          <button
            onClick={openAddDelegateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1 transition-all"
          >
            <Plus size={16} />
            إضافة مندوب مبيعات جديد
          </button>
        </div>
      </div>

      {/* Stats and Search bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="lg:col-span-2 bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ابحث باسم المندوب أو برقم هاتفه لرؤية سجل العمولات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Stat: Active delegates */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">عدد المندوبين النشطين:</span>
            <span className="text-base font-bold text-slate-800">{data.delegates.length} مندوباً</span>
          </div>
          <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500">
            <Users size={18} />
          </div>
        </div>

        {/* Stat: Total due commission */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-xs flex justify-between items-center text-xs">
          <div>
            <span className="text-blue-600 font-medium block mb-0.5">إجمالي العمولات المستحقة للدفع:</span>
            <span className="text-base font-bold text-blue-700">
              {formatCurrency(data.delegates.reduce((acc, d) => acc + d.balance, 0), activeCurrency, rate)}
            </span>
          </div>
          <div className="w-9 h-9 bg-blue-100/50 rounded-lg flex items-center justify-center text-blue-600">
            <Coins size={18} />
          </div>
        </div>
      </div>

      {/* Delegates Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                <th className="p-3.5">اسم مندوب المبيعات</th>
                <th className="p-3.5">هاتف المندوب</th>
                <th className="p-3.5 text-center">نسبة العمولة (%)</th>
                <th className="p-3.5">إجمالي المبيعات المحققة</th>
                <th className="p-3.5">إجمالي العمولات الكلية</th>
                <th className="p-3.5">إجمالي السلف المقبوضة</th>
                <th className="p-3.5">الرصيد المتبقي المستحق له</th>
                <th className="p-3.5 text-left">التصفية والعمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDelegates.map(d => {
                const hasBalance = d.balance > 0;
                return (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block text-sm">{d.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">معرف المندوب: {d.id}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">{d.phone}</td>
                    <td className="p-3.5 text-center font-bold font-mono">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] border border-blue-100">
                        {d.commissionRate}%
                      </span>
                    </td>
                    <td className="p-3.5 font-bold font-mono text-slate-700">
                      {formatCurrency(d.totalSales, activeCurrency, rate)}
                    </td>
                    <td className="p-3.5 font-bold font-mono text-emerald-600">
                      {formatCurrency(d.totalCommission, activeCurrency, rate)}
                    </td>
                    <td className="p-3.5 font-bold font-mono text-rose-500">
                      -{formatCurrency(d.totalAdvances, activeCurrency, rate)}
                    </td>
                    <td className="p-3.5 font-bold font-mono text-blue-600 text-sm">
                      {formatCurrency(d.balance, activeCurrency, rate)}
                    </td>
                    <td className="p-3.5 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedDelegate(d);
                            setIsHistoryModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          سجل العمولات والسلف
                        </button>

                        {hasBalance && (
                          <button
                            onClick={() => openAdvanceModal(d)}
                            className="px-2.5 py-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-md transition-colors"
                          >
                            صرف سلفة مالية $
                          </button>
                        )}

                        {currentUserRole === 'admin' && (
                          <>
                            <button
                              onClick={() => openEditDelegateModal(d)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteDelegate(d.id, d.name)}
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

      {/* ==================================== MODAL: ADD/EDIT DELEGATE ==================================== */}
      {isDelegateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-md">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {selectedDelegate ? 'تعديل بيانات حساب المندوب' : 'إضافة حساب مندوب مبيعات جديد'}
              </h3>
              <button 
                onClick={() => setIsDelegateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDelegate} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">اسم المندوب الرباعي <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={delegateForm.name}
                  onChange={(e) => setDelegateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700"
                  placeholder="مثال: يوسف حسين مروان"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">رقم هاتف المندوب <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={delegateForm.phone}
                  onChange={(e) => setDelegateForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                  placeholder="مثال: 07801234567"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">نسبة العمولة الافتراضية (%) <span className="text-rose-500">*</span></label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={delegateForm.commissionRate}
                    onChange={(e) => setDelegateForm(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
                    className="w-32 px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                  />
                  <span className="text-xs text-slate-500">تحتسب هذه النسبة من صافي الفواتير المسجلة باسم المندوب</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDelegateModalOpen(false)}
                  className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-blue-600 text-white font-bold rounded-lg"
                >
                  حفظ حساب المندوب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================== MODAL: ADVANCE PAYMENT (صرف سلفة للمندوب) ==================================== */}
      {isAdvanceModalOpen && selectedDelegate && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-md">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">تسجيل وصرف سلفة مالية للمندوب</h3>
              <button 
                onClick={() => {
                  setSelectedDelegate(null);
                  setIsAdvanceModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                <div>اسم المندوب: <span className="font-bold text-slate-800">{selectedDelegate.name}</span></div>
                <div>العمولات المتبقية المستحقة له: <span className="font-bold text-blue-600">{formatCurrency(selectedDelegate.balance, 'IQD', rate)}</span></div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">المبلغ المراد صرفه كسلفة (بالدينار د.ع) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedDelegate.balance}
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                  placeholder="اكتب قيمة السلفة المسلمة..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">بيان صرف السلفة والسبب</label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700"
                  placeholder="مثال: دفعة من العمولات لشهر يونيو، أو سلفة طارئة"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDelegate(null);
                    setIsAdvanceModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-rose-600 text-white font-bold rounded-lg shadow-sm"
                >
                  تأكيد صرف السلفة وتنزيلها
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================== MODAL: DELEGATE ACCOUNT DETAIL ==================================== */}
      {isHistoryModalOpen && selectedDelegate && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-800 text-sm">كشف العمولات والسلف التفصيلي للمندوب: {selectedDelegate.name}</h3>
              <button 
                onClick={() => {
                  setSelectedDelegate(null);
                  setIsHistoryModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border text-xs text-center">
                  <span className="text-slate-400 block mb-1">العمولات الكلية المحصلة:</span>
                  <span className="font-bold text-emerald-600 font-mono text-sm">{formatCurrency(selectedDelegate.totalCommission, 'IQD', rate)}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border text-xs text-center">
                  <span className="text-slate-400 block mb-1">إجمالي السلف المدفوعة له:</span>
                  <span className="font-bold text-rose-500 font-mono text-sm">-{formatCurrency(selectedDelegate.totalAdvances, 'IQD', rate)}</span>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs text-center">
                  <span className="text-blue-600 font-bold block mb-1">الصافي المعلق المستحق له:</span>
                  <span className="font-bold text-blue-700 font-mono text-sm">{formatCurrency(selectedDelegate.balance, 'IQD', rate)}</span>
                </div>
              </div>

              {/* Transactions list */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 block">تفاصيل سجل القيود المحاسبية التاريخية:</span>
                
                {getDelegateTransactions(selectedDelegate.id).length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs border border-dashed rounded-lg">لم تسجل أي حركة محاسبية أو مبيعات لهذا المندوب بعد.</div>
                ) : (
                  <div className="border border-slate-100 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-right text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          <th className="p-2.5">التاريخ</th>
                          <th className="p-2.5">النوع</th>
                          <th className="p-2.5">القيمة</th>
                          <th className="p-2.5">الرصيد المستحق بعدها</th>
                          <th className="p-2.5">البيان والتفاصيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-medium font-mono">
                        {getDelegateTransactions(selectedDelegate.id).slice().reverse().map(tx => {
                          const isEarned = tx.amount > 0;
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-mono text-slate-400 text-[10px]">
                                {new Date(tx.date).toLocaleDateString('ar-IQ')}
                              </td>
                              <td className="p-2.5 font-sans">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  tx.type === 'commission' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {tx.type === 'commission' ? 'استحقاق عمولة' : tx.type === 'advance' ? 'سلفة مقبوضة' : 'تسوية حساب'}
                                </span>
                              </td>
                              <td className={`p-2.5 font-bold ${isEarned ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {isEarned ? '+' : ''}{formatCurrency(tx.amount, 'IQD', rate)}
                              </td>
                              <td className="p-2.5 text-slate-700 font-semibold">
                                {formatCurrency(tx.balanceAfter, 'IQD', rate)}
                              </td>
                              <td className="p-2.5 text-slate-500 text-[10px] font-sans max-w-xs truncate" title={tx.notes}>
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
                    setSelectedDelegate(null);
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
