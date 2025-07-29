/*!
 * NightTrader SPA – Unified Architecture
 * ------------------------------------------------------------
 * • Single IIFE with clean global namespace
 * • Configurable network support (mainnet/testnet)
 * • Unified legacy compatibility layer
 * • Memory-efficient event system
 * • DRY principle with shared utilities
 * • High performance with minimal allocations
 * ------------------------------------------------------------
 */

(function () {
  "use strict";

  /* --------------------------------------------------------
   * 1. Configuration & Network Management
   * ------------------------------------------------------*/
  const CONFIG = {
    API_ENDPOINTS: {
      testnet: 'testnet-api.nighttrader.exchange',
      mainnet: 'my-api.nighttrader.exchange'
    },
    VALID_NETWORKS: ["mainnet", "testnet"],
    DEFAULT_NETWORK: "mainnet",
    REAUTH_INTERVAL: 5 * 60 * 1000, // 5 minutes
    WS_RECONNECT_DELAY: 1000,
    GUI_PAGESIZE: 15,
    SIGI_NUM: 30,
    ZERO_TXID: "0000000000000000000000000000000000000000000000000000000000000000"
  };

  // Network selection with localStorage persistence
  const getStoredNetwork = () => {
    try {
      const stored = localStorage.getItem("xybot");
      const parsed = stored ? JSON.parse(stored) : {};
      return CONFIG.VALID_NETWORKS.includes(parsed.network) 
        ? parsed.network 
        : CONFIG.DEFAULT_NETWORK;
    } catch {
      return CONFIG.DEFAULT_NETWORK;
    }
  };

  const setStoredNetwork = (network) => {
    if (!CONFIG.VALID_NETWORKS.includes(network)) return false;
    try {
      const stored = JSON.parse(localStorage.getItem("xybot") || "{}");
      stored.network = network;
      localStorage.setItem("xybot", JSON.stringify(stored));
      return true;
    } catch {
      return false;
    }
  };

  const CURRENT_NETWORK = getStoredNetwork();
  const NETWORK_HOST = CONFIG.API_ENDPOINTS[CURRENT_NETWORK];
  const WS_URL = `wss://${NETWORK_HOST}/ws`;
  const API_BASE = `https://${NETWORK_HOST}`;

  /* --------------------------------------------------------
   * 2. Utilities (Memory-efficient, reusable)
   * ------------------------------------------------------*/
  const utils = {
    // JSON parsing with BigInt support
    jsonBNparse: (k, v) => 
      typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,

    safeJSON: (str) => {
      try { return JSON.parse(str, utils.jsonBNparse); }
      catch { return null; }
    },

    // Cookie utilities
    getCookie: (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      return parts.length === 2 ? parts.pop().split(';').shift() : "";
    },

    setCookie: (name, value, options = {}) => {
      const opts = { SameSite: 'Strict', ...options };
      const optStr = Object.entries(opts).map(([k, v]) => `${k}=${v}`).join(';');
      document.cookie = `${name}=${value};${optStr}`;
    },

    // JWT utilities
    getJWT: () => utils.getCookie("jwt"),
    
    decodeJWT: (token = utils.getJWT()) => {
      if (!token) return {};
      try {
        const [, payload] = token.split(".");
        const decoded = payload.replace(/[-_]/g, m => ({ "-": "+", "_": "/" }[m]));
        return JSON.parse(atob(decoded));
      } catch {
        return {};
      }
    },

    // Debounce utility for performance
    debounce: (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Memory-efficient object pooling for frequent operations
    createPool: (createFn, resetFn) => {
      const pool = [];
      return {
        get: () => pool.length ? resetFn(pool.pop()) : createFn(),
        release: (obj) => pool.push(obj)
      };
    }
  };

  /* --------------------------------------------------------
   * 3. Event System (High-performance pub/sub)
   * ------------------------------------------------------*/
  const eventSystem = (() => {
    const events = new Map();
    
    const on = (event, handler) => {
      if (!events.has(event)) events.set(event, new Set());
      events.get(event).add(handler);
      
      // Return unsubscribe function
      return () => events.get(event)?.delete(handler);
    };

    const emit = (event, data) => {
      events.get(event)?.forEach(handler => {
        try { handler(data); }
        catch (error) { console.error(`Event handler error for ${event}:`, error); }
      });
    };

    const once = (event, handler) => {
      const unsubscribe = on(event, (data) => {
        unsubscribe();
        handler(data);
      });
      return unsubscribe;
    };

    return { on, emit, once };
  })();

  /* --------------------------------------------------------
   * 4. State Management (Memory-efficient store)
   * ------------------------------------------------------*/
  const store = (() => {
    const state = {
      connecting: true,
      data: null,
      balances: {},
      network: CURRENT_NETWORK,
      nnum: "",
      user: "",
      profile: null
    };

    const get = (key) => key ? state[key] : { ...state };
    
    const set = (key, value) => {
      if (state[key] === value) return;
      const oldValue = state[key];
      state[key] = value;
      eventSystem.emit(`state:${key}`, { value, oldValue });
      eventSystem.emit('state:change', { key, value, oldValue });
    };

    const update = (updates) => {
      Object.entries(updates).forEach(([key, value]) => set(key, value));
    };

    return { get, set, update };
  })();

  /* --------------------------------------------------------
   * 5. API Layer (RESTful and WebSocket)
   * ------------------------------------------------------*/
  const api = {
    // REST endpoints
    endpoints: {
      init: "/u/init",
      buy: "/u/buy",
      sell: "/u/sell",
      nobuy: "/u/nobuy",
      nosell: "/u/nosell",
      withdraw: "/u/withdraw",
      nowithdraw: "/u/nowithdraw",
      withdraw_evm_txid: "/u/withdraw_evm_txid",
      address: "/u/address",
      reauth: "/u/reauth"
    },

    // Generic request handler
    request: async (endpoint, options = {}) => {
      const url = `${API_BASE}${endpoint}`;
      const config = {
        headers: {
          "Authorization": `Bearer ${utils.getJWT()}`,
          "Content-Type": "application/json",
          ...options.headers
        },
        ...options
      };

      try {
        const response = await fetch(url, config);
        const text = await response.text();
        return utils.safeJSON(text) || { error: "Invalid JSON response" };
      } catch (error) {
        return { error: error.message };
      }
    },

    // Specific API methods
    init: () => api.request(api.endpoints.init),
    reauth: () => api.request(api.endpoints.reauth),
    buy: (data) => api.request(api.endpoints.buy, { method: "POST", body: JSON.stringify(data) }),
    sell: (data) => api.request(api.endpoints.sell, { method: "POST", body: JSON.stringify(data) }),
    withdraw: (data) => api.request(api.endpoints.withdraw, { method: "POST", body: JSON.stringify(data) }),
    getAddress: (coin) => api.request(`${api.endpoints.address}/${coin}`)
  };

  /* --------------------------------------------------------
   * 6. WebSocket Management
   * ------------------------------------------------------*/
  const websocket = (() => {
    let ws = null;
    let reauthTimer = null;
    let reconnectTimer = null;
    let isReconnecting = false;

    const handlers = new Map();
    
    const connect = () => {
      if (ws?.readyState === WebSocket.OPEN) return;
      
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        store.set("connecting", false);
        isReconnecting = false;
        
        // Send initial authentication
        send({ type: "init", jwt: utils.getJWT() });
        
        // Setup reauth timer
        clearTimeout(reauthTimer);
        reauthTimer = setTimeout(reauth, CONFIG.REAUTH_INTERVAL);
        
        eventSystem.emit("ws:connected");
      };

      ws.onclose = () => {
        store.set("connecting", true);
        clearTimeout(reauthTimer);
        
        if (!isReconnecting) {
          isReconnecting = true;
          reconnectTimer = setTimeout(connect, CONFIG.WS_RECONNECT_DELAY);
        }
        
        eventSystem.emit("ws:disconnected");
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        eventSystem.emit("ws:error", error);
      };

      ws.onmessage = (event) => {
        event.data.trim().split("\n").forEach(line => {
          const message = utils.safeJSON(line);
          if (!message?.type) return;
          
          // Emit to modern handlers
          eventSystem.emit(`ws:${message.type}`, message);
          
          // Call legacy handlers
          handlers.get(message.type)?.forEach(handler => {
            try { handler(message); }
            catch (error) { console.error(`WS handler error for ${message.type}:`, error); }
          });
        });
      };
    };

    const send = (data) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    };

    const on = (type, handler) => {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(handler);
      
      return () => handlers.get(type)?.delete(handler);
    };

    const reauth = async () => {
      try {
        const result = await api.reauth();
        if (result.ok) {
          utils.setCookie("jwt", result.access);
          send({ type: "init", jwt: utils.getJWT() });
        }
      } catch (error) {
        console.error("Reauth failed:", error);
      }
      
      clearTimeout(reauthTimer);
      reauthTimer = setTimeout(reauth, CONFIG.REAUTH_INTERVAL);
    };

    return { connect, send, on };
  })();

  /* --------------------------------------------------------
   * 7. Legacy Compatibility Layer
   * ------------------------------------------------------*/
  const createLegacyCompat = () => {
    // Initialize legacy global objects
    if (!window.ych) {
      window.ych = {
        nnum: "",
        user: "",
        sigi_num: CONFIG.SIGI_NUM,
        pubkey1: "",
        prvkey1: "",
        pubkey2: "",
        pubkey3: "",
        address: {},
        locktime1: {},
        locktime2: {},
        asset_extra: {},
        data: {
          buys: {},
          sells: {},
          trades: {}
        },
        ws_calls: {},
        timer_reauth: null,
        zerotxid: CONFIG.ZERO_TXID,
        get_cookie: utils.getCookie,
        gui: {
          tables: {},
          pagesize: CONFIG.GUI_PAGESIZE,
          current_market: '',
          buys_up_side_down: false,
          prefs_txouts_debug: true,
          connecting1: true,
          connecting2: true,
          update_balance: utils.debounce((balance) => {
            eventSystem.emit("balance:update", balance);
          }, 100)
        }
      };
    }

    if (!window.xybot) {
      window.xybot = {
        api: CONFIG.API_ENDPOINTS,
        network: NETWORK_HOST,
        setNetwork: (network) => {
          if (setStoredNetwork(network)) {
            window.location.reload(); // Reload to apply new network
          }
        },
        getNetwork: () => CURRENT_NETWORK
      };
    }

    // Legacy path variables
    Object.entries(api.endpoints).forEach(([key, path]) => {
      window[`ych_${key}_path`] = path;
    });

    // Legacy functions
    window.getJWT = utils.getJWT;
    window.onconnecting = () => {
      console.log("Connection status:", window.ych.gui.connecting1, window.ych.gui.connecting2);
    };
    /*window.updateConnectionStatus = (status) => {
      console.log("Connection status update:", status);

    };
    */

    // Legacy GUI initialization handlers
    window.ych_gui_on_init = (data) => {
      const jwt = utils.getJWT();
      const jwtInfo = utils.decodeJWT(jwt);
      
      window.ych.data = data;
      window.ych.nnum = data.nnum;
      store.set("data", data);
      store.set("nnum", data.nnum);

      if (data.profile) {
        window.ych.user = data.profile.user;
        window.ych_uidx = data.profile.uidx;
        window.ych.pubkey1 = data.profile.pubk1;
        window.ych.pubkey2 = data.profile.pubk2;
        window.ych.pubkey3 = data.profile.pubk3;
        
        window.ych_gui_on_login(jwtInfo.uid || '', data.profile);
      } else {
        window.ych_gui_on_logout();
      }
    };

    window.ych_gui_on_login = (uid, profile) => {
      console.log("=== User Login ===");
      store.set("user", profile.user);
      store.set("profile", profile);

      // Process assets and balances
      profile.assets?.forEach(asset => {
        const { coin } = asset;
        if (asset.address) {
          window.ych.address[coin] = asset.address;
          window.ych.locktime1[coin] = asset.locktime1;
          window.ych.locktime2[coin] = asset.locktime2;
        }
        if (asset.extra) {
          window.ych.asset_extra[coin] = asset.extra;
        }
      });

      // Process balances
      if (profile.balances) {
        store.set("balances", profile.balances);
        Object.entries(profile.balances).forEach(([coin, balance]) => {
          window.ych.gui.update_balance(balance);
        });
      }

      eventSystem.emit("user:login", { uid, profile });
    };

    window.ych_gui_on_logout = () => {
      console.log("=== User Logout ===");
      utils.setCookie("jwt", "", { expires: "Thu, 01 Jan 1970 00:00:01 GMT" });
      
      window.ych.user = "";
      window.ych.data.profile = null;
      store.update({ user: "", profile: null });
      
      eventSystem.emit("user:logout");
    };

    // Legacy WebSocket handlers
    window.ych.ws_calls = {
      balances: (wsdata) => eventSystem.emit("ws:balances", wsdata),
      coininfo: (wsdata) => eventSystem.emit("ws:coininfo", wsdata),
      txoutsupdate: (wsdata) => eventSystem.emit("ws:txoutsupdate", wsdata),
      userbuysupdate: (wsdata) => eventSystem.emit("ws:userbuysupdate", wsdata),
      usersellsupdate: (wsdata) => eventSystem.emit("ws:usersellsupdate", wsdata),
      buysupdate: (wsdata) => eventSystem.emit("ws:buysupdate", wsdata),
      sellsupdate: (wsdata) => eventSystem.emit("ws:sellsupdate", wsdata),
      markettradesupdate: (wsdata) => eventSystem.emit("ws:markettradesupdate", wsdata),
      usertradesupdate: (wsdata) => eventSystem.emit("ws:usertradesupdate", wsdata),
      depositaddress: (wsdata) => eventSystem.emit("ws:depositaddress", wsdata),
      adddeposit: (wsdata) => eventSystem.emit("ws:adddeposit", wsdata),
      regdeposit: (wsdata) => eventSystem.emit("ws:regdeposit", wsdata),
      addressesupdate1: (wsdata) => eventSystem.emit("ws:addressesupdate1", wsdata),
      addwithdraw: (wsdata) => eventSystem.emit("ws:addwithdraw", wsdata),
      regwithdraw: (wsdata) => eventSystem.emit("ws:regwithdraw", wsdata),
      nnum: (wsdata) => {
        window.ych.nnum = wsdata.objects?.[0];
        store.set("nnum", wsdata.objects?.[0]);
        eventSystem.emit("ws:nnum", wsdata);
      }
    };

    // Bridge store events to legacy GUI
    eventSystem.on("state:connecting", ({ value }) => {
      window.ych.gui.connecting1 = value;
      window.ych.gui.connecting2 = value;
      window.onconnecting();
    });
  };

  /* --------------------------------------------------------
   * 8. Application Bootstrap
   * ------------------------------------------------------*/
  const bootstrap = async () => {
    console.log(`Starting NightTrader on ${CURRENT_NETWORK} network...`);
    
    try {
      // Initialize legacy compatibility
      createLegacyCompat();
      
      // Load initial data
      const initData = await api.init();
      if (!initData?.ok) {
        console.warn("Init failed:", initData);
        store.set("connecting", false);
        window.updateConnectionStatus(false);
        return;
      }
      
      // Update store and legacy objects
      store.set("data", initData);
      store.set("connecting", false);
      
      // Initialize legacy GUI
      window.ych_gui_on_init(initData);
      window.updateConnectionStatus(true);
      
      // Setup WebSocket
      websocket.connect();
      
      // Setup WebSocket message handlers
      eventSystem.on("ws:balances", ({ objects }) => {
        if (objects) {
          store.set("balances", objects);
          objects.forEach(balance => window.ych.gui.update_balance(balance));
        }
      });
      
      eventSystem.on("ws:coininfo", ({ objects }) => {
        if (objects?.[0]) {
          store.set("coininfo", objects[0]);
        }
      });
      
      console.log("NightTrader initialized successfully");
      
    } catch (error) {
      console.error("Bootstrap failed:", error);
      store.set("connecting", false);
      window.updateConnectionStatus(false);
    }
  };

  /* --------------------------------------------------------
   * 9. Public API
   * ------------------------------------------------------*/
  window.NT = {
    store,
    api,
    websocket,
    eventSystem,
    utils,
    config: {
      network: CURRENT_NETWORK,
      setNetwork: window.xybot?.setNetwork
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();