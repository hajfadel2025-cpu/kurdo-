/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AppData, 
  Product, 
  Customer, 
  Delegate, 
  Invoice, 
  PurchaseInvoice, 
  StockMovement, 
  CustomerTransaction, 
  DelegateTransaction, 
  CompanyInfo,
  User
} from './types';
import { loadFromStorage, saveToStorage, formatCurrency } from './utils';

// Import sub-components
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Purchases from './components/Purchases';
import Customers from './components/Customers';
import Delegates from './components/Delegates';
import Reports from './components/Reports';
import Settings from './components/Settings';

// Lucide icons
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Layers, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Briefcase, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X,
  Lock,
  User as UserIcon,
  Globe,
  Coins
} from 'lucide-react';

export default function App() {
  // ---------------- Core App State ----------------
  const [data, setData] = useState<AppData>(() => loadFromStorage());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'IQD'>('IQD');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('warehouse_active_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Login form state
  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('admin');
  const [loginError, setLoginError] = useState('');

  // Mobile navigation state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto persist data to localStorage whenever data changes
  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  // ---------------- Authentication Actions ----------------
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const matchedUser = data.users.find(
      u => u.username.toLowerCase() === usernameInput.toLowerCase() && u.passwordHash === passwordInput
    );

    if (matchedUser) {
      setCurrentUser(matchedUser);
      localStorage.setItem('warehouse_active_user', JSON.stringify(matchedUser));
      // Reset input fields
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة! يرجى التحقق وإعادة المحاولة.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('warehouse_active_user');
    setActiveTab('dashboard');
  };

  // ---------------- State Updaters ----------------
  const handleUpdateProducts = (products: Product[]) => {
    setData(prev => ({ ...prev, products }));
  };

  const handleUpdateCustomers = (customers: Customer[]) => {
    setData(prev => ({ ...prev, customers }));
  };

  const handleUpdateDelegates = (delegates: Delegate[]) => {
    setData(prev => ({ ...prev, delegates }));
  };

  const handleUpdateInvoices = (invoices: Invoice[]) => {
    setData(prev => ({ ...prev, invoices }));
  };

  const handleUpdatePurchaseInvoices = (purchaseInvoices: PurchaseInvoice[]) => {
    setData(prev => ({ ...prev, purchaseInvoices }));
  };

  const handleUpdateCategories = (categories: any[]) => {
    setData(prev => ({ ...prev, categories }));
  };

  const handleUpdateUnits = (units: any[]) => {
    setData(prev => ({ ...prev, units }));
  };

  const handleAddStockMovement = (movement: StockMovement) => {
    setData(prev => ({
      ...prev,
      stockMovements: [movement, ...prev.stockMovements]
    }));
  };

  const handleAddCustomerTransaction = (tx: CustomerTransaction) => {
    setData(prev => ({
      ...prev,
      customerTransactions: [tx, ...prev.customerTransactions]
    }));
  };

  const handleAddDelegateTransaction = (tx: DelegateTransaction) => {
    setData(prev => ({
      ...prev,
      delegateTransactions: [tx, ...prev.delegateTransactions]
    }));
  };

  const handleUpdateCompanyInfo = (companyInfo: CompanyInfo) => {
    setData(prev => ({ ...prev, companyInfo }));
  };

  const handleRestoreData = (restoredData: AppData) => {
    setData(restoredData);
  };

  // ---------------- Navigation list with role constraints ----------------
  const navigationItems = [
    { id: 'dashboard', label: 'لوحة القيادة والمؤشرات', icon: LayoutDashboard, roles: ['admin', 'delegate'] },
    { id: 'products', label: 'دليل المنتجات والأصناف', icon: ShoppingBag, roles: ['admin', 'delegate'] },
    { id: 'inventory', label: 'مراقبة المخزون والجرد', icon: Layers, roles: ['admin', 'delegate'] },
    { id: 'sales', label: 'نقطة مبيعات وفواتير جديدة', icon: ShoppingCart, roles: ['admin', 'delegate'] },
    { id: 'purchases', label: 'المشتريات والتوريد', icon: TrendingUp, roles: ['admin'] },
    { id: 'customers', label: 'حسابات العملاء والديون', icon: Users, roles: ['admin', 'delegate'] },
    { id: 'delegates', label: 'المندوبين والعمولات', icon: Briefcase, roles: ['admin'] },
    { id: 'reports', label: 'التقارير المالية والتحليلات', icon: FileText, roles: ['admin'] },
    { id: 'settings', label: 'إعدادات الشركة والنظام', icon: SettingsIcon, roles: ['admin', 'delegate'] },
  ];

  const visibleNavigationItems = navigationItems.filter(
    item => currentUser && item.roles.includes(currentUser.role)
  );

  // If not logged in, render a gorgeous RTL Login screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          
          {/* Header Branding */}
          <div className="bg-slate-900 text-white text-center py-8 px-6 space-y-2 relative">
            <div className="absolute top-4 right-4 text-slate-500 font-mono text-[9px]">ERP V1.0</div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-xl font-bold">
              📦
            </div>
            <h1 className="text-base font-bold">مستودع الرافدين للتجارة والتوزيع</h1>
            <p className="text-xs text-slate-400">نظام إدارة المخازن، الفواتير، الديون وعمولات المندوبين</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            
            {loginError && (
              <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-bold leading-normal">
                {loginError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">اسم المستخدم المعتمد</label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-hidden"
                  placeholder="مثال: admin"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">كلمة مرور الحساب</label>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-hidden"
                  placeholder="••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1"
            >
              دخول آمن للنظام ←
            </button>

            {/* Quick selectors for testing ease */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[10px] text-slate-400 block text-center font-bold">بوابات الدخول السريع للاختبار والمراجعة:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput('admin');
                    setPasswordInput('admin');
                  }}
                  className="py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-md"
                >
                  حساب المدير (أدمن)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput('delegate');
                    setPasswordInput('123456');
                  }}
                  className="py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-md"
                >
                  حساب المندوب
                </button>
              </div>
            </div>

          </form>

        </div>
      </div>
    );
  }

  // ---------------- Main Application Shell (RTL Layout) ----------------
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" dir="rtl">
      
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-100 h-16 sticky top-0 z-40 px-4 flex items-center justify-between shadow-xs">
        
        {/* Left header: Title & Burger Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 lg:hidden"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center text-sm">
              📦
            </span>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-800">{data.companyInfo.name}</h1>
              <p className="text-[10px] text-slate-400">سعر الصرف المعتمد: 1$ = {data.companyInfo.exchangeRate} د.ع</p>
            </div>
          </div>
        </div>

        {/* Right header: Exchange rate switcher & user profile logout */}
        <div className="flex items-center gap-3">
          
          {/* Active currency toggle */}
          <div className="border border-slate-200 bg-slate-50 p-1 rounded-lg flex gap-1 text-[11px] font-bold">
            <button
              onClick={() => setActiveCurrency('IQD')}
              className={`px-2.5 py-1 rounded transition-all ${
                activeCurrency === 'IQD' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              العراقية (د.ع)
            </button>
            <button
              onClick={() => setActiveCurrency('USD')}
              className={`px-2.5 py-1 rounded transition-all ${
                activeCurrency === 'USD' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              الأجنبية ($)
            </button>
          </div>

          {/* User badge & logout */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-100 text-xs">
            <div className="text-left hidden md:block">
              <span className="font-bold text-slate-800 block text-right">{currentUser.name}</span>
              <span className="text-[10px] text-slate-400 font-bold block text-right">
                {currentUser.role === 'admin' ? 'مدير عام' : 'مندوب مبيعات'}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>

      </header>

      {/* Main Body (Sidebar + View Panel) */}
      <div className="flex-1 flex relative">
        
        {/* 1. Sidebar Navigation (RTL positioned on the right) */}
        <aside className={`bg-slate-900 text-slate-300 w-64 flex flex-col shrink-0 border-l border-slate-800 z-40 h-[calc(100vh-64px)] sticky top-16 transition-all duration-300 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } fixed lg:static right-0`}>
          
          {/* Mobile close button inside sidebar */}
          <div className="flex justify-end p-3 lg:hidden">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links list */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {visibleNavigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false); // Auto close mobile menu
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-right transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer branding details */}
          <div className="p-4 border-t border-slate-800/80 text-[10px] text-slate-500 text-center font-bold">
            <div>نظام مستودع الرافدين v1.0</div>
            <div className="text-[9px] text-slate-600 mt-0.5">صنع بواسطة الذكاء الاصطناعي 🚀</div>
          </div>

        </aside>

        {/* Mobile menu backdrop click listener */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          />
        )}

        {/* 2. Primary Views panel workspace */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden max-w-full">
          
          {/* Views render */}
          {activeTab === 'dashboard' && (
            <Dashboard 
              data={data} 
              activeCurrency={activeCurrency} 
              onNavigate={(tab) => setActiveTab(tab)} 
            />
          )}

          {activeTab === 'products' && (
            <Products 
              data={data} 
              activeCurrency={activeCurrency} 
              currentUserRole={currentUser.role}
              onUpdateProducts={handleUpdateProducts} 
              onUpdateCategories={handleUpdateCategories}
              onUpdateUnits={handleUpdateUnits}
            />
          )}

          {activeTab === 'inventory' && (
            <Inventory 
              data={data} 
              activeCurrency={activeCurrency} 
              currentUserRole={currentUser.role}
              currentUsername={currentUser.name}
              onUpdateProducts={handleUpdateProducts}
              onAddStockMovement={handleAddStockMovement}
            />
          )}

          {activeTab === 'sales' && (
            <Sales 
              data={data} 
              activeCurrency={activeCurrency} 
              currentUserRole={currentUser.role}
              currentUsername={currentUser.name}
              onUpdateProducts={handleUpdateProducts}
              onUpdateCustomers={handleUpdateCustomers}
              onUpdateDelegates={handleUpdateDelegates}
              onUpdateInvoices={handleUpdateInvoices}
              onAddStockMovement={handleAddStockMovement}
              onAddCustomerTransaction={handleAddCustomerTransaction}
              onAddDelegateTransaction={handleAddDelegateTransaction}
            />
          )}

          {activeTab === 'purchases' && (
            <Purchases 
              data={data} 
              activeCurrency={activeCurrency} 
              currentUserRole={currentUser.role}
              currentUsername={currentUser.name}
              onUpdateProducts={handleUpdateProducts}
              onUpdatePurchaseInvoices={handleUpdatePurchaseInvoices}
              onAddStockMovement={handleAddStockMovement}
            />
          )}

          {activeTab === 'customers' && (
            <Customers 
              data={data} 
              activeCurrency={activeCurrency} 
              currentUserRole={currentUser.role}
              currentUsername={currentUser.name}
              onUpdateCustomers={handleUpdateCustomers}
              onAddCustomerTransaction={handleAddCustomerTransaction}
            />
          )}

          {activeTab === 'delegates' && (
            <Delegates 
              data={data} 
              activeCurrency={activeCurrency} 
              currentUserRole={currentUser.role}
              currentUsername={currentUser.name}
              onUpdateDelegates={handleUpdateDelegates}
              onAddDelegateTransaction={handleAddDelegateTransaction}
            />
          )}

          {activeTab === 'reports' && (
            <Reports 
              data={data} 
              activeCurrency={activeCurrency} 
            />
          )}

          {activeTab === 'settings' && (
            <Settings 
              data={data} 
              currentUserRole={currentUser.role}
              currentUsername={currentUser.name}
              onUpdateCompanyInfo={handleUpdateCompanyInfo}
              onRestoreData={handleRestoreData}
            />
          )}

        </main>

      </div>

    </div>
  );
}
