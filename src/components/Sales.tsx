/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppData, Product, Customer, Delegate, Invoice, InvoiceItem, StockMovement, CustomerTransaction, DelegateTransaction } from '../types';
import { generateId, formatCurrency } from '../utils';
import { 
  ShoppingCart, 
  UserPlus, 
  Trash2, 
  Save, 
  Printer, 
  Send, 
  RotateCcw, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Minus,
  X,
  CreditCard,
  DollarSign
} from 'lucide-react';

interface SalesProps {
  data: AppData;
  activeCurrency: 'USD' | 'IQD';
  currentUserRole: 'admin' | 'delegate';
  currentUsername: string;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateDelegates: (delegates: Delegate[]) => void;
  onUpdateInvoices: (invoices: Invoice[]) => void;
  onAddStockMovement: (movement: StockMovement) => void;
  onAddCustomerTransaction: (tx: CustomerTransaction) => void;
  onAddDelegateTransaction: (tx: DelegateTransaction) => void;
}

export default function Sales({
  data,
  activeCurrency,
  currentUserRole,
  currentUsername,
  onUpdateProducts,
  onUpdateCustomers,
  onUpdateDelegates,
  onUpdateInvoices,
  onAddStockMovement,
  onAddCustomerTransaction,
  onAddDelegateTransaction
}: SalesProps) {
  const rate = data.companyInfo.exchangeRate;

  // ---------------- State ----------------
  const [activeTab, setActiveTab] = useState<'invoice' | 'history'>('invoice');
  const [searchTerm, setSearchTerm] = useState('');
  
  // New invoice cart state
  const [selectedCustomerId, setSelectedCustomerId] = useState(data.customers[0]?.id || '');
  const [selectedDelegateId, setSelectedDelegateId] = useState(data.delegates[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card'>('cash');
  const [invoiceCurrency, setInvoiceCurrency] = useState<'USD' | 'IQD'>(activeCurrency);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'value'>('value');
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Selected invoice for viewing details/printing/returns
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Search in Invoice products
  const [productSearch, setProductSearch] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ---------------- Cart Actions ----------------

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      showToast('عذراً، هذا المنتج غير متوفر في المخازن حالياً!', 'error');
      return;
    }

    // Check existing qty in cart
    const existing = cart.find(item => item.productId === product.id);
    const existingQty = existing ? existing.quantity : 0;

    if (existingQty + 1 > product.quantity) {
      showToast(`عذراً، لا يوجد مخزون كافي! المتوفر فقط هو ${product.quantity} قطعة`, 'error');
      return;
    }

    // Determine prices in Invoice Currency
    // Since product prices are natively USD or IQD, we convert them properly
    const isIqdNative = product.supplierId === 'sup_2' || product.unit === 'كارتون' || product.unit === 'كيس';
    const nativePrice = product.salePrice;
    const nativeCost = product.costPrice;

    let salePriceInInvCurrency = nativePrice;
    let costPriceInInvCurrency = nativeCost;

    if (isIqdNative && invoiceCurrency === 'USD') {
      salePriceInInvCurrency = nativePrice / rate;
      costPriceInInvCurrency = nativeCost / rate;
    } else if (!isIqdNative && invoiceCurrency === 'IQD') {
      salePriceInInvCurrency = nativePrice * rate;
      costPriceInInvCurrency = nativeCost * rate;
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
        salePrice: salePriceInInvCurrency,
        costPrice: costPriceInInvCurrency
      }]);
    }
    showToast('تمت إضافة الصنف للفاتورة');
  };

  const updateCartQty = (productId: string, newQty: number) => {
    const p = data.products.find(prod => prod.id === productId);
    if (!p) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > p.quantity) {
      showToast(`عذراً، المخزون المتوفر هو ${p.quantity} قطع فقط!`, 'error');
      return;
    }

    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQty } 
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
    showToast('تم إزالة الصنف من الفاتورة');
  };

  // ---------------- Cart Totals ----------------
  const cartTotal = cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0);
  
  let cartNetTotal = cartTotal;
  if (discountValue > 0) {
    if (discountType === 'percentage') {
      cartNetTotal = cartTotal * (1 - discountValue / 100);
    } else {
      cartNetTotal = Math.max(0, cartTotal - discountValue);
    }
  }

  // ---------------- Save Invoice ----------------
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('لا يمكن حفظ فاتورة فارغة! يرجى إضافة أصناف أولاً', 'error');
      return;
    }

    const customer = data.customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      showToast('يرجى تحديد العميل', 'error');
      return;
    }

    const delegate = data.delegates.find(d => d.id === selectedDelegateId);
    
    const invoiceNum = `INV-2026-${String(data.invoices.length + 1).padStart(4, '0')}`;
    const invoiceId = generateId('inv');

    // 1. Deduct Product quantities
    const updatedProducts = data.products.map(p => {
      const cartItem = cart.find(item => item.productId === p.id);
      if (cartItem) {
        return {
          ...p,
          quantity: p.quantity - cartItem.quantity
        };
      }
      return p;
    });
    onUpdateProducts(updatedProducts);

    // 2. Log Stock Movements (out_sale)
    cart.forEach(item => {
      const p = data.products.find(prod => prod.id === item.productId)!;
      const movement: StockMovement = {
        id: generateId('mov'),
        productId: item.productId,
        productName: item.productName,
        type: 'out_sale',
        quantity: -item.quantity,
        date: new Date().toISOString(),
        previousQty: p.quantity,
        currentQty: p.quantity - item.quantity,
        notes: `مبيعات بموجب فاتورة رقم ${invoiceNum}`,
        createdBy: currentUsername
      };
      onAddStockMovement(movement);
    });

    // 3. Update Customer Debt balance if payment method is "credit" (أجل)
    let finalNetTotalInIqd = cartNetTotal;
    if (invoiceCurrency === 'USD') {
      finalNetTotalInIqd = cartNetTotal * rate;
    }

    if (paymentMethod === 'credit') {
      const updatedCustomers = data.customers.map(c => {
        if (c.id === customer.id) {
          return {
            ...c,
            balance: c.balance + finalNetTotalInIqd
          };
        }
        return c;
      });
      onUpdateCustomers(updatedCustomers);

      // Log Customer debit transaction
      const custTx: CustomerTransaction = {
        id: generateId('ct'),
        customerId: customer.id,
        type: 'sale_invoice',
        amount: finalNetTotalInIqd,
        balanceAfter: customer.balance + finalNetTotalInIqd,
        date: new Date().toISOString(),
        invoiceId: invoiceId,
        notes: `مبيعات بالآجل بموجب فاتورة رقم ${invoiceNum}`
      };
      onAddCustomerTransaction(custTx);
    }

    // 4. Calculate Delegate Commission and update balance
    if (delegate) {
      const commissionAmountInIqd = finalNetTotalInIqd * (delegate.commissionRate / 100);
      const updatedDelegates = data.delegates.map(d => {
        if (d.id === delegate.id) {
          return {
            ...d,
            balance: d.balance + commissionAmountInIqd,
            totalSales: d.totalSales + finalNetTotalInIqd,
            totalCommission: d.totalCommission + commissionAmountInIqd
          };
        }
        return d;
      });
      onUpdateDelegates(updatedDelegates);

      // Log Delegate commission ledger
      const delTx: DelegateTransaction = {
        id: generateId('dt'),
        delegateId: delegate.id,
        type: 'commission',
        amount: commissionAmountInIqd,
        balanceAfter: delegate.balance + commissionAmountInIqd,
        date: new Date().toISOString(),
        invoiceId: invoiceId,
        notes: `عمولة مبيعات بنسبة ${delegate.commissionRate}% للفاتورة رقم ${invoiceNum}`
      };
      onAddDelegateTransaction(delTx);
    }

    // 5. Build and save invoice
    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber: invoiceNum,
      customerId: customer.id,
      customerName: customer.name,
      delegateId: delegate?.id,
      delegateName: delegate?.name,
      date: new Date().toISOString(),
      items: cart,
      discountValue,
      discountType,
      paymentMethod,
      currency: invoiceCurrency,
      total: cartTotal,
      netTotal: cartNetTotal,
      isReturned: false,
      notes: invoiceNotes,
      createdBy: currentUsername
    };

    onUpdateInvoices([...data.invoices, newInvoice]);
    
    // Reset Cart
    setCart([]);
    setDiscountValue(0);
    setInvoiceNotes('');
    setViewingInvoice(newInvoice); // immediately view the printed version
    showToast(`تم حفظ الفاتورة بنجاح برقم: ${invoiceNum}`);
  };

  // ---------------- Refund / Returns (مرتجع مبيعات) ----------------
  const handleReturnInvoice = (invoice: Invoice) => {
    if (currentUserRole !== 'admin') {
      showToast('عذراً، هذه الصلاحية للمسؤولين فقط', 'error');
      return;
    }

    if (invoice.isReturned) {
      showToast('هذه الفاتورة تم إرجاعها مسبقاً!', 'error');
      return;
    }

    if (!confirm(`هل أنت متأكد من تسجيل مرتجع كامل للفاتورة رقم ${invoice.invoiceNumber}؟ سيتم إعادة الكميات للمخزن وتسوية حسابات العميل والمندوب.`)) {
      return;
    }

    // 1. Return quantities to stock
    const updatedProducts = data.products.map(p => {
      const returnedItem = invoice.items.find(item => item.productId === p.id);
      if (returnedItem) {
        return {
          ...p,
          quantity: p.quantity + returnedItem.quantity
        };
      }
      return p;
    });
    onUpdateProducts(updatedProducts);

    // 2. Log Stock Movements (in_returned)
    invoice.items.forEach(item => {
      const p = data.products.find(prod => prod.id === item.productId)!;
      const movement: StockMovement = {
        id: generateId('mov'),
        productId: item.productId,
        productName: item.productName,
        type: 'in_returned',
        quantity: item.quantity,
        date: new Date().toISOString(),
        previousQty: p.quantity,
        currentQty: p.quantity + item.quantity,
        notes: `مرتجع مبيعات للفاتورة رقم ${invoice.invoiceNumber}`,
        createdBy: currentUsername
      };
      onAddStockMovement(movement);
    });

    // Calculate Net total in IQD
    let netTotalInIqd = invoice.netTotal;
    if (invoice.currency === 'USD') {
      netTotalInIqd = invoice.netTotal * rate;
    }

    // 3. Update Customer Balance if invoice was "credit"
    if (invoice.paymentMethod === 'credit') {
      const customer = data.customers.find(c => c.id === invoice.customerId);
      if (customer) {
        const updatedCustomers = data.customers.map(c => {
          if (c.id === customer.id) {
            return {
              ...c,
              balance: c.balance - netTotalInIqd // deduct the debt
            };
          }
          return c;
        });
        onUpdateCustomers(updatedCustomers);

        // Log Customer return tx
        const custTx: CustomerTransaction = {
          id: generateId('ct'),
          customerId: customer.id,
          type: 'return',
          amount: -netTotalInIqd,
          balanceAfter: customer.balance - netTotalInIqd,
          date: new Date().toISOString(),
          invoiceId: invoice.id,
          notes: `إرجاع مبيعات فاتورة رقم ${invoice.invoiceNumber}`
        };
        onAddCustomerTransaction(custTx);
      }
    }

    // 4. Update Delegate Commission if there was a delegate
    if (invoice.delegateId) {
      const delegate = data.delegates.find(d => d.id === invoice.delegateId);
      if (delegate) {
        const commissionToRefund = netTotalInIqd * (delegate.commissionRate / 100);
        const updatedDelegates = data.delegates.map(d => {
          if (d.id === delegate.id) {
            return {
              ...d,
              balance: d.balance - commissionToRefund,
              totalSales: d.totalSales - netTotalInIqd,
              totalCommission: d.totalCommission - commissionToRefund
            };
          }
          return d;
        });
        onUpdateDelegates(updatedDelegates);

        // Log Delegate commission debit
        const delTx: DelegateTransaction = {
          id: generateId('dt'),
          delegateId: delegate.id,
          type: 'payout', // deduct
          amount: -commissionToRefund,
          balanceAfter: delegate.balance - commissionToRefund,
          date: new Date().toISOString(),
          invoiceId: invoice.id,
          notes: `خصم عمولة مرتجع مبيعات فاتورة رقم ${invoice.invoiceNumber}`
        };
        onAddDelegateTransaction(delTx);
      }
    }

    // 5. Mark invoice as returned
    const updatedInvoices = data.invoices.map(inv => {
      if (inv.id === invoice.id) {
        return {
          ...inv,
          isReturned: true,
          returnDate: new Date().toISOString()
        };
      }
      return inv;
    });
    onUpdateInvoices(updatedInvoices);

    if (viewingInvoice?.id === invoice.id) {
      setViewingInvoice({ ...invoice, isReturned: true, returnDate: new Date().toISOString() });
    }
    showToast(`تم تسجيل الفاتورة رقم ${invoice.invoiceNumber} كمرتجع مبيعات بنجاح`);
  };

  // ---------------- Share Invoice via WhatsApp ----------------
  const shareOnWhatsApp = (invoice: Invoice) => {
    const phone = data.customers.find(c => c.id === invoice.customerId)?.phone || '';
    
    // Format message
    let message = `*فاتورة مبيعات من: ${data.companyInfo.name}*\n`;
    message += `*رقم الفاتورة:* ${invoice.invoiceNumber}\n`;
    message += `*التاريخ:* ${new Date(invoice.date).toLocaleDateString('ar-IQ')}\n`;
    message += `*طريقة الدفع:* ${invoice.paymentMethod === 'cash' ? 'نقدي' : invoice.paymentMethod === 'credit' ? 'آجل' : 'شبكة/بطاقة'}\n`;
    message += `-----------------------------\n`;
    
    invoice.items.forEach(item => {
      message += `- ${item.productName} (العدد: ${item.quantity}) - السعر: ${formatCurrency(item.salePrice, invoice.currency, rate)}\n`;
    });
    
    message += `-----------------------------\n`;
    message += `*الإجمالي:* ${formatCurrency(invoice.total, invoice.currency, rate)}\n`;
    if (invoice.discountValue > 0) {
      message += `*الخصم:* ${invoice.discountValue}${invoice.discountType === 'percentage' ? '%' : ''}\n`;
    }
    message += `*الصافي النهائي:* ${formatCurrency(invoice.netTotal, invoice.currency, rate)}\n\n`;
    message += `شكرًا لتعاملكم معنا!`;

    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone.replace(/\+/g, '')}&text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  // ---------------- Filter Products in Cart ----------------
  const filteredProductsToSelect = data.products.filter(p => {
    return p.status === 'active' && 
           (p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
            p.barcode.includes(productSearch));
  });

  // ---------------- Filter Invoices ----------------
  const filteredInvoices = data.invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6" id="sales_panel">
      
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
          <h2 className="text-xl font-bold text-slate-800 font-sans">نظام نقطة المبيعات وإصدار الفواتير</h2>
          <p className="text-slate-500 text-xs mt-1">توليد فواتير جديدة، ربط العملاء والمندوبين، إرسال فواتير واتساب، وطباعة الفاتورة.</p>
        </div>

        <div className="border border-slate-200 bg-white p-1 rounded-lg flex gap-1 text-xs">
          <button
            onClick={() => setActiveTab('invoice')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'invoice' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            فاتورة مبيعات جديدة
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'history' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            سجل الفواتير الصادرة ({data.invoices.length})
          </button>
        </div>
      </div>

      {/* ================================= TAB 1: NEW INVOICE WORKSPACE ================================= */}
      {activeTab === 'invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel (Col span 7): Product selection catalog */}
          <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-slate-800 font-bold text-xs flex items-center gap-2">
              <ShoppingCart className="text-blue-500" size={16} />
              اختر أصناف السلع لإضافتها للفاتورة
            </h3>

            <div className="relative">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ابحث باسم السلعة أو امسح الباركود..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
              />
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {filteredProductsToSelect.map(p => {
                const isOutOfStock = p.quantity === 0;
                const isLow = p.quantity <= p.minStock && p.quantity > 0;

                return (
                  <div 
                    key={p.id} 
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-2 rounded-lg border border-slate-100 flex items-center justify-between text-xs transition-all ${
                      isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-slate-50/80 hover:border-blue-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {p.imageUrl && (
                        <img 
                          src={p.imageUrl} 
                          alt="" 
                          className="w-8 h-8 rounded object-cover border" 
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div>
                        <span className="font-bold block text-slate-800">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">الرف: {p.location || 'غير محدد'} | باركود: {p.barcode}</span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="font-bold block text-blue-600">
                        {formatCurrency(p.salePrice, invoiceCurrency, rate)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isOutOfStock ? 'bg-rose-50 text-rose-600' : isLow ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        متوفر: {p.quantity} {p.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel (Col span 7): Invoicing Cart & Calculations */}
          <form onSubmit={handleSaveInvoice} className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-slate-800 font-bold text-xs flex items-center gap-1">
              تفاصيل الفاتورة النشطة والعميل المستلم
            </h3>

            {/* Row 1: Select Customer & Sales Delegate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">العميل المستلم الفاتورة <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-white"
                >
                  {data.customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (الهاتف: {c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">المندوب المبيعات <span className="text-slate-400">(اختياري للعمولة)</span></label>
                <select
                  value={selectedDelegateId}
                  onChange={(e) => setSelectedDelegateId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 bg-white"
                >
                  <option value="">بلا مندوب (مبيعات مباشرة)</option>
                  {data.delegates.map(d => (
                    <option key={d.id} value={d.id}>{d.name} (نسبة عمولته: {d.commissionRate}%)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Invoicing Settings (Currency, Payment) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">عملة تسعير الفاتورة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceCurrency('IQD');
                      // Recalculate cart prices instantly from dollar to dinar
                      setCart(cart.map(item => ({
                        ...item,
                        salePrice: item.salePrice * rate,
                        costPrice: item.costPrice * rate
                      })));
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      invoiceCurrency === 'IQD' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    دينار عراقي (IQD)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceCurrency('USD');
                      // Convert
                      setCart(cart.map(item => ({
                        ...item,
                        salePrice: item.salePrice / rate,
                        costPrice: item.costPrice / rate
                      })));
                    }}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      invoiceCurrency === 'USD' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    دولار أمريكي (USD)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">طريقة سداد قيمة الفاتورة</label>
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
                    آجل (ديون ⚠️)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                      paymentMethod === 'card' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    بطاقة / شبكة
                  </button>
                </div>
              </div>
            </div>

            {/* Invoiced items list (Cart) */}
            <div className="border border-slate-100 rounded-xl overflow-hidden mt-4">
              <div className="bg-slate-50/75 p-2.5 font-bold text-slate-600 text-[11px] border-b border-slate-100">
                قائمة السلع المختارة في الفاتورة
              </div>
              
              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">سلة الفاتورة فارغة. اختر السلع من القائمة الجانبية المجاورة.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.productId} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block">{item.productName}</span>
                        <span className="text-[10px] text-slate-400">سعر القطعة: {formatCurrency(item.salePrice, invoiceCurrency, rate)}</span>
                      </div>

                      {/* Quantity Editor */}
                      <div className="flex items-center gap-1.5 px-4">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                          className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 flex items-center justify-center font-bold text-sm"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-slate-800 w-8 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                          className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 flex items-center justify-center font-bold text-sm"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Total & Remove */}
                      <div className="flex items-center gap-4">
                        <span className="font-bold font-mono text-slate-700 w-24 text-left">
                          {formatCurrency(item.salePrice * item.quantity, invoiceCurrency, rate)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-rose-600 hover:bg-rose-50 p-1 rounded"
                          title="إزالة"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount Form */}
            <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 block">خصم إضافي على الفاتورة:</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                  />
                  
                  <div className="flex bg-white border border-slate-200 rounded-lg p-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDiscountType('value')}
                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                        discountType === 'value' ? 'bg-blue-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      مبلغ مالي
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                        discountType === 'percentage' ? 'bg-blue-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      نسبة مئوية (%)
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 block">ملاحظات الفاتورة والبيان:</label>
                <input
                  type="text"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700"
                  placeholder="مثال: مستلمة جزئياً، تسليم بغداد..."
                />
              </div>
            </div>

            {/* Calculations and final submit */}
            <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الإجمالي للفاتورة:</span>
                <span className="font-mono font-bold text-slate-700">
                  {formatCurrency(cartTotal, invoiceCurrency, rate)}
                </span>
              </div>
              
              {discountValue > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>قيمة الخصم الممنوح:</span>
                  <span className="font-mono font-bold">
                    -{discountType === 'percentage' ? `${discountValue}%` : formatCurrency(discountValue, invoiceCurrency, rate)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-800 text-sm font-bold pt-2 border-t border-dashed">
                <span>الصافي النهائي للفاتورة:</span>
                <span className="font-mono text-blue-600 text-base">
                  {formatCurrency(cartNetTotal, invoiceCurrency, rate)}
                </span>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 text-xs"
                >
                  <Save size={16} />
                  حفظ واعتماد الفاتورة وتعديل الأرصدة
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ================================= TAB 2: INVOICES ARCHIVE / HISTORY ================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة أو اسم العميل للطباعة أو المرتجع..."
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
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">اسم العميل المستلم</th>
                    <th className="p-3">مندوب المبيعات</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">طريقة السداد</th>
                    <th className="p-3">الصافي النهائي</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-left">الإجراءات والعمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvoices.slice().reverse().map(inv => {
                    let methodColor = 'bg-slate-100 text-slate-600';
                    let methodLabel = '';
                    switch (inv.paymentMethod) {
                      case 'cash':
                        methodColor = 'bg-emerald-50 text-emerald-700';
                        methodLabel = 'نقدي';
                        break;
                      case 'credit':
                        methodColor = 'bg-rose-50 text-rose-700 font-semibold';
                        methodLabel = 'آجل';
                        break;
                      case 'card':
                        methodColor = 'bg-blue-50 text-blue-700';
                        methodLabel = 'شبكة';
                        break;
                    }

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-800 font-mono">{inv.invoiceNumber}</td>
                        <td className="p-3 font-semibold text-slate-700">{inv.customerName}</td>
                        <td className="p-3 text-slate-500 text-[11px]">{inv.delegateName || 'مبيعات مباشرة'}</td>
                        <td className="p-3 font-mono text-slate-400 text-[10px]">
                          {new Date(inv.date).toLocaleDateString('ar-IQ')} {new Date(inv.date).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${methodColor}`}>
                            {methodLabel}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-mono text-blue-600">
                          {formatCurrency(inv.netTotal, inv.currency, rate)}
                        </td>
                        <td className="p-3">
                          {inv.isReturned ? (
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              تم الإرجاع (مرتجع)
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              مكتملة ومؤكدة
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingInvoice(inv)}
                              title="عرض وتفاصيل الطباعة"
                              className="px-2 py-1 text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md transition-colors"
                            >
                              عرض وطباعة
                            </button>

                            <button
                              onClick={() => shareOnWhatsApp(inv)}
                              title="إرسال عبر واتساب"
                              className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-0.5"
                            >
                              واتساب 📱
                            </button>

                            {!inv.isReturned && currentUserRole === 'admin' && (
                              <button
                                onClick={() => handleReturnInvoice(inv)}
                                className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-md transition-colors flex items-center gap-0.5"
                              >
                                <RotateCcw size={10} />
                                إرجاع الفاتورة
                              </button>
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
        </div>
      )}

      {/* ==================================== MODAL: INVOICE DETAILS & PRINT PREVIEW ==================================== */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-800 text-sm">تفاصيل الفاتورة الرسمية ومعاينة الطباعة</h3>
              <button 
                onClick={() => setViewingInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Area Container */}
            <div className="p-6 space-y-6">
              
              {/* Actual Printable Invoice Document */}
              <div 
                id="printable-sales-invoice" 
                className="p-6 border border-slate-300 rounded-xl bg-white space-y-6 select-text text-right relative overflow-hidden"
              >
                {viewingInvoice.isReturned && (
                  <div className="absolute top-8 -left-12 transform -rotate-45 bg-rose-600 text-white font-bold text-[10px] py-1 px-12 text-center shadow-xs">
                    مرتجع ملغى
                  </div>
                )}

                {/* Doc Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <h1 className="text-sm font-bold text-slate-800">{data.companyInfo.name}</h1>
                    <p className="text-[10px] text-slate-400">{data.companyInfo.address}</p>
                    <p className="text-[10px] text-slate-400">الهاتف: {data.companyInfo.phone}</p>
                  </div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-blue-600">فاتورة مبيعات</h2>
                    <p className="text-[11px] font-mono text-slate-500">{viewingInvoice.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-400 mt-1">التاريخ: {new Date(viewingInvoice.date).toLocaleDateString('ar-IQ')}</p>
                  </div>
                </div>

                {/* Doc Meta info (Customer & Delegate) */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px]">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px] block">صادرة لصالح السيد / الشركة:</span>
                    <span className="font-bold text-slate-800">{viewingInvoice.customerName}</span>
                    <span className="text-slate-500 block">الهاتف: {data.customers.find(c => c.id === viewingInvoice.customerId)?.phone || '-'}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px] block">بواسطة المندوب:</span>
                    <span className="font-bold text-slate-800">{viewingInvoice.delegateName || 'مبيعات مباشرة'}</span>
                    <span className="text-slate-500 block">طريقة الدفع: <span className="font-bold text-slate-700">{
                      viewingInvoice.paymentMethod === 'cash' ? 'نقدي (كاش)' : viewingInvoice.paymentMethod === 'credit' ? 'آجل ديون' : 'بطاقة شبكة'
                    }</span></span>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-right text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 font-bold bg-slate-100/50">
                      <th className="p-2">توصيف السلعة الصنف</th>
                      <th className="p-2 text-center">الكمية</th>
                      <th className="p-2 text-left">سعر المفرد</th>
                      <th className="p-2 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingInvoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-semibold text-slate-800">{item.productName}</td>
                        <td className="p-2 text-center font-mono">{item.quantity}</td>
                        <td className="p-2 text-left font-mono">{formatCurrency(item.salePrice, viewingInvoice.currency, rate)}</td>
                        <td className="p-2 text-left font-bold font-mono">{formatCurrency(item.salePrice * item.quantity, viewingInvoice.currency, rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals Summary */}
                <div className="border-t border-slate-300 pt-4 flex justify-between items-start">
                  <div className="text-[10px] text-slate-400 max-w-xs">
                    {viewingInvoice.notes && <p className="mt-1 font-bold text-slate-700">ملاحظات: {viewingInvoice.notes}</p>}
                    <p className="mt-2">تعتبر هذه الفاتورة مستندًا رسميًا لحسابات المخزن ومثبتة في دفاترنا المحاسبية.</p>
                  </div>

                  <div className="w-64 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>الإجمالي الفرعي:</span>
                      <span className="font-mono font-bold">{formatCurrency(viewingInvoice.total, viewingInvoice.currency, rate)}</span>
                    </div>

                    {viewingInvoice.discountValue > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>الخصم الممنوح:</span>
                        <span className="font-mono font-bold">
                          -{viewingInvoice.discountType === 'percentage' ? `${viewingInvoice.discountValue}%` : formatCurrency(viewingInvoice.discountValue, viewingInvoice.currency, rate)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-slate-800 text-sm border-t border-dashed border-slate-300 pt-1.5">
                      <span>الصافي النهائي:</span>
                      <span className="font-mono text-blue-600">{formatCurrency(viewingInvoice.netTotal, viewingInvoice.currency, rate)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer seal/stamp placeholder */}
                <div className="border-t border-slate-100 pt-6 flex justify-between items-center text-[10px] text-slate-400">
                  <span>منفذ الفاتورة: <span className="font-bold text-slate-600">{viewingInvoice.createdBy}</span></span>
                  <div className="text-center font-bold text-slate-700">توقيع وختم المستودع</div>
                </div>
              </div>

              {/* Action buttons under invoice doc preview */}
              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4">
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  إغلاق
                </button>

                <button
                  onClick={() => shareOnWhatsApp(viewingInvoice)}
                  className="px-4 py-2 text-xs bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold flex items-center gap-1"
                >
                  إرسال للعميل واتساب 📱
                </button>

                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const printContent = document.getElementById('printable-sales-invoice')?.innerHTML;
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>فاتورة مبيعات - ${viewingInvoice.invoiceNumber}</title>
                            <style>
                              body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; text-align: right; }
                              .invoice-box { border: 1px solid #ccc; padding: 20px; border-radius: 8px; max-width: 800px; margin: 0 auto; }
                              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                              th, td { border-bottom: 1px solid #eee; padding: 8px; text-align: right; }
                              th { background-color: #f7f7f7; }
                              .totals { float: left; width: 250px; margin-top: 20px; font-weight: bold; }
                              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                              .meta { background-color: #fafafa; padding: 10px; margin-top: 15px; border-radius: 5px; display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
                            </style>
                          </head>
                          <body onload="window.print();window.close();">
                            <div class="invoice-box">
                              ${printContent}
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    } else {
                      showToast('فشل فتح نافذة الطباعة. الرجاء تمكين النوافذ المنبثقة', 'error');
                    }
                  }}
                  className="px-4 py-2 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  طباعة الفاتورة المحاسبية 🖨️
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
