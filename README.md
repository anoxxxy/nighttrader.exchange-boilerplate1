# Nighttrader.exchange Frontend Components

This document describes the key React components that power the Nighttrader.exchange multisignature trading interface.

## Core Components

### 1. ReactiveComponent (Base Class)
The foundation for all trading components with common functionality:

- **State management** with `setState()` and reactive updates
- **Data subscription system** for real-time market data
- **Formatting utilities** for numbers, currencies, dates
- **Loading state management**
- **Automatic refresh** capabilities

All other components extend this base class.

### 2. MarketStats
Displays key market statistics with filtering capabilities:

**Features:**
- Shows volume, average trade size, and activity metrics
- Toggle between "All Markets" view or specific market
- Calculates:
  - 24h volume (USD)
  - Average trade size
  - Trade frequency
  - Time since last trade
- Responsive card layout

**Data Sources:**
- `TradingData.Market.getPublicTrades()`
- `TradingData.Market.getRecentPublicTrades()`

### 3. RecentPublicTrades
Displays the most recent trades in a table format:

**Features:**
- Filterable by market
- Shows:
  - Trading pair
  - Buy/Sell type (color-coded)
  - Amount
  - Price
  - Timestamp
- Auto-refreshes with new trades
- Compact, scrollable table design

### 4. TopMarkets
Leaderboard-style component showing market performance:

**View Options:**
1. By Volume (default)
2. Top Gainers (24h)
3. Top Losers (24h)

**Displays:**
- Market pair
- Current price
- 24h change (color-coded)
- Volume (USD)

### 5. MarketHistory
Detailed trade history for selected markets:

**Features:**
- Market selector dropdown
- Shows complete trade history with:
  - Trade type
  - Execution price
  - Amount
  - Timestamp
- Paginated results
- Time-formatted display

### 6. MarketVolumeOverview
Compact volume summary for top markets:

**Displays:**
- Top 5 markets by volume
- Current price
- 24h change
- USD volume

### 7. MarketDepthChart
Visualizes order book liquidity:

**Features:**
- Bid/Ask depth chart
- Spread calculation
- Mid-price indicator
- Cumulative volume tracking
- Side-by-side comparison of market depth

### 8. OrderBook
Traditional order book display:

**Features:**
- Two-side view (Bids/Asks)
- Visual volume indicators
- Price levels with amounts
- Market selector
- Real-time updates

## Component Initialization
All components are initialized through:

```javascript
const components = {
  topMarkets: new TopMarkets('[data-component="market-list"]'),
  orderBook: new OrderBook('[data-component="orderbook"]'),
  marketHistory: new MarketHistory('[data-component="market-history"]'),
  marketStats: new MarketStats('[data-component="market-stats"]'),
  recentPublicTrades: new RecentPublicTrades('[data-component="recent-public-trades"]'),
  marketVolumeOverview: new MarketVolumeOverview('[data-component="market-volume-overview"]'),
  marketDepthChart: new MarketDepthChart('[data-component="market-depth"]')
};

function initRender() {
  Object.values(components).forEach(component => {
    component.init();
  });
}
```

## Real-Time Updates
Components subscribe to WebSocket events for live updates:

```javascript
app.eventSystem.on("ws:buysupdate", (wsdata) => {
  components.orderBook.refresh();
  components.marketDepthChart.refresh();
});

app.eventSystem.on("ws:sellsupdate", (wsdata) => {
  components.orderBook.refresh();
  components.marketDepthChart.refresh();
});

app.eventSystem.on("ws:markettradesupdate", (wsdata) => {
  components.marketStats.refresh();
  components.orderBook.refresh();
  components.recentPublicTrades.refresh();
  components.marketDepthChart.refresh();
});
```

## Network Awareness
Components handle network changes gracefully:

```javascript
function showNetworkChangeFeedback(network) {
  // Reset all component states
  Object.values(components).forEach(component => {
    component.unsubscribeAll();
    component.element.find('select').val('');
  });
  
  // Reinitialize after network switch
  setTimeout(() => initRender(), 3000);
}
