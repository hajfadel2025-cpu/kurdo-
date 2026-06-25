/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppData } from '../types';
import { formatCurrency, exportToCSV } from '../utils';
import { 
  FileText, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  FileSpreadsheet, 
  Search,
  Filter,
  ArrowUpRight,
  Printer,
  CheckCircle
} from 'lucide-react';

interface ReportsProps {
  data: AppData;
  activeCurrency: 'USD' | 'IQD';
}

export default function Reports({ data, activeCurrency }: ReportsProps) {
  const rate = data.companyInfo.exchangeRate;

  // ---------------- State ----------------
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'stock' | 'debts' | 'delegates'>('sales');
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [delegateFilter, setDelegateFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  // Toast for confirmation
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ---------------- Helper Filters ----------------
  const filterByDate = (dateStr: string) => {
    if (!dateFrom && !dateTo) return true;
    const date = new Date(dateStr);
    if (dateFrom && date < new Date(dateFrom)) return false;
    if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  };

  // ---------------- REPORT 1: SALES REPORT ----------------
  const filteredSales = data.invoices.filter(inv => {
    const matchesDate = filterByDate(inv.date);
    const matchesCust = customerFilter === 'all' || inv.customerId === customerFilter;
    const matchesDel = delegateFilter === 'all' || inv.delegateId === delegateFilter;
    return matchesDate && matchesCust && matchesDel;
  });

  const totalSalesVal = filteredSales.reduce((acc, inv) => {
    const amt = inv.currency === activeCurrency ? inv.netTotal : (activeCurrency === 'IQD' ? inv.netTotal * rate : inv.netTotal / rate);
    return acc + amt;
  }, 0);

  const totalSalesProfits = filteredSales.reduce((acc, inv) => {
    if (inv.isReturned) return acc;
    const invProfit = inv.items.reduce((itemAcc, item) => {
      return itemAcc + ((item.salePrice - item.costPrice) * item.quantity);
    }, 0);

    // discount adjustment
    let profit = invProfit;
    if (inv.discountValue > 0) {
      if (inv.discountType === 'percentage') {
        profit = invProfit * (1 - inv.discountValue / 100);
      } else {
        const pct = inv.discountValue / inv.total;
        profit = invProfit * (1 - pct);
      }
    }

    const profitInActive = inv.currency === activeCurrency ? profit : (activeCurrency === 'IQD' ? profit * rate : profit / rate);
    return acc + profitInActive;
  }, 0);

  const exportSalesReport = () => {
    const headers = ['رقم الفاتورة', 'العميل', 'المندوب', 'التاريخ', 'طريقة الدفع', 'العملة', 'الإجمالي القذر', 'قيمة الخصم', 'الصافي النهائي'];
    const rows = filteredSales.map(inv => [
      inv.invoiceNumber,
      inv.customerName,
      inv.delegateName || 'مباشر',
      new Date(inv.date).toLocaleDateString('ar-IQ'),
      inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'credit' ? 'آجل' : 'شبكة',
      inv.currency,
      inv.total,
      inv.discountValue + (inv.discountType === 'percentage' ? '%' : ''),
      inv.netTotal
    ]);
    exportToCSV(rows, 'تقرير_المبيعات_التفصيلي', headers);
    triggerToast('تم تصدير تقرير المبيعات بنجاح');
  };

  // ---------------- REPORT 2: PURCHASES REPORT ----------------
  const filteredPurchases = data.purchaseInvoices.filter(pinv => {
    const matchesDate = filterByDate(pinv.date);
    const matchesSup = supplierFilter === 'all' || pinv.supplierId === supplierFilter;
    return matchesDate && matchesSup;
  });

  const totalPurchasesVal = filteredPurchases.reduce((acc, pinv) => {
    const amt = pinv.currency === activeCurrency ? pinv.netTotal : (activeCurrency === 'IQD' ? pinv.netTotal * rate : pinv.netTotal / rate);
    return acc + amt;
  }, 0);

  const exportPurchasesReport = () => {
    const headers = ['رقم الفاتورة', 'المورد المجهز', 'التاريخ', 'طريقة الدفع', 'العملة', 'إجمالي الفاتورة'];
    const rows = filteredPurchases.map(pinv => [
      pinv.invoiceNumber,
      pinv.supplierName,
      new Date(pinv.date).toLocaleDateString('ar-IQ'),
      pinv.paymentMethod === 'cash' ? 'نقدي' : pinv.paymentMethod === 'credit' ? 'آجل' : 'شبكة',
      pinv.currency,
      pinv.netTotal
    ]);
    exportToCSV(rows, 'تقرير_المشتريات_التفصيلي', headers);
    triggerToast('تم تصدير تقرير المشتريات بنجاح');
  };

  // ---------------- REPORT 3: INVENTORY VALUATION ----------------
  const totalStockQty = data.products.reduce((acc, p) => acc + p.quantity, 0);
  
  const totalInvestmentCost = data.products.reduce((acc, p) => {
    const costInActive = p.supplierId === 'sup_2' || p.unit === 'كارتون' || p.unit === 'كيس'
      ? (activeCurrency === 'USD' ? p.costPrice / rate : p.costPrice)
      : (activeCurrency === 'IQD' ? p.costPrice * rate : p.costPrice);
    return acc + (costInActive * p.quantity);
  }, 0);

  const expectedSalesVal = data.products.reduce((acc, p) => {
    const saleInActive = p.supplierId === 'sup_2' || p.unit === 'كارتون' || p.unit === 'كيس'
      ? (activeCurrency === 'USD' ? p.salePrice / rate : p.salePrice)
      : (activeCurrency === 'IQD' ? p.salePrice * rate : p.salePrice);
    return acc + (saleInActive * p.quantity);
  }, 0);

  const exportInventoryValuation = () => {
    const headers = ['المعرف', 'الباركود', 'اسم المنتج الصنف', 'المجموعة التصنيفية', 'الكمية المتوفرة', 'سعر الشراء الفردي', 'قيمة الاستثمار الكلية'];
    const rows = data.products.map(p => [
      p.id,
      p.barcode,
      p.name,
      p.category,
      p.quantity,
      formatCurrency(p.costPrice, activeCurrency, rate),
      formatCurrency(p.costPrice * p.quantity, activeCurrency, rate)
    ]);
    exportToCSV(rows, 'تقرير_تقييم_المخزون_المالي', headers);
    triggerToast('تم تصدير تقرير جرد وقيمة المخزون');
  };

  // ---------------- REPORT 4: CUSTOMERS & DEBTS ----------------
  const totalDebtsVal = data.customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0);
  const totalDebtsInActive = activeCurrency === 'IQD' ? totalDebtsVal : totalDebtsVal / rate;

  const exportDebtsReport = () => {
    const headers = ['معرف العميل', 'اسم العميل الحساب', 'الهاتف', 'قيمة المديونية بالدينار د.ع'];
    const rows = data.customers.map(c => [
      c.id,
      c.name,
      c.phone,
      c.balance
    ]);
    exportToCSV(rows, 'تقرير_مديونيات_العملاء', headers);
    triggerToast('تم تصدير كشف مديونيات العملاء');
  };

  // ---------------- REPORT 5: DELEGATES PERFORMANCE ----------------
  const exportDelegatesReport = () => {
    const headers = ['معرف المندوب', 'اسم المندوب', 'الهاتف', 'العمولة المتفق عليها %', 'حجم المبيعات المحققة', 'إجمالي العمولات الكلية', 'إجمالي السلف المقبوضة', 'المستحق الحالي له'];
    const rows = data.delegates.map(d => [
      d.id,
      d.name,
      d.phone,
      `${d.commissionRate}%`,
      d.totalSales,
      d.totalCommission,
      d.totalAdvances,
      d.balance
    ]);
    exportToCSV(rows, 'تقرير_أداء_وعمولات_المندوبين', headers);
    triggerToast('تم تصدير تقرير أداء المندوبين');
  };

  return (
    <div className="space-y-6" id="reports_panel">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-4 z-50 p-4 bg-emerald-600 rounded-lg shadow-lg flex items-center gap-2 text-white animate-fade-in">
          <CheckCircle size={18} />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">مكتب التقارير المالية والإحصائيات والتحليلات</h2>
          <p className="text-slate-500 text-xs mt-1">عرض وتحليل الأداء العام للمبيعات والمشتريات والمخزن والعملاء والمندوبين مع تصدير الأرشيف</p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-semibold overflow-x-auto whitespace-nowrap pb-1">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 border-b-2 px-1 transition-all flex items-center gap-1 ${
            activeTab === 'sales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart size={14} />
          كشف حركة المبيعات والأرباح
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 border-b-2 px-1 transition-all flex items-center gap-1 ${
            activeTab === 'purchases' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp size={14} className="text-emerald-500" />
          كشف حركة المشتريات والتوريد
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 border-b-2 px-1 transition-all flex items-center gap-1 ${
            activeTab === 'stock' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package size={14} />
          تقييم قيمة المخزون المالي
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={`pb-3 border-b-2 px-1 transition-all flex items-center gap-1 ${
            activeTab === 'debts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={14} />
          تقرير مديونيات العملاء
        </button>
        <button
          onClick={() => setActiveTab('delegates')}
          className={`pb-3 border-b-2 px-1 transition-all flex items-center gap-1 ${
            activeTab === 'delegates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase size={14} />
          أداء وعمولات المندوبين
        </button>
      </div>

      {/* ================================= TAB 1: SALES REPORT ================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-wrap gap-4 items-end text-xs">
            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">من تاريخ:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">إلى تاريخ:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">العميل:</label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
              >
                <option value="all">كل العملاء</option>
                {data.customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">المندوب:</label>
              <select
                value={delegateFilter}
                onChange={(e) => setDelegateFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
              >
                <option value="all">كل المندوبين</option>
                {data.delegates.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setCustomerFilter('all');
                  setDelegateFilter('all');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                تفريغ
              </button>
              
              <button
                onClick={exportSalesReport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1"
              >
                <FileSpreadsheet size={14} />
                تصدير Excel
              </button>
            </div>
          </div>

          {/* Sales metrics summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs text-center space-y-1">
              <span className="text-slate-400 text-xs block">صافي حجم المبيعات للفترة المحددة</span>
              <span className="text-2xl font-bold text-emerald-600 block">
                {formatCurrency(totalSalesVal, activeCurrency, rate)}
              </span>
              <span className="text-[10px] text-slate-400">إجمالي الفواتير الصادرة المحسوبة: {filteredSales.length} فواتير</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs text-center space-y-1">
              <span className="text-slate-400 text-xs block">الأرباح التلقائية الصافية المقدرة</span>
              <span className="text-2xl font-bold text-blue-600 block">
                {formatCurrency(totalSalesProfits, activeCurrency, rate)}
              </span>
              <span className="text-[10px] text-slate-400">تحسب تلقائياً من الفروق بين سعر البيع والتكلفة</span>
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="p-3">الفاتورة</th>
                    <th className="p-3">حساب العميل</th>
                    <th className="p-3">تاريخها</th>
                    <th className="p-3">السداد</th>
                    <th className="p-3">الصافي المالي</th>
                    <th className="p-3">الربح الصافي للفاتورة</th>
                    <th className="p-3">منفذها</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSales.map(inv => {
                    // Calculate individual invoice net profit in active currency
                    const invProfit = inv.items.reduce((acc, item) => acc + ((item.salePrice - item.costPrice) * item.quantity), 0);
                    let profit = invProfit;
                    if (inv.discountValue > 0) {
                      if (inv.discountType === 'percentage') profit = invProfit * (1 - inv.discountValue / 100);
                      else profit = Math.max(0, invProfit - (inv.discountValue / inv.total) * invProfit);
                    }
                    const profitInActive = inv.currency === activeCurrency ? profit : (activeCurrency === 'IQD' ? profit * rate : profit / rate);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold font-mono">{inv.invoiceNumber}</td>
                        <td className="p-3 font-semibold">{inv.customerName}</td>
                        <td className="p-3 font-mono text-slate-400">{new Date(inv.date).toLocaleDateString('ar-IQ')}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            inv.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {inv.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-mono text-blue-600">
                          {formatCurrency(inv.netTotal, inv.currency, rate)}
                        </td>
                        <td className="p-3 font-bold font-mono text-emerald-600">
                          {inv.isReturned ? '-' : formatCurrency(profitInActive, activeCurrency, rate)}
                        </td>
                        <td className="p-3 text-slate-500">{inv.createdBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================= TAB 2: PURCHASES REPORT ================================= */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-wrap gap-4 items-end text-xs">
            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">من تاريخ:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">إلى تاريخ:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold block">المورد:</label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white"
              >
                <option value="all">كل الموردين</option>
                {data.suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setSupplierFilter('all');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                تفريغ
              </button>
              
              <button
                onClick={exportPurchasesReport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1"
              >
                <FileSpreadsheet size={14} />
                تصدير Excel
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs text-center space-y-1 max-w-md mx-auto">
            <span className="text-slate-400 text-xs block">إجمالي قيمة التوريد والمشتريات المدفوعة</span>
            <span className="text-2xl font-bold text-slate-800 block">
              {formatCurrency(totalPurchasesVal, activeCurrency, rate)}
            </span>
            <span className="text-[10px] text-slate-400">إجمالي الفواتير المستلمة: {filteredPurchases.length} فواتير</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="p-3">فاتورة الشراء</th>
                    <th className="p-3">المورد المجهز</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">طريقة السداد</th>
                    <th className="p-3">القيمة الكلية للفاتورة</th>
                    <th className="p-3">المستخدم المستلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPurchases.map(pinv => (
                    <tr key={pinv.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold font-mono">{pinv.invoiceNumber}</td>
                      <td className="p-3 font-semibold">{pinv.supplierName}</td>
                      <td className="p-3 font-mono text-slate-400">{new Date(pinv.date).toLocaleDateString('ar-IQ')}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          {pinv.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}
                        </span>
                      </td>
                      <td className="p-3 font-bold font-mono text-rose-600">
                        {formatCurrency(pinv.netTotal, pinv.currency, rate)}
                      </td>
                      <td className="p-3 text-slate-500">{pinv.createdBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================= TAB 3: INVENTORY VALUATION ================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs text-center space-y-1">
              <span className="text-slate-400 text-xs block">عدد السلع والقطع الإجمالي بالمخزن</span>
              <span className="text-2xl font-bold text-slate-800 block">{totalStockQty} قطعة</span>
              <span className="text-[10px] text-slate-400">موزعة على دليل الأصناف المقيدة</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs text-center space-y-1">
              <span className="text-slate-400 text-xs block">إجمالي رأس المال المستثمر (تكلفة الشراء)</span>
              <span className="text-2xl font-bold text-blue-600 block">
                {formatCurrency(totalInvestmentCost, activeCurrency, rate)}
              </span>
              <span className="text-[10px] text-slate-400">القيمة الفعلية للأصول المخزنية</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs text-center space-y-1">
              <span className="text-slate-400 text-xs block">العائدات المتوقعة عند البيع الكامل</span>
              <span className="text-2xl font-bold text-emerald-600 block">
                {formatCurrency(expectedSalesVal, activeCurrency, rate)}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">صافي الربح المتوقع: +{formatCurrency(expectedSalesVal - totalInvestmentCost, activeCurrency, rate)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-700">دليل تقييم السلع والأصناف الحالي</span>
            <button
              onClick={exportInventoryValuation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1"
            >
              <FileSpreadsheet size={14} />
              تصدير الجرد المالي Excel
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  <th className="p-3">باركود السلعة</th>
                  <th className="p-3">اسم السلعة</th>
                  <th className="p-3">الكمية المتوفرة</th>
                  <th className="p-3 text-left">سعر التكلفة الفردي</th>
                  <th className="p-3 text-left">قيمة رأس المال المستثمر فيها</th>
                  <th className="p-3 text-left">سعر البيع الفردي</th>
                  <th className="p-3 text-left">القيمة البيعية المتوقعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.products.map(p => {
                  const costNative = p.supplierId === 'sup_2' || p.unit === 'كارتون' || p.unit === 'كيس'
                    ? (activeCurrency === 'USD' ? p.costPrice / rate : p.costPrice)
                    : (activeCurrency === 'IQD' ? p.costPrice * rate : p.costPrice);
                  const saleNative = p.supplierId === 'sup_2' || p.unit === 'كارتون' || p.unit === 'كيس'
                    ? (activeCurrency === 'USD' ? p.salePrice / rate : p.salePrice)
                    : (activeCurrency === 'IQD' ? p.salePrice * rate : p.salePrice);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-400">{p.barcode}</td>
                      <td className="p-3 font-bold text-slate-800">{p.name} ({p.unit})</td>
                      <td className="p-3 font-semibold text-slate-700 font-mono">{p.quantity} {p.unit}</td>
                      <td className="p-3 text-left font-mono">{formatCurrency(costNative, activeCurrency, rate)}</td>
                      <td className="p-3 text-left font-mono font-bold text-slate-800">{formatCurrency(costNative * p.quantity, activeCurrency, rate)}</td>
                      <td className="p-3 text-left font-mono text-blue-600">{formatCurrency(saleNative, activeCurrency, rate)}</td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-600">{formatCurrency(saleNative * p.quantity, activeCurrency, rate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================= TAB 4: CUSTOMERS DEBTS REPORT ================================= */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 text-[10px] block font-bold">إجمالي مطلوبات مستودعك من السوق:</span>
              <span className="text-xl font-bold text-rose-600 font-mono">{formatCurrency(totalDebtsInActive, activeCurrency, rate)}</span>
            </div>
            <button
              onClick={exportDebtsReport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1"
            >
              <FileSpreadsheet size={14} />
              تصدير الديون المتراكمة
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  <th className="p-3.5">اسم العميل الحساب</th>
                  <th className="p-3.5">رقم الاتصال</th>
                  <th className="p-3.5">المديونية الحالية المتبقية</th>
                  <th className="p-3.5">درجة الخطورة والحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.customers.filter(c => c.balance !== 0).map(c => {
                  const isDebtor = c.balance > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold text-slate-800">{c.name}</td>
                      <td className="p-3.5 font-mono text-slate-500">{c.phone}</td>
                      <td className={`p-3.5 font-bold font-mono text-sm ${isDebtor ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(c.balance, activeCurrency, rate)}
                      </td>
                      <td className="p-3.5">
                        {isDebtor ? (
                          <span className="bg-rose-100 text-rose-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                            ⚠️ معلق غير مسدد
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                            ✓ دفعات زائدة (دائن)
                          </span>
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

      {/* ================================= TAB 5: DELEGATES PERFORMANCE ================================= */}
      {activeTab === 'delegates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-700">لوحة تقييم إنتاجية وعمولات المندوبين</span>
            <button
              onClick={exportDelegatesReport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1"
            >
              <FileSpreadsheet size={14} />
              تصدير أداء المندوبين
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  <th className="p-3.5">اسم المندوب المبيعات</th>
                  <th className="p-3.5">نسبة العمولة المتفق عليها</th>
                  <th className="p-3.5">حجم المبيعات الكلية المحققة</th>
                  <th className="p-3.5">مجموع عمولاته الإجمالية</th>
                  <th className="p-3.5">إجمالي السلف المخصومة</th>
                  <th className="p-3.5">المستحق المتبقي للتصفية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.delegates.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-800">{d.name}</td>
                    <td className="p-3.5 font-bold font-mono text-blue-600">{d.commissionRate}%</td>
                    <td className="p-3.5 font-semibold font-mono text-slate-700">{formatCurrency(d.totalSales, activeCurrency, rate)}</td>
                    <td className="p-3.5 font-bold font-mono text-emerald-600">{formatCurrency(d.totalCommission, activeCurrency, rate)}</td>
                    <td className="p-3.5 font-bold font-mono text-rose-500">-{formatCurrency(d.totalAdvances, activeCurrency, rate)}</td>
                    <td className="p-3.5 font-bold font-mono text-blue-600">{formatCurrency(d.balance, activeCurrency, rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
