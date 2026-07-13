/**
 * 个人简历网站 - 访问控制系统
 * ============================================
 * 功能:
 * 1. 手动开关 - 一键开启/关闭网站访问
 * 2. 时间段调度 - 按星期/时间段控制访问
 * 3. 访问日志 - 记录访问信息
 * 4. 密码保护管理后台
 * ============================================
 */

const AccessControl = (() => {
  'use strict';

  // ---- 配置 ----
  const CONFIG_KEY = 'resume_access_config';
  const LOG_KEY = 'resume_visit_log';
  const DEFAULT_CONFIG = {
    enabled: true,
    manual_override: false,
    manual_override_enabled: false,
    message: '网站暂时关闭维护中，请稍后再访问。',
    schedule: {
      enable_schedule: false,
      timezone: 'Asia/Shanghai',
      windows: [
        { name: '工作时间', days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00' }
      ]
    },
    password: 'admin123'
  };

  // ---- 状态 ----
  let config = null;
  let isInitialized = false;

  /**
   * 加载配置 (localStorage > config.json > 默认)
   */
  async function loadConfig() {
    // 先从 localStorage 加载用户自定义配置
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        config = deepMerge(clone(DEFAULT_CONFIG), parsed);
      } catch {
        config = clone(DEFAULT_CONFIG);
      }
    } else {
      config = clone(DEFAULT_CONFIG);
    }

    // 尝试从 config.json 加载，合并覆盖
    try {
      const resp = await fetch('./config.json', { cache: 'no-cache' });
      if (resp.ok) {
        const remote = await resp.json();
        if (remote.access_control) {
          config = deepMerge(config, remote.access_control);
        }
      }
    } catch {
      // config.json 不存在时使用默认配置
    }

    // localStorage 中保存的手动覆盖状态优先
    const manualOverride = localStorage.getItem('resume_manual_override');
    if (manualOverride !== null) {
      config.manual_override = manualOverride === 'true';
      config.manual_override_enabled = true;
    }

    isInitialized = true;
    return config;
  }

  /**
   * 检查当前是否可以访问
   */
  function checkAccess(cfg) {
    cfg = cfg || config;

    // 1. 系统总开关
    if (!cfg.enabled) {
      return { allowed: false, reason: '系统维护中', message: cfg.message || DEFAULT_CONFIG.message };
    }

    // 2. 手动覆盖 (管理员手动开关)
    if (cfg.manual_override_enabled) {
      if (!cfg.manual_override) {
        return { allowed: false, reason: '管理员已手动关闭', message: cfg.message || DEFAULT_CONFIG.message };
      }
      return { allowed: true, reason: '手动开启' };
    }

    // 3. 时间段调度
    if (cfg.schedule && cfg.schedule.enable_schedule) {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=周日, 1=周一...
      const timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes());

      // 转换为数字比较
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      let inWindow = false;
      for (const win of cfg.schedule.windows) {
        // 检查星期匹配
        if (!win.days.includes(dayOfWeek)) continue;

        // 检查时间范围
        const startParts = win.start.split(':').map(Number);
        const endParts = win.end.split(':').map(Number);
        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];

        if (startMinutes <= endMinutes) {
          // 正常时间段
          if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            inWindow = true;
            break;
          }
        } else {
          // 跨夜时间段 (如 22:00 - 06:00)
          if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
            inWindow = true;
            break;
          }
        }
      }

      if (!inWindow) {
        const nextWindow = getNextAvailableTime(cfg.schedule);
        return {
          allowed: false,
          reason: '非开放时间',
          message: cfg.message || DEFAULT_CONFIG.message,
          nextAvailable: nextWindow
        };
      }
    }

    return { allowed: true, reason: '正常访问' };
  }

  /**
   * 获取下一个可用开放时间
   */
  function getNextAvailableTime(schedule) {
    if (!schedule || !schedule.windows.length) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();

    // 搜索接下来的 7 天
    for (let offset = 0; offset <= 7; offset++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + offset);
      const checkDay = checkDate.getDay();

      for (const win of schedule.windows) {
        if (!win.days.includes(checkDay)) continue;

        const startParts = win.start.split(':').map(Number);
        const startMinutes = startParts[0] * 60 + startParts[1];

        if (offset === 0 && startMinutes <= currentMinutes) continue;

        checkDate.setHours(startParts[0], startParts[1], 0, 0);
        return {
          date: checkDate.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' }),
          time: win.start,
          name: win.name
        };
      }
    }
    return null;
  }

  /**
   * 记录访问日志
   */
  function logVisit() {
    try {
      const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      logs.push({
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent.substring(0, 120),
        referrer: document.referrer || '直接访问',
        url: window.location.href,
        ip: '' // 服务端可补充
      });

      // 保留最近 500 条
      if (logs.length > 500) {
        logs.splice(0, logs.length - 500);
      }

      localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    } catch {
      // localStorage 满时忽略
    }
  }

  /**
   * 获取访问日志统计
   */
  function getVisitStats() {
    try {
      const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      const today = new Date().toISOString().split('T')[0];

      return {
        total: logs.length,
        today: logs.filter(l => l.timestamp.startsWith(today)).length,
        lastVisit: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
        logs: logs.slice(-100) // 最近 100 条
      };
    } catch {
      return { total: 0, today: 0, lastVisit: null, logs: [] };
    }
  }

  /**
   * 执行访问控制并显示覆盖层
   */
  async function enforce() {
    await loadConfig();
    const result = checkAccess();

    // 记录访问
    logVisit();

    if (!result.allowed) {
      showAccessDenied(result);
    }

    return result;
  }

  /**
   * 显示访问被拒绝覆盖层
   */
  function showAccessDenied(result) {
    const overlay = document.createElement('div');
    overlay.className = 'access-overlay active';
    overlay.id = 'access-denied-overlay';

    let nextTimeHtml = '';
    if (result.nextAvailable) {
      nextTimeHtml = `
        <div style="margin-top:16px;padding:12px;background:color-mix(in srgb, var(--color-accent) 10%, transparent);border-radius:8px;font-size:0.9rem;">
          📅 下次开放时间：${result.nextAvailable.date} ${result.nextAvailable.time}
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="access-denied-card">
        <div class="icon">🔒</div>
        <h2>网站暂时无法访问</h2>
        <p>${result.message}</p>
        ${nextTimeHtml}
        <div style="margin-top:16px;font-size:0.8rem;color:var(--color-text-muted);">
          管理员如需登录后台，请 <a href="admin.html">点击这里</a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  // ---- 管理后台 API ----

  /**
   * 验证管理员密码
   */
  function verifyPassword(inputPassword) {
    return inputPassword === config.password;
  }

  /**
   * 切换手动覆盖状态
   */
  function toggleManualOverride(enable) {
    if (enable !== undefined) {
      config.manual_override = enable;
    } else {
      config.manual_override = !config.manual_override;
    }
    config.manual_override_enabled = true;

    // 保存到 localStorage
    localStorage.setItem('resume_manual_override', String(config.manual_override));
    saveConfig();
    return config.manual_override;
  }

  /**
   * 关闭手动覆盖，恢复自动调度
   */
  function disableManualOverride() {
    config.manual_override_enabled = false;
    localStorage.removeItem('resume_manual_override');
    saveConfig();
  }

  /**
   * 更新配置
   */
  function updateConfig(newConfig) {
    config = deepMerge(config, newConfig);
    saveConfig();
  }

  /**
   * 重置配置
   */
  function resetConfig() {
    config = clone(DEFAULT_CONFIG);
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem('resume_manual_override');
  }

  /**
   * 保存配置到 localStorage
   */
  function saveConfig() {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      // 忽略
    }
  }

  /**
   * 获取当前配置
   */
  function getConfig() {
    return config ? clone(config) : clone(DEFAULT_CONFIG);
  }

  /**
   * 清除访问日志
   */
  function clearLogs() {
    localStorage.removeItem(LOG_KEY);
  }

  // ---- 工具函数 ----

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function deepMerge(target, source) {
    const result = clone(target);
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // ---- 公开 API ----
  return {
    loadConfig,
    checkAccess: (cfg) => checkAccess(cfg || config),
    enforce,
    verifyPassword,
    toggleManualOverride,
    disableManualOverride,
    updateConfig,
    resetConfig,
    getConfig,
    getVisitStats,
    clearLogs,
    logVisit
  };
})();
