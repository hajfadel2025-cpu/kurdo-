/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppData } from './types';
import { initialData } from './initialData';

// Format currency beautifully
export function formatCurrency(amount: number, currency: 'USD' | 'IQD', exchangeRate: number): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  } else {
    return `${amount.toLocaleString('ar-IQ')} د.ع`;
  }
}

// Convert amount between currencies
export function convertCurrency(amount: number, from: 'USD' | 'IQD', to: 'USD' | 'IQD', exchangeRate: number): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'IQD') {
    return amount * exchangeRate;
  } else {
    return amount / exchangeRate;
  }
}

// Generate unique IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

// Persist data in localStorage
export function saveToStorage(data: AppData): void {
  try {
    localStorage.setItem('warehouse_erp_data', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

// Load data from localStorage or fallback to initial data
export function loadFromStorage(): AppData {
  try {
    const data = localStorage.getItem('warehouse_erp_data');
    if (data) {
      const parsed = JSON.parse(data);
      // Basic validation to ensure schema compatibility
      if (parsed.products && parsed.companyInfo && parsed.invoices) {
        return parsed as AppData;
      }
    }
  } catch (error) {
    console.error('Error loading from storage:', error);
  }
  return initialData;
}

// Export array of objects to CSV with UTF-8 BOM for proper Arabic Excel compatibility
export function exportToCSV(data: any[], fileName: string, headers: string[]): void {
  try {
    const csvRows = [];
    
    // Add UTF-8 BOM so Excel opens Arabic correctly
    csvRows.push('\uFEFF');
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = row.map((val: any) => {
        if (val === undefined || val === null) return '""';
        const stringVal = String(val).replace(/"/g, '""'); // Escape quotes
        return stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('"') 
          ? `"${stringVal}"` 
          : stringVal;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting CSV:', error);
  }
}
