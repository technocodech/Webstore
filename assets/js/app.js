/**
 * POS RETAIL PRO - MAIN APPLICATION LOGIC
 * Logika utama aplikasi POS Retail
 */

// Global state
let cart = [];
let products = [];
let transactions = [];
let stockLogs = [];
let currentTransaction = null;
let selectedProduct = null;

/**
 * Initialize aplikasi
 */
async function initApp() {
    try {
        // Load data dari localStorage
        cart = getFromLocalStorage(STORAGE_KEYS.CART, []);
        currentTransaction = getFromLocalStorage(STORAGE_KEYS.DRAFT_TRANSACTION, null);
        
        // Update cart count jika di halaman kasir
        updateCartCount();
        
        // Load data dari backend
        await loadProducts();
        await loadTransactions();
        await loadStockLogs();
        
        showNotification('success', 'Sistem POS siap digunakan');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showNotification('error', 'Gagal memuat data awal');
    }
}

/**
 * Load produk dari backend
 */
async function loadProducts() {
    try {
        const data = await apiRequest('/api/products');
        products = data.products || [];
        return products;
    } catch (error) {
        console.error('Failed to load products:', error);
        return [];
    }
}

/**
 * Load transaksi dari backend
 */
async function loadTransactions() {
    try {
        const data = await apiRequest('/api/transactions');
        transactions = data.transactions || [];
        return transactions;
    } catch (error) {
        console.error('Failed to load transactions:', error);
        return [];
    }
}

/**
 * Load stock logs dari backend
 */
async function loadStockLogs() {
    try {
        const data = await apiRequest('/api/stock-logs');
        stockLogs = data.stock_logs || [];
        return stockLogs;
    } catch (error) {
        console.error('Failed to load stock logs:', error);
        return [];
    }
}

/**
 * KASIR PAGE FUNCTIONS
 */

/**
 * Load produk untuk kasir
 */
async function loadProductsForKasir() {
    try {
        await loadProducts();
        displayProductsForKasir();
        setupSearch();
    } catch (error) {
        console.error('Failed to load products for kasir:', error);
    }
}

/**
 * Display produk di halaman kasir
 */
