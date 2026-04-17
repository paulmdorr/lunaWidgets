window.__actionHandlers = {};
window.__state = {};
window.__renderFn = null;
window.widget = {
  onRefresh: (fn, delay = window.__config?.updateInterval ?? 500) => {
    fn();
    setInterval(fn, delay);
  },
  action: (name, payload) => {
    const handler = window.__actionHandlers[name];
    if (handler) handler(payload);
  },
  onAction: (name, fn) => {
    window.__actionHandlers[name] = fn;
  },
  useState: initial => {
    window.__state = { ...initial };
    return window.__state;
  },
  setState: partial => {
    window.__state = { ...window.__state, ...partial };
    if (window.__renderFn && document.readyState !== 'loading') {
      window.__renderFn(window.__state);
    }
  },
  render: callback => {
    const tmpl = typeof callback === 'string' ? callback : window.__widgetTemplate;
    const after = typeof callback === 'function' ? callback : null;
    window.__renderFn = s => {
      if (!tmpl) return;
      const html = Mustache.render(tmpl, s);
      const appHTML = document.getElementById('app');
      morphdom(appHTML, `<div id="app">${html}</div>`);
      if (after) after();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => window.__renderFn(window.__state));
    } else {
      window.__renderFn(window.__state);
    }
  },
  fetch: async (url, options = {}) => {
    const result = await window.__TAURI__.core.invoke('widget_fetch', {
      request: {
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body || null,
      },
    });
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: () => Promise.resolve(JSON.parse(result.body)),
      text: () => Promise.resolve(result.body),
    };
  },
};

document.addEventListener('mousedown', e => {
  if (e.ctrlKey) window.__TAURI__.core.invoke('start_dragging');
});
