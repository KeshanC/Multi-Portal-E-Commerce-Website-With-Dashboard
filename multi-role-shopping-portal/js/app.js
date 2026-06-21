// app.js - Main Application Controller
import { DB } from './db.js';
import { Auth } from './auth.js';
import { Dashboard } from './dashboard.js';

// Global Cart State
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  initAuthEvents();
  initNavigation();
  checkSession();
  initAppForms();
  initProfileEvents();
});

// ================= SESSION MONITORING =================
function checkSession() {
  const session = Auth.getSession();
  const authPortal = document.getElementById('auth-portal');
  const appShell = document.getElementById('app-shell');

  if (session) {
    authPortal.classList.add('hidden');
    appShell.classList.remove('hidden');
    
    // Set theme class on body
    document.body.className = `theme-${session.role}`;
    
    // Setup Profile Summary
    document.getElementById('profile-name').textContent = session.name;
    document.getElementById('profile-role').textContent = session.role;
    
    const avatarEl = document.getElementById('user-avatar');
    avatarEl.textContent = session.name.charAt(0).toUpperCase();

    // Show appropriate navigation items
    document.getElementById('nav-admin').classList.add('hidden');
    document.getElementById('nav-supplier').classList.add('hidden');
    document.getElementById('nav-user').classList.add('hidden');
    document.getElementById(`nav-${session.role}`).classList.remove('hidden');

    // Route to default tab per role
    const defaultTabs = {
      admin: 'admin-dashboard',
      supplier: 'supplier-dashboard',
      user: 'user-shop'
    };
    switchTab(defaultTabs[session.role]);

    // Start Real-Time 2-Minute Sync Clock
    Dashboard.startAutoUpdate(() => {
      // Callback executed every 2 minutes
      refreshActiveViewData();
    });

  } else {
    authPortal.classList.remove('hidden');
    appShell.classList.add('hidden');
    document.body.className = 'dark-theme';
  }
  if (window.lucide) window.lucide.createIcons();
}

// ================= AUTH EVENTS =================
function initAuthEvents() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginTab = document.getElementById('tab-login-btn');
  const registerTab = document.getElementById('tab-register-btn');
  const loginError = document.getElementById('login-error');
  const regError = document.getElementById('reg-error');

  // Toggle Login/Register Forms
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  // Login execution
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    try {
      Auth.login(email, pass);
      loginForm.reset();
      checkSession();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
    }
  });

  // Register execution
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    regError.classList.add('hidden');
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const gender = document.getElementById('reg-gender').value;
    const role = document.getElementById('reg-role').value;

    try {
      if (pass.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      Auth.register({ name, email, password: pass, gender, role });
      
      // Auto Login
      Auth.login(email, pass);
      registerForm.reset();
      checkSession();
    } catch (err) {
      regError.textContent = err.message;
      regError.classList.remove('hidden');
    }
  });

  // Sign out
  document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.logout();
    cart = [];
    checkSession();
  });
}

// ================= NAVIGATION CONTROL =================
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle nav item highlight
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // Main Auto Refresh Manual Button
  document.getElementById('sync-now-btn').addEventListener('click', () => {
    Dashboard.triggerSync();
  });
}

function switchTab(tabName) {
  // Hide all views
  document.querySelectorAll('.app-view').forEach(view => view.classList.add('hidden'));

  // Update header text
  const titles = {
    'admin-dashboard': 'Executive Overview',
    'admin-management': 'Account & Permissions Manager',
    'admin-shopping': 'Product Portal',
    'supplier-dashboard': 'Store Analytics',
    'supplier-add': 'New Product Listing',
    'supplier-orders': 'Customer Deliveries',
    'supplier-stock': 'Inventory & Availability Tracker',
    'user-shop': 'Marketplace',
    'user-dashboard': 'Customer Dashboard'
  };

  const title = titles[tabName] || 'Portal';
  document.getElementById('view-title').textContent = title;

  // Show selected view
  const targetViewId = `view-${tabName}`;
  const targetView = document.getElementById(targetViewId);

  if (targetView) {
    targetView.classList.remove('hidden');
    loadViewData(tabName);
  }
}

