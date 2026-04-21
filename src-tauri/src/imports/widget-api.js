let __renderPending = false;
let __renderMissed = false;
let __shouldRender = true;
const __actionHandlers = {};
let __renderCallback = null;
let __store = {};
const __render = s => {
  const html = Mustache.render(window.__widgetTemplate, s);
  const appHTML = document.getElementById('app');
  morphdom(appHTML, `<div id="app">${html}</div>`);
  if (__renderCallback && typeof __renderCallback == 'function') __renderCallback();
};
const __invoke = window.__TAURI__.core.invoke;
delete window.__TAURI__;

function scheduleRender() {
  if (!__shouldRender) {
    __renderMissed = true;
    return;
  }

  if (__renderPending) return;
  __renderPending = true;

  queueMicrotask(() => {
    __renderPending = false;
    __render(__store);
  });
}

const __proxyCache = new WeakMap();

function reactive(obj) {
  if (__proxyCache.has(obj)) return __proxyCache.get(obj);

  const proxy = new Proxy(obj, {
    get: (target, key) => {
      const val = target[key];
      return val && typeof val === 'object' ? reactive(val) : val;
    },
    set: (target, key, value) => {
      // note: if value is an object/array, === won't deep-compare so replacements always re-render
      if (value === target[key]) return true;
      target[key] = value;
      scheduleRender();
      return true;
    },
  });

  __proxyCache.set(obj, proxy);

  return proxy;
}

__store = reactive({});

window.widget = {
  onRefresh: (fn, delay = window.__config?.updateInterval ?? 500) => {
    fn();
    setInterval(fn, delay);
  },
  action: (name, payload) => {
    const handler = __actionHandlers[name];
    if (handler) handler(payload);
  },
  onAction: (name, fn) => {
    __actionHandlers[name] = fn;
  },
  renderWithCallback: callback => {
    __renderCallback = callback;
  },
  fetch: async (url, options = {}) => {
    const result = await __invoke('widget_fetch', {
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
  getSystemStats: () => __invoke('get_system_stats'),
  setLoading: isLoading => {
    const appElement = document.getElementById('app');
    if (!appElement) return;
    if (isLoading) {
      appElement.innerHTML = '<div class="widget-loading">Loading...</div>';
    } else {
      scheduleRender();
    }
  },
  setError: message => {
    const appElement = document.getElementById('app');
    if (!appElement) return;
    __shouldRender = false;
    appElement.innerHTML = `<div class="widget-error">${message}</div>`;
  },
  pauseRender: () => (__shouldRender = false),
  resumeRender: () => {
    __shouldRender = true;

    if (__renderMissed) {
      __renderMissed = false;
      scheduleRender();
    }
  },
};

Object.defineProperty(window.widget, 'store', {
  get: () => __store,
  set: value => {
    __store = reactive(value);
    scheduleRender();
  },
});

document.addEventListener('mousedown', e => {
  if (e.ctrlKey) __invoke('start_dragging');
});
