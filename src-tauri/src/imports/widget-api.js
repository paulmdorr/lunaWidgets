let __renderPending = false;
let __renderMissed = false;
let __shouldRender = true;
const __actionHandlers = {};
let __renderCallback = null;
let __store = {};

const __invoke = window.__TAURI__.core.invoke;
delete window.__TAURI__;

let __widgetTemplate = '';
window.__setWidgetTemplate = t => {
  __widgetTemplate = t;
  delete window.__setWidgetTemplate;
};

const __render = s => {
  const html = Mustache.render(__widgetTemplate, s);
  const appHTML = document.getElementById('app');
  morphdom(appHTML, `<div id="app">${html}</div>`);
  if (__renderCallback && typeof __renderCallback == 'function') __renderCallback();
};

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
  onRefresh: (fn, delay = widget.config?.updateInterval ?? 500) => {
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
    document.querySelector('.widget-toast')?.remove();
    const toastElement = document.createElement('div');
    toastElement.className = 'widget-toast';
    const iconElement = document.createElement('div');
    iconElement.className = 'widget-toast-icon';
    iconElement.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="white" fill-rule="evenodd"><path d="M12 3L21.5 20H2.5z M11 9h2v5.5h-2z M11 16.5h2v2h-2z"/></svg>`;
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    toastElement.appendChild(iconElement);
    toastElement.appendChild(messageElement);
    document.body.appendChild(toastElement);
    setTimeout(() => {
      toastElement.classList.add('widget-toast--out');
      toastElement.addEventListener('animationend', () => toastElement.remove());
    }, 3000);
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