// ================= VIEW STATE RENDERERS =================
function loadViewData(tabName) {
  switch (tabName) {
    case 'admin-dashboard':
      Dashboard.renderAdminDashboard();
      break;
    case 'admin-management':
      renderAdminManagement();
      break;
    case 'admin-shopping':
      // The admin shopping option should look like the user shopping tab
      mirrorAdminShoppingLayout();
      break;
    case 'supplier-dashboard':
      Dashboard.renderSupplierDashboard();
      break;
    case 'supplier-orders':
      renderSupplierOrders();
      break;
    case 'supplier-stock':
      renderSupplierStock();
      break;
    case 'user-shop':
      renderUserShop();
      break;
    case 'user-dashboard':
      renderUserDashboard();
      break;
  }
  if (window.lucide) window.lucide.createIcons();
}

// Automatically reload views during 2-minute sync callbacks
function refreshActiveViewData() {
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav) {
    loadViewData(activeNav.dataset.tab);
  }
}

// ================= ADMIN MANAGEMENT =================
function renderAdminManagement() {
  const container = document.getElementById('management-table-body');
  if (!container) return;

  const users = DB.getUsers();
  const currentSession = Auth.getSession();

  container.innerHTML = users.map(u => {
    // Hide admins from modification for safety, or render with controls disabled
    const isSelf = u.id === currentSession.userId;
    const isSpecialAdmin = u.role === 'admin' && !isSelf;

    return `
      <tr>
        <td><span class="badge" style="background: rgba(var(--accent-${u.role}-rgb), 0.15); color: var(--accent-${u.role});">${u.role}</span></td>
        <td><strong>${u.name}</strong> ${isSelf ? '<span class="badge" style="background: rgba(255,255,255,0.1); color: #fff;">You</span>' : ''}</td>
        <td>${u.email}</td>
        <td><span style="text-transform: capitalize;">${u.gender || 'other'}</span></td>
        <td>${u.mobile || '<span class="text-muted">Not specified</span>'}</td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${u.address || '<span class="text-muted">Not specified</span>'}</td>
        <td><span class="status-pill status-${u.status}">${u.status === 'active' ? 'Active' : 'Suspended'}</span></td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline btn-xs edit-account-btn" data-id="${u.id}" ${isSpecialAdmin ? 'disabled' : ''}>
              <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> Edit
            </button>
            <button class="btn btn-danger btn-xs delete-account-btn" data-id="${u.id}" ${isSelf || isSpecialAdmin ? 'disabled' : ''}>
              <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind Actions
  document.querySelectorAll('.edit-account-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditAccountModal(btn.dataset.id);
    });
  });

  document.querySelectorAll('.delete-account-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Are you absolutely sure you want to permanently delete this account? This will delete all their data.')) {
        DB.deleteUser(btn.dataset.id);
        renderAdminManagement();
      }
    });
  });
}

function openEditAccountModal(userId) {
  const users = DB.getUsers();
  const u = users.find(usr => usr.id === userId);
  if (!u) return;

  document.getElementById('edit-user-id').value = u.id;
  document.getElementById('edit-user-name').value = u.name;
  document.getElementById('edit-user-email').value = u.email;
  document.getElementById('edit-user-gender').value = u.gender || 'male';
  document.getElementById('edit-user-status').value = u.status || 'active';
  document.getElementById('edit-user-mobile').value = u.mobile || '';
  document.getElementById('edit-user-address').value = u.address || '';

  document.getElementById('edit-user-modal').classList.remove('hidden');
}

// ================= ADMIN SHOPPING PROXY =================
function mirrorAdminShoppingLayout() {
  const adminShoppingView = document.getElementById('view-admin-shopping');
  const userShopView = document.getElementById('view-user-shop');
  
  if (adminShoppingView && userShopView) {
    adminShoppingView.innerHTML = `
      <div style="margin-bottom: 20px; border-left: 4px solid var(--accent-admin); padding: 12px; background: rgba(16,185,129,0.05); font-size: 13px;">
        <strong>Admin Sandbox mode:</strong> This acts as your personal shopping workspace. All shopping functions below mirror the user interface.
      </div>
      ${userShopView.innerHTML}
    `;
    
    // Bind all user shop events specifically on this view
    renderUserShop('view-admin-shopping');
  }
}

// ================= SUPPLIER LOGIC =================
function renderSupplierOrders() {
  const container = document.getElementById('supplier-orders-table-body');
  if (!container) return;

  const session = Auth.getSession();
  const orders = DB.getOrdersBySupplier(session.userId);

  if (orders.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 40px;">
          <i data-lucide="inbox" style="width: 36px; height: 36px; margin-bottom: 10px; opacity: 0.5;"></i>
          <p>No customer orders placed yet</p>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = orders.map(o => {
    const isActionable = o.status === 'pending';
    return `
      <tr>
        <td><code>${o.id}</code></td>
        <td><strong>${o.userName}</strong></td>
        <td>${o.productName}</td>
        <td>${o.quantity}</td>
        <td><strong>$${o.total}</strong></td>
        <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis;">${o.address}</td>
        <td><code>${o.mobile}</code></td>
        <td><span class="status-pill status-${o.status}">${o.status}</span></td>
        <td>
          ${isActionable ? `
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-primary btn-xs order-complete-btn" data-id="${o.id}" style="background: var(--accent-admin);">
                <i data-lucide="check" style="width: 12px; height: 12px;"></i> Ship
              </button>
              <button class="btn btn-danger btn-xs order-cancel-btn" data-id="${o.id}">
                <i data-lucide="x" style="width: 12px; height: 12px;"></i> Cancel
              </button>
            </div>
          ` : '<span class="text-muted">-</span>'}
        </td>
      </tr>
    `;
  }).join('');

  // Actions
  document.querySelectorAll('.order-complete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      DB.updateOrderStatus(btn.dataset.id, 'completed');
      renderSupplierOrders();
    });
  });

  document.querySelectorAll('.order-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Cancel this order? Stock will be refunded automatically.')) {
        DB.updateOrderStatus(btn.dataset.id, 'cancelled');
        renderSupplierOrders();
      }
    });
  });
}

function renderSupplierStock() {
  const container = document.getElementById('supplier-stock-grid');
  if (!container) return;

  const session = Auth.getSession();
  const products = DB.getProductsBySupplier(session.userId);

  if (products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
        <i data-lucide="package-search" style="width: 48px; height: 48px; opacity: 0.5; margin-bottom: 12px;"></i>
        <h3>No products registered under your account yet.</h3>
        <p>Go to the "Add Items" tab to register products into inventory.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => {
    return `
      <div class="stock-card glassmorphic">
        <img src="${p.image}" alt="${p.name}">
        <div class="stock-card-details">
          <h4>${p.name}</h4>
          <span class="product-category" style="margin-bottom: 12px;">$${p.price}</span>
          <div class="stock-updater">
            <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Qty Available:</span>
            <input type="number" class="stock-input qty-edit-val" data-id="${p.id}" value="${p.stock}" min="0">
            <button class="btn btn-outline btn-xs save-stock-btn" data-id="${p.id}">Set</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Bind Update Stock Action
  document.querySelectorAll('.save-stock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.id;
      const input = document.querySelector(`.qty-edit-val[data-id="${pid}"]`);
      if (input) {
        const val = parseInt(input.value, 10);
        if (isNaN(val) || val < 0) return;
        
        const products = DB.getProducts();
        const p = products.find(prod => prod.id === pid);
        if (p) {
          p.stock = val;
          DB.saveProduct(p);
          
          // Flash dynamic success button
          btn.textContent = 'Saved!';
          btn.style.borderColor = 'var(--accent-admin)';
          btn.style.color = 'var(--accent-admin)';
          setTimeout(() => {
            btn.textContent = 'Set';
            btn.style.borderColor = '';
            btn.style.color = '';
          }, 1000);
        }
      }
    });
  });
}

