window.ych = function() {};

(function () {
  "use strict";

  /* --------------------------------------------------------
   * 1. Configuration & Initial Setup
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

  /* --------------------------------------------------------
   * 2. Utility Functions
   * ------------------------------------------------------*/
  const utils = {
    jsonBNparse: (k, v) =>
      typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,

    safeJSON: (str) => {
      try {
        return JSON.parse(str, utils.jsonBNparse);
      } catch {
        return null;
      }
    },

    getCookie: (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      return parts.length === 2 ? parts.pop().split(";")[0] : "";
    },

    setCookie: (name, value, options = {}) => {
      const opts = { SameSite: "Strict", ...options };
      const optStr = Object.entries(opts).map(([k, v]) => `${k}=${v}`).join(";");
      document.cookie = `${name}=${value};${optStr}`;
    },

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

    // Network utilities
    getStoredNetwork: () => {
      try {
        const stored = localStorage.getItem("xybot");
        const parsed = stored ? JSON.parse(stored) : {};
        return CONFIG.VALID_NETWORKS.includes(parsed.network)
          ? parsed.network
          : CONFIG.DEFAULT_NETWORK;
      } catch {
        return CONFIG.DEFAULT_NETWORK;
      }
    },

    setStoredNetwork: (network) => {
      if (!CONFIG.VALID_NETWORKS.includes(network)) return false;
      try {
        const stored = JSON.parse(localStorage.getItem("xybot") || "{}");
        stored.network = network;
        localStorage.setItem("xybot", JSON.stringify(stored));
        return true;
      } catch {
        return false;
      }
    }
  };

  /* --------------------------------------------------------
   * 3. Event System
   * ------------------------------------------------------*/
  const eventSystem = (() => {
    const events = new Map();

    return {
      on(event, handler) {
        if (!events.has(event)) events.set(event, new Set());
        events.get(event).add(handler);
        return () => events.get(event)?.delete(handler);
      },
      emit(event, data) {
        events.get(event)?.forEach(handler => {
          try {
            handler(data);
          } catch (e) {
            console.error(`Event "${event}" error:`, e);
          }
        });
      }
    };
  })();

  /* --------------------------------------------------------
   * 4. Centralized State Store
   * ------------------------------------------------------*/
  const store = (() => {
    // Initialize state with network configuration
    const state = {
      // Connection state
      connecting: true,
      
      // Network configuration (centralized)
      network: utils.getStoredNetwork(),
      networkHost: null,
      wsUrl: null,
      apiBase: null,
      
      // Application data
      data: null,
      balances: {},
      nnum: "",
      user: "",
      profile: null
    };

    // Initialize network-dependent URLs
    const updateNetworkUrls = (network) => {
      state.networkHost = CONFIG.API_ENDPOINTS[network];
      state.wsUrl = `wss://${state.networkHost}/ws`;
      state.apiBase = `https://${state.networkHost}`;
    };

    // Set initial network URLs
    updateNetworkUrls(state.network);

    return {
      get(key) {
        return key ? state[key] : { ...state };
      },
      
      set(key, value) {
        const oldValue = state[key];
        state[key] = value;
        
        // Auto-update network URLs when network changes
        if (key === 'network') {
          updateNetworkUrls(value);
        }
        
        eventSystem.emit(`state:${key}`, { value, oldValue });
      },
      
      update(updates) {
        const changes = {};
        Object.entries(updates).forEach(([key, value]) => {
          const oldValue = state[key];
          state[key] = value;
          changes[key] = { value, oldValue };
          
          // Auto-update network URLs when network changes
          if (key === 'network') {
            updateNetworkUrls(value);
          }
        });
        
        // Emit all changes
        Object.entries(changes).forEach(([key, change]) => {
          eventSystem.emit(`state:${key}`, change);
        });
        
        return changes;
      },

      // Helper methods for network state
      getNetworkConfig: () => ({
        network: state.network,
        host: state.networkHost,
        wsUrl: state.wsUrl,
        apiBase: state.apiBase
      })
    };
  })();

  /* --------------------------------------------------------
   * 5. API Layer (uses store for URLs)
   * ------------------------------------------------------*/
  const api = {
    endpoints: {
      init: "/u/init",
      reauth: "/u/reauth"
    },
    
    request: async (endpoint, options = {}) => {
      const { apiBase } = store.getNetworkConfig();
      const url = `${apiBase}${endpoint}`;
      const config = {
        headers: {
          "Authorization": `Bearer ${utils.getJWT()}`,
          "Content-Type": "application/json"
        },
        ...options
      };
      try {
        const response = await fetch(url, config);
        const text = await response.text();
        return utils.safeJSON(text);
      } catch (err) {
        return { error: err.message };
      }
    },
    
    init: () => api.request(api.endpoints.init),
    reauth: () => api.request(api.endpoints.reauth)
  };
const api2 = {
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
   * 6. WebSocket Module (uses store for URLs)
   * ------------------------------------------------------*/
  const websocket = (() => {
  let ws = null;
  let connectionAttempts = 0;
  const MAX_ATTEMPTS = 5;

  const connect = () => {
    if (ws?.readyState === WebSocket.OPEN) return;
    
    const { wsUrl } = store.getNetworkConfig();
    console.log('store.getNetworkConfig(): ', store.getNetworkConfig(), wsUrl);
    ws = new WebSocket(wsUrl);
    connectionAttempts++;

    ws.onopen = () => {
      connectionAttempts = 0; // Reset on success
      store.set("connecting", false);
      send({ type: "init", jwt: utils.getJWT() });
      setTimeout(reauth, CONFIG.REAUTH_INTERVAL);
      eventSystem.emit("ws:connected");
//      eventSystem.emit("connection:success");
    };

    ws.onclose = () => {
      store.set("connecting", true);
      if (connectionAttempts < MAX_ATTEMPTS) {
        setTimeout(connect, CONFIG.WS_RECONNECT_DELAY);
      } else {
        //eventSystem.emit("connection:failed", { reason: "Max connection attempts reached"});
      }
      eventSystem.emit("ws:disconnected");
  //    eventSystem.emit("connection:failed2");
    };

    ws.onerror = (error) => {
      eventSystem.emit("ws:error", error);
      if (connectionAttempts >= MAX_ATTEMPTS) {
        //eventSystem.emit("connection:failed1", { reason: error.message || "WebSocket error"});
      }
    };

    ws.onmessage = (event) => {
      event.data.trim().split("\n").forEach(line => {
        const msg = utils.safeJSON(line);
        if (!msg?.type) return;
        eventSystem.emit(`ws:${msg.type}`, msg);
      });
    };
  };


    const send = (data) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    };

    const disconnect = () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };

    const reauth = async () => {
      const result = await api.reauth();
      if (result.ok) {
        utils.setCookie("jwt", result.access);
        send({ type: "init", jwt: utils.getJWT() });
      }
    };

    return { connect, send, disconnect, reauth };
  })();

  /* --------------------------------------------------------
   * 7. Network Management (DRY and centralized)
   * ------------------------------------------------------*/
  const networkManager = {
    switchNetwork: async (newNetwork) => {
      const currentNetwork = store.get('network');
      
      // Prevent switching if already on the desired network
      if (newNetwork === currentNetwork) return;

      if (!utils.setStoredNetwork(newNetwork)) return;

      // Set connecting state and update store
      store.update({
        connecting: true,
        network: newNetwork
      });
      
      updateConnectionStatus(false);

      // Disconnect existing WebSocket
      websocket.disconnect();

      // Fetch fresh data and reinitialize
      try {
        const newData = await api.init();
        if (newData.ok) {
          window.ych_gui_on_init(newData);
          eventSystem.emit("network:changed", { from: currentNetwork, to: newNetwork });
          websocket.connect();
          

          // Force UI refresh
          if (typeof initRender === 'function') {
            //initRender();
          }
          updateConnectionStatus(true);
          eventSystem.emit("connection:success");
        } else {
          throw new Error("Failed to load new network data");
        }
      } catch (err) {
        console.error("Error switching network:", err);
        store.set("connecting", false);
        updateConnectionStatus(false);
        eventSystem.emit("network:change:error", { error: err.message });
      }
    },

    getNetwork: () => store.get('network'),
    
    setNetwork: (network) => {
      if (utils.setStoredNetwork(network)) {
        networkManager.switchNetwork(network);
      }
    },

    getNetworkConfig: () => store.getNetworkConfig()
  };

  /* --------------------------------------------------------
   * 8. NightTrader Compatibility Layer
   * ------------------------------------------------------*/
  const initializeGlobals = () => {
    const { network, host } = store.getNetworkConfig();
    
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
          update_balance: utils.debounce((balance) => {
            eventSystem.emit("balance:update", balance);
          }, 100)
        }
      };
    }

    if (!window.xybot) {
      window.xybot = {
        api: CONFIG.API_ENDPOINTS,
        network: host,
        setNetwork: networkManager.setNetwork,
        getNetwork: networkManager.getNetwork
      };
    }

    // Legacy path variables
    Object.entries(api.endpoints).forEach(([key, path]) => {
      window[`ych_${key}_path`] = path;
    });

    // Legacy functions
    window.getJWT = utils.getJWT;
    
    window.updateConnectionStatus = (isConnected) => {
      const statusElement = document.querySelector('#connection-status');
      if (!statusElement) return;
      
      statusElement.innerHTML = isConnected
        ? `<i class="fas fa-check text-success me-1"></i><span class="text-success">Connected</span>`
        : `<i class="fas fa-circle text-danger me-1"></i><span class="text-danger">Disconnected</span>`;

      if (isConnected) {
        initRender();
      }
      eventSystem.emit('connection:status', { connected: isConnected });
    };

    // Legacy GUI initialization handlers
    window.ych_gui_on_init = (data) => {
      const jwt = utils.getJWT();
      const jwtInfo = utils.decodeJWT(jwt);
      
      window.ych.data = data;
      window.ych.nnum = data.nnum;
      
      // Update store with received data
      store.update({
        data: data,
        nnum: data.nnum
      });

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
      
      // Update store with user data
      store.update({
        user: profile.user,
        profile: profile
      });

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
      
      // Update store
      store.update({
        user: "",
        profile: null
      });
      
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
        const nnum = wsdata.objects?.[0];
        window.ych.nnum = nnum;
        store.set("nnum", nnum);
        eventSystem.emit("ws:nnum", wsdata);
      }
    };

    // Bridge store events to legacy GUI
    eventSystem.on("state:connecting", ({ value }) => {
      updateConnectionStatus(!value);
    });

    // Update xybot network when store network changes
    eventSystem.on("state:network", ({ value }) => {
      window.xybot.network = CONFIG.API_ENDPOINTS[value];
    });
  };

  /* --------------------------------------------------------
   * 9. Compnent manager
   * ------------------------------------------------------*/


