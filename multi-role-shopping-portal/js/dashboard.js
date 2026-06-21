// dashboard.js - Charts & Real-Time Stats Renderer
import { DB } from './db.js';
import { Auth } from './auth.js';

let refreshTimer = null;
const SYNC_DURATION = 120; // 2 minutes in seconds
let secondsRemaining = SYNC_DURATION;
let updateCallback = null; // Callback to notify app to reload UI elements

export class Dashboard {
  static startAutoUpdate(callback) {
    updateCallback = callback;
    if (refreshTimer) clearInterval(refreshTimer);
    
    secondsRemaining = SYNC_DURATION;
    this.updateProgressHUD();

    refreshTimer = setInterval(() => {
      secondsRemaining--;
      if (secondsRemaining <= 0) {
        secondsRemaining = SYNC_DURATION;
        this.triggerSync();
      } else {
        this.updateProgressHUD();
      }
    }, 1000);
  }

  static triggerSync() {
    secondsRemaining = SYNC_DURATION;
    this.updateProgressHUD();
    
    // Play a tiny subtle visual confirmation
    const banner = document.getElementById('sync-banner');
    if (banner) {
      banner.style.borderColor = 'var(--accent-user)';
      setTimeout(() => banner.style.borderColor = 'var(--border-glass)', 1000);
    }

    // Refresh dashboards
    this.renderAdminDashboard();
    this.renderSupplierDashboard();
    
    if (updateCallback) {
      updateCallback();
    }
  }

  static updateProgressHUD() {
    const textEl = document.getElementById('sync-text');
    const barEl = document.getElementById('sync-bar');
    if (textEl) textEl.textContent = `Sync in ${secondsRemaining}s`;
    if (barEl) {
      const pct = (secondsRemaining / SYNC_DURATION);
      barEl.style.transform = `scaleX(${pct})`;
    }
  }

  // ================= ADMIN DASHBOARD =================
  static renderAdminDashboard() {
    const users = DB.getUsers();
    const orders = DB.getOrders();

    const customerUsers = users.filter(u => u.role === 'user');
    const supplierUsers = users.filter(u => u.role === 'supplier');

    // Stats
    const userCountEl = document.getElementById('admin-stat-users');
    const supplierCountEl = document.getElementById('admin-stat-suppliers');
    const salesCountEl = document.getElementById('admin-stat-sales');

    if (userCountEl) userCountEl.textContent = customerUsers.length;
    if (supplierCountEl) supplierCountEl.textContent = supplierUsers.length;

    // Daily Sales (today's orders count)
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.date === today);
    if (salesCountEl) salesCountEl.textContent = todayOrders.length;

    // 1. Gender distribution Donut Chart (Admin shows all users + suppliers)
    const genderStats = { male: 0, female: 0, other: 0 };
    users.forEach(u => {
      if (u.role !== 'admin') {
        const g = u.gender ? u.gender.toLowerCase() : 'other';
        genderStats[g] = (genderStats[g] || 0) + 1;
      }
    });

    this.drawDonutChart(
      'admin-gender-chart',
      genderStats.male,
      genderStats.female,
      genderStats.other,
      'Total users'
    );