function displayProductsForKasir() {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Tidak ada produk tersedia</p>
                <a href="tambah_barang.html" class="btn-link">Tambah produk baru</a>
            </div>
        `;
        return;
    }
    
    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'search-item';
        productElement.dataset.id = product.id;
        
        productElement.innerHTML = `
            <div class="search-item-info">
                <h4>${product.name}</h4>
                <p>${formatCategory(product.category)} • Stok: ${product.stock}</p>
            </div>
            <div class="search-item-price">${formatCurrency(product.selling_price)}</div>
        `;
        
        productElement.addEventListener('click', () => addToCart(product));
        container.appendChild(productElement);
    });
}

/**
 * Setup search untuk kasir
 */
function setupSearch() {
    const searchInput = document.getElementById('productSearch');
    if (!searchInput) return;
    
    const debouncedSearch = debounce(searchProducts, 300);
    searchInput.addEventListener('input', debouncedSearch);
}

/**
 * Search produk
 */
function searchProducts(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('.search-item');
    
    items.forEach(item => {
        const name = item.querySelector('.search-item-info h4').textContent.toLowerCase();
        const category = item.querySelector('.search-item-info p').textContent.toLowerCase();
        const matches = name.includes(searchTerm) || category.includes(searchTerm);
        item.style.display = matches ? 'flex' : 'none';
    });
}

/**
 * Tambah produk ke cart
 */
function addToCart(product) {
    // Cek stok
    if (product.stock <= 0) {
        showNotification('warning', `Stok ${product.name} habis`);
        return;
    }
    
    // Cek apakah produk sudah ada di cart
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            showNotification('warning', `Stok ${product.name} tidak mencukupi`);
            return;
        }
        existingItem.quantity += 1;
        existingItem.total = existingItem.quantity * existingItem.price;
    } else {
        cart.push({
            id: generateId('CART'),
            product_id: product.id,
            name: product.name,
            price: product.selling_price,
            quantity: 1,
            total: product.selling_price,
            category: product.category,
            unit: product.unit,
            stock: product.stock
        });
    }
    
    updateCart();
    showNotification('success', `${product.name} ditambahkan ke keranjang`);
}

/**
 * Update cart display
 */
function updateCart() {
    // Simpan ke localStorage
    saveToLocalStorage(STORAGE_KEYS.CART, cart);
    
    // Update count
    updateCartCount();
    
    // Update display jika di halaman kasir
    const cartItemsContainer = document.getElementById('cartItems');
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('totalAmount');
    const discountElement = document.getElementById('discount');
    
    if (cartItemsContainer) {
        renderCartItems(cartItemsContainer);
    }
    
    if (subtotalElement && totalElement && discountElement) {
        updateCartSummary();
    }
}

/**
 * Update cart count
 */
function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    cartCountElements.forEach(element => {
        element.textContent = `${totalItems} item`;
    });
}

/**
 * Render cart items
 */
function renderCartItems(container) {
    container.innerHTML = '';
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Keranjang belanja kosong</p>
                <p class="small">Cari dan tambah produk untuk memulai transaksi</p>
            </div>
        `;
        return;
    }
    
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <i class="fas fa-box"></i>
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-meta">
                    ${formatCategory(item.category)} • ${item.unit}
                </div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn decrease" data-id="${item.id}">
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" class="quantity-input" 
                       value="${item.quantity}" min="1" max="${item.stock}"
                       data-id="${item.id}">
                <button class="quantity-btn increase" data-id="${item.id}">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="cart-item-price">${formatCurrency(item.total)}</div>
            <div class="cart-item-remove" data-id="${item.id}">
                <i class="fas fa-trash"></i>
            </div>
        `;
        
        container.appendChild(cartItem);
    });
    
    // Add event listeners
    container.querySelectorAll('.quantity-btn.decrease').forEach(btn => {
        btn.addEventListener('click', decreaseQuantity);
    });
    
    container.querySelectorAll('.quantity-btn.increase').forEach(btn => {
        btn.addEventListener('click', increaseQuantity);
    });
    
    container.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', updateQuantity);
    });
    
    container.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', removeFromCart);
    });
}

/**
 * Update cart summary
 */
function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const discount = 0; // Bisa ditambahkan fitur diskon
    const total = subtotal - discount;
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('discount').textContent = formatCurrency(discount);
    document.getElementById('totalAmount').textContent = formatCurrency(total);
    
    // Update kembalian jika ada input uang
    calculateChange();
}

/**
 * Decrease quantity
 */
function decreaseQuantity(event) {
    const itemId = event.currentTarget.dataset.id;
    const item = cart.find(item => item.id === itemId);
    
    if (item && item.quantity > 1) {
        item.quantity -= 1;
        item.total = item.quantity * item.price;
        updateCart();
    }
}

/**
 * Increase quantity
 */
function increaseQuantity(event) {
    const itemId = event.currentTarget.dataset.id;
    const item = cart.find(item => item.id === itemId);
    
    if (item && item.quantity < item.stock) {
        item.quantity += 1;
        item.total = item.quantity * item.price;
        updateCart();
    } else {
        showNotification('warning', 'Stok tidak mencukupi');
    }
}

/**
 * Update quantity from input
 */
function updateQuantity(event) {
    const itemId = event.currentTarget.dataset.id;
    const newQuantity = parseInt(event.target.value);
    const item = cart.find(item => item.id === itemId);
    
    if (item) {
        if (newQuantity >= 1 && newQuantity <= item.stock) {
            item.quantity = newQuantity;
            item.total = item.quantity * item.price;
            updateCart();
        } else {
            showNotification('warning', `Jumlah harus antara 1 dan ${item.stock}`);
            event.target.value = item.quantity;
        }
    }
}

/**
 * Remove item from cart
 */
function removeFromCart(event) {
    const itemId = event.currentTarget.dataset.id;
    const item = cart.find(item => item.id === itemId);
    
    if (item && confirm(`Hapus ${item.name} dari keranjang?`)) {
        cart = cart.filter(item => item.id !== itemId);
        updateCart();
        showNotification('info', 'Produk dihapus dari keranjang');
    }
}

/**
 * Clear cart
 */
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Bersihkan semua item di keranjang?')) {
        cart = [];
        updateCart();
        showNotification('info', 'Keranjang dibersihkan');
    }
}

/**
 * Calculate change
 */
function calculateChange() {
    const cashInput = document.getElementById('cashAmount');
    const changeElement = document.getElementById('changeAmount');
    
    if (!cashInput || !changeElement) return;
    
    const cashAmount = parseFloat(cashInput.value) || 0;
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    const change = cashAmount - total;
    
    changeElement.textContent = formatCurrency(change >= 0 ? change : 0);
    
    // Update warna berdasarkan kembalian
    if (change < 0) {
        changeElement.style.color = 'var(--danger-color)';
    } else if (change > 0) {
        changeElement.style.color = 'var(--success-color)';
    } else {
        changeElement.style.color = 'inherit';
    }
}

/**
 * Process payment
 */
async function processPayment() {
    // Validasi
    if (cart.length === 0) {
        showNotification('warning', 'Keranjang belanja kosong');
        return;
    }
    
    const cashInput = document.getElementById('cashAmount');
    const cashAmount = parseFloat(cashInput.value) || 0;
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    const paymentMethod = document.querySelector('.payment-methods .method.active').dataset.method;
    
    if (paymentMethod === 'cash' && cashAmount < total) {
        showNotification('error', 'Uang diterima kurang dari total belanja');
        return;
    }
    
    // Konfirmasi
    if (!confirm(`Proses transaksi sebesar ${formatCurrency(total)}?`)) {
        return;
    }
    
    try {
        // Prepare transaction data
        const transactionData = {
            transaction_code: generateTransactionCode(),
            items: cart.map(item => ({
                product_id: item.product_id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
                category: item.category
            })),
            subtotal: total,
            discount: 0,
            total: total,
            payment_method: paymentMethod,
            cash_received: cashAmount,
            change: paymentMethod === 'cash' ? (cashAmount - total) : 0,
            status: 'completed'
        };
        
        // Kirim ke backend
        const response = await apiRequest('/api/transactions', 'POST', transactionData);
        
        if (response.success) {
            // Reset cart
            cart = [];
            updateCart();
            
            // Reset form
            if (cashInput) cashInput.value = '';
            
            // Tampilkan struk
            showReceipt(response.transaction);
            
            // Update recent transactions
            await loadRecentTransactions();
            
            showNotification('success', 'Transaksi berhasil diproses');
        } else {
            throw new Error(response.message || 'Transaksi gagal');
        }
    } catch (error) {
        console.error('Payment processing failed:', error);
        showNotification('error', `Gagal memproses pembayaran: ${error.message}`);
    }
}

/**
 * Show receipt
 */
function showReceipt(transaction) {
    const modal = document.getElementById('receiptModal');
    const receiptContent = document.getElementById('receiptContent');
    
    if (!modal || !receiptContent) return;
    
    // Format receipt
    const receiptHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h4>POS RETAIL PRO</h4>
                <p>Jl. Contoh No. 123, Kota</p>
                <p>Telp: 0812-3456-7890</p>
            </div>
            
            <div class="receipt-details">
                <div class="receipt-row">
                    <span>No. Transaksi:</span>
                    <span>${transaction.transaction_code}</span>
                </div>
                <div class="receipt-row">
                    <span>Tanggal:</span>
                    <span>${formatDate(transaction.created_at, true)}</span>
                </div>
                <div class="receipt-row">
                    <span>Kasir:</span>
                    <span>Sistem POS</span>
                </div>
                
                <hr style="margin: 15px 0; border: none; border-top: 1px dashed #000;">
                
                ${transaction.items.map(item => `
                    <div class="receipt-row">
                        <span>${item.name} (${item.quantity}x)</span>
                        <span>${formatCurrency(item.total)}</span>
                    </div>
                `).join('')}
                
                <hr style="margin: 15px 0; border: none; border-top: 1px dashed #000;">
                
                <div class="receipt-row">
                    <span>Subtotal:</span>
                    <span>${formatCurrency(transaction.subtotal)}</span>
                </div>
                <div class="receipt-row">
                    <span>Diskon:</span>
                    <span>${formatCurrency(transaction.discount)}</span>
                </div>
                <div class="receipt-row total">
                    <span>TOTAL:</span>
                    <span>${formatCurrency(transaction.total)}</span>
                </div>
                
                <div class="receipt-row">
                    <span>Pembayaran:</span>
                    <span>${transaction.payment_method.toUpperCase()}</span>
                </div>
                
                ${transaction.payment_method === 'cash' ? `
                    <div class="receipt-row">
                        <span>Bayar:</span>
                        <span>${formatCurrency(transaction.cash_received)}</span>
                    </div>
                    <div class="receipt-row">
                        <span>Kembali:</span>
                        <span>${formatCurrency(transaction.change)}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="receipt-footer">
                <p>Terima kasih atas kunjungan Anda</p>
                <p>*** BARANG YANG SUDAH DIBELI TIDAK DAPAT DIKEMBALIKAN ***</p>
            </div>
        </div>
    `;
    
    receiptContent.innerHTML = receiptHTML;
    modal.classList.add('active');
    
    // Simpan transaksi terakhir
    saveToLocalStorage('last_transaction', transaction);
    
    // Setup receipt actions
    setupReceiptActions(transaction);
}

/**
 * Setup receipt actions
 */
function setupReceiptActions(transaction) {
    const printBtn = document.getElementById('printReceiptBtn');
    const downloadBtn = document.getElementById('downloadReceipt');
    const telegramBtn = document.getElementById('sendTelegram');
    
    if (printBtn) {
        printBtn.onclick = () => {
            window.print();
        };
    }
    
    if (downloadBtn) {
        downloadBtn.onclick = async () => {
            try {
                showNotification('info', 'Menyiapkan struk untuk download...');
                const response = await apiRequest(`/api/receipt/${transaction.id}/download`);
                showNotification('success', 'Struk siap didownload');
                // Implement download logic
            } catch (error) {
                showNotification('error', 'Gagal mendownload struk');
            }
        };
    }
    
    if (telegramBtn) {
        telegramBtn.onclick = async () => {
            try {
                showNotification('info', 'Mengirim struk ke Telegram...');
                const response = await apiRequest(`/api/receipt/${transaction.id}/telegram`);
                showNotification('success', 'Struk berhasil dikirim ke Telegram');
            } catch (error) {
                showNotification('error', 'Gagal mengirim ke Telegram');
            }
        };
    }
}

/**
 * Load recent transactions
 */
async function loadRecentTransactions() {
    try {
        await loadTransactions();
        displayRecentTransactions();
    } catch (error) {
        console.error('Failed to load recent transactions:', error);
    }
}

/**
 * Display recent transactions
 */
function displayRecentTransactions() {
    const container = document.getElementById('recentTransactionsList');
    if (!container) return;
    
    // Ambil 5 transaksi terbaru
    const recent = transactions
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Belum ada transaksi</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recent.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-header">
                <span class="transaction-code">${transaction.transaction_code}</span>
                <span class="transaction-time">${formatDate(transaction.created_at, true)}</span>
            </div>
            <div class="transaction-details">
                <span>${transaction.items.length} items</span>
                <span class="transaction-total">${formatCurrency(transaction.total)}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Save draft transaction
 */
function saveDraftTransaction() {
    if (cart.length === 0) {
        showNotification('warning', 'Tidak ada item untuk disimpan');
        return;
    }
    
    const draft = {
        items: cart,
        saved_at: new Date().toISOString()
    };
    
    saveToLocalStorage(STORAGE_KEYS.DRAFT_TRANSACTION, draft);
    showNotification('success', 'Transaksi disimpan sebagai draft');
}

/**
 * Print last receipt
 */
function printLastReceipt() {
    const lastTransaction = getFromLocalStorage('last_transaction');
    
    if (!lastTransaction) {
        showNotification('warning', 'Tidak ada struk terakhir yang tersedia');
        return;
    }
    
    showReceipt(lastTransaction);
}

/**
 * TAMBAH BARANG PAGE FUNCTIONS
 */

/**
 * Save new product
 */
async function saveProduct() {
    // Collect form data
    const productData = {
        code: document.getElementById('productCode').value.trim(),
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('category').value,
        unit: document.getElementById('unit').value,
        purchase_price: parseFloat(document.getElementById('purchasePrice').value) || 0,
        selling_price: parseFloat(document.getElementById('sellingPrice').value) || 0,
        stock: parseInt(document.getElementById('stock').value) || 0,
        min_stock: parseInt(document.getElementById('minStock').value) || 5,
        barcode: document.getElementById('barcode').value.trim() || null,
        description: document.getElementById('description').value.trim() || null
    };
    
    // Validation
    if (!validateRequired(productData.code, 'Kode produk')) return;
    if (!validateRequired(productData.name, 'Nama produk')) return;
    if (!validateRequired(productData.category, 'Kategori')) return;
    if (!validateRequired(productData.unit, 'Satuan')) return;
    if (!validatePositiveNumber(productData.purchase_price, 'Harga beli')) return;
    if (!validatePositiveNumber(productData.selling_price, 'Harga jual')) return;
    if (!validatePositiveNumber(productData.stock, 'Stok')) return;
    if (!validatePositiveNumber(productData.min_stock, 'Stok minimum')) return;
    
    if (productData.selling_price < productData.purchase_price) {
        showNotification('warning', 'Harga jual harus lebih besar dari harga beli');
        return;
    }
    
    try {
        showNotification('info', 'Menyimpan produk...');
        
        const response = await apiRequest('/api/products', 'POST', productData);
        
        if (response.success) {
            showNotification('success', 'Produk berhasil disimpan');
            
            // Reset form
            document.getElementById('productForm').reset();
            
            // Generate new code
            document.getElementById('generateCode').click();
            
            // Reload products list
            await loadRecentProducts();
        } else {
            throw new Error(response.message || 'Gagal menyimpan produk');
        }
    } catch (error) {
        console.error('Failed to save product:', error);
        showNotification('error', `Gagal menyimpan produk: ${error.message}`);
    }
}

/**
 * Load recent products
 */
async function loadRecentProducts() {
    try {
        await loadProducts();
        displayRecentProducts();
    } catch (error) {
        console.error('Failed to load recent products:', error);
    }
}

/**
 * Display recent products
 */
function displayRecentProducts() {
    const container = document.getElementById('recentProductsTable');
    if (!container) return;
    
    // Ambil 10 produk terbaru
    const recent = products
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
    
    if (recent.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Belum ada produk</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = recent.map(product => `
        <tr>
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${formatCategory(product.category)}</td>
            <td>
                <span class="stock-badge ${product.stock <= product.min_stock ? 'low' : 'normal'}">
                    ${product.stock} ${product.unit}
                </span>
            </td>
            <td>${formatCurrency(product.selling_price)}</td>
            <td>
                ${product.stock === 0 ? 
                    '<span class="status-badge danger">Habis</span>' :
                    product.stock <= product.min_stock ? 
                    '<span class="status-badge warning">Menipis</span>' :
                    '<span class="status-badge success">Tersedia</span>'
                }
            </td>
        </tr>
    `).join('');
}

/**
 * RESTOK PAGE FUNCTIONS
 */

/**
 * Load products for restok
 */
async function loadProductsForRestock() {
    try {
        await loadProducts();
        displayProductsForRestock();
    } catch (error) {
        console.error('Failed to load products for restok:', error);
    }
}

/**
 * Display products for restok
 */
function displayProductsForRestock() {
    const container = document.getElementById('productsList');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Tidak ada produk tersedia</p>
            </div>
        `;
        return;
    }
    
    // Filter berdasarkan kategori dan stok
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const stockFilter = document.getElementById('stockFilter')?.value || '';
    
    let filteredProducts = [...products];
    
    if (categoryFilter) {
        filteredProducts = filteredProducts.filter(p => p.category === categoryFilter);
    }
    
    if (stockFilter === 'low') {
        filteredProducts = filteredProducts.filter(p => p.stock <= p.min_stock && p.stock > 0);
    } else if (stockFilter === 'empty') {
        filteredProducts = filteredProducts.filter(p => p.stock === 0);
    } else if (stockFilter === 'normal') {
        filteredProducts = filteredProducts.filter(p => p.stock > p.min_stock);
    }
    
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Tidak ada produk yang sesuai filter</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredProducts.map(product => {
        const stockClass = product.stock === 0 ? 'critical' : 
                          product.stock <= product.min_stock ? 'low' : 'normal';
        
        return `
            <div class="product-item-restok ${selectedProduct?.id === product.id ? 'selected' : ''}" 
                 data-id="${product.id}">
                <div class="product-item-header">
                    <span class="product-item-name">${product.name}</span>
                    <span class="product-item-stock ${stockClass}">
                        Stok: ${product.stock} ${product.unit}
                    </span>
                </div>
                <div class="product-item-meta">
                    <span>${formatCategory(product.category)}</span>
                    <span>Min: ${product.min_stock} ${product.unit}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners
    container.querySelectorAll('.product-item-restok').forEach(item => {
        item.addEventListener('click', selectProductForRestock);
    });
}

/**
 * Select product for restok
 */
function selectProductForRestock(event) {
    const productId = event.currentTarget.dataset.id;
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    selectedProduct = product;
    
    // Update display
    document.querySelectorAll('.product-item-restok').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Update form
    const productInfo = document.getElementById('selectedProductInfo');
    productInfo.innerHTML = `
        <div class="selected-product-info">
            <h4>${product.name}</h4>
            <p>Kode: ${product.code} • Kategori: ${formatCategory(product.category)}</p>
            <p>Stok saat ini: <strong>${product.stock} ${product.unit}</strong></p>
            <p>Stok minimum: <strong>${product.min_stock} ${product.unit}</strong></p>
            <p>Harga beli terakhir: <strong>${formatCurrency(product.purchase_price)}</strong></p>
        </div>
    `;
    
    // Enable form
    document.getElementById('restockQuantity').disabled = false;
    document.getElementById('restockPrice').disabled = false;
    document.getElementById('processRestock').disabled = false;
    
    // Set default values
    document.getElementById('restockQuantity').value = product.min_stock;
    document.getElementById('restockPrice').value = product.purchase_price;
    
    updateRestockSummary();
}

/**
 * Filter products for restok
 */
function filterProductsForRestock() {
    displayProductsForRestock();
}

/**
 * Process restok
 */
async function processRestock() {
    if (!selectedProduct) {
        showNotification('warning', 'Pilih produk terlebih dahulu');
        return;
    }
    
    const quantity = parseInt(document.getElementById('restockQuantity').value) || 0;
    const price = parseFloat(document.getElementById('restockPrice').value) || 0;
    const supplier = document.getElementById('supplier').value.trim();
    const notes = document.getElementById('restockNotes').value.trim();
    
    if (!validatePositiveNumber(quantity, 'Jumlah restok')) return;
    if (!validatePositiveNumber(price, 'Harga beli')) return;
    
    try {
        showNotification('info', 'Memproses restok...');
        
        const restockData = {
            product_id: selectedProduct.id,
            quantity: quantity,
            price: price,
            supplier: supplier || null,
            notes: notes || null,
            total_cost: quantity * price
        };
        
        const response = await apiRequest('/api/stock/restock', 'POST', restockData);
        
        if (response.success) {
            showNotification('success', 'Restok berhasil diproses');
            
            // Reset form
            document.getElementById('restockForm').reset();
            selectedProduct = null;
            
            // Update display
            document.getElementById('selectedProductInfo').innerHTML = `
                <div class="empty-selection">
                    <i class="fas fa-box-open"></i>
                    <p>Pilih produk untuk direstok</p>
                </div>
            `;
            
            document.getElementById('processRestock').disabled = true;
            document.getElementById('restockQuantity').disabled = true;
            document.getElementById('restockPrice').disabled = true;
            
            // Reload data
            await loadProductsForRestock();
            await loadRestokHistory();
        } else {
            throw new Error(response.message || 'Gagal memproses restok');
        }
    } catch (error) {
        console.error('Failed to process restok:', error);
        showNotification('error', `Gagal memproses restok: ${error.message}`);
    }
}

/**
 * Load restok history
 */
async function loadRestokHistory() {
    try {
        await loadStockLogs();
        displayRestokHistory();
    } catch (error) {
        console.error('Failed to load restok history:', error);
    }
}

/**
 * Display restok history
 */
function displayRestokHistory() {
    const container = document.getElementById('restokHistoryList');
    if (!container) return;
    
    // Ambil 10 restok terbaru
    const recent = stockLogs
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
    
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>Belum ada riwayat restok</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recent.map(log => {
        const product = products.find(p => p.id === log.product_id);
        return `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-date">${formatDate(log.created_at, true)}</span>
                    <span class="history-quantity">+${log.quantity}</span>
                </div>
                <div class="history-details">
                    <p>${product?.name || 'Produk tidak ditemukan'}</p>
                    <p>Harga: ${formatCurrency(log.price)} • Total: ${formatCurrency(log.total_cost)}</p>
                    ${log.supplier ? `<p>Supplier: ${log.supplier}</p>` : ''}
                    ${log.notes ? `<p>Catatan: ${log.notes}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Preview auto restock
 */
async function previewAutoRestock() {
    try {
        showNotification('info', 'Mempersiapkan restok otomatis...');
        
        const threshold = document.getElementById('restockThreshold').value;
        const amount = document.getElementById('restockAmount').value;
        const customAmount = document.getElementById('customAmount').value;
        
        const response = await apiRequest('/api/stock/auto-restock/preview', 'POST', {
            threshold,
            amount,
            custom_amount: customAmount
        });
        
        displayAutoRestockPreview(response.products);
    } catch (error) {
        console.error('Failed to preview auto restock:', error);
        showNotification('error', 'Gagal mempersiapkan restok otomatis');
    }
}

/**
 * Process auto restock
 */
async function processAutoRestock() {
    try {
        showNotification('info', 'Memproses restok otomatis...');
        
        const threshold = document.getElementById('restockThreshold').value;
        const amount = document.getElementById('restockAmount').value;
        const customAmount = document.getElementById('customAmount').value;
        
        const response = await apiRequest('/api/stock/auto-restock', 'POST', {
            threshold,
            amount,
            custom_amount: customAmount
        });
        
        if (response.success) {
            showNotification('success', 'Restok otomatis berhasil diproses');
            
            // Tutup modal
            document.getElementById('autoRestockModal').classList.remove('active');
            
            // Reload data
            await loadProductsForRestock();
            await loadRestokHistory();
        }
    } catch (error) {
        console.error('Failed to process auto restock:', error);
        showNotification('error', 'Gagal memproses restok otomatis');
    }
}

/**
 * DASHBOARD PAGE FUNCTIONS
 */

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        await Promise.all([
            loadProducts(),
            loadTransactions(),
            loadStockLogs()
        ]);
        
        updateDashboardStats();
        updateCharts();
        updateRecentTransactions();
        updateLowStockWarning();
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats() {
    // Today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Today's transactions
    const todayTransactions = transactions.filter(t => 
        t.created_at.startsWith(today)
    );
    
    // Today's income
    const todayIncome = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    
    // Yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayTransactions = transactions.filter(t => 
        t.created_at.startsWith(yesterdayStr)
    );
    const yesterdayIncome = yesterdayTransactions.reduce((sum, t) => sum + t.total, 0);
    
    // Income change
    const incomeChange = yesterdayIncome > 0 ? 
        ((todayIncome - yesterdayIncome) / yesterdayIncome * 100).toFixed(1) : 0;
    
    // Low stock count
    const lowStockCount = products.filter(p => 
        p.stock <= p.min_stock && p.stock > 0
    ).length;
    
    // Out of stock count
    const outOfStockCount = products.filter(p => p.stock === 0).length;
    
    // Update UI
    document.getElementById('todayIncome').textContent = formatCurrency(todayIncome);
    document.getElementById('todayTransactions').textContent = todayTransactions.length;
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('lowStockCount').textContent = lowStockCount + outOfStockCount;
    
    // Update change indicators
    const incomeChangeElement = document.getElementById('todayIncome').parentNode.querySelector('.stat-change');
    if (incomeChangeElement) {
        incomeChangeElement.innerHTML = `
            <i class="fas fa-arrow-${todayIncome >= yesterdayIncome ? 'up' : 'down'}"></i>
            <span>${Math.abs(incomeChange)}% dari kemarin</span>
        `;
    }
}

/**
 * Update charts
 */
function updateCharts() {
    // Revenue chart (7 days)
    const ctx1 = document.getElementById('revenueChart');
    if (ctx1) {
        const labels = [];
        const data = [];
        
        // Generate last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
            
            const dayTransactions = transactions.filter(t => 
                t.created_at.startsWith(dateStr)
            );
            const dayRevenue = dayTransactions.reduce((sum, t) => sum + t.total, 0);
            data.push(dayRevenue);
        }
        
        new Chart(ctx1, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pendapatan',
                    data: data,
                    borderColor: 'var(--primary-color)',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + value.toLocaleString('id-ID');
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Category chart
    const ctx2 = document.getElementById('categoryChart');
    if (ctx2) {
        const categories = ['makanan', 'minuman', 'sembako', 'jajan'];
        const categoryColors = [
            'rgba(67, 97, 238, 0.8)',
            'rgba(114, 9, 183, 0.8)',
            'rgba(76, 201, 240, 0.8)',
            'rgba(248, 37, 133, 0.8)'
        ];
        
        const categoryData = categories.map(category => {
            const categoryTransactions = transactions.flatMap(t => 
                t.items.filter(item => item.category === category)
            );
            return categoryTransactions.reduce((sum, item) => sum + item.total, 0);
        });
        
        new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: categories.map(c => formatCategory(c)),
                datasets: [{
                    data: categoryData,
                    backgroundColor: categoryColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

/**
 * Update recent transactions
 */
function updateRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    // Ambil 5 transaksi terbaru
    const recent = transactions
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Belum ada transaksi</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = recent.map(transaction => `
        <tr>
            <td>${transaction.transaction_code}</td>
            <td>${formatDate(transaction.created_at, true)}</td>
            <td>${transaction.items.length} items</td>
            <td>${formatCurrency(transaction.total)}</td>
            <td>
                <span class="status-badge success">Selesai</span>
            </td>
        </tr>
    `).join('');
}

/**
 * Update low stock warning
 */
function updateLowStockWarning() {
    const container = document.getElementById('lowStockSection');
    if (!container) return;
    
    const lowStockProducts = products.filter(p => 
        p.stock <= p.min_stock
    );
    
    if (lowStockProducts.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const warningHTML = `
        <div class="warning-section">
            <div class="section-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Peringatan Stok Menipis</h3>
            </div>
            <div class="warning-grid">
                ${lowStockProducts.slice(0, 4).map(product => `
                    <div class="warning-card">
                        <div class="warning-icon">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="warning-info">
                            <h4>${product.name}</h4>
                            <p>Stok: ${product.stock} ${product.unit} • Min: ${product.min_stock} ${product.unit}</p>
                            <p class="warning-action">
                                <a href="restok.html" class="btn-link">
                                    <i class="fas fa-plus-circle"></i> Restok Sekarang
                                </a>
                            </p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = warningHTML;
}

/**
 * LAPORAN PAGE FUNCTIONS
 */

/**
 * Load report data
 */
async function loadReportData() {
    try {
        await Promise.all([
            loadProducts(),
            loadTransactions(),
            loadStockLogs()
        ]);
        
        updateReportSummary();
        updateReportCharts();
        updateReportTables();
    } catch (error) {
        console.error('Failed to load report data:', error);
    }
}

/**
 * Update report summary
 */
function updateReportSummary() {
    const reportType = document.getElementById('reportType').value;
    const timePeriod = document.getElementById('timePeriod').value;
    
    // Filter transactions berdasarkan periode
    let filteredTransactions = [...transactions];
    
    if (timePeriod === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filteredTransactions = filteredTransactions.filter(t => 
            t.created_at.startsWith(today)
        );
    } else if (timePeriod === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        filteredTransactions = filteredTransactions.filter(t => 
            t.created_at.startsWith(yesterdayStr)
        );
    } else if (timePeriod === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredTransactions = filteredTransactions.filter(t => 
            new Date(t.created_at) >= weekAgo
        );
    } else if (timePeriod === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filteredTransactions = filteredTransactions.filter(t => 
            new Date(t.created_at) >= monthAgo
        );
    } else if (timePeriod === 'year') {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        filteredTransactions = filteredTransactions.filter(t => 
            new Date(t.created_at) >= yearAgo
        );
    } else if (timePeriod === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate) {
            filteredTransactions = filteredTransactions.filter(t => {
                const transactionDate = t.created_at.split('T')[0];
                return transactionDate >= startDate && transactionDate <= endDate;
            });
        }
    }
    
    // Calculate totals
    const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = filteredTransactions.length;
    const totalItemsSold = filteredTransactions.flatMap(t => t.items)
        .reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate profit (simplified: 30% margin)
    const totalProfit = totalSales * 0.3;
    
    // Update UI
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalTransactions').textContent = totalTransactions;
    document.getElementById('totalItemsSold').textContent = totalItemsSold;
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
}

/**
 * Update report charts
 */
function updateReportCharts() {
    // Sales chart
    const ctx1 = document.getElementById('salesChart');
    if (ctx1) {
        // ... chart implementation similar to dashboard
    }
    
    // Category sales chart
    const ctx2 = document.getElementById('categorySalesChart');
    if (ctx2) {
        // ... chart implementation
    }
    
    // Top products chart
    const ctx3 = document.getElementById('topProductsChart');
    if (ctx3) {
        // ... chart implementation
    }
}

/**
 * Update report tables
 */
function updateReportTables() {
    updateTransactionsTable();
    updateStockTable();
}

/**
 * Update transactions table
 */
function updateTransactionsTable() {
    const container = document.getElementById('transactionsTableBody');
    if (!container) return;
    
    // Similar filtering logic as updateReportSummary
    // ... implementation
    
    container.innerHTML = transactions.map(transaction => `
        <tr>
            <td>${transaction.transaction_code}</td>
            <td>${formatDate(transaction.created_at)}</td>
            <td>${formatDate(transaction.created_at, true).split(', ')[1]}</td>
            <td>${transaction.items.length} items</td>
            <td>${formatCurrency(transaction.total)}</td>
            <td>${transaction.payment_method.toUpperCase()}</td>
            <td>
                <button class="btn btn-sm btn-secondary view-detail" data-id="${transaction.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Update stock table
 */
function updateStockTable() {
    const container = document.getElementById('stockTableBody');
    if (!container) return;
    
    container.innerHTML = products.map(product => {
        const status = product.stock === 0 ? 'danger' : 
                      product.stock <= product.min_stock ? 'warning' : 'success';
        const statusText = product.stock === 0 ? 'Habis' : 
                          product.stock <= product.min_stock ? 'Menipis' : 'Aman';
        
        return `
            <tr>
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${formatCategory(product.category)}</td>
                <td>${product.stock} ${product.unit}</td>
                <td>${product.min_stock} ${product.unit}</td>
                <td>
                    <span class="status-badge ${status}">${statusText}</span>
                </td>
                <td>${formatDate(product.updated_at)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Export functions
 */
async function exportPDFReport() {
    try {
        showNotification('info', 'Menyiapkan laporan PDF...');
        const response = await apiRequest('/api/reports/pdf');
        showNotification('success', 'Laporan PDF siap didownload');
        // Implement download
    } catch (error) {
        showNotification('error', 'Gagal membuat laporan PDF');
    }
}

async function exportExcelReport() {
    try {
        showNotification('info', 'Menyiapkan laporan Excel...');
        const response = await apiRequest('/api/reports/excel');
        showNotification('success', 'Laporan Excel siap didownload');
        // Implement download
    } catch (error) {
        showNotification('error', 'Gagal membuat laporan Excel');
    }
}

async function sendReportToTelegram() {
    try {
        showNotification('info', 'Mengirim laporan ke Telegram...');
        const response = await apiRequest('/api/reports/telegram');
        showNotification('success', 'Laporan berhasil dikirim ke Telegram');
    } catch (error) {
        showNotification('error', 'Gagal mengirim laporan ke Telegram');
    }
}

/**
 * Initialize aplikasi saat halaman dimuat
 */
document.addEventListener('DOMContentLoaded', function() {
    // Cek apakah semua komponen ada
    const isDashboardPage = document.getElementById('todayIncome') !== null;
    const isKasirPage = document.getElementById('productSearch') !== null;
    const isTambahBarangPage = document.getElementById('productForm') !== null;
    const isRestokPage = document.getElementById('productsList') !== null;
    const isLaporanPage = document.getElementById('reportType') !== null;
    
    // Initialize berdasarkan halaman
    if (isDashboardPage) {
        initApp().then(() => loadDashboardData());
    } else if (isKasirPage) {
        initApp().then(() => loadProductsForKasir());
    } else if (isTambahBarangPage) {
        initApp().then(() => loadRecentProducts());
    } else if (isRestokPage) {
        initApp().then(() => {
            loadProductsForRestock();
            loadRestokHistory();
        });
    } else if (isLaporanPage) {
        initApp().then(() => loadReportData());
    } else {
        initApp();
    }
    
    // Add CSS untuk badges
    const badgeStyles = document.createElement('style');
    badgeStyles.textContent = `
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-badge.success {
            background: rgba(76, 201, 240, 0.2);
            color: var(--success-color);
            border: 1px solid var(--success-color);
        }
        
        .status-badge.warning {
            background: rgba(248, 150, 30, 0.2);
            color: var(--warning-color);
            border: 1px solid var(--warning-color);
        }
        
        .status-badge.danger {
            background: rgba(249, 65, 68, 0.2);
            color: var(--danger-color);
            border: 1px solid var(--danger-color);
        }
        
        .stock-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.85rem;
        }
        
        .stock-badge.low {
            background: rgba(248, 150, 30, 0.2);
            color: var(--warning-color);
        }
        
        .stock-badge.critical {
            background: rgba(249, 65, 68, 0.2);
            color: var(--danger-color);
        }
        
        .stock-badge.normal {
            background: rgba(76, 201, 240, 0.2);
            color: var(--success-color);
        }
        
        .warning-section {
            background: linear-gradient(135deg, rgba(248, 150, 30, 0.1), rgba(248, 150, 30, 0.05));
            border-radius: var(--radius-lg);
            padding: var(--spacing-lg);
            margin-top: var(--spacing-xl);
            border: 1px solid rgba(248, 150, 30, 0.3);
        }
        
        .warning-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--spacing-md);
            margin-top: var(--spacing-md);
        }
        
        .warning-card {
            background: var(--card-color);
            border-radius: var(--radius-md);
            padding: var(--spacing-md);
            display: flex;
            gap: var(--spacing-md);
            align-items: center;
            box-shadow: var(--shadow-sm);
        }
        
        .warning-icon {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-sm);
            background: rgba(248, 150, 30, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--warning-color);
        }
        
        .warning-info h4 {
            font-size: 0.95rem;
            margin-bottom: 2px;
        }
        
        .warning-info p {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 4px;
        }
        
        .warning-action {
            margin-top: 4px;
        }
        
        .empty-state {
            text-align: center;
            padding: var(--spacing-xl);
            color: var(--text-secondary);
        }
        
        .empty-state i {
            font-size: 3rem;
            margin-bottom: var(--spacing-md);
            opacity: 0.5;
        }
        
        .transaction-item {
            padding: var(--spacing-md);
            border-bottom: 1px solid var(--gray-light);
        }
        
        .transaction-item:last-child {
            border-bottom: none;
        }
        
        .transaction-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-xs);
        }
        
        .transaction-code {
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .transaction-time {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        
        .transaction-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
        }
        
        .transaction-total {
            font-weight: 600;
            color: var(--primary-color);
        }
    `;
    document.head.appendChild(badgeStyles);
});