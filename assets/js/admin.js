/**
 * 个人简历网站 - 管理后台 JavaScript
 * ============================================
 * 功能: 登录、开关控制、计划调度、访问统计
 * ============================================
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  let isAuthenticated = false;
  let currentConfig = null;

  const loginPanel = document.getElementById('login-panel');
  const adminPanel = document.getElementById('admin-panel');

  // ==========================================
  // 初始化
  // ==========================================
  async function init() {
    currentConfig = await AccessControl.loadConfig();

    // 尝试恢复 session
    if (sessionStorage.getItem('resume_admin_auth') === 'true') {
      isAuthenticated = true;
      showAdminPanel();
    } else {
      showLoginPanel();
    }
  }

  function showLoginPanel() {
    loginPanel.classList.remove('hidden');
    adminPanel.classList.add('hidden');
  }

  function showAdminPanel() {
    loginPanel.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    loadSettings();
    loadStats();
  }

  // ==========================================
  // 登录
  // ==========================================
  const loginBtn = document.getElementById('login-btn');
  const loginPwd = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');

  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
    loginPwd.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  function handleLogin() {
    const pwd = loginPwd.value;
    if (AccessControl.verifyPassword(pwd)) {
      isAuthenticated = true;
      sessionStorage.setItem('resume_admin_auth', 'true');
      showAdminPanel();
      loginError.classList.add('hidden');
      loginPwd.value = '';
    } else {
      loginError.classList.remove('hidden');
      loginPwd.value = '';
      loginPwd.focus();
    }
  }

  // ==========================================
  // 登出
  // ==========================================
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      isAuthenticated = false;
      sessionStorage.removeItem('resume_admin_auth');
      showLoginPanel();
    });
  }

  // ==========================================
  // 加载设置
  // ==========================================
  function loadSettings() {
    const cfg = AccessControl.getConfig();

    // 总开关
    const masterToggle = document.getElementById('master-toggle');
    masterToggle.checked = cfg.enabled;

    // 手动覆盖
    const manualToggle = document.getElementById('manual-toggle');
    const manualStatus = document.getElementById('manual-status');
    manualToggle.checked = cfg.manual_override_enabled ? cfg.manual_override : cfg.enabled;
    updateManualStatus(manualToggle.checked);

    // 计划调度
    const scheduleToggle = document.getElementById('schedule-toggle');
    scheduleToggle.checked = cfg.schedule && cfg.schedule.enable_schedule;

    // 维护信息
    const messageInput = document.getElementById('access-message');
    messageInput.value = cfg.message || '';

    // 密码
    const pwdInput = document.getElementById('admin-password');
    pwdInput.value = cfg.password || '';

    // 时间段设置
    renderScheduleWindows(cfg.schedule && cfg.schedule.windows ? cfg.schedule.windows : []);
  }

  function updateManualStatus(enabled) {
    const status = document.getElementById('manual-status');
    if (status) {
      status.textContent = enabled ? '🟢 网站可访问' : '🔴 网站已关闭';
      status.className = enabled ? 'status-badge status-on' : 'status-badge status-off';
    }
  }

  // ==========================================
  // 总开关
  // ==========================================
  const masterToggle = document.getElementById('master-toggle');
  if (masterToggle) {
    masterToggle.addEventListener('change', () => {
      AccessControl.updateConfig({ enabled: masterToggle.checked });

      // 如果手动覆盖未启用, 同步手动覆盖状态
      const cfg = AccessControl.getConfig();
      if (!cfg.manual_override_enabled) {
        const manualToggle = document.getElementById('manual-toggle');
        manualToggle.checked = masterToggle.checked;
        updateManualStatus(masterToggle.checked);
      }

      showToast(masterToggle.checked ? '✅ 网站已开放访问' : '🔒 网站已关闭访问');
    });
  }

  // ==========================================
  // 手动覆盖开关
  // ==========================================
  const manualToggle = document.getElementById('manual-toggle');
  if (manualToggle) {
    manualToggle.addEventListener('change', () => {
      AccessControl.toggleManualOverride(manualToggle.checked);
      updateManualStatus(manualToggle.checked);
      showToast(manualToggle.checked ? '✅ 手动开启访问' : '🔒 手动关闭访问');
    });
  }

  // ==========================================
  // 恢复自动调度
  // ==========================================
  const autoBtn = document.getElementById('restore-auto-btn');
  if (autoBtn) {
    autoBtn.addEventListener('click', () => {
      AccessControl.disableManualOverride();
      const cfg = AccessControl.getConfig();
      const manualToggle = document.getElementById('manual-toggle');
      manualToggle.checked = cfg.enabled;
      updateManualStatus(cfg.enabled);
      showToast('🔄 已切换为自动调度模式');
    });
  }

  // ==========================================
  // 计划调度
  // ==========================================
  const scheduleToggle = document.getElementById('schedule-toggle');
  if (scheduleToggle) {
    scheduleToggle.addEventListener('change', () => {
      const cfg = AccessControl.getConfig();
      cfg.schedule = cfg.schedule || { enable_schedule: false, timezone: 'Asia/Shanghai', windows: [] };
      cfg.schedule.enable_schedule = scheduleToggle.checked;
      AccessControl.updateConfig(cfg);
      showToast(scheduleToggle.checked ? '📅 时间段调度已开启' : '📅 时间段调度已关闭');
    });
  }

  // ==========================================
  // 时间窗口渲染
  // ==========================================
  function renderScheduleWindows(windows) {
    const container = document.getElementById('schedule-windows');
    if (!container) return;

    if (!windows || windows.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span style="font-size:32px;">📅</span>
          <p>暂无时间段设置</p>
          <button class="btn btn-primary btn-sm" onclick="addTimeWindow()">+ 添加时间段</button>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    windows.forEach((win, index) => {
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      const selectedDays = (win.days || []).map(d => dayNames[d]).join('、') || '未选择';

      const card = document.createElement('div');
      card.className = 'window-card';
      card.innerHTML = `
        <div class="window-header">
          <span class="window-name">${win.name || '时间段 ' + (index + 1)}</span>
          <button class="btn-icon danger" onclick="removeTimeWindow(${index})" title="删除">✕</button>
        </div>
        <div class="window-days">星期 ${selectedDays}</div>
        <div class="window-time">${win.start || '00:00'} — ${win.end || '23:59'}</div>
      `;
      container.appendChild(card);
    });

    // 添加按钮
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-outline btn-sm add-window-btn';
    addBtn.textContent = '+ 添加时间段';
    addBtn.onclick = addTimeWindow;
    container.appendChild(addBtn);
  }

  // ==========================================
  // 新增/删除时间窗口 (挂载到 window 供 onclick 调用)
  // ==========================================
  window.addTimeWindow = function() {
    const cfg = AccessControl.getConfig();
    cfg.schedule = cfg.schedule || { enable_schedule: !!document.getElementById('schedule-toggle')?.checked, timezone: 'Asia/Shanghai', windows: [] };
    cfg.schedule.windows.push({
      name: '工作时间',
      days: [1, 2, 3, 4, 5],
      start: '09:00',
      end: '18:00'
    });
    AccessControl.updateConfig(cfg);
    renderScheduleWindows(cfg.schedule.windows);
    showToast('✅ 已添加时间段，请在下方详细编辑');
  };

  window.removeTimeWindow = function(index) {
    const cfg = AccessControl.getConfig();
    if (cfg.schedule && cfg.schedule.windows) {
      cfg.schedule.windows.splice(index, 1);
      AccessControl.updateConfig(cfg);
      renderScheduleWindows(cfg.schedule.windows);
      showToast('🗑️ 时间段已删除');
    }
  };

  // ==========================================
  // 保存所有设置
  // ==========================================
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAllSettings);
  }

  function saveAllSettings() {
    const message = document.getElementById('access-message').value;
    const password = document.getElementById('admin-password').value;

    const cfg = AccessControl.getConfig();
    cfg.message = message;
    cfg.password = password;

    AccessControl.updateConfig(cfg);

    // 如果修改了密码则重新登录
    if (password !== currentConfig.password) {
      setTimeout(() => {
        showToast('🔑 密码已修改，请重新登录');
        setTimeout(() => logoutBtn.click(), 1500);
      }, 500);
    } else {
      showToast('✅ 设置已保存');
    }

    // 更新时间窗口数据
    saveScheduleWindows();
  }

  function saveScheduleWindows() {
    const windowCards = document.querySelectorAll('.window-card');
    if (windowCards.length === 0) return;

    const cfg = AccessControl.getConfig();
    cfg.schedule = cfg.schedule || { enable_schedule: false, timezone: 'Asia/Shanghai', windows: [] };

    // 从 DOM 读取已存在的时间窗口
    // (新增的通过 addTimeWindow 已保存)
  }

  // ==========================================
  // 访问统计
  // ==========================================
  function loadStats() {
    const stats = AccessControl.getVisitStats();

    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-today').textContent = stats.today;
    document.getElementById('stat-last-visit').textContent = stats.lastVisit
      ? new Date(stats.lastVisit).toLocaleString('zh-CN')
      : '暂无记录';

    // 渲染日志表格
    const tbody = document.getElementById('log-table-body');
    if (tbody) {
      if (stats.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">暂无访问记录</td></tr>';
      } else {
        tbody.innerHTML = stats.logs.reverse().map(log => `
          <tr>
            <td>${new Date(log.timestamp).toLocaleString('zh-CN')}</td>
            <td title="${log.userAgent}">${log.userAgent.substring(0, 50)}${log.userAgent.length > 50 ? '...' : ''}</td>
            <td title="${log.referrer}">${log.referrer === '直接访问' ? '直接访问' : (log.referrer.substring(0, 40) + (log.referrer.length > 40 ? '...' : ''))}</td>
            <td>
              <span class="status-dot ${log.referrer === '直接访问' ? 'direct' : 'referral'}"></span>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // ==========================================
  // 清除日志
  // ==========================================
  const clearLogsBtn = document.getElementById('clear-logs-btn');
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      if (confirm('确定要清除所有访问日志吗？')) {
        AccessControl.clearLogs();
        loadStats();
        showToast('🗑️ 访问日志已清除');
      }
    });
  }

  // ==========================================
  // 刷新统计
  // ==========================================
  const refreshStatsBtn = document.getElementById('refresh-stats-btn');
  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', () => {
      loadStats();
      showToast('🔄 统计已刷新');
    });
  }

  // ==========================================
  // 重置配置
  // ==========================================
  const resetBtn = document.getElementById('reset-config-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('⚠️ 确定要重置所有配置为默认值吗？\n此操作不可撤销！')) {
        AccessControl.resetConfig();
        currentConfig = AccessControl.getConfig();
        loadSettings();
        showToast('🔄 配置已重置为默认值');
      }
    });
  }

  // ==========================================
  // Toast 通知
  // ==========================================
  function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ==========================================
  // 快捷键
  // ==========================================
  document.addEventListener('keydown', (e) => {
    // Ctrl+Enter 保存
    if (e.ctrlKey && e.key === 'Enter' && isAuthenticated) {
      saveAllSettings();
      showToast('✅ 设置已保存');
    }
    // Escape 登出
    if (e.key === 'Escape' && isAuthenticated) {
      if (confirm('确定要登出吗？')) {
        logoutBtn.click();
      }
    }
  });

  // ==========================================
  // 预览网站
  // ==========================================
  const previewBtn = document.getElementById('preview-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      window.open('index.html', '_blank');
    });
  }

  // ---- 启动 ----
  init();
});