    // 2. Weekly Orders performance Bar Chart (Placed vs Cancelled)
    // Gather statistics for the last 5 days
    const last5Days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (4 - i));
      return d.toISOString().split('T')[0];
    });

    const chartData = last5Days.map(date => {
      const dayOrders = orders.filter(o => o.date === date);
      const placed = dayOrders.filter(o => o.status !== 'cancelled').length;
      const cancelled = dayOrders.filter(o => o.status === 'cancelled').length;
      return { date, placed, cancelled };
    });

    this.drawBarChart('admin-orders-chart', chartData);
  }

  // ================= SUPPLIER DASHBOARD =================
  static renderSupplierDashboard() {
    const session = Auth.getSession();
    if (!session || session.role !== 'supplier') return;

    const supplierId = session.userId;
    const allOrders = DB.getOrders();
    const supplierOrders = allOrders.filter(o => o.supplierId === supplierId);

    // Calc metrics
    const totalOrders = supplierOrders.length;
    const completedOrders = supplierOrders.filter(o => o.status === 'completed');
    const revenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const cancelledCount = supplierOrders.filter(o => o.status === 'cancelled').length;

    const ordersEl = document.getElementById('supplier-stat-orders');
    const revenueEl = document.getElementById('supplier-stat-revenue');
    const cancelledEl = document.getElementById('supplier-stat-cancelled');

    if (ordersEl) ordersEl.textContent = totalOrders;
    if (revenueEl) revenueEl.textContent = `$${revenue.toLocaleString()}`;
    if (cancelledEl) cancelledEl.textContent = cancelledCount;

    // 1. Supplier customer demographics (Genders of users who ordered from this supplier)
    const genderStats = { male: 0, female: 0, other: 0 };
    supplierOrders.forEach(o => {
      const g = o.userGender ? o.userGender.toLowerCase() : 'other';
      genderStats[g] = (genderStats[g] || 0) + 1;
    });

    this.drawDonutChart(
      'supplier-gender-chart',
      genderStats.male,
      genderStats.female,
      genderStats.other,
      'Total orders'
    );

    // 2. Supplier daily sales trend (Orders placed vs cancelled)
    const last5Days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (4 - i));
      return d.toISOString().split('T')[0];
    });

    const chartData = last5Days.map(date => {
      const dayOrders = supplierOrders.filter(o => o.date === date);
      const placed = dayOrders.filter(o => o.status !== 'cancelled').length;
      const cancelled = dayOrders.filter(o => o.status === 'cancelled').length;
      return { date, placed, cancelled };
    });

    this.drawBarChart('supplier-trend-chart', chartData);
  }

  // ================= SVG DRAWING HELPERS =================
  
  /**
   * Draw a premium SVG Donut Chart
   */
  static drawDonutChart(containerId, male, female, other, centerSubText) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = male + female + other;
    if (total === 0) {
      container.innerHTML = `<div class="cart-empty-state"><i data-lucide="pie-chart"></i><p>No demographic data available yet</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const malePct = male / total;
    const femalePct = female / total;
    const otherPct = other / total;

    const radius = 50;
    const circ = 2 * Math.PI * radius; // 314.16

    const maleStroke = circ * malePct;
    const femaleStroke = circ * femalePct;
    const otherStroke = circ * otherPct;

    // Offsets (accumulative offsets rotating clockwise)
    const maleOffset = 0;
    const femaleOffset = -maleStroke;
    const otherOffset = -(maleStroke + femaleStroke);

    const svgHTML = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: 100%;">
        <svg class="donut-svg" viewBox="0 0 120 120">
          <circle class="donut-bg" cx="60" cy="60" r="${radius}"></circle>
          
          ${male > 0 ? `
            <circle class="donut-segment" cx="60" cy="60" r="${radius}"
              stroke="var(--accent-user)"
              stroke-dasharray="${maleStroke} ${circ - maleStroke}"
              stroke-dashoffset="${maleOffset}"></circle>
          ` : ''}
          
          ${female > 0 ? `
            <circle class="donut-segment" cx="60" cy="60" r="${radius}"
              stroke="var(--accent-supplier)"
              stroke-dasharray="${femaleStroke} ${circ - femaleStroke}"
              stroke-dashoffset="${femaleOffset}"></circle>
          ` : ''}

          ${other > 0 ? `
            <circle class="donut-segment" cx="60" cy="60" r="${radius}"
              stroke="var(--accent-warning)"
              stroke-dasharray="${otherStroke} ${circ - otherStroke}"
              stroke-dashoffset="${otherOffset}"></circle>
          ` : ''}
        </svg>

        <div class="chart-center-label">
          <span class="chart-center-val">${total}</span>
          <span class="chart-center-sub">${centerSubText}</span>
        </div>

        <div class="chart-legend">
          <div class="legend-item">
            <span class="legend-dot" style="background: var(--accent-user);"></span>
            <span>Male (${male})</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: var(--accent-supplier);"></span>
            <span>Female (${female})</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: var(--accent-warning);"></span>
            <span>Other (${other})</span>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = svgHTML;
  }

  /**
   * Draw a side-by-side double column bar chart
   */
  static drawBarChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Find max value to calibrate height scale
    const maxVal = Math.max(...data.flatMap(d => [d.placed, d.cancelled]), 4); // default min scale of 4

    const width = 380;
    const height = 180;
    const padding = 24;

    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    const barWidth = 14;
    const groupGap = 40;

    // Grid lines HTML
    let gridLinesHTML = '';
    const gridDivisions = 4;
    for (let i = 0; i <= gridDivisions; i++) {
      const y = padding + (chartHeight * (1 - i / gridDivisions));
      const val = Math.round((maxVal / gridDivisions) * i);
      gridLinesHTML += `
        <line class="chart-grid-line" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"></line>
        <text x="${padding - 8}" y="${y + 3}" text-anchor="end">${val}</text>
      `;
    }

    // Bars & labels HTML
    let barsHTML = '';
    const stepX = chartWidth / (data.length - 0.5);

    data.forEach((day, index) => {
      const groupX = padding + (index * stepX) + 10;
      
      // Placed order bar
      const placedHeight = (day.placed / maxVal) * chartHeight;
      const placedY = padding + chartHeight - placedHeight;

      // Cancelled order bar
      const cancelledHeight = (day.cancelled / maxVal) * chartHeight;
      const cancelledY = padding + chartHeight - cancelledHeight;

      // Date labeling
      const dateObj = new Date(day.date);
      const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

      barsHTML += `
        <!-- Placed orders bar -->
        <rect class="bar-rect-placed" 
              x="${groupX}" 
              y="${placedY}" 
              width="${barWidth}" 
              height="${placedHeight}" 
              title="Placed: ${day.placed}"></rect>
              
        <!-- Cancelled orders bar -->
        <rect class="bar-rect-cancelled" 
              x="${groupX + barWidth + 4}" 
              y="${cancelledY}" 
              width="${barWidth}" 
              height="${cancelledHeight}" 
              title="Cancelled: ${day.cancelled}"></rect>

        <text x="${groupX + barWidth + 2}" y="${height - 6}" text-anchor="middle" style="font-size: 9px; fill: var(--text-secondary);">${dayLabel}</text>
      `;
    });

    const svgHTML = `
      <svg class="bar-svg" viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
        ${gridLinesHTML}
        ${barsHTML}
      </svg>
      <div class="chart-legend" style="margin-top: 10px;">
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--accent-user);"></span>
          <span>Orders Placed / Active</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--accent-danger);"></span>
          <span>Orders Cancelled</span>
        </div>
      </div>
    `;

    container.innerHTML = svgHTML;
  }
}
