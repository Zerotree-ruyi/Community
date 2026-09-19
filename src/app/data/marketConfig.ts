/**
 * 行情页 / 首页共用 — 21 个交易对配置
 *  symbol: Binance WebSocket 订阅用(去掉 BINANCE: 前缀就是 binance 小写交易对)
 *  key:    URL 查询参数 / 收藏 localStorage 用(小写)
 *  glyph:  unicode 符号作 logo(零依赖,不被墙,稳定显示)
 *  color:  圆形背景色 (tailwind bg-* class)
 *
 *  注:不再使用外网图床(国内/服务器经常被墙),全部走 unicode 字符。
 */
export interface MarketCoin {
  symbol: string;   // BINANCE:BTCUSDT
  name:   string;   // Bitcoin
  pair:   string;   // USDT
  glyph:  string;   // ₿ Ξ ◎ 等 unicode 符号
  color:  string;   // tailwind bg-* class
  key:    string;   // BTC
}

export const MARKET_COINS: MarketCoin[] = [
  { symbol: 'BINANCE:BTCUSDT',   name: 'Bitcoin',          pair: 'USDT', glyph: 'B', color: 'bg-orange-500', key: 'BTC'  },
  { symbol: 'BINANCE:ETHUSDT',   name: 'Ethereum',         pair: 'USDT', glyph: 'E', color: 'bg-blue-500',   key: 'ETH'  },
  { symbol: 'BINANCE:BNBUSDT',   name: 'BNB',              pair: 'USDT', glyph: 'B', color: 'bg-yellow-500', key: 'BNB'  },
  { symbol: 'BINANCE:SOLUSDT',   name: 'Solana',           pair: 'USDT', glyph: 'S', color: 'bg-purple-500', key: 'SOL'  },
  { symbol: 'BINANCE:ADAUSDT',   name: 'Cardano',          pair: 'USDT', glyph: 'A', color: 'bg-blue-600',   key: 'ADA'  },
  { symbol: 'BINANCE:TRXUSDT',   name: 'TRON',             pair: 'USDT', glyph: 'T', color: 'bg-red-500',    key: 'TRX'  },
  { symbol: 'BINANCE:DOGEUSDT',  name: 'Dogecoin',         pair: 'USDT', glyph: 'D', color: 'bg-yellow-600', key: 'DOGE' },
  { symbol: 'BINANCE:XRPUSDT',   name: 'XRP',              pair: 'USDT', glyph: 'X', color: 'bg-gray-700',   key: 'XRP'  },
  { symbol: 'BINANCE:AVAXUSDT',  name: 'Avalanche',        pair: 'USDT', glyph: 'A', color: 'bg-red-600',    key: 'AVAX' },
  { symbol: 'BINANCE:LINKUSDT',  name: 'Chainlink',        pair: 'USDT', glyph: 'L', color: 'bg-blue-700',   key: 'LINK' },
  { symbol: 'BINANCE:DOTUSDT',   name: 'Polkadot',         pair: 'USDT', glyph: 'D', color: 'bg-pink-600',   key: 'DOT'  },
  { symbol: 'BINANCE:LTCUSDT',   name: 'Litecoin',         pair: 'USDT', glyph: 'L', color: 'bg-gray-500',   key: 'LTC'  },
  { symbol: 'BINANCE:UNIUSDT',   name: 'Uniswap',          pair: 'USDT', glyph: 'U', color: 'bg-pink-500',   key: 'UNI'  },
  { symbol: 'BINANCE:ATOMUSDT',  name: 'Cosmos',           pair: 'USDT', glyph: 'C', color: 'bg-blue-800',   key: 'ATOM' },
  { symbol: 'BINANCE:ETCUSDT',   name: 'Ethereum Classic', pair: 'USDT', glyph: 'E', color: 'bg-green-600',  key: 'ETC'  },
  { symbol: 'BINANCE:NEARUSDT',  name: 'NEAR Protocol',    pair: 'USDT', glyph: 'N', color: 'bg-black',      key: 'NEAR' },
  { symbol: 'BINANCE:APTUSDT',   name: 'Aptos',            pair: 'USDT', glyph: 'A', color: 'bg-zinc-700',   key: 'APT'  },
  { symbol: 'BINANCE:ARBUSDT',   name: 'Arbitrum',         pair: 'USDT', glyph: 'A', color: 'bg-sky-600',    key: 'ARB'  },
  { symbol: 'BINANCE:OPUSDT',    name: 'Optimism',         pair: 'USDT', glyph: 'O', color: 'bg-red-500',    key: 'OP'   },
  { symbol: 'BINANCE:FILUSDT',   name: 'Filecoin',         pair: 'USDT', glyph: 'F', color: 'bg-blue-500',   key: 'FIL'  },
  { symbol: 'BINANCE:SUIUSDT',   name: 'Sui',              pair: 'USDT', glyph: 'S', color: 'bg-cyan-500',   key: 'SUI'  },
];