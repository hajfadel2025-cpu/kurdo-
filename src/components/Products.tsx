/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { AppData, Product, Category, Unit, Supplier } from '../types';
import { generateId, formatCurrency } from '../utils';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  QrCode, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet,
  X,
  Settings,
  ChevronDown
} from 'lucide-react';

interface ProductsProps {
  data: AppData;
  activeCurrency: 'USD' | 'IQD';
  currentUserRole: 'admin' | 'delegate';
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdateUnits: (units: Unit[]) => void;
}

export default function Products({ 
  data, 
  activeCurrency, 
  currentUserRole,
  onUpdateProducts, 
  onUpdateCategories, 
  onUpdateUnits 
}: ProductsProps) {
  const rate = data.companyInfo.exchangeRate;

  // ---------------- State ----------------
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  
  // Selected product for edit or label printing
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingLabelProduct, setViewingLabelProduct] = useState<Product | null>(null);

  // New item inputs
  const [productForm, setProductForm] = useState({
    name: '',
    barcode: '',
    category: '',
    unit: '',
    costPrice: 0,
    salePrice: 0,
    quantity: 0,
    minStock: 5,
    location: '',
    supplierId: '',
    status: 'active' as 'active' | 'inactive' | 'expired',
    imageUrl: ''
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  
  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show customized alert toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ---------------- Actions ----------------
  
  // Convert uploaded image to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showToast('حجم الصورة كبير جداً! الحد الأقصى المسموح هو 2 ميغابايت', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm(prev => ({ ...prev, imageUrl: reader.result as string }));
        showToast('تم رفع الصورة بنجاح');
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString(), // Generate random barcode
      category: data.categories[0]?.name || '',
      unit: data.units[0]?.name || '',
      costPrice: 0,
      salePrice: 0,
      quantity: 0,
      minStock: 5,
      location: '',
      supplierId: data.suppliers[0]?.id || '',
      status: 'active',
      imageUrl: ''
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    if (currentUserRole !== 'admin') {
      showToast('عذراً، هذه الصلاحية للمسؤولين فقط', 'error');
      return;
    }
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      unit: product.unit,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      quantity: product.quantity,
      minStock: product.minStock,
      location: product.location,
      supplierId: product.supplierId,
      status: product.status,
      imageUrl: product.imageUrl || ''
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.barcode) {
      showToast('يرجى ملء الحقول الإجبارية', 'error');
      return;
    }

    if (productForm.salePrice < productForm.costPrice) {
      if (!confirm('سعر البيع أقل من سعر الشراء، هل أنت متأكد من المتابعة؟')) {
        return;
      }
    }

    if (editingProduct) {
      // Edit
      const updated = data.products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            ...productForm,
            qrCode: productForm.barcode // Barcode maps to QR Code
          };
        }
        return p;
      });
      onUpdateProducts(updated);
      showToast('تم تعديل بيانات المنتج بنجاح');
    } else {
      // Add
      const newProduct: Product = {
        id: generateId('prod'),
        ...productForm,
        qrCode: productForm.barcode
      };
      onUpdateProducts([...data.products, newProduct]);
      showToast('تم إضافة المنتج الجديد بنجاح');
    }
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (currentUserRole !== 'admin') {
      showToast('عذراً، هذه الصلاحية للمسؤولين فقط', 'error');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المنتج "${productName}" نهائياً من النظام؟`)) {
      const filtered = data.products.filter(p => p.id !== productId);
      onUpdateProducts(filtered);
      showToast('تم حذف المنتج بنجاح');
    }
  };

  // Add category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    // Check duplication
    if (data.categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      showToast('المجموعة موجودة بالفعل!', 'error');
      return;
    }

    const newCat: Category = {
      id: generateId('cat'),
      name: newCategoryName.trim()
    };
    onUpdateCategories([...data.categories, newCat]);
    setNewCategoryName('');
    showToast('تم إضافة المجموعة بنجاح');
  };

  const handleDeleteCategory = (catId: string, name: string) => {
    if (data.products.some(p => p.category === name)) {
      showToast('لا يمكن حذف هذه المجموعة لأنها تحتوي على منتجات نشطة!', 'error');
      return;
    }
    const filtered = data.categories.filter(c => c.id !== catId);
    onUpdateCategories(filtered);
    showToast('تم حذف المجموعة');
  };

  // Add unit
  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    if (data.units.some(u => u.name.toLowerCase() === newUnitName.trim().toLowerCase())) {
      showToast('وحدة القياس موجودة بالفعل!', 'error');
      return;
    }

    const newUnit: Unit = {
      id: generateId('unit'),
      name: newUnitName.trim()
    };
    onUpdateUnits([...data.units, newUnit]);
    setNewUnitName('');
    showToast('تم إضافة وحدة القياس بنجاح');
  };

  const handleDeleteUnit = (unitId: string, name: string) => {
    if (data.products.some(p => p.unit === name)) {
      showToast('لا يمكن حذف وحدة القياس هذه لأنها مرتبطة بمنتجات نشطة!', 'error');
      return;
    }
    const filtered = data.units.filter(u => u.id !== unitId);
    onUpdateUnits(filtered);
    showToast('تم حذف وحدة القياس');
  };

  // ---------------- Filters & Search ----------------
  const filteredProducts = data.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.barcode.includes(searchTerm) || 
                          p.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'all') matchesStatus = true;
    else if (statusFilter === 'active') matchesStatus = p.status === 'active';
    else if (statusFilter === 'inactive') matchesStatus = p.status === 'inactive';
    else if (statusFilter === 'expired') matchesStatus = p.status === 'expired';
    else if (statusFilter === 'low_stock') matchesStatus = p.quantity <= p.minStock && p.quantity > 0;
    else if (statusFilter === 'out_of_stock') matchesStatus = p.quantity === 0;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6" id="products_panel">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 left-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 text-white animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Control Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">إدارة دليل الأصناف والمنتجات</h2>
          <p className="text-slate-500 text-xs mt-1">تعديل بيانات المنتجات، رفع الصور، توليد ملصقات الباركود والـ QR Code</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1.5"
          >
            <Settings size={14} />
            المجموعات ({data.categories.length})
          </button>
          
          <button
            onClick={() => setIsUnitModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1.5"
          >
            <Settings size={14} />
            وحدات القياس ({data.units.length})
          </button>

          {currentUserRole === 'admin' && (
            <button
              onClick={openAddProductModal}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus size={16} />
              إضافة صنف جديد
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="البحث باسم المنتج، الباركود، أو موقع الرف التخزيني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <Filter size={14} />
            <span>تصفية حسب:</span>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden bg-white text-slate-700 font-medium"
          >
            <option value="all">كل المجموعات</option>
            {data.categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Status/Stock Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden bg-white text-slate-700 font-medium"
          >
            <option value="all">كل الحالات والمخزون</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="expired">منتهي</option>
            <option value="low_stock">المخزون منخفض ⚠️</option>
            <option value="out_of_stock">نفذ من المخزن 🛑</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white text-center py-16 rounded-xl border border-slate-100 shadow-xs text-slate-400 text-sm">
          لا توجد نتائج تطابق خيارات البحث والتصفية المحددة.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(p => {
            const isLowStock = p.quantity <= p.minStock && p.quantity > 0;
            const isOutOfStock = p.quantity === 0;
            const profit = p.salePrice - p.costPrice;
            const profitPercentage = p.costPrice > 0 ? (profit / p.costPrice) * 100 : 0;

            return (
              <div 
                key={p.id} 
                className={`bg-white rounded-xl border transition-all hover:shadow-md overflow-hidden relative flex flex-col justify-between ${
                  isOutOfStock ? 'border-rose-200 bg-rose-50/10' : 
                  isLowStock ? 'border-amber-200' : 'border-slate-100'
                }`}
              >
                {/* Alert tags */}
                <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                  {isOutOfStock && (
                    <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      نفذ بالكامل
                    </span>
                  )}
                  {isLowStock && (
                    <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      مخزون منخفض
                    </span>
                  )}
                  {p.status === 'expired' && (
                    <span className="bg-slate-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      منتهي
                    </span>
                  )}
                </div>

                {/* Card Header & Image */}
                <div>
                  <div className="h-32 bg-slate-50 flex items-center justify-center border-b border-slate-50 relative overflow-hidden shrink-0">
                    {p.imageUrl ? (
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-slate-300 flex flex-col items-center gap-1">
                        <Upload size={24} />
                        <span className="text-[10px]">بلا صورة</span>
                      </div>
                    )}
                    
                    <div className="absolute bottom-1 right-1.5 bg-slate-800/80 text-white text-[9px] px-2 py-0.5 rounded-md font-mono">
                      {p.location || 'غير محدد الرف'}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px] font-semibold">{p.category}</span>
                      <span className="text-slate-600 text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.unit}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-800 line-clamp-2 h-8 leading-relaxed">
                      {p.name}
                    </h3>

                    {/* Barcode details */}
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 bg-slate-50 p-1 rounded">
                      <span className="font-bold text-slate-500">باركود:</span>
                      <span>{p.barcode}</span>
                    </div>

                    {/* Financial details */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px]">سعر الشراء:</span>
                        <span className="font-bold text-slate-700">
                          {formatCurrency(p.costPrice, activeCurrency, rate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">سعر البيع:</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(p.salePrice, activeCurrency, rate)}
                        </span>
                      </div>
                    </div>

                    {/* Profit Margin Widget */}
                    <div className="bg-emerald-50/50 text-[10px] p-1.5 rounded flex items-center justify-between text-emerald-800">
                      <span>الربح التلقائي:</span>
                      <span className="font-bold">
                        +{formatCurrency(profit, activeCurrency, rate)} ({profitPercentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Stock & Actions */}
                <div className="bg-slate-50/50 p-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">المخزون الفعلي:</span>
                    <span className={`font-bold text-sm ${isOutOfStock ? 'text-rose-600' : 'text-slate-800'}`}>
                      {p.quantity} {p.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setViewingLabelProduct(p);
                        setIsLabelModalOpen(true);
                      }}
                      title="طباعة ملصق QR Code"
                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 rounded-md transition-all"
                    >
                      <QrCode size={14} />
                    </button>

                    {currentUserRole === 'admin' && (
                      <>
                        <button
                          onClick={() => openEditProductModal(p)}
                          title="تعديل"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          title="حذف"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================== MODAL: ADD/EDIT PRODUCT ==================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج وصنف جديد للمخازن'}
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              
              {/* Row 1: Name & Barcode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">اسم المنتج / الصنف <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-blue-500"
                    placeholder="مثال: شاشة سامسونج 50 بوصة ذكية"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">الباركود (الرقم التسلسلي) <span className="text-rose-500">*</span></label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      required
                      value={productForm.barcode}
                      onChange={(e) => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-hidden focus:border-blue-500"
                      placeholder="628100..."
                    />
                    <button
                      type="button"
                      onClick={() => setProductForm(prev => ({ ...prev, barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString() }))}
                      className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs"
                      title="توليد باركود تلقائي"
                    >
                      توليد
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Category & Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">المجموعة التصنيفية</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                  >
                    {data.categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">وحدة القياس</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                  >
                    {data.units.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Prices & Quantities */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-bold text-slate-600 block">سعر الشراء</label>
                  <input
                    type="number"
                    step="any"
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-bold text-slate-600 block">سعر البيع</label>
                  <input
                    type="number"
                    step="any"
                    value={productForm.salePrice}
                    onChange={(e) => setProductForm(prev => ({ ...prev, salePrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-bold text-slate-600 block">الكمية الافتتاحية</label>
                  <input
                    type="number"
                    disabled={editingProduct !== null} // Adjust quantities only via Inventory screen for editing!
                    value={productForm.quantity}
                    onChange={(e) => setProductForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono disabled:bg-slate-50 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-bold text-slate-600 block">الحد الأدنى للتنبيه</label>
                  <input
                    type="number"
                    value={productForm.minStock}
                    onChange={(e) => setProductForm(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 4: Location, Supplier, and Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">موقع التخزين (الرف)</label>
                  <input
                    type="text"
                    value={productForm.location}
                    onChange={(e) => setProductForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                    placeholder="مثال: الرف A-3 أو مخزن الأجهزة"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">المورد الرئيسي</label>
                  <select
                    value={productForm.supplierId}
                    onChange={(e) => setProductForm(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                  >
                    {data.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.companyName})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">حالة المنتج</label>
                  <select
                    value={productForm.status}
                    onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="expired">منتهي الصلاحية</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Product Image (URL or Upload Base64) */}
              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2">صورة المنتج</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] text-slate-500 block">رابط صورة (من الإنترنت):</label>
                    <input
                      type="url"
                      value={productForm.imageUrl}
                      onChange={(e) => setProductForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                      placeholder="https://images.unsplash.com..."
                    />
                    
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-[11px] text-slate-500">أو قم برفع صورة من جهازك:</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[10px] font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md transition-all flex items-center gap-1"
                      >
                        <Upload size={12} />
                        اختر ملف صوره
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="flex items-center justify-center border border-dashed border-slate-200 rounded-lg p-2 bg-white h-24">
                    {productForm.imageUrl ? (
                      <div className="relative w-full h-full flex justify-center">
                        <img 
                          src={productForm.imageUrl} 
                          alt="Preview" 
                          className="h-full object-contain rounded" 
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setProductForm(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute -top-1 -left-1 p-1 bg-rose-500 text-white rounded-full text-[9px]"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">معاينة الصورة ستظهر هنا</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================== MODAL: CATEGORIES MANAGEMENT ==================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-md">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">إدارة المجموعات التصنيفية</h3>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Add New Form */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="اسم المجموعة الجديدة..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} />
                  إضافة
                </button>
              </form>

              {/* List of current */}
              <div className="border border-slate-100 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                {data.categories.map(c => (
                  <div key={c.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                    <span className="font-semibold text-slate-700">{c.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      title="حذف المجموعة"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL: UNITS MANAGEMENT ==================================== */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-md">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">إدارة وحدات القياس والموازين</h3>
              <button 
                onClick={() => setIsUnitModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Add New Form */}
              <form onSubmit={handleAddUnit} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="وحدة جديدة (قطعة، صندوق، كارتون، كيلو...)"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} />
                  إضافة
                </button>
              </form>

              {/* List of current */}
              <div className="border border-slate-100 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                {data.units.map(u => (
                  <div key={u.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                    <span className="font-semibold text-slate-700">{u.name}</span>
                    <button
                      onClick={() => handleDeleteUnit(u.id, u.name)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      title="حذف الوحدة"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL: QR LABEL PRINTING ==================================== */}
      {isLabelModalOpen && viewingLabelProduct && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-sm">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                <QrCode size={16} className="text-blue-500" />
                ملصق الباركود و QR Code المنتج
              </h3>
              <button 
                onClick={() => {
                  setViewingLabelProduct(null);
                  setIsLabelModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Premium Printable Label Template */}
              <div 
                id="printable-barcode-label" 
                className="border border-slate-300 p-4 rounded-lg bg-white shadow-xs space-y-3 text-center mx-auto max-w-xs select-text"
              >
                <div className="text-[12px] font-bold text-slate-800 truncate px-2">{viewingLabelProduct.name}</div>
                
                {/* QR Code Dynamic API Generation */}
                <div className="flex justify-center py-2">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(viewingLabelProduct.barcode)}`} 
                    alt="QR Code Label"
                    className="w-32 h-32 border border-slate-100 p-1 rounded bg-white shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="text-[10px] font-semibold text-slate-500 font-mono tracking-widest">{viewingLabelProduct.barcode}</div>
                
                <div className="border-t border-dashed border-slate-200 pt-2 flex items-center justify-between px-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[9px] block">سعر البيع:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(viewingLabelProduct.salePrice, activeCurrency, rate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block">الرف:</span>
                    <span className="font-semibold text-slate-700">{viewingLabelProduct.location || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Print Instructions Button */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setViewingLabelProduct(null);
                    setIsLabelModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs bg-slate-100 text-slate-700 rounded-lg font-semibold flex-1"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => {
                    const printContents = document.getElementById('printable-barcode-label')?.innerHTML;
                    const originalContents = document.body.innerHTML;
                    
                    if (printContents) {
                      // Custom print styles for the labels
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>طباعة ملصق - ${viewingLabelProduct.name}</title>
                              <style>
                                body { font-family: 'Cairo', sans-serif; direction: rtl; text-align: center; padding: 20px; }
                                .label { border: 1px solid #333; padding: 15px; border-radius: 8px; max-width: 250px; margin: 0 auto; }
                                .title { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
                                .qr { width: 150px; height: 150px; margin: 10px auto; }
                                .code { font-family: monospace; font-size: 11px; margin-bottom: 10px; tracking-widest: 2px; }
                                .details { display: flex; justify-content: space-between; font-size: 12px; border-top: 1px dashed #ccc; padding-top: 10px; }
                              </style>
                            </head>
                            <body onload="window.print();window.close();">
                              <div class="label">
                                <div class="title">${viewingLabelProduct.name}</div>
                                <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${viewingLabelProduct.barcode}" />
                                <div class="code">${viewingLabelProduct.barcode}</div>
                                <div class="details">
                                  <span>السعر: ${formatCurrency(viewingLabelProduct.salePrice, activeCurrency, rate)}</span>
                                  <span>الرف: ${viewingLabelProduct.location || '-'}</span>
                                </div>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      } else {
                        showToast('حدث خطأ أثناء فتح نافذة الطباعة. يرجى تفعيل النوافذ المنبثقة', 'error');
                      }
                    }
                  }}
                  className="px-4 py-2 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold flex-1 flex items-center justify-center gap-1"
                >
                  طباعة الملصق 🖨️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
