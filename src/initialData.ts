/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppData } from './types';

export const initialData: AppData = {
  users: [
    {
      username: 'admin',
      name: 'أبو أحمد المدير',
      role: 'admin',
      passwordHash: 'admin'
    },
    {
      username: 'delegate',
      name: 'محمد المندوب',
      role: 'delegate',
      passwordHash: '123456'
    }
  ],
  companyInfo: {
    name: 'مستودع الرافدين للتجارة العامة والتوزيع',
    address: 'العراق، بغداد، الكرادة، قرب ساحة الفردوس',
    phone: '07701234567',
    logoUrl: '',
    exchangeRate: 1500
  },
  categories: [
    { id: 'cat_1', name: 'الأجهزة الكهربائية' },
    { id: 'cat_2', name: 'الإلكترونيات والموبايل' },
    { id: 'cat_3', name: 'المواد الغذائية' },
    { id: 'cat_4', name: 'أدوات منزلية ومطبخ' }
  ],
  units: [
    { id: 'unit_1', name: 'قطعة' },
    { id: 'unit_2', name: 'كارتون' },
    { id: 'unit_3', name: 'صندوق' },
    { id: 'unit_4', name: 'كيلوغرام' },
    { id: 'unit_5', name: 'كيس' }
  ],
  suppliers: [
    { id: 'sup_1', name: 'شركة النور للأجهزة الكهربائية', phone: '07801112223', companyName: 'النور المحدودة' },
    { id: 'sup_2', name: 'مجموعة دجلة للمواد الغذائية والاستيراد', phone: '07904445556', companyName: 'دجلة ش.م' },
    { id: 'sup_3', name: 'الشركة الوطنية للإلكترونيات', phone: '07502223334', companyName: 'الوطنية للتقنية' }
  ],
  customers: [
    { id: 'cust_1', name: 'أسواق الأمل المركزية', phone: '07712345678', balance: 350000 },
    { id: 'cust_2', name: 'مكتب البصرة للتجهيزات', phone: '07823456789', balance: 1200000 },
    { id: 'cust_3', name: 'معرض بغداد للإلكترونيات', phone: '07934567890', balance: 0 },
    { id: 'cust_4', name: 'سوبرماركت الهدى', phone: '07512345678', balance: -50000 }
  ],
  delegates: [
    {
      id: 'del_1',
      name: 'أحمد علي العبيدي',
      phone: '07705556667',
      commissionRate: 5,
      balance: 145000,
      totalSales: 3900000,
      totalCommission: 195000,
      totalAdvances: 50000
    },
    {
      id: 'del_2',
      name: 'سعد عمر الجبوري',
      phone: '07804448889',
      commissionRate: 3,
      balance: 30000,
      totalSales: 2000000,
      totalCommission: 60000,
      totalAdvances: 30000
    }
  ],
  products: [
    {
      id: 'prod_1',
      barcode: '8806087111222',
      name: 'شاشة ال جي 55 بوصة ذكية 4K',
      category: 'الإلكترونيات والموبايل',
      unit: 'قطعة',
      costPrice: 320,
      salePrice: 380,
      quantity: 15,
      minStock: 5,
      location: 'الرف A-12',
      supplierId: 'sup_3',
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=150&q=80',
      qrCode: '8806087111222'
    },
    {
      id: 'prod_2',
      barcode: '6901234567890',
      name: 'غسالة ملابس هومر 8 كغم فول اوتوماتيك',
      category: 'الأجهزة الكهربائية',
      unit: 'قطعة',
      costPrice: 210,
      salePrice: 250,
      quantity: 8,
      minStock: 3,
      location: 'المنطقة ب - رف 2',
      supplierId: 'sup_1',
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1582730147234-fd815c78fc40?w=150&q=80',
      qrCode: '6901234567890'
    },
    {
      id: 'prod_3',
      barcode: '6281007001122',
      name: 'حليب المراعي كرتون (12 لتر)',
      category: 'المواد الغذائية',
      unit: 'كارتون',
      costPrice: 12500,
      salePrice: 15000,
      quantity: 45,
      minStock: 10,
      location: 'مخزن الأغذية رف 3',
      supplierId: 'sup_2',
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&q=80',
      qrCode: '6281007001122'
    },
    {
      id: 'prod_4',
      barcode: '6221008003344',
      name: 'مياه معدنية الواحة (كارتون 24 بطول)',
      category: 'المواد الغذائية',
      unit: 'كارتون',
      costPrice: 2200,
      salePrice: 3000,
      quantity: 4,
      minStock: 15,
      location: 'مخزن الأغذية رف 1',
      supplierId: 'sup_2',
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1608885898957-a599fb15ec36?w=150&q=80',
      qrCode: '6221008003344'
    },
    {
      id: 'prod_5',
      barcode: '745123698520',
      name: 'خلاط فواكه كينوود بقوة 800 واط',
      category: 'أدوات منزلية ومطبخ',
      unit: 'قطعة',
      costPrice: 45,
      salePrice: 55,
      quantity: 0,
      minStock: 5,
      location: 'الرف C-4',
      supplierId: 'sup_1',
      status: 'inactive',
      imageUrl: 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=150&q=80',
      qrCode: '745123698520'
    }
  ],
  invoices: [
    {
      id: 'inv_1',
      invoiceNumber: 'INV-2026-0001',
      customerId: 'cust_1',
      customerName: 'أسواق الأمل المركزية',
      delegateId: 'del_1',
      delegateName: 'أحمد علي العبيدي',
      date: '2026-06-20T10:30:00.000Z',
      items: [
        {
          productId: 'prod_1',
          productName: 'شاشة ال جي 55 بوصة ذكية 4K',
          quantity: 2,
          salePrice: 380,
          costPrice: 320
        },
        {
          productId: 'prod_3',
          productName: 'حليب المراعي كرتون (12 لتر)',
          quantity: 10,
          salePrice: 15000,
          costPrice: 12500
        }
      ],
      discountValue: 10,
      discountType: 'percentage',
      paymentMethod: 'credit',
      currency: 'IQD',
      total: 1290000,
      netTotal: 1161000,
      isReturned: false,
      createdBy: 'admin'
    },
    {
      id: 'inv_2',
      invoiceNumber: 'INV-2026-0002',
      customerId: 'cust_3',
      customerName: 'معرض بغداد للإلكترونيات',
      delegateId: 'del_2',
      delegateName: 'سعد عمر الجبوري',
      date: '2026-06-22T14:15:00.000Z',
      items: [
        {
          productId: 'prod_2',
          productName: 'غسالة ملابس هومر 8 كغم فول اوتوماتيك',
          quantity: 4,
          salePrice: 250,
          costPrice: 210
        }
      ],
      discountValue: 0,
      discountType: 'value',
      paymentMethod: 'cash',
      currency: 'USD',
      total: 1000,
      netTotal: 1000,
      isReturned: false,
      createdBy: 'admin'
    }
  ],
  purchaseInvoices: [
    {
      id: 'pur_1',
      invoiceNumber: 'PUR-2026-0001',
      supplierId: 'sup_1',
      supplierName: 'شركة النور للأجهزة الكهربائية',
      date: '2026-06-15T09:00:00.000Z',
      items: [
        {
          productId: 'prod_2',
          productName: 'غسالة ملابس هومر 8 كغم فول اوتوماتيك',
          quantity: 10,
          costPrice: 210
        }
      ],
      paymentMethod: 'cash',
      currency: 'USD',
      total: 2100,
      netTotal: 2100,
      createdBy: 'admin'
    },
    {
      id: 'pur_2',
      invoiceNumber: 'PUR-2026-0002',
      supplierId: 'sup_2',
      supplierName: 'مجموعة دجلة للمواد الغذائية والاستيراد',
      date: '2026-06-18T11:00:00.000Z',
      items: [
        {
          productId: 'prod_3',
          productName: 'حليب المراعي كرتون (12 لتر)',
          quantity: 50,
          costPrice: 12500
        }
      ],
      paymentMethod: 'credit',
      currency: 'IQD',
      total: 625000,
      netTotal: 625000,
      createdBy: 'admin'
    }
  ],
  stockMovements: [
    {
      id: 'mov_1',
      productId: 'prod_2',
      productName: 'غسالة ملابس هومر 8 كغم فول اوتوماتيك',
      type: 'in_purchase',
      quantity: 10,
      date: '2026-06-15T09:00:00.000Z',
      previousQty: 2,
      currentQty: 12,
      notes: 'شراء بموجب فاتورة شراء رقم PUR-2026-0001',
      createdBy: 'admin'
    },
    {
      id: 'mov_2',
      productId: 'prod_3',
      productName: 'حليب المراعي كرتون (12 لتر)',
      type: 'in_purchase',
      quantity: 50,
      date: '2026-06-18T11:00:00.000Z',
      previousQty: 5,
      currentQty: 55,
      notes: 'شراء بموجب فاتورة شراء رقم PUR-2026-0002',
      createdBy: 'admin'
    },
    {
      id: 'mov_3',
      productId: 'prod_1',
      productName: 'شاشة ال جي 55 بوصة ذكية 4K',
      type: 'out_sale',
      quantity: 2,
      date: '2026-06-20T10:30:00.000Z',
      previousQty: 17,
      currentQty: 15,
      notes: 'مبيعات بموجب فاتورة رقم INV-2026-0001',
      createdBy: 'admin'
    },
    {
      id: 'mov_4',
      productId: 'prod_3',
      productName: 'حليب المراعي كرتون (12 لتر)',
      type: 'out_sale',
      quantity: 10,
      date: '2026-06-20T10:30:00.000Z',
      previousQty: 55,
      currentQty: 45,
      notes: 'مبيعات بموجب فاتورة رقم INV-2026-0001',
      createdBy: 'admin'
    },
    {
      id: 'mov_5',
      productId: 'prod_2',
      productName: 'غسالة ملابس هومر 8 كغم فول اوتوماتيك',
      type: 'out_sale',
      quantity: 4,
      date: '2026-06-22T14:15:00.000Z',
      previousQty: 12,
      currentQty: 8,
      notes: 'مبيعات بموجب فاتورة رقم INV-2026-0002',
      createdBy: 'admin'
    }
  ],
  customerTransactions: [
    {
      id: 'ct_1',
      customerId: 'cust_1',
      type: 'sale_invoice',
      amount: 1161000,
      balanceAfter: 1161000,
      date: '2026-06-20T10:30:00.000Z',
      invoiceId: 'inv_1',
      notes: 'شراء بضاعة بالآجل بموجب فاتورة رقم INV-2026-0001'
    },
    {
      id: 'ct_2',
      customerId: 'cust_1',
      type: 'payment',
      amount: -811000,
      balanceAfter: 350000,
      date: '2026-06-21T12:00:00.000Z',
      notes: 'تسديد نقدي جزء من الديون المترتبة'
    }
  ],
  delegateTransactions: [
    {
      id: 'dt_1',
      delegateId: 'del_1',
      type: 'commission',
      amount: 58050,
      balanceAfter: 58050,
      date: '2026-06-20T10:30:00.000Z',
      invoiceId: 'inv_1',
      notes: 'عمولة مبيعات فاتورة رقم INV-2026-0001'
    },
    {
      id: 'dt_2',
      delegateId: 'del_1',
      type: 'advance',
      amount: -50000,
      balanceAfter: 8050,
      date: '2026-06-21T09:00:00.000Z',
      notes: 'سلفة مالية مستلمة نقداً'
    },
    {
      id: 'dt_3',
      delegateId: 'del_1',
      type: 'commission',
      amount: 136950,
      balanceAfter: 145000,
      date: '2026-06-19T10:00:00.000Z',
      notes: 'تسوية عمولات عن مبيعات سابقة غير مسجلة بالتفصيل'
    },
    {
      id: 'dt_4',
      delegateId: 'del_2',
      type: 'commission',
      amount: 45000,
      balanceAfter: 45000,
      date: '2026-06-22T14:15:00.000Z',
      invoiceId: 'inv_2',
      notes: 'عمولة مبيعات فاتورة رقم INV-2026-0002'
    },
    {
      id: 'dt_5',
      delegateId: 'del_2',
      type: 'advance',
      amount: -30000,
      balanceAfter: 15000,
      date: '2026-06-23T10:00:00.000Z',
      notes: 'سلفة مستلمة نقداً'
    },
    {
      id: 'dt_6',
      delegateId: 'del_2',
      type: 'commission',
      amount: 15000,
      balanceAfter: 30000,
      date: '2026-06-24T08:00:00.000Z',
      notes: 'تسوية عمولات مبيعات سابقة'
    }
  ]
};