// ================= USER SHOP LOGIC =================
function renderUserShop(parentViewId = 'view-user-shop') {
  const container = document.querySelector(`#${parentViewId} #shop-products-grid`);
  if (!container) return;

  const products = DB.getProducts();
  const suppliers = DB.getUsers().filter(u => u.role === 'supplier');

  if (products.length === 0) {
    container.innerHTML = `<p class="text-muted">No products available in the shop right now.</p>`;
    return;
  }

  container.innerHTML = products.map(p => {
    const isOutOfStock = p.stock <= 0;
    const sup = suppliers.find(s => s.id === p.supplierId);
    const supplierName = sup ? sup.name : 'Unknown Supplier';

    return `
      <div class="product-card glassmorphic">
        <div class="product-image-container">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-info">
          <span class="product-category">${supplierName}</span>
          <h4 class="product-title">${p.name}</h4>
          <p class="product-description">${p.description}</p>
          <div class="product-footer">
            <span class="product-price">$${p.price}</span>
            ${isOutOfStock ? `
              <span class="out-of-stock-tag">Out of stock</span>
            ` : `
              <button class="btn btn-primary btn-xs add-to-cart-btn" data-id="${p.id}" data-parent="${parentViewId}">
                <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Add Cart
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Bind add-to-cart events
  document.querySelectorAll(`#${parentViewId} .add-to-cart-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.id, btn.dataset.parent);
    });
  });

  renderCart(parentViewId);
}

function addToCart(productId, parentViewId) {
  const products = DB.getProducts();
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  const cartIndex = cart.findIndex(item => item.id === productId);

  if (cartIndex !== -1) {
    // Check stock limit
    if (cart[cartIndex].quantity < product.stock) {
      cart[cartIndex].quantity++;
    } else {
      alert(`Cannot add more. Only ${product.stock} items are in stock.`);
      return;
    }
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      supplierId: product.supplierId,
      quantity: 1
    });
  }

  renderCart(parentViewId);
}

function renderCart(parentViewId = 'view-user-shop') {
  const container = document.querySelector(`#${parentViewId} #cart-items-container`);
  const cartCountEl = document.querySelector(`#${parentViewId} #cart-count`);
  const subtotalEl = document.querySelector(`#${parentViewId} #cart-subtotal`);
  const totalEl = document.querySelector(`#${parentViewId} #cart-total`);
  const checkoutBtn = document.querySelector(`#${parentViewId} #checkout-btn`);

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <i data-lucide="shopping-cart"></i>
        <p>Your cart is empty</p>
      </div>
    `;
    if (cartCountEl) cartCountEl.textContent = '0 items';
    if (subtotalEl) subtotalEl.textContent = '$0.00';
    if (totalEl) totalEl.textContent = '$0.00';
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Count items
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (cartCountEl) cartCountEl.textContent = `${totalQty} item${totalQty > 1 ? 's' : ''}`;
  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString()}`;
  if (totalEl) totalEl.textContent = `$${subtotal.toLocaleString()}`;
  if (checkoutBtn) checkoutBtn.disabled = false;

  container.innerHTML = cart.map(item => {
    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <h5 class="cart-item-name">${item.name}</h5>
          <span class="cart-item-price">$${item.price} each</span>
        </div>
        <div class="cart-item-qty">
          <button class="btn btn-outline btn-xs qty-minus-btn" data-id="${item.id}" data-parent="${parentViewId}">-</button>
          <span class="cart-item-qty-val">${item.quantity}</span>
          <button class="btn btn-outline btn-xs qty-plus-btn" data-id="${item.id}" data-parent="${parentViewId}">+</button>
        </div>
      </div>
    `;
  }).join('');

  // Bind quantities
  document.querySelectorAll(`#${parentViewId} .qty-minus-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      adjustCartQty(btn.dataset.id, -1, btn.dataset.parent);
    });
  });

  document.querySelectorAll(`#${parentViewId} .qty-plus-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      adjustCartQty(btn.dataset.id, 1, btn.dataset.parent);
    });
  });

  // Checkout modal launch
  if (checkoutBtn) {
    // Remove old listeners to avoid multiple attachments
    const newBtn = checkoutBtn.cloneNode(true);
    checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);
    
    newBtn.addEventListener('click', () => {
      launchCheckoutModal(subtotal);
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

function adjustCartQty(productId, delta, parentViewId) {
  const index = cart.findIndex(item => item.id === productId);
  if (index === -1) return;

  const products = DB.getProducts();
  const product = products.find(p => p.id === productId);

  if (delta > 0) {
    if (cart[index].quantity < product.stock) {
      cart[index].quantity++;
    } else {
      alert('Cannot add more. Stock limit reached.');
    }
  } else {
    cart[index].quantity--;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
  }

  renderCart(parentViewId);
}

// Checkout Form handling
function launchCheckoutModal(total) {
  const modal = document.getElementById('checkout-modal');
  const user = Auth.getCurrentUser();

  // Populate user data if already stored in user profile
  document.getElementById('checkout-mobile').value = user.mobile || '';
  document.getElementById('checkout-address').value = user.address || '';

  document.getElementById('modal-summary-subtotal').textContent = `$${total.toLocaleString()}`;
  document.getElementById('modal-summary-total').textContent = `$${total.toLocaleString()}`;

  modal.classList.remove('hidden');
}

// ================= USER DASHBOARD =================
function renderUserDashboard() {
  const ordersBody = document.getElementById('user-orders-table-body');
  const statOrders = document.getElementById('user-stat-orders');
  const statSpent = document.getElementById('user-stat-spent');
  const statPending = document.getElementById('user-stat-pending');

  if (!ordersBody) return;

  const session = Auth.getSession();
  const userOrders = DB.getOrdersByUser(session.userId);

  // Stats
  const totalSpent = userOrders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingCount = userOrders.filter(o => o.status === 'pending').length;

  if (statOrders) statOrders.textContent = userOrders.length;
  if (statSpent) statSpent.textContent = `$${totalSpent.toLocaleString()}`;
  if (statPending) statPending.textContent = pendingCount;

  if (userOrders.length === 0) {
    ordersBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 40px;">
          <i data-lucide="package-open" style="width: 36px; height: 36px; margin-bottom: 10px; opacity: 0.5;"></i>
          <p>You haven't placed any orders yet.</p>
        </td>
      </tr>
    `;
    return;
  }

  ordersBody.innerHTML = userOrders.map(o => {
    return `
      <tr>
        <td><code>${o.id}</code></td>
        <td><strong>${o.productName}</strong></td>
        <td>${o.quantity}</td>
        <td><strong>$${o.total}</strong></td>
        <td>${o.date}</td>
        <td><span class="status-pill status-${o.status}">${o.status}</span></td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${o.address}</td>
        <td><code>${o.mobile}</code></td>
      </tr>
    `;
  }).join('');
}

// ================= APPS FORMS HANDLING =================
function initAppForms() {
  // Checkout Submit
  const checkoutForm = document.getElementById('checkout-form');
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const mobile = document.getElementById('checkout-mobile').value;
    const address = document.getElementById('checkout-address').value;
    const session = Auth.getSession();

    if (cart.length === 0) return;

    // Create individual orders for different items/suppliers
    cart.forEach(item => {
      DB.createOrder({
        userId: session.userId,
        userName: session.name,
        userGender: session.gender,
        productId: item.id,
        productName: item.name,
        supplierId: item.supplierId,
        quantity: item.quantity,
        total: item.price * item.quantity,
        status: 'pending',
        address,
        mobile
      });
    });

    // Save mobile/address back to user account for convenient auto-fills later
    const user = Auth.getCurrentUser();
    if (user) {
      user.mobile = mobile;
      user.address = address;
      DB.saveUser(user);
    }

    // Reset checkout & cart
    cart = [];
    checkoutForm.reset();
    document.getElementById('checkout-modal').classList.add('hidden');
    
    alert('Congratulations! Your Cash on Delivery order has been successfully placed.');

    // Switch view to user dashboard to see pending orders
    switchTab('user-dashboard');
    
    // Force sync dashboards immediately so other accounts reflect it
    Dashboard.triggerSync();
  });

  // Modal Closures
  document.getElementById('close-checkout-modal').addEventListener('click', () => {
    document.getElementById('checkout-modal').classList.add('hidden');
  });

  document.getElementById('close-edit-modal').addEventListener('click', () => {
    document.getElementById('edit-user-modal').classList.add('hidden');
  });

  // Admin save edited user
  const editUserForm = document.getElementById('admin-edit-user-form');
  editUserForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const uid = document.getElementById('edit-user-id').value;
    const users = DB.getUsers();
    const u = users.find(usr => usr.id === uid);

    if (u) {
      u.name = document.getElementById('edit-user-name').value;
      u.email = document.getElementById('edit-user-email').value;
      u.gender = document.getElementById('edit-user-gender').value;
      u.status = document.getElementById('edit-user-status').value;
      u.mobile = document.getElementById('edit-user-mobile').value;
      u.address = document.getElementById('edit-user-address').value;

      DB.saveUser(u);
      document.getElementById('edit-user-modal').classList.add('hidden');
      editUserForm.reset();
      
      // Update management UI and dashboards
      renderAdminManagement();
      Dashboard.triggerSync();
    }
  });

  // Supplier Add Product form
  const addProductForm = document.getElementById('supplier-add-product-form');
  if (addProductForm) {
    const radioCustom = document.querySelector('input[name="prod-image-select"][value="custom"]');
    const inputCustomUrl = document.getElementById('prod-image-url');

    // Handle Custom Url image selection toggle input display
    document.querySelectorAll('input[name="prod-image-select"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radioCustom.checked) {
          inputCustomUrl.classList.remove('hidden');
          inputCustomUrl.required = true;
        } else {
          inputCustomUrl.classList.add('hidden');
          inputCustomUrl.required = false;
        }
      });
    });

    addProductForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('prod-name').value;
      const price = parseFloat(document.getElementById('prod-price').value);
      const stock = parseInt(document.getElementById('prod-stock').value, 10);
      const description = document.getElementById('prod-description').value;

      let image = '';
      const selectedImgPreset = document.querySelector('input[name="prod-image-select"]:checked').value;

      if (selectedImgPreset === 'custom') {
        image = inputCustomUrl.value;
      } else {
        // Fetch preset urls matching seeds
        const presets = {
          phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop',
          watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop',
          shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop',
          hoodie: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&auto=format&fit=crop',
          pack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop'
        };
        image = presets[selectedImgPreset];
      }

      const session = Auth.getSession();
      const newProduct = {
        id: 'prod_' + Math.random().toString(36).substr(2, 9),
        supplierId: session.userId,
        name,
        description,
        price,
        stock,
        image
      };

      DB.saveProduct(newProduct);
      addProductForm.reset();
      inputCustomUrl.classList.add('hidden');
      inputCustomUrl.required = false;

      // Show success
      const successEl = document.getElementById('add-product-success');
      successEl.classList.remove('hidden');
      setTimeout(() => successEl.classList.add('hidden'), 3000);

      // Force refresh data
      Dashboard.triggerSync();
    });
  }
}

// ================= PROFILE ACTIONS =================
function initProfileEvents() {
  const editNameBtn = document.getElementById('edit-profile-name-btn');
  if (editNameBtn) {
    editNameBtn.addEventListener('click', () => {
      const session = Auth.getSession();
      if (!session) return;

      const newName = prompt('Enter your new profile name:', session.name);
      if (newName && newName.trim() !== '') {
        const trimmed = newName.trim();

        // Update user in DB
        const users = DB.getUsers();
        const u = users.find(usr => usr.id === session.userId);
        if (u) {
          u.name = trimmed;
          DB.saveUser(u);

          // Update Session
          session.name = trimmed;
          sessionStorage.setItem('portal_session', JSON.stringify(session));

          // Update Sidebar UI
          document.getElementById('profile-name').textContent = trimmed;
          document.getElementById('user-avatar').textContent = trimmed.charAt(0).toUpperCase();

          // Refresh active view data to propagate the name change immediately
          refreshActiveViewData();
        }
      }
    });
  }
}