// 1. Define your components (unchanged)
/*
const componentInstances = {
    topMarkets: new TopMarkets('[data-component="market-list"]'),
    orderBook: new OrderBook('[data-component="orderbook"]'),
    marketHistory: new MarketHistory('[data-component="market-history"]'),
    marketStats: new MarketStats('[data-component="market-stats"]'),
    recentPublicTrades: new RecentPublicTrades('[data-component="recent-public-trades"]'),
    marketVolumeOverview: new MarketVolumeOverview('[data-component="market-volume-overview"]'),
    marketDepthChart: new MarketDepthChart('[data-component="market-depth"]')
};
*/
// 2. Add to app with proper safety checks

const components = {
    /**
     * Get a component instance
     * @param {string} name Component name
     * @returns {object|null} Component instance or null if not found
     */
    get: (name) => {
        const component = componentInstances[name];
        if (!component) {
            console.warn(`Component "${name}" not found. Available components:`, Object.keys(componentInstances));
            return null;
        }
        return component;
    },

    /**
     * Call a method on a component safely
     * @param {string} componentName 
     * @param {string} methodName 
     * @param {...any} args 
     * @returns {any|null} Method result or null if failed
     */
    call: (componentName, methodName, ...args) => {
        const component = componentInstances[componentName];
        if (!component) {
            console.warn(`Component "${componentName}" not found`);
            return null;
        }
        if (typeof component[methodName] !== 'function') {
            console.warn(`Method "${methodName}" not found on component "${componentName}"`);
            return null;
        }
        return component[methodName](...args);
    },

    /**
     * Refresh specific components
     * @param {...string} componentNames 
     */
    refresh: (...componentNames) => {
        componentNames.forEach(name => {
            const component = componentInstances[name];
            if (component?.refresh) {
                component.refresh();
            } else {
                console.warn(`Cannot refresh component "${name}" - not found or missing refresh method`);
            }
        });
    },

    /**
     * Refresh all components that have refresh capability
     */
    refreshAll: () => {
        Object.values(componentInstances).forEach(comp => {
            if (comp?.refresh) comp.refresh();
        });
    }
};


  /* --------------------------------------------------------
   * 10. Application Bootstrap
   * ------------------------------------------------------*/
  const bootstrap = async () => {
    initializeGlobals();
    const initData = await api.init();
    if (initData?.ok) {
      window.ych_gui_on_init(initData);
      store.set("connecting", false);
    } else {
      store.set("connecting", false);
    }
    websocket.connect();
  };

  /* --------------------------------------------------------
   * 20. Public API (Clean Namespace)
   * ------------------------------------------------------*/
  window.app = {
    // ✨ Core Modules
    utils,
    components,
    store,
    eventSystem,
    config: CONFIG,

    // 🔐 Auth-related utilities
    auth: {
      getJWT: utils.getJWT,
      decodeJWT: utils.decodeJWT,
      reauth: websocket.reauth
    },

    // 🌐 Network management (DRY and centralized)
    network: {
      getNetwork: networkManager.getNetwork,
      setNetwork: networkManager.setNetwork,
      switchNetwork: networkManager.switchNetwork,
      getConfig: networkManager.getNetworkConfig,
      get connected() {
        return !store.get('connecting');
      },
      get connecting() {
        return store.get('connecting');
      }
    }
  };

  // Event handlers
  app.eventSystem.on("network:changed", ({ to }) => {
    if (typeof showNetworkChangeFeedback === 'function') {
      showNetworkChangeFeedback(to);
    }
  });

  app.eventSystem.on('connection:status', ({ connected }) => {
    // Update other UI elements based on connection state
  });

  /* --------------------------------------------------------
   * 11. DOM Ready Check
   * ------------------------------------------------------*/
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

  /* --------------------------------------------------------
   * 12. Debugging Tools
   * ------------------------------------------------------*/
  window.DEBUG = {
    app,
    store: store.get(),
    status: () => ({
      network: app.network.getNetwork(),
      connected: app.network.connected,
      jwt: app.auth.getJWT(),
      config: app.network.getConfig()
    }),
    forceTestnet: () => app.network.switchNetwork("testnet"),
    forceMainnet: () => app.network.switchNetwork("mainnet"),
    logStatus: () => console.log(DEBUG.status())
  };

})();
