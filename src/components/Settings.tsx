/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppData, CompanyInfo } from '../types';
import { 
  Settings as SettingsIcon, 
  Building, 
  Phone, 
  MapPin, 
  DollarSign, 
  Save, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SettingsProps {
  data: AppData;
  onUpdateCompanyInfo: (info: CompanyInfo) => void;
  onRestoreData: (restoredData: AppData) => void;
  currentUserRole: 'admin' | 'delegate';
  currentUsername: string;
}

export default function Settings({
  data,
  onUpdateCompanyInfo,
  onRestoreData,
  currentUserRole,
  currentUsername
}: SettingsProps) {
  // ---------------- State ----------------
  const [name, setName] = useState(data.companyInfo.name);
  const [phone, setPhone] = useState(data.companyInfo.phone);
  const [address, setAddress] = useState(data.companyInfo.address);
  const [exchangeRate, setExchangeRate] = useState(data.companyInfo.exchangeRate);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ---------------- Save Company Info ----------------
  const handleSaveCompanyInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== 'admin') {
      showToast('عذراً، تعديل إعدادات الشركة متاح للمسؤولين فقط!', 'error');
      return;
    }

    if (exchangeRate <= 0) {
      showToast('سعر الصرف يجب أن يكون رقماً صحيحاً إيجابياً', 'error');
      return;
    }

    onUpdateCompanyInfo({
      name,
      phone,
      address,
      exchangeRate
    });
    showToast('تم حفظ وتعديل إعدادات الشركة وسعر الصرف بنجاح');
  };

  // ---------------- Back Up Data (تصدير نسخة احتياطية) ----------------
  const handleBackup = () => {
    try {
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `مستودع_نسخة_احتياطية_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showToast('تم توليد وتنزيل ملف النسخة الاحتياطية بنجاح!');
    } catch (err) {
      showToast('عذراً، فشل تصدير النسخة الاحتياطية', 'error');
    }
  };

  // ---------------- Restore Data (استيراد نسخة احتياطية) ----------------
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUserRole !== 'admin') {
      showToast('عذراً، استيراد النسخة الاحتياطية متاح للمسؤولين فقط!', 'error');
      return;
    }

    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('تحذير: سيتم استبدال كامل بيانات المخازن الحالية بالبيانات الموجودة في ملف النسخة الاحتياطية. هل تود الاستمرار؟')) {
      return;
    }

    fileReader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string);
        
        // Validate keys in backup to prevent crashing
        if (parsedData.products && parsedData.customers && parsedData.delegates && parsedData.invoices && parsedData.companyInfo) {
          onRestoreData(parsedData);
          showToast('تم استعادة البيانات والملفات بنجاح وتحديث النظام بالكامل!');
          
          // Sync company info fields on page
          setName(parsedData.companyInfo.name);
          setPhone(parsedData.companyInfo.phone);
          setAddress(parsedData.companyInfo.address);
          setExchangeRate(parsedData.companyInfo.exchangeRate);
        } else {
          showToast('فشل استيراد الملف! بنية ملف النسخة الاحتياطية غير صالحة.', 'error');
        }
      } catch (err) {
        showToast('ملف خاطئ أو تالف! يرجى اختيار ملف نسخة احتياطية صحيح.', 'error');
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <div className="space-y-6" id="settings_panel">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 text-white animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
          <SettingsIcon size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">إعدادات المنظومة والنسخ الاحتياطي</h2>
          <p className="text-slate-500 text-xs mt-1">تعديل بيانات الشركة والمستودع، تحديث سعر الصرف اليومي، وإدارة الصلاحيات وحفظ الأرصدة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side (Col span 7): Company Config Form */}
        <form onSubmit={handleSaveCompanyInfo} className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-slate-800 font-bold text-xs flex items-center gap-1.5 pb-2 border-b border-slate-50">
            <Building size={16} className="text-blue-500" />
            بيانات الشركة ومستندات الفوترة والطباعة
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">اسم الشركة / المعرض / المستودع <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700"
                placeholder="مثال: شركة النخبة للتجهيزات الغذائية"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">رقم الهاتف الرسمي للشركة <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                placeholder="مثال: 07712345678"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">العنوان الجغرافي للمقر <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700"
              placeholder="مثال: العراق، بغداد، شارع الكرادة، قرب ساحة التحريات"
            />
          </div>

          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-3">
            <h4 className="text-slate-800 font-bold text-[11px] flex items-center gap-1">
              <DollarSign size={14} className="text-emerald-600" />
              سعر صرف الدولار المعتمد بالمنظومة (1 دولار = كم دينار)
            </h4>
            
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                required
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseInt(e.target.value) || 0)}
                className="w-36 px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-mono"
                placeholder="سعر الصرف المالي..."
              />
              <span className="text-xs text-slate-500 font-bold">دينار عراقي (IQD)</span>
            </div>
            <p className="text-[10px] text-slate-400">تنبيه: تحديث هذا السعر يعيد توجيه عمليات التحويل الحسابية للفواتير بالدينار والرواتب فوراً.</p>
          </div>

          {currentUserRole === 'admin' ? (
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-1"
            >
              <Save size={15} />
              حفظ وتأكيد إعدادات الشركة
            </button>
          ) : (
            <div className="p-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>لا تمتلك صلاحية تعديل إعدادات مستودع الشركة. يرجى مراجعة المسؤول.</span>
            </div>
          )}
        </form>

        {/* Right Side (Col span 5): Backups and privilege check */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Back up & Restore box */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-slate-800 font-bold text-xs flex items-center gap-1.5 pb-2 border-b border-slate-50">
              أدوات حفظ ونسخ قواعد البيانات والأرصدة
            </h3>

            <p className="text-slate-500 text-xs leading-relaxed">
              تضمن هذه الأدوات أمان بضائعك وعملياتك، يمكنك الاحتفاظ بنسخة كاملة على جهازك لاستعادتها في أي وقت عند حدوث خلل.
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleBackup}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Download size={15} />
                توليد نسخة احتياطية كاملة (.json)
              </button>

              {currentUserRole === 'admin' ? (
                <div className="relative">
                  <input
                    type="file"
                    id="restore-file-input"
                    accept=".json"
                    onChange={handleRestore}
                    className="hidden"
                  />
                  <label
                    htmlFor="restore-file-input"
                    className="w-full py-3 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Upload size={15} />
                    استيراد واسترجاع نسخة احتياطية
                  </label>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg text-center text-xs">
                  🔒 ميزة الاستيراد معطلة للمناديب
                </div>
              )}
            </div>
          </div>

          {/* Privilege Audit Card */}
          <div className="bg-slate-900 text-slate-300 p-5 rounded-xl space-y-3 shadow-xs">
            <h3 className="text-white font-bold text-xs">كشف حساب المستخدم الحالي والصلاحيات</h3>
            <div className="text-[11px] space-y-2">
              <div className="flex justify-between">
                <span>اسم المستخدم النشط:</span>
                <span className="font-bold text-white font-mono">{currentUsername}</span>
              </div>
              <div className="flex justify-between">
                <span>الصلاحية الممنوحة:</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  currentUserRole === 'admin' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {currentUserRole === 'admin' ? 'مدير عام المنظومة (كامل الصلاحيات)' : 'مندوب مبيعات (محدود الصلاحية)'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-800 leading-normal">
              صلاحية المندوب تسمح له برؤية الأصناف وتوليد فواتير مبيعات جديدة فقط، بينما صلاحية المسؤول تتيح حذف الفواتير، المرتجعات، صرف السلف للعملاء وتعديل المخزون.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
