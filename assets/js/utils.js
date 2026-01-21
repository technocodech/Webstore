/**
 * UTILITY FUNCTIONS FOR POS RETAIL PRO
 * Functions untuk operasi umum, format, dll.
 */

// Konfigurasi API Backend (NGROK URL)
const API_BASE_URL = 'https://211c9c517b36.ngrok-free.app'; // GANTI DENGAN URL NGROK ANDA
const STORAGE_KEYS = {
    CART: 'pos_retail_cart',
    DRAFT_TRANSACTION: 'pos_draft_transaction',
    THEME: 'pos_theme',
    RECEIPT_SETTINGS: 'pos_receipt_settings'
};

/**
 * Format currency Indonesia (Rp)
 */
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return 'Rp 0';
    return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
}

/**
 * Format angka dengan pemisah ribuan
 */
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return parseInt(num).toLocaleString('id-ID');
}

/**
 * Format tanggal Indonesia
 */
function formatDate(date, includeTime = false) {
    if (!date) return '-';
    
    const d = new Date(date);
    const options = { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.second = '2-digit';
    }
    
    return d.toLocaleDateString('id-ID', options);
}

/**
 * Generate ID unik
 */
function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}${random}`.toUpperCase();
}

/**
 * Generate kode transaksi
 */
function generateTransactionCode() {
    const date = new Date();
    const year = date.getFullYear().toString().substr(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TRX${year}${month}${day}${random}`;
}

/**
 * Generate kode produk
 */
function generateProductCode() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PRD${timestamp}${random}`;
}

/**
 * Simpan data ke localStorage
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

/**
 * Ambil data dari localStorage
 */
function getFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Hapus data dari localStorage
 */
function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

/**
 * Kirim request ke API Backend
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        showNotification('error', `Gagal terhubung ke server: ${error.message}`);
        throw error;
    }
}

/**
 * Tampilkan notifikasi
 */
function showNotification(type, message, duration = 5000) {
    // Hapus notifikasi sebelumnya
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Buat notifikasi baru
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Tambahkan ke body
    document.body.appendChild(notification);
    
    // Tampilkan dengan animasi
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Tambahkan event listener untuk tombol close
    notification.querySelector('.notification-close').addEventListener('click', () => {
        hideNotification(notification);
    });
    
    // Auto hide setelah duration
    if (duration > 0) {
        setTimeout(() => {
            hideNotification(notification);
        }, duration);
    }
    
    function hideNotification(notif) {
        notif.classList.remove('show');
        setTimeout(() => {
            if (notif.parentNode) {
                notif.parentNode.removeChild(notif);
            }
        }, 300);
    }
}

/**
 * Validasi input number positif
 */
function validatePositiveNumber(value, fieldName = 'Nilai') {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
        showNotification('error', `${fieldName} harus angka positif`);
        return false;
    }
    return true;
}

/**
 * Validasi input required
 */
function validateRequired(value, fieldName = 'Field') {
    if (!value || value.toString().trim() === '') {
        showNotification('error', `${fieldName} harus diisi`);
        return false;
    }
    return true;
}

/**
 * Format waktu untuk logging
 */
function getCurrentTimestamp() {
    const now = new Date();
    return now.toISOString();
}

/**
 * Hitung umur dalam hari
 */
function getDaysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Debounce function untuk optimasi performa
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Download file dari Blob
 */
function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/**
 * Copy text ke clipboard
 */
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => {
        showNotification('success', 'Berhasil disalin ke clipboard');
        return true;
    }).catch(err => {
        console.error('Copy failed:', err);
        showNotification('error', 'Gagal menyalin ke clipboard');
        return false;
    });
}

/**
 * Format kategori untuk display
 */
function formatCategory(category) {
    const categoryMap = {
        'makanan': 'Makanan',
        'minuman': 'Minuman',
        'sembako': 'Sembako',
        'jajan': 'Jajan'
    };
    return categoryMap[category] || category;
}

/**
 * Cek apakah hari ini
 */
function isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
}

/**
 * Cek apakah minggu ini
 */
function isThisWeek(date) {
    const today = new Date();
    const checkDate = new Date(date);
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return checkDate >= weekStart && checkDate <= weekEnd;
}

/**
 * Cek apakah bulan ini
 */
function isThisMonth(date) {
    const today = new Date();
    const checkDate = new Date(date);
    return today.getFullYear() === checkDate.getFullYear() && 
           today.getMonth() === checkDate.getMonth();
}

/**
 * Hitung total dari array objek dengan property tertentu
 */
function calculateTotal(items, property) {
    return items.reduce((sum, item) => sum + (parseFloat(item[property]) || 0), 0);
}

/**
 * Group array by property
 */
function groupBy(array, property) {
    return array.reduce((groups, item) => {
        const key = item[property];
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
}

/**
 * Filter array by date range
 */
function filterByDateRange(items, startDate, endDate, dateField = 'created_at') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Sampai akhir hari
    
    return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= start && itemDate <= end;
    });
}

// Tambahkan style untuk notifikasi
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(120%);
        transition: transform 0.3s ease;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-success {
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        border-left: 4px solid #2E7D32;
    }
    
    .notification-error {
        background: linear-gradient(135deg, #F44336, #D32F2F);
        color: white;
        border-left: 4px solid #C62828;
    }
    
    .notification-warning {
        background: linear-gradient(135deg, #FF9800, #F57C00);
        color: white;
        border-left: 4px solid #EF6C00;
    }
    
    .notification-info {
        background: linear-gradient(135deg, #2196F3, #1976D2);
        color: white;
        border-left: 4px solid #1565C0;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
    }
    
    .notification-content i {
        font-size: 1.2rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
        margin-left: 10px;
        opacity: 0.8;
        transition: opacity 0.2s;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
`;
document.head.appendChild(notificationStyle);