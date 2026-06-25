/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppData, Product, StockMovement } from '../types';
import { generateId, formatCurrency, exportToCSV } from '../utils';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  Clipboard, 
  FileSpreadsheet, 
  AlertTriangle, 
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  RefreshCw,
  Plus,
  Minus
} from 'lucide-react';

interface InventoryProps {
  data: AppData;
  activeCurrency: 'USD' | 'IQD';
  currentUserRole: 'admin' | 'delegate';
  currentUsername: string;
  onUpdateProducts: (products: Product[]) => void;
  onAddStockMovement: (movement: StockMovement) => void;
}

export default function Inventory({
  data,
  activeCurrency,
  currentUserRole,
  currentUsername,
  onUpdateProducts,
  onAddStockMovement
}: InventoryProps) {
  const rate = data.companyInfo.exchangeRate;

  // ---------------- State ----------------
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [activeTab, setActiveTab] = useState<'status' | 'movements' | 'reconcile'>('status');

  // Manual Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNotes, setAdjustNotes] = useState('');

  // Reconcile/Physical Inventory (الجرد) state
  const [isReconcileActive, setIsReconcileActive] = useState(false);
  const [reconciledQuantities, setReconciledQuantities] = useState<Record<string, number>>({});

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ---------------- Handlers ----------------

  // Handle Manual Stock In/Out Adjustment
  const handleManualAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    if (adjustQty <= 0) {
      showToast('يرجى تحديد كمية صحيحة أكبر من الصفر', 'error');
      return;
    }

    const previousQty = adjustProduct.quantity;
    let currentQty = previousQty;

    if (adjustType === 'in') {
      currentQty += adjustQty;
    } else {
      if (adjustQty > previousQty) {
        showToast('الكمية المراد خصمها أكبر من المخزون المتوفر!', 'error');
        return;
      }
      currentQty -= adjustQty;
    }

    // Update Product stock
    const updatedProducts = data.products.map(p => {
      if (p.id === adjustProduct.id) {
        return { ...p, quantity: currentQty };
      }
      return p;
    });
    onUpdateProducts(updatedProducts);

    // Create movement log
    const movement: StockMovement = {
      id: generateId('mov'),
      productId: adjustProduct.id,
      productName: adjustProduct.name,
      type: adjustType === 'in' ? 'in_manual' : 'out_manual',
      quantity: adjustType === 'in' ? adjustQty : -adjustQty,
      date: new Date().toISOString(),
      previousQty,
      currentQty,
      notes: adjustNotes || `تعديل يدوي بواسطة ${currentUsername}`,
      createdBy: currentUsername
    };
    onAddStockMovement(movement);

    setIsAdjustModalOpen(false);
    setAdjustProduct(null);
    setAdjustNotes('');
    setAdjustQty(1);
    showToast('تم تعديل الكمية وتوثيق الحركة بنجاح');
  };

  // Handle Inventory Reconciliation (حفظ الجرد الفعلي)
  const handleSaveReconciliation = () => {
    if (currentUserRole !== 'admin') {
      showToast('عذراً، هذه الصلاحية للمسؤولين فقط', 'error');
      return;
    }

    const changesToApply: Array<{ product: Product; prev: number; curr: number }> = [];

    // Identify which products have different quantities
    data.products.forEach(p => {
      const reconciledValue = reconciledQuantities[p.id];
      if (reconciledValue !== undefined && reconciledValue !== p.quantity) {
        changesToApply.push({
          product: p,
          prev: p.quantity,
          curr: reconciledValue
        });
      }
    });

    if (changesToApply.length === 0) {
      showToast('لم يتم تعديل أي كمية، الجرد مطابق للمخزون الفعلي', 'error');
      setIsReconcileActive(false);
      return;
    }

    if (!confirm(`هل أنت متأكد من تطبيق تعديلات الجرد على عدد ${changesToApply.length} صنف؟ سيتم تحديث الكميات وتوثيق الحركات.`)) {
      return;
    }

    // Apply changes
    const updatedProducts = data.products.map(p => {
      const rec = reconciledQuantities[p.id];
      if (rec !== undefined) {
        return { ...p, quantity: rec };
      }
      return p;
    });
    onUpdateProducts(updatedProducts);

    // Log movements for each adjusted item
    changesToApply.forEach(change => {
      const diff = change.curr - change.prev;
      const movement: StockMovement = {
        id: generateId('mov'),
        productId: change.product.id,
        productName: change.product.name,
        type: 'adjustment',
        quantity: diff,
        date: new Date().toISOString(),
        previousQty: change.prev,
        currentQty: change.curr,
        notes: `تعديل جرد مخزني (تطابق فعلي) بواسطة المسؤول ${currentUsername}`,
        createdBy: currentUsername
      };
      onAddStockMovement(movement);
    });

    setIsReconcileActive(false);
    setReconciledQuantities({});
    showToast('تم اعتماد وحفظ نتائج الجرد وتحديث المخزون بنجاح');
  };

  // Start reconciliation session
  const startReconciliation = () => {
    const initialRecs: Record<string, number> = {};
    data.products.forEach(p => {
      initialRecs[p.id] = p.quantity;
    });
    setReconciledQuantities(initialRecs);
    setIsReconcileActive(true);
    showToast('بدأت جلسة جرد المستودع الفعلية، قم بإدخال الكميات المقاسة على الرفوف');
  };

  // Handle single reconcile input change
  const handleReconcileQtyChange = (productId: string, value: number) => {
    setReconciledQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, value)
    }));
  };

  // Export Inventory Valuation to Excel (CSV)
  const exportInventory = () => {
    const headers = ['المعرف', 'الباركود', 'اسم الصنف', 'المجموعة', 'وحدة القياس', 'موقع التخزين (الرف)', 'الكمية المتوفرة', 'سعر الشراء الفردي', 'إجمالي قيمة الشراء'];
    const rows = data.products.map(p => {
      const totalCost = p.costPrice * p.quantity;
      return [
        p.id,
        p.barcode,
        p.name,
        p.category,
        p.unit,
        p.location || 'غير محدد',
        p.quantity,
        formatCurrency(p.costPrice, activeCurrency, rate),
        formatCurrency(totalCost, activeCurrency, rate)
      ];
    });

    exportToCSV(rows, `تقرير_مخزون_المستودع`, headers);
    showToast('تم تصدير تقرير قيمة المخزون بنجاح');
  };

  // ---------------- Filters ----------------
  const filteredProducts = data.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.barcode.includes(searchTerm) || 
                          p.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.quantity <= p.minStock && p.quantity > 0;
    else if (stockFilter === 'out') matchesStock = p.quantity === 0;
    else if (stockFilter === 'normal') matchesStock = p.quantity > p.minStock;

    return matchesSearch && matchesStock;
  });

  return (
    <div className="space-y-6" id="inventory_panel">
      
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
          <h2 className="text-xl font-bold text-slate-800">إدارة المخزون الفعلي وعمليات الجرد</h2>
          <p className="text-slate-500 text-xs mt-1">تعديل كميات الأصناف، تتبع الحركات التاريخية (داخل/خارج)، وإجراء مطابقة الجرد</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'status' && (
            <button
              onClick={exportInventory}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="text-emerald-600" size={16} />
              تصدير جرد المخزون Excel
            </button>
          )}

          {activeTab === 'reconcile' && !isReconcileActive && currentUserRole === 'admin' && (
            <button
              onClick={startReconciliation}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Clipboard size={16} />
              بدء جلسة جرد مخازن جديدة
            </button>
          )}

          {isReconcileActive && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsReconcileActive(false);
                  setReconciledQuantities({});
                  showToast('تم إلغاء جلسة الجرد دون حفظ التغييرات', 'error');
                }}
                className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all"
              >
                إلغاء الجلسة
              </button>
              <button
                onClick={handleSaveReconciliation}
                className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all animate-pulse"
              >
                <CheckCircle size={16} />
                اعتماد وتحديث فروقات الجرد
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-medium">
        <button
          onClick={() => { if (!isReconcileActive) setActiveTab('status'); }}
          disabled={isReconcileActive}
          className={`pb-3 border-b-2 font-bold px-1 transition-all ${
            activeTab === 'status' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          حالة المخزون المتوفر
        </button>
        <button
          onClick={() => { if (!isReconcileActive) setActiveTab('movements'); }}
          disabled={isReconcileActive}
          className={`pb-3 border-b-2 font-bold px-1 transition-all ${
            activeTab === 'movements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          سجل حركات المخزن (داخل/خارج)
        </button>
        <button
          onClick={() => setActiveTab('reconcile')}
          className={`pb-3 border-b-2 font-bold px-1 transition-all ${
            activeTab === 'reconcile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          جرد الرفوف الفعلي ومطابقة العجز
        </button>
      </div>

      {/* ================================= TAB 1: STATUS LIST ================================= */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {/* Stats quick view */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">أصناف متوفرة وسليمة</span>
                <span className="text-base font-bold text-slate-800">
                  {data.products.filter(p => p.quantity > p.minStock).length} صنف بالمستودع
                </span>
              </div>
            </div>

            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-center gap-3">
              <AlertTriangle className="text-amber-600" size={24} />
              <div>
                <span className="text-[10px] text-slate-500 block">أصناف تحت حد الطلب (منخفضة)</span>
                <span className="text-base font-bold text-slate-800">
                  {data.products.filter(p => p.quantity <= p.minStock && p.quantity > 0).length} صنف قيد النفاد
                </span>
              </div>
            </div>

            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                !
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">أصناف منتهية بالكامل</span>
                <span className="text-base font-bold text-slate-800">
                  {data.products.filter(p => p.quantity === 0).length} صنف يحتاج شراء فوري
                </span>
              </div>
            </div>
          </div>

          {/* Search bar inside tab */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ابحث باسم المنتج، موقع الرف، الباركود لتعديل رصيد المخزن..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
              >
                <option value="all">كل المخزون</option>
                <option value="normal">المخزون الكافي</option>
                <option value="low">المنخفض (⚠️)</option>
                <option value="out">المنتهي بالكامل (🛑)</option>
              </select>
            </div>
          </div>

          {/* Status Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/75 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="p-3">اسم الصنف المنتج</th>
                    <th className="p-3">باركود</th>
                    <th className="p-3">المجموعة</th>
                    <th className="p-3">موقع الرف</th>
                    <th className="p-3">الكمية الحالية</th>
                    <th className="p-3">الحد الأدنى</th>
                    <th className="p-3">المورد الرئيسي</th>
                    {currentUserRole === 'admin' && <th className="p-3 text-left">العمليات السريعة</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map(p => {
                    const isLow = p.quantity <= p.minStock && p.quantity > 0;
                    const isOut = p.quantity === 0;
                    const supplier = data.suppliers.find(s => s.id === p.supplierId);

                    return (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isOut ? 'bg-rose-50/10' : isLow ? 'bg-amber-50/10' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {p.imageUrl && (
                              <img 
                                src={p.imageUrl} 
                                alt="" 
                                className="w-8 h-8 rounded object-cover border shrink-0" 
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div>
                              <span className="font-bold block text-slate-800">{p.name}</span>
                              <span className="text-[10px] text-slate-400">{p.unit}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{p.barcode}</td>
                        <td className="p-3 text-slate-500">{p.category}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium font-mono text-slate-600">
                            {p.location || 'غير محدد'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-bold ${
                            isOut ? 'text-rose-600' : isLow ? 'text-amber-500' : 'text-slate-800'
                          }`}>
                            {p.quantity} {p.unit}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 font-mono">{p.minStock}</td>
                        <td className="p-3 text-slate-500 text-[10px]">{supplier?.name || '-'}</td>
                        {currentUserRole === 'admin' && (
                          <td className="p-3 text-left">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setAdjustProduct(p);
                                  setAdjustType('in');
                                  setIsAdjustModalOpen(true);
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-100 transition-colors flex items-center gap-0.5"
                              >
                                <Plus size={10} />
                                توريد يدوي
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustProduct(p);
                                  setAdjustType('out');
                                  setIsAdjustModalOpen(true);
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded border border-rose-100 transition-colors flex items-center gap-0.5"
                              >
                                <Minus size={10} />
                                صرف يدوي
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================= TAB 2: MOVEMENT HISTORY LOG ================================= */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-slate-800 font-bold text-sm flex items-center gap-1">
              <Clock size={16} className="text-blue-500" />
              أرشيف سجل حركات الأصناف التاريخي الكامل
            </h3>
            <span className="text-xs text-slate-400">مرتب من الأحدث للأقدم</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="bg-slate-50/75 text-slate-500 border-b border-slate-100 font-semibold">
                  <th className="p-3">معرف الحركة</th>
                  <th className="p-3">اسم المنتج الصنف</th>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3">الكمية المغيرة</th>
                  <th className="p-3">الرصيد السابق</th>
                  <th className="p-3">الرصيد الجديد</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">البيان والملاحظات</th>
                  <th className="p-3">المستخدم المنفذ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.stockMovements.slice().reverse().map((mov, idx) => {
                  let badgeColor = 'bg-slate-100 text-slate-600';
                  let typeLabel = '';

                  switch (mov.type) {
                    case 'in_purchase':
                      badgeColor = 'bg-emerald-50 text-emerald-700 font-bold';
                      typeLabel = 'مشتريات';
                      break;
                    case 'out_sale':
                      badgeColor = 'bg-rose-50 text-rose-700 font-bold';
                      typeLabel = 'مبيعات';
                      break;
                    case 'in_manual':
                      badgeColor = 'bg-teal-50 text-teal-700';
                      typeLabel = 'تسوية توريد';
                      break;
                    case 'out_manual':
                      badgeColor = 'bg-amber-50 text-amber-700';
                      typeLabel = 'تسوية صرف';
                      break;
                    case 'in_returned':
                    case 'out_returned':
                      badgeColor = 'bg-purple-50 text-purple-700';
                      typeLabel = 'مرتجع';
                      break;
                    case 'adjustment':
                      badgeColor = 'bg-blue-50 text-blue-700';
                      typeLabel = 'جرد رفوف';
                      break;
                  }

                  const isPositive = mov.quantity > 0;

                  return (
                    <tr key={mov.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{mov.id}</td>
                      <td className="p-3 font-bold text-slate-800">{mov.productName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${badgeColor}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-bold font-mono text-sm ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? '+' : ''}{mov.quantity}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{mov.previousQty}</td>
                      <td className="p-3 font-mono font-semibold text-slate-700">{mov.currentQty}</td>
                      <td className="p-3 font-mono text-slate-400 text-[10px]">
                        {new Date(mov.date).toLocaleString('ar-IQ')}
                      </td>
                      <td className="p-3 text-slate-500 text-[10px] max-w-xs truncate" title={mov.notes}>
                        {mov.notes}
                      </td>
                      <td className="p-3 text-slate-600 font-semibold">{mov.createdBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================= TAB 3: PHYSICAL RECONCILE / AUDIT ================================= */}
      {activeTab === 'reconcile' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-slate-800 font-bold text-sm">عملية جرد المخزون الفعلي (Reconciliation)</h3>
              <p className="text-slate-500 text-[11px] mt-1">تتيح لك هذه الأداة مطابقة رصيد الرف الفعلي مع الرصيد المسجل بالنظام، وتسجيل العجز أو الزيادة كحركة تسوية معتمدة.</p>
            </div>
            
            {!isReconcileActive && currentUserRole === 'admin' && (
              <button
                onClick={startReconciliation}
                className="px-4 py-2 text-xs bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-xs"
              >
                بدء جلسة الجرد والعد الميداني
              </button>
            )}
          </div>

          {!isReconcileActive ? (
            <div className="border border-dashed border-slate-200 rounded-xl py-12 px-4 text-center max-w-lg mx-auto space-y-3">
              <Clipboard size={40} className="mx-auto text-slate-300" />
              <h4 className="font-bold text-slate-700 text-sm">لا توجد جلسة جرد نشطة حالياً</h4>
              <p className="text-xs text-slate-400">انقر على زر البدء لفتح استمارة العد الفعلي، وإدخال الكميات المقاسة من واقع رفوف المستودع.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border-r-4 border-blue-500 p-3 rounded text-xs text-blue-800 flex items-center justify-between">
                <span>جلسة الجرد نشطة ومفتوحة الآن. يرجى إدخال العدد الفعلي لكل صنف. الأصناف غير المدخلة لن تتأثر.</span>
                <span className="font-bold font-mono">العد قيد التحرير...</span>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full border-collapse text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                      <th className="p-3">اسم المنتج الصنف</th>
                      <th className="p-3">موقع الرف</th>
                      <th className="p-3">الرصيد الدفتري (المسجل)</th>
                      <th className="p-3 text-center">الرصيد الميداني (الفعلي)</th>
                      <th className="p-3">فروقات الجرد الفعلي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data.products.map(p => {
                      const bookQty = p.quantity;
                      const physicalQty = reconciledQuantities[p.id] ?? bookQty;
                      const variance = physicalQty - bookQty;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{p.name} ({p.unit})</td>
                          <td className="p-3 text-slate-400 font-mono">{p.location || 'A-1'}</td>
                          <td className="p-3 font-semibold font-mono text-slate-500">{bookQty} {p.unit}</td>
                          <td className="p-3 flex justify-center">
                            <div className="flex items-center gap-1.5 w-32 justify-center">
                              <button
                                type="button"
                                onClick={() => handleReconcileQtyChange(p.id, physicalQty - 1)}
                                className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center justify-center text-sm"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={physicalQty}
                                onChange={(e) => handleReconcileQtyChange(p.id, parseInt(e.target.value) || 0)}
                                className="w-16 text-center py-1 border border-slate-200 rounded-md text-xs font-bold font-mono text-slate-700"
                              />
                              <button
                                type="button"
                                onClick={() => handleReconcileQtyChange(p.id, physicalQty + 1)}
                                className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center justify-center text-sm"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-3 font-bold">
                            {variance === 0 ? (
                              <span className="text-emerald-600">✓ مطابق</span>
                            ) : variance > 0 ? (
                              <span className="text-blue-600 font-mono">+{variance} (زيادة)</span>
                            ) : (
                              <span className="text-rose-600 font-mono">{variance} (عجز ⚠️)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================== MODAL: MANUAL QUANTITY ADJUSTMENT ==================================== */}
      {isAdjustModalOpen && adjustProduct && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-md">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {adjustType === 'in' ? 'تسوية وارد - زيادة رصيد المخزن' : 'تسوية صادر - خصم رصيد المخزن'}
              </h3>
              <button 
                onClick={() => {
                  setAdjustProduct(null);
                  setIsAdjustModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualAdjustment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
                <div>اسم الصنف الصنف: <span className="font-bold text-slate-800">{adjustProduct.name}</span></div>
                <div>الرصيد الدفتري الحالي: <span className="font-bold text-blue-600">{adjustProduct.quantity} {adjustProduct.unit}</span></div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">الكمية المراد تعديلها ({adjustProduct.unit}) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">البيان وسبب التسوية اليدوية <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700"
                  placeholder="مثال: زيادة بسبب هدايا من المورد، أو إتلاف بضاعة منتهية الصلاحية..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustProduct(null);
                    setIsAdjustModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs text-white font-bold rounded-lg shadow-sm ${
                    adjustType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  حفظ واعتماد الحركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
