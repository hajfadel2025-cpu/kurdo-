/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppData, Product, StockMovement } from '../types';
import { formatCurrency } from '../utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownLeft,
  Activity,
  Award
} from 'lucide-react';

interface DashboardProps {
  data: AppData;
  activeCurrency: 'USD' | 'IQD';
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ data, activeCurrency, onNavigate }: DashboardProps) {
  const rate = data.companyInfo.exchangeRate;

  // ----------------- Calculations -----------------
  
  // 1. Inventory Valuation
  const totalStockQty = data.products.reduce((acc, p) => acc + p.quantity, 0);
  
  const inventoryValueCost = data.products.reduce((acc, p) => {
    // If product prices are in USD, and we are converting to activeCurrency
    const costInActive = p.supplierId === 'sup_2' || p.unit === 'كارتون' || p.unit === 'كيس' // simple mock rule for IQD
      ? (activeCurrency === 'USD' ? p.costPrice / rate : p.costPrice) // IQD native
      : (activeCurrency === 'IQD' ? p.costPrice * rate : p.costPrice); // USD native
    return acc + (costInActive * p.quantity);
  }, 0);

  const inventoryValueSale = data.products.reduce((acc, p) => {
    const saleInActive = p.supplierId === 'sup_2' || p.unit === 'كارتون' || p.unit === 'كيس'
      ? (activeCurrency === 'USD' ? p.salePrice / rate : p.salePrice)
      : (activeCurrency === 'IQD' ? p.salePrice * rate : p.salePrice);
    return acc + (saleInActive * p.quantity);
  }, 0);

  // Expected profit from inventory
  const expectedProfit = inventoryValueSale - inventoryValueCost;

  // 2. Sales Calculations
  const totalSalesAmount = data.invoices
    .filter(inv => !inv.isReturned)
    .reduce((acc, inv) => {
      const invoiceAmtInActive = inv.currency === activeCurrency 
        ? inv.netTotal 
        : (activeCurrency === 'IQD' ? inv.netTotal * rate : inv.netTotal / rate);
      return acc + invoiceAmtInActive;
    }, 0);

  // 3. Purchase Calculations
  const totalPurchasesAmount = data.purchaseInvoices.reduce((acc, pinv) => {
    const purchaseAmtInActive = pinv.currency === activeCurrency
      ? pinv.netTotal
      : (activeCurrency === 'IQD' ? pinv.netTotal * rate : pinv.netTotal / rate);
    return acc + purchaseAmtInActive;
  }, 0);

  // 4. Realized Profit (from sold items)
  const realizedProfit = data.invoices
    .filter(inv => !inv.isReturned)
    .reduce((acc, inv) => {
      const invoiceProfit = inv.items.reduce((itemAcc, item) => {
        const itemCost = item.costPrice * item.quantity;
        const itemSale = item.salePrice * item.quantity;
        const profit = itemSale - itemCost;
        return itemAcc + profit;
      }, 0);

      // apply discount percentage or value proportionally to profit
      let finalInvoiceProfit = invoiceProfit;
      if (inv.discountValue > 0) {
        if (inv.discountType === 'percentage') {
          finalInvoiceProfit = invoiceProfit * (1 - inv.discountValue / 100);
        } else {
          const discountPctOfTotal = inv.discountValue / inv.total;
          finalInvoiceProfit = invoiceProfit * (1 - discountPctOfTotal);
        }
      }

      const profitInActive = inv.currency === activeCurrency
        ? finalInvoiceProfit
        : (activeCurrency === 'IQD' ? finalInvoiceProfit * rate : finalInvoiceProfit / rate);

      return acc + profitInActive;
    }, 0);

  // 5. Customer Debts
  const totalDebts = data.customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0);
  const totalDebtsInActive = activeCurrency === 'IQD' ? totalDebts : totalDebts / rate;

  // 6. Low stock count
  const lowStockProducts = data.products.filter(p => p.quantity <= p.minStock);
  const outOfStockProducts = data.products.filter(p => p.quantity === 0);

  // 7. Category Distribution for Horizontal Stack Chart
  const categoryStats = data.categories.map(cat => {
    const productsInCat = data.products.filter(p => p.category === cat.name);
    const value = productsInCat.reduce((acc, p) => {
      const costInActive = p.supplierId === 'sup_2' || p.unit === 'كارتون' || p.unit === 'كيس'
        ? (activeCurrency === 'USD' ? p.costPrice / rate : p.costPrice)
        : (activeCurrency === 'IQD' ? p.costPrice * rate : p.costPrice);
      return acc + (costInActive * p.quantity);
    }, 0);
    const qty = productsInCat.reduce((acc, p) => acc + p.quantity, 0);
    return { name: cat.name, value, qty };
  }).filter(c => c.qty > 0);

  const totalCatValue = categoryStats.reduce((acc, c) => acc + c.value, 0);

  // 8. Bestsellers Leaderboard
  const productSalesMap: Record<string, { name: string; qty: number; total: number }> = {};
  data.invoices
    .filter(inv => !inv.isReturned)
    .forEach(inv => {
      inv.items.forEach(item => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.productName, qty: 0, total: 0 };
        }
        productSalesMap[item.productId].qty += item.quantity;
        
        const saleAmtInActive = inv.currency === activeCurrency
          ? item.salePrice * item.quantity
          : (activeCurrency === 'IQD' ? (item.salePrice * item.quantity) * rate : (item.salePrice * item.quantity) / rate);
        productSalesMap[item.productId].total += saleAmtInActive;
      });
    });

  const bestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4);

  // 9. Monthly Sales Chart data points (mock trend line based on actual invoices)
  const chartDataPoints = [
    { label: 'أبريل', amount: totalSalesAmount * 0.4 },
    { label: 'مايو', amount: totalSalesAmount * 0.75 },
    { label: 'يونيو (الحالي)', amount: totalSalesAmount }
  ];
  const maxChartValue = Math.max(...chartDataPoints.map(d => d.amount), 1);

  return (
    <div className="space-y-6" id="dashboard_panel">
      {/* Dynamic Notifications Banner */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-lg flex items-start gap-3 shadow-xs">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-amber-800 font-semibold text-sm">تنبيهات المخزون العاجلة</h4>
            <p className="text-amber-700 text-xs mt-1">
              يوجد <span className="font-bold">{outOfStockProducts.length}</span> أصناف نفذت بالكامل، و <span className="font-bold">{lowStockProducts.length - outOfStockProducts.length}</span> أصناف وصلت إلى الحد الأدنى المحدد للمخزون. يرجى مراجعة طلبات الشراء.
            </p>
            <button 
              onClick={() => onNavigate('inventory')}
              className="text-amber-900 underline text-xs font-semibold mt-2 hover:text-amber-950 block"
            >
              عرض المنتجات المنخفضة وجدولتها للجرد ←
            </button>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-medium block">إجمالي المبيعات المعتمدة</span>
            <span className="text-2xl font-bold text-emerald-600 block">
              {formatCurrency(totalSalesAmount, activeCurrency, rate)}
            </span>
            <span className="text-xs text-emerald-500 flex items-center gap-1 font-medium">
              <TrendingUp size={12} />
              <span>مبيعات جارية نشطة</span>
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
            <ShoppingCart size={24} />
          </div>
        </div>

        {/* Stat 2: Net Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-medium block">صافي الأرباح المحققة</span>
            <span className="text-2xl font-bold text-blue-600 block">
              {formatCurrency(realizedProfit, activeCurrency, rate)}
            </span>
            <span className="text-xs text-slate-500 block">
              هامش ربح مبيعات فعلي
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Stat 3: Inventory Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-medium block">قيمة المخزون الحالي (سعر الشراء)</span>
            <span className="text-2xl font-bold text-slate-800 block">
              {formatCurrency(inventoryValueCost, activeCurrency, rate)}
            </span>
            <span className="text-xs text-slate-500 block">
              إجمالي القطع: {totalStockQty} قطعة بالمخازن
            </span>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600">
            <Package size={24} />
          </div>
        </div>

        {/* Stat 4: Debts */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-medium block">ديون العملاء المعلقة (الآجل)</span>
            <span className="text-2xl font-bold text-rose-600 block">
              {formatCurrency(totalDebtsInActive, activeCurrency, rate)}
            </span>
            <span className="text-xs text-rose-500 flex items-center gap-1 font-medium">
              <TrendingDown size={12} />
              <span>مستحقات واجبة التحصيل</span>
            </span>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Secondary Stats Panel (Bento Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Performance Dynamic Visual Trend Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2">
              <Activity className="text-emerald-500" size={18} />
              مؤشر نمو المبيعات الربع سنوي
            </h3>
            <span className="text-xs text-slate-500">القيمة بالعملة المحددة</span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {chartDataPoints.map((dp, i) => {
              const heightPercentage = Math.max(10, (dp.amount / maxChartValue) * 100);
              return (
                <div key={i} className="flex flex-col items-center justify-end h-48 space-y-2">
                  <div className="w-full text-center text-xs font-bold text-slate-700">
                    {formatCurrency(dp.amount, activeCurrency, rate)}
                  </div>
                  <div className="w-12 relative rounded-t-md overflow-hidden bg-slate-50 group hover:bg-slate-100 transition-colors w-16 md:w-20">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-md transition-all duration-1000 ease-out"
                      style={{ height: `${heightPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{dp.label}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
            <span>الربح المتوقع للمخزون غير المباع: <span className="font-bold text-slate-700">{formatCurrency(expectedProfit, activeCurrency, rate)}</span></span>
            <span>إجمالي المشتريات: <span className="font-bold text-slate-700">{formatCurrency(totalPurchasesAmount, activeCurrency, rate)}</span></span>
          </div>
        </div>

        {/* Category distribution widget */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-slate-800 font-bold text-sm">توزيع قيمة المخزون حسب المجموعات</h3>
          
          {totalCatValue === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">لا توجد منتجات في المخازن حالياً.</div>
          ) : (
            <div className="space-y-4 pt-2">
              {categoryStats.map((cat, idx) => {
                const percentage = (cat.value / totalCatValue) * 100;
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500'];
                const color = colors[idx % colors.length];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{cat.name}</span>
                      <span className="text-slate-500">
                        {formatCurrency(cat.value, activeCurrency, rate)} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${color} h-full rounded-full`} style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400">عدد القطع الإجمالي: {cat.qty} قطعة</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Third Row: Bestsellers & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Products Leaderboard */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2">
              <Award className="text-amber-500" size={18} />
              المنتجات الأكثر مبيعاً ورواجاً
            </h3>
            <span className="text-xs text-slate-500">حسب الوحدات المباعة</span>
          </div>

          {bestSellers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">لم تسجل مبيعات حتى الآن.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bestSellers.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                      <p className="text-[10px] text-slate-400">الكمية المباعة: {item.qty} وحدة</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    {formatCurrency(item.total, activeCurrency, rate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2">
              <Activity className="text-blue-500" size={18} />
              آخر حركات المخازن الموثقة
            </h3>
            <button 
              onClick={() => onNavigate('inventory')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              عرض سجل الحركة الكامل
            </button>
          </div>

          {data.stockMovements.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">لا يوجد حركات مخزنية مسجلة.</div>
          ) : (
            <div className="space-y-3">
              {data.stockMovements.slice(0, 5).map((mov, idx) => {
                const isIncoming = mov.type.startsWith('in_') || mov.type === 'adjustment' && mov.quantity > 0;
                return (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2.5">
                      {isIncoming ? (
                        <span className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                          +
                        </span>
                      ) : (
                        <span className="w-7 h-7 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center font-bold">
                          -
                        </span>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-800">{mov.productName}</h4>
                        <p className="text-[10px] text-slate-400">{mov.notes}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className={`font-bold ${isIncoming ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncoming ? '+' : '-'}{Math.abs(mov.quantity)}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(mov.date).toLocaleDateString('ar-IQ')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
