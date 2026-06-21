// db.js - LocalStorage Database Controller
const DB_KEY = 'multi_role_shopping_db_v2';

const SEED_USERS = [
  { id: 'usr_admin', email: 'admin@portal.com', password: 'admin', role: 'admin', name: 'Alexander Admin', gender: 'male', address: 'Admin Suite, Central HQ', mobile: '555-0100', status: 'active' }
];

const SEED_PRODUCTS = [];

// Seed orders stretching over the last few days to populate charts
const getPastDateStr = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const SEED_ORDERS = [];

export class DB {
  static init() {
    if (!localStorage.getItem(DB_KEY)) {
      const db = {
        users: SEED_USERS,
        products: SEED_PRODUCTS,
        orders: SEED_ORDERS
      };
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    }
  }

  static get() {
    this.init();
    return JSON.parse(localStorage.getItem(DB_KEY));
  }

  static save(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  }

  // --- Users Section ---
  static getUsers() {
    return this.get().users;
  }

  static saveUser(user) {
    const db = this.get();
    const index = db.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      db.users[index] = user;
    } else {
      db.users.push(user);
    }
    this.save(db);
    return user;
  }

  static deleteUser(userId) {
    const db = this.get();
    db.users = db.users.filter(u => u.id !== userId);
    // Remove orders associated with this user, or keep for records. Let's delete to make it clean.
    db.orders = db.orders.filter(o => o.userId !== userId);
    this.save(db);
  }

  // --- Products Section ---
  static getProducts() {
    return this.get().products;
  }

  static getProductsBySupplier(supplierId) {
    return this.get().products.filter(p => p.supplierId === supplierId);
  }

  static saveProduct(product) {
    const db = this.get();
    const index = db.products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      db.products[index] = product;
    } else {
      db.products.push(product);
    }
    this.save(db);
    return product;
  }

  static deleteProduct(productId) {
    const db = this.get();
    db.products = db.products.filter(p => p.id !== productId);
    this.save(db);
  }

  // --- Orders Section ---
  static getOrders() {
    return this.get().orders;
  }

  static getOrdersBySupplier(supplierId) {
    return this.get().orders.filter(o => o.supplierId === supplierId);
  }

  static getOrdersByUser(userId) {
    return this.get().orders.filter(o => o.userId === userId);
  }

  static createOrder(orderData) {
    const db = this.get();
    const newOrder = {
      id: 'ord_' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      ...orderData
    };
    db.orders.push(newOrder);

    // Deduct stock
    const prodIndex = db.products.findIndex(p => p.id === orderData.productId);
    if (prodIndex !== -1) {
      db.products[prodIndex].stock = Math.max(0, db.products[prodIndex].stock - orderData.quantity);
    }

    this.save(db);
    return newOrder;
  }

  static updateOrderStatus(orderId, status) {
    const db = this.get();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
      const oldStatus = order.status;
      order.status = status;

      // Restock if order gets cancelled
      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        const prod = db.products.find(p => p.id === order.productId);
        if (prod) {
          prod.stock += order.quantity;
        }
      }
      this.save(db);
    }
  }
}
