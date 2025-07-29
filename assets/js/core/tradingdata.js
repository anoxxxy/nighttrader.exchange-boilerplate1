var TradingData = (() => {
  const cache = new Map();
  
  // Helper functions
  const toDecimal = (val) => typeof val === 'bigint' ? Number(val) / 1e8 : Number(val) ? Number(val) / 1e8 : 0;
  const cacheKey = (fn, ...args) => `${fn.name}:${args.join(':')}`;
  
  const withCache = (fn, ...args) => {
    const key = cacheKey(fn, ...args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };

  // Core data accessors - Always get fresh data
  const getProfile = () => window.ych.data?.profile || {};
  const getMarkets = () => window.ych.data?.markets || {};
  const getCoinInfos = () => window.ych.data?.coininfos || {};

  // =============================================================================
  // USER DATA NAMESPACE
  // =============================================================================
  const UserData = {
    // Profile
    getEmail: () => getProfile().user,
    getId: () => getProfile().uidx,
    getTitle: () => getProfile().title,

    // Balances - Return raw bigint values
    getBalance: (coin) => getProfile().balances?.[coin]?.free || 0n,
    getLockedBalance: (coin) => getProfile().balances?.[coin]?.orders || 0n,
    getTotalBalance: (coin) => getProfile().balances?.[coin]?.sum || 0n,
    
    getAllBalances: () => {
      const balances = getProfile().balances || {};
      const result = {};
      
      Object.entries(balances).forEach(([coin, b]) => {
        result[coin] = {
          clearance: b.clearance || 0n,
          credit: b.credit || 0n,
          debit: b.debit || 0n,
          deposits: b.deposits || 0n,
          free: b.free || 0n,
          offtrade: b.offtrade || 0n,
          orders: b.orders || 0n,
          ordersindebit: b.ordersindebit || 0n,
          ordersintxouts: b.ordersintxouts || 0n,
          sum: b.sum || 0n,
          toxic: b.toxic || 0n,
          txouts: b.txouts || 0n,
          withdraws: b.withdraws || 0n,
          coin: b.coin
        };
      });
      
      return result;
    },
    
    getCoinsWithBalance: () => {
      const balances = getProfile().balances || {};
      const result = {};
      
      Object.entries(balances).forEach(([coin, balance]) => {
        const free = balance.free || 0n;
        const locked = balance.orders || 0n;
        if (free > 0n || locked > 0n) {
          result[coin] = { free, locked, total: free + locked };
        }
      });
      
      return result;
    },

    // Addresses
    getAddress: (coin) => (getProfile().assets || []).find(a => a.coin === coin)?.address || null,
    
    getAllAddresses: () => {
      const result = {};
      (getProfile().assets || []).forEach(asset => {
        if (asset.coin && asset.address) {
          result[asset.coin] = asset.address;
        }
      });
      return result;
    },

    // Rewards - Return raw bigint values
    getReward: (coin) => getProfile().rewards?.[coin] || 0n,
    getAllRewards: () => getProfile().rewards || {},

    // Orders - Return raw bigint values
    getBuyOrders: () => getProfile().buys || {},
    getSellOrders: () => getProfile().sells || {},
    
    getOrdersForMarket: (pair, side = null) => {
      const buys = getProfile().buys?.[pair] || [];
      const sells = getProfile().sells?.[pair] || [];
      
      if (side === 'buys') return buys;
      if (side === 'sells') return sells;
      return { buys, sells };
    },

    getMarketsWithOpenOrders: () => {
      const buys = getProfile().buys || {};
      const sells = getProfile().sells || {};
      const allPairs = new Set([...Object.keys(buys), ...Object.keys(sells)]);

      return Array.from(allPairs).map(pair => {
        const buyOrders = buys[pair] || [];
        const sellOrders = sells[pair] || [];
        const totalOrders = buyOrders.length + sellOrders.length;

        return totalOrders > 0 ? {
          market: pair,
          totalOrders,
          ...(buyOrders.length && { buys: buyOrders }),
          ...(sellOrders.length && { sells: sellOrders })
        } : null;
      }).filter(Boolean);
    },

    // Trades - Return raw bigint values
    getTradeHistory: () => getProfile().trades || {},
    getTradeHistoryForMarket: (pair) => getProfile().trades?.[pair] || [],
    
    getTradedVolumeForMarket: (pair) => {
      const trades = UserData.getTradeHistoryForMarket(pair);
      let volumeA = 0n, volumeB = 0n;

      trades.forEach(trade => {
        volumeA += trade.amounta || 0n;
        volumeB += trade.amountb || 0n;
      });

      return { amounta: volumeA, amountb: volumeB };
    },

    getLastTrade: () => {
      const trades = Object.values(getProfile().trades || {}).flat();
      return trades.length ? trades.sort((a, b) => b.date - a.date)[0] : null;
    },

    getRecentTrades: (limit = 20) => {
      const trades = Object.values(getProfile().trades || {}).flat();
      return trades.sort((a, b) => b.date - a.date).slice(0, limit);
    },

    // Deposits - Return raw bigint values
    getDeposits: (coin, limit = 20) => {
      const deposits = getProfile().deposits?.[coin] || [];
      return deposits.slice()
        .sort((a, b) => b.date - a.date)
        .slice(0, limit);
    },

    getAllDeposits: (limit = 20) => {
      const allDeposits = Object.values(getProfile().deposits || {}).flat();
      return allDeposits
        .sort((a, b) => b.date - a.date)
        .slice(0, limit);
    },

    // Portfolio Analysis - Return USD values as decimals
    getPortfolioValueUSD: () => {
      return Object.keys(getCoinInfos()).reduce((total, coin) => {
        const balance = toDecimal(UserData.getBalance(coin));
        const priceUSD = MarketData.getPriceInUSD(coin);
        return total + (balance * priceUSD);
      }, 0);
    },

    getPortfolioAllocation: () => {
      const totalValueUSD = UserData.getPortfolioValueUSD();
      if (totalValueUSD === 0) return {};
      
      const allocation = {};
      Object.keys(getCoinInfos()).forEach(coin => {
        const balance = toDecimal(UserData.getBalance(coin));
        const priceUSD = MarketData.getPriceInUSD(coin);
        const valueUSD = balance * priceUSD;
        
        if (valueUSD > 0) {
          allocation[coin] = {
            balance: balance,
            valueUSD: valueUSD,
            percentage: (valueUSD / totalValueUSD) * 100
          };
        }
      });
      
      return allocation;
    },

    getTopHoldings: (limit = 10) => {
      const allocation = UserData.getPortfolioAllocation();
      return Object.entries(allocation)
        .sort(([,a], [,b]) => b.valueUSD - a.valueUSD)
        .slice(0, limit)
        .map(([coin, data]) => ({ coin, ...data }));
    },

    getTradingStats: (marketPair = null) => {
      let trades = Object.values(getProfile().trades || {}).flat();
      
      if (marketPair) {
        trades = trades.filter(t => t.mname === marketPair);
      }
      
      if (!trades.length) return null;

      const totalTrades = trades.length;
      const totalVolumeUSD = trades.reduce((sum, trade) => 
        sum + MarketData.getTradeValueUSD(trade), 0);
      
      const tradingPairs = new Set(trades.map(t => t.mname));

      // Use dateu directly (convert nanoseconds to milliseconds)
      const datesInMs = trades.map(t => t.dateu / 1e6);
      
      const minDate = Math.min(...datesInMs);
      const maxDate = Math.max(...datesInMs);
      
      // Calculate actual calendar days between first and last trade
      const startDate = new Date(minDate);
      const endDate = new Date(maxDate);
      
      // Reset time components to compare just dates
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      // Calculate difference in calendar days (minimum 1)
      const tradingPeriodDays = Math.max(1, Math.ceil(
        (endDate - startDate) / (1000 * 60 * 60 * 24) + 1
      ));

      return {
        totalTrades,
        totalVolumeUSD,
        avgTradeSize: totalVolumeUSD / totalTrades,
        uniquePairs: tradingPairs.size,
        tradingPeriodDays,
        avgTradesPerDay: totalTrades / tradingPeriodDays,
        firstTradeDate: new Date(minDate).toISOString(),
        lastTradeDate: new Date(maxDate).toISOString(),
        analyzedMarket: marketPair || 'all markets',
        datePrecision: 'nanoseconds (dateu)'
      };
    }
  };

  // =============================================================================
  // MARKET DATA NAMESPACE
  // =============================================================================
  const MarketData = {
    // Market Info - Return raw bigint values where applicable
    getAllMarkets: () => getMarkets(),
    getMarketInfo: (pair) => getMarkets()[pair] || null,
    getMarketList: () => Object.keys(getMarkets()),
    isMarketOpen: (pair) => getMarkets()[pair]?.open || false,
    isMarketInMaintenance: (pair) => getMarkets()[pair]?.service || false,
    
    // Prices - Return raw bigint values
    getPrice: (pair) => getMarkets()[pair]?.price || 0n,
    getVolumeUSD: (pair) => toDecimal(getMarkets()[pair]?.volusd), // USD values as decimal
    
    getChangePercent: (pair, timeframe = 'day') => {
      const market = getMarkets()[pair];
      return market ? (timeframe === 'day' ? market.change1d : market.change7d) || 0 : 0;
    },

    getPriceInUSD: (coin) => {
      return withCache(function getPriceInUSDImpl(coin) {
        if (coin === 'USDT' || coin === 'USD') return 1;
        if (coin === 'DAI') return toDecimal(MarketData.getPrice('DAI-USDT')) || 1;

        const baseCoins = MarketData.getBaseSymbols();
        const markets = getMarkets();

        for (const base of baseCoins) {
          const pair = `${coin}-${base}`;
          if (markets[pair]) {
            const price = toDecimal(MarketData.getPrice(pair));
            const baseUSD = MarketData.getPriceInUSD(base);
            if (!isNaN(price) && !isNaN(baseUSD)) {
              return price * baseUSD;
            }
          }
        }

        return getCoinInfos()[coin]?.ext?.priceext || 0;
      }, coin);
    },

    // Orderbook - Return raw bigint values
    getPublicBids: () => window.ych.data?.buys || {},
    getPublicAsks: () => window.ych.data?.sells || {},
    
    getOrderbook: (pair, ascending = true) => {
      const bids = (window.ych.data?.buys?.[pair] || []).slice();
      const asks = (window.ych.data?.sells?.[pair] || []).slice();

      const sortOrders = (orders, ascending) =>
        orders.sort((a, b) =>
          ascending ? 
            Number(a.price - b.price) : 
            Number(b.price - a.price)
        );

      return {
        bids: sortOrders(bids, !ascending),
        asks: sortOrders(asks, ascending)
      };
    },

    getOrderbookDepth: (pair, maxLevels = 50) => {
      const { bids, asks } = MarketData.getOrderbook(pair);
      
      const sortedBids = bids.sort((a, b) => Number(b.price - a.price)).slice(0, maxLevels);
      const sortedAsks = asks.sort((a, b) => Number(a.price - b.price)).slice(0, maxLevels);
      
      let bidDepth = 0n, askDepth = 0n;
      
      const bidDepthLevels = sortedBids.map(order => {
        bidDepth += order.amounta;
        return { 
          price: order.price, 
          amounta: order.amounta, 
          cumulative: bidDepth 
        };
      });
      
      const askDepthLevels = sortedAsks.map(order => {
        askDepth += order.amounta;
        return { 
          price: order.price, 
          amounta: order.amounta, 
          cumulative: askDepth 
        };
      });

      return {
        bids: bidDepthLevels,
        asks: askDepthLevels,
        spread: sortedAsks.length && sortedBids.length ? 
          toDecimal(sortedAsks[0].price - sortedBids[0].price) : 0,
        midPrice: sortedAsks.length && sortedBids.length ? 
          toDecimal((sortedAsks[0].price + sortedBids[0].price) / 2n) : 0
      };
    },

    getMarketDepthStats: (pair) => {
      const depth = MarketData.getOrderbookDepth(pair);
      
      const totalBidVolume = depth.bids.reduce((sum, level) => sum + level.amounta, 0n);
      const totalAskVolume = depth.asks.reduce((sum, level) => sum + level.amounta, 0n);
      const totalVolume = totalBidVolume + totalAskVolume;
      
      return {
        totalBidVolume: toDecimal(totalBidVolume),
        totalAskVolume: toDecimal(totalAskVolume),
        totalVolume: toDecimal(totalVolume),
        bidPercentage: totalVolume > 0n ? 
          Number(totalBidVolume * 10000n / totalVolume) / 100 : 0, // Avoid floating point
        askPercentage: totalVolume > 0n ? 
          Number(totalAskVolume * 10000n / totalVolume) / 100 : 0,
        bidLevels: depth.bids.length,
        askLevels: depth.asks.length,
        spread: depth.spread,
        midPrice: depth.midPrice
      };
    },

    // Trade History - Return raw bigint values
    getPublicTrades: () => window.ych.data?.trades || {},
    getPublicTradeHistory: (pair) => window.ych.data?.trades?.[pair] || [],
    
    getRecentPublicTrades: (pair, limit = 30) => {
      const trades = MarketData.getPublicTradeHistory(pair);
      return trades.sort((a, b) => b.date - a.date).slice(0, limit);
    },

    getPublicTradeStats: (pair, timeframe = 24) => {
      const trades = MarketData.getPublicTradeHistory(pair);
      const cutoff = Date.now() - (timeframe * 60 * 60 * 1000);
      const recentTrades = trades.filter(trade => trade.date > cutoff);
      
      if (recentTrades.length === 0) return null;
      
      const totalVolume = recentTrades.reduce((sum, trade) => 
        sum + (trade.amounta || 0n), 0n);
      
      const prices = recentTrades.map(trade => trade.price || 0n);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0n) / BigInt(prices.length);
      
      return {
        tradeCount: recentTrades.length,
        totalVolume: toDecimal(totalVolume),
        avgPrice: toDecimal(avgPrice),
        highPrice: toDecimal(prices.reduce((a, b) => a > b ? a : b)),
        lowPrice: toDecimal(prices.reduce((a, b) => a < b ? a : b)),
        priceRange: toDecimal(prices.reduce((a, b) => a > b ? a : b) - 
                   prices.reduce((a, b) => a < b ? a : b)),
        timeframe
      };
    },

    // Market Analysis - Return USD values as decimals
    getTopMarketsByVolume: (limit = 10) => {
      return Object.entries(getMarkets())
        .filter(([, market]) => !market.group)
        .sort(([,a], [,b]) => (b.volusd || 0) - (a.volusd || 0))
        .slice(0, limit)
        .map(([pair, market]) => ({
          pair,
          volumeUSD: market.volusd || 0,
          price: toDecimal(market.price),
          change24h: market.change1d || 0
        }));
    },

    getMarketsByChange: (timeframe = 'day', limit = 10, direction = 'desc') => {
      const changeField = timeframe === 'day' ? 'change1d' : 'change7d';
      
      return Object.entries(getMarkets())
        .filter(([, market]) => !market.group && market[changeField] !== undefined)
        .sort(([,a], [,b]) => {
          const aChange = a[changeField] || 0;
          const bChange = b[changeField] || 0;
          return direction === 'desc' ? bChange - aChange : aChange - bChange;
        })
        .slice(0, limit)
        .map(([pair, market]) => ({
          pair,
          change: market[changeField] || 0,
          price: toDecimal(market.price),
          volumeUSD: market.volusd || 0
        }));
    },

    // Base Markets
    getBaseMarkets: () => (window.ych.data?.groups || []).filter(market => market.group),
    getBaseSymbols: () => MarketData.getBaseMarkets().map(market => market.coinb),
    getMarketsByBase: (coinb) => Object.values(getMarkets()).filter(
      market => !market.group && market.coinb === coinb
    ),

    // Utilities
    searchMarkets: (query) => {
      const lowerQuery = query.toLowerCase();
      
      return Object.entries(getMarkets())
        .filter(([pair, market]) => 
          !market.group && 
          (pair.toLowerCase().includes(lowerQuery) ||
           market.coina?.toLowerCase().includes(lowerQuery) ||
           market.coinb?.toLowerCase().includes(lowerQuery))
        )
        .map(([pair, market]) => ({
          pair,
          price: toDecimal(market.price),
          volumeUSD: market.volusd || 0,
          change24h: market.change1d || 0,
          open: market.open || false
        }));
    },

    getTradeValueUSD: (trade) => {
      const priceA = MarketData.getPriceInUSD(trade.coina);
      const priceB = MarketData.getPriceInUSD(trade.coinb);
      const valueA = toDecimal(trade.amounta) * priceA;
      const valueB = toDecimal(trade.amountb) * priceB;
      return Math.max(valueA, valueB);
    }
  };

  // =============================================================================
  // COIN INFO NAMESPACE
  // =============================================================================
  const CoinInfo = {
    getAll: () => getCoinInfos(),
    
    getInfo: (coin) => {
      const info = getCoinInfos()[coin];
      if (!info) return null;

      return {
        ...info,
        fee: {
          ...info.fee,
          minamount: info.fee.minamount || 0n,
          minorder: info.fee.minorder || 0n
        }
      };
    },

    getSupportedCoins: () => Object.keys(getCoinInfos()),
    getExplorerLink: (coin) => getCoinInfos()[coin]?.ext?.txhashurl || null,
    getNetworkName: (coin) => getCoinInfos()[coin]?.cfg?.net || null,
    getCoinType: (coin) => getCoinInfos()[coin]?.type || null,
    
    getFees: (coin) => {
      const fee = getCoinInfos()[coin]?.fee || {};
      return {
        buyfee: fee.buyfee || 0,
        sellfee: fee.sellfee || 0,
        sendfee: fee.sendfee || 0,
        withfee: fee.withfee || 0
      };
    },

    canSendOrReceive: (coin) => {
      const ops = getCoinInfos()[coin]?.ops || {};
      return {
        canSend: !!ops.send,
        canReceive: !!ops.recv
      };
    }
  };

  // Public API
  return {
    User: UserData,
    Market: MarketData,
    Coin: CoinInfo,

    clearCache: () => cache.clear()
  };
})();