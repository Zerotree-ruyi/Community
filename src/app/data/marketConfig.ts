/**
 * 行情页 / 首页共用 — 22 个交易对配置
 *  symbol: Binance WebSocket 订阅用(去掉 BINANCE: 前缀就是 binance 小写交易对)
 *  key:    URL 查询参数 / 收藏 localStorage 用(小写)
 */
export interface MarketCoin {
  symbol: string;   // BINANCE:BTCUSDT
  name:   string;   // Bitcoin
  pair:   string;   // USDT
  logo:   string;   // coingecko logo URL
  color:  string;   // tailwind bg-* class
  key:    string;   // BTC
}

export const MARKET_COINS: MarketCoin[] = [
  { symbol: 'BINANCE:BTCUSDT',   name: 'Bitcoin',          pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',                        color: 'bg-orange-500', key: 'BTC' },
  { symbol: 'BINANCE:ETHUSDT',   name: 'Ethereum',         pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',                     color: 'bg-blue-500',   key: 'ETH' },
  { symbol: 'BINANCE:BNBUSDT',   name: 'BNB',              pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',                  color: 'bg-yellow-500', key: 'BNB' },
  { symbol: 'BINANCE:SOLUSDT',   name: 'Solana',           pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',                       color: 'bg-purple-500', key: 'SOL' },
  { symbol: 'BINANCE:ADAUSDT',   name: 'Cardano',          pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',                       color: 'bg-blue-600',   key: 'ADA' },
  { symbol: 'BINANCE:TRXUSDT',   name: 'TRON',             pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',                    color: 'bg-red-500',    key: 'TRX' },
  { symbol: 'BINANCE:DOGEUSDT',  name: 'Dogecoin',         pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',                       color: 'bg-yellow-600', key: 'DOGE' },
  { symbol: 'BINANCE:XRPUSDT',   name: 'XRP',              pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',             color: 'bg-gray-700',   key: 'XRP' },
  { symbol: 'BINANCE:AVAXUSDT',  name: 'Avalanche',        pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', color: 'bg-red-600', key: 'AVAX' },
  { symbol: 'BINANCE:LINKUSDT',  name: 'Chainlink',        pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',            color: 'bg-blue-700',   key: 'LINK' },
  { symbol: 'BINANCE:DOTUSDT',   name: 'Polkadot',         pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',                    color: 'bg-pink-600',   key: 'DOT' },
  { symbol: 'BINANCE:LTCUSDT',   name: 'Litecoin',         pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',                       color: 'bg-gray-500',   key: 'LTC' },
  { symbol: 'BINANCE:UNIUSDT',   name: 'Uniswap',          pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png',                color: 'bg-pink-500',   key: 'UNI' },
  { symbol: 'BINANCE:ATOMUSDT',  name: 'Cosmos',           pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',                   color: 'bg-blue-800',   key: 'ATOM' },
  { symbol: 'BINANCE:ETCUSDT',   name: 'Ethereum Classic', pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png',        color: 'bg-green-600',  key: 'ETC' },
  { symbol: 'BINANCE:NEARUSDT',  name: 'NEAR Protocol',    pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/10365/small/near.png',                        color: 'bg-black',      key: 'NEAR' },
  { symbol: 'BINANCE:APTUSDT',   name: 'Aptos',            pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round_logo.png',             color: 'bg-zinc-700',   key: 'APT' },
  { symbol: 'BINANCE:ARBUSDT',   name: 'Arbitrum',         pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/16547/small/Arbitrum.png',                    color: 'bg-sky-600',    key: 'ARB' },
  { symbol: 'BINANCE:OPUSDT',    name: 'Optimism',         pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',                    color: 'bg-red-500',    key: 'OP' },
  { symbol: 'BINANCE:FILUSDT',   name: 'Filecoin',         pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',                    color: 'bg-blue-500',   key: 'FIL' },
  { symbol: 'BINANCE:SUIUSDT',   name: 'Sui',              pair: 'USDT', logo: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',                  color: 'bg-cyan-500',   key: 'SUI' },
];