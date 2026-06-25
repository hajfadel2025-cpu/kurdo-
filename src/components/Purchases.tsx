/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppData, Product, Supplier, PurchaseInvoice, PurchaseItem, StockMovement } from '../types';
import { generateId, formatCurrency } from '../utils';
import { 
  Package, 
  ArrowDownLeft, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  CheckCircle, 
  AlertCircle,
  X
} from 'lucide-react';

interface PurchasesProps {
  data: AppData;
  activeCurrency: 'USD' | 'IQD';
  currentUserRole: 'admin' | 'delegate';
  currentUsername: string;
  onUpdateProducts: (products: Product[]) => void;
  onUpdatePurchaseInvoices: (invoices: PurchaseInvoice[]) => void;
  onAddStockMovement: (movement: StockMovement) => void;
}

export default function Purchases({
  data,
  activeCurrency,
  currentUserRole,
  currentUsername,
  onUpdateProducts,
  onUpdatePurchaseInvoices,
  onAddStockMovement
}: PurchasesProps) {
  const rate = data.companyInfo.exchangeRate;

  // ---------------- State ----------------
  const [activeTab, setActiveTab] = useState<'new_invoice' | 'history'>('new_invoice');
  const [searchTerm, setSearchTerm] = useState('');

  // Cart / Purchase draft
  const [selectedSupplierId, setSelectedSupplierId] = useState(data.suppliers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card'>('cash');
  const [purchaseCurrency, setPurchaseCurrency] = useState<'USD' | 'IQD'>(activeCurrency);
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Product Selection search in panel
  const [productSearch, setProductSearch] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ---------------- Cart Actions ----------------
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    
    // Determine native cost price in Purchase Currency
    const isIqdNative = product.supplierId === 'sup_2' || product.unit === 'كارتون' || product.unit === 'كيس';
    let costPriceInPurCurrency = product.costPrice;

    if (isIqdNative && purchaseCurrency === 'USD') {
      costPriceInPurCurrency = product.costPrice / rate;
    } else if (!isIqdNative && purchaseCurrency === 'IQD') {
      costPriceInPurCurrency = product.costPrice * rate;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        costPrice: costPriceInPurCurrency
      }]);
    }
    showToast('تم إضافة الصنف لفاتورة الشراء');
  };

  const updateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQty } 
        : item
    ));
  };

  const updateCartPrice = (productId: string, newPrice: number) => {
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, costPrice: Math.max(0, newPrice) } 
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
    showToast('تم إزالة الصنف');
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);

  // ---------------- Save Purchase Invoice ----------------
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('يرجى اختيار أصناف لشراء بضائع أولاً!', 'error');
      return;
    }

    const supplier = data.suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) {
      showToast('يرجى تحديد المورد أولاً', 'error');
      return;
    }

    const invoiceNum = `PUR-2026-${String(data.purchaseInvoices.length + 1).padStart(4, '0')}`;
    const invoiceId = generateId('pur');

    // 1. ADD purchased quantities to products stock
    const updatedProducts = data.products.map(p => {
      const cartItem = cart.find(item => item.productId === p.id);
      if (cartItem) {
        // Update product costPrice as well to reflect the latest purchase cost (natively)!
        let latestCostNative = cartItem.costPrice;
        const isIqdNative = p.supplierId === 'sup_2' || p.unit === 'كارتون' || p.unit === 'كيس';

        if (isIqdNative && purchaseCurrency === 'USD') {
          latestCostNative = cartItem.costPrice * rate; // convert to IQD
        } else if (!isIqdNative && purchaseCurrency === 'IQD') {
          latestCostNative = cartItem.costPrice / rate; // convert to USD
        }

        return {
          ...p,
          quantity: p.quantity + cartItem.quantity,
          costPrice: latestCostNative // Dynamic Pricing update based on latest cost!
        };
      }
      return p;
    });
    onUpdateProducts(updatedProducts);

    // 2. Log Stock Movements (in_purchase)
    cart.forEach(item => {
      const p = data.products.find(prod => prod.id === item.productId)!;
      const movement: StockMovement = {
        id: generateId('mov'),
        productId: item.productId,
        productName: item.productName,
        type: 'in_purchase',
        quantity: item.quantity,
        date: new Date().toISOString(),
        previousQty: p.quantity,
        currentQty: p.quantity + item.quantity,
        notes: `شراء وتوريد بموجب فاتورة شراء رقم ${invoiceNum}`,
        createdBy: currentUsername
      };
      onAddStockMovement(movement);
    });

    // 3. Build and save purchase invoice
    const newInvoice: PurchaseInvoice = {
      id: invoiceId,
      invoiceNumber: invoiceNum,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date().toISOString(),
      items: cart,
      paymentMethod,
      currency: purchaseCurrency,
      total: cartTotal,
      netTotal: cartTotal, // no discount on purchases by default
      notes: purchaseNotes,
      createdBy: currentUsername
    };

    onUpdatePurchaseInvoices([...data.purchaseInvoices, newInvoice]);

    // Reset Cart
    setCart([]);
    setPurchaseNotes('');
    setActiveTab('history');
    showToast(`تم اعتماد وتنزيل فاتورة الشراء بنجاح برقم: ${invoiceNum}`);
  };

  // ---------------- Filters ----------------
  const filteredProductsToSelect = data.products.filter(p => {
    return p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
           p.barcode.includes(productSearch);
  });

  const filteredPurchases = data.purchaseInvoices.filter(inv => {
    return inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
           inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6" id="purchases_panel">
      
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">إدارة المشتريات وتوريد البضائع</h2>
          <p className="text-slate-500 text-xs mt-1">توليد فواتير الشراء من الموردين وزيادة رصيد المخزن تلقائياً وتحديث أسعار التكلفة</p>
        </div>

        <div className="border border-slate-200 bg-white p-1 rounded-lg flex gap-1 text-xs">
          <button
            onClick={() => setActiveTab('new_invoice')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'new_invoice' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            فاتورة شراء جديدة
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'history' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            أرشيف فواتير الشراء ({data.purchaseInvoices.length})
          </button>
        </div>
      </div>

      {/* ================================= TAB 1: NEW PURCHASE INVOICE ================================= */}
      {activeTab === 'new_invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Product Selection */}
          <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-slate-800 font-bold text-xs flex items-center gap-2">
              <Plus className="text-blue-500" size={16} />
              اختر أصناف السلع المستلمة من المورد
            </h3>

            <div className="relative">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ابحث باسم السلعة أو امسح الباركود للتوريد..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
              />
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredProductsToSelect.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => addToCart(p)}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-blue-100 hover:bg-slate-50/50 flex items-center justify-between text-xs transition-all cursor-pointer"
                >
                  <div>
                    <span className="font-bold block text-slate-800">{p.name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">المجموعة: {p.category} | باركود: {p.barcode}</span>
                  </div>
                  <div className="text-left shrink-0 font-medium">
                    <span className="text-slate-400 block text-[9px]">تكلفتها الحالية:</span>
                    <span className="font-bold text-slate-700">{formatCurrency(p.costPrice, purchaseCurrency, rate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Purchase Form Draft */}
          <form onSubmit={handleSavePurchase} className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-slate-800 font-bold text-xs">مسودة الفاتورة والمورد</h3>

            {/* Row 1: Select Supplier */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">المورد المجهز للبضاعة <span className="text-rose-500">*</span></label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-white"
              >
                {data.suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (شركة: {s.companyName} | هاتف: {s.phone})</option>
                ))}
              </select>
            </div>

            {/* Row 2: Settings (Currency, Payment) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">عملة شراء الفاتورة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseCurrency('IQD');
                      setCart(cart.map(item => ({ ...item, costPrice: item.costPrice * rate })));
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      purchaseCurrency === 'IQD' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    دينار عراقي (IQD)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseCurrency('USD');
                      setCart(cart.map(item => ({ ...item, costPrice: item.costPrice / rate })));
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      purchaseCurrency === 'USD' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    دولار أمريكي (USD)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">طريقة سداد المورد</label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                      paymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    نقدي (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                      paymentMethod === 'credit' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    آجل (حساب)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                      paymentMethod === 'card' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    شبكة/حوالة
                  </button>
                </div>
              </div>
            </div>

            {/* Cart Items list */}
            <div className="border border-slate-100 rounded-xl overflow-hidden mt-4">
              <div className="bg-slate-50/75 p-2.5 font-bold text-slate-600 text-[11px] border-b border-slate-100">
                الأصناف المستوردة بالفاتورة
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">لا يوجد بنود لشراء بضائع حالياً. اختر السلع من الجانب.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.productId} className="p-3 flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block">{item.productName}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Cost Input Editor */}
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 block">تكلفة الشراء الحالية بالفاتورة:</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.costPrice}
                            onChange={(e) => updateCartPrice(item.productId, parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-0.5 border border-slate-200 rounded font-bold font-mono text-xs"
                          />
                        </div>

                        {/* Qty Editor */}
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 block text-center">الكمية:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                              className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-slate-800 w-8 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                              className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="text-left min-w-24 font-bold font-mono text-slate-700">
                          {formatCurrency(item.costPrice * item.quantity, purchaseCurrency, rate)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-rose-600 hover:bg-rose-50 p-1 rounded self-end md:self-auto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 block">ملاحظات وبيانات الاستيراد:</label>
              <input
                type="text"
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700"
                placeholder="مثال: شحنة قادمة من معبر إبراهيم الخليل، بضاعة ممتازة..."
              />
            </div>

            {/* Bottom Total */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex justify-between font-bold text-slate-800 text-sm">
                <span>المجموع النهائي للفاتورة:</span>
                <span className="font-mono text-blue-600 text-base">
                  {formatCurrency(cartTotal, purchaseCurrency, rate)}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center justify-center gap-1"
              >
                <Save size={15} />
                تأكيد واعتماد الفاتورة وتوريد الكميات للمخازن
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ================================= TAB 2: PURCHASES ARCHIVE ================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة أو اسم المورد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="p-3">رقم فاتورة الشراء</th>
                    <th className="p-3">اسم المورد المجهز</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3">إجمالي قيمة الشراء</th>
                    <th className="p-3">المستخدم المستلم</th>
                    <th className="p-3">الملاحظات والبيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPurchases.slice().reverse().map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-800 font-mono">{inv.invoiceNumber}</td>
                      <td className="p-3 font-semibold text-slate-700">{inv.supplierName}</td>
                      <td className="p-3 font-mono text-slate-400 text-[10px]">
                        {new Date(inv.date).toLocaleDateString('ar-IQ')} {new Date(inv.date).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          inv.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'credit' ? 'آجل' : 'شبكة'}
                        </span>
                      </td>
                      <td className="p-3 font-bold font-mono text-emerald-600">
                        {formatCurrency(inv.netTotal, inv.currency, rate)}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{inv.createdBy}</td>
                      <td className="p-3 text-slate-400 text-[10px] max-w-xs truncate" title={inv.notes}>
                        {inv.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
