# 交易所设计 (Community)

一个面向移动端(手机屏幕宽度)的加密货币交易所前端 UI 项目,使用真实的 Binance WebSocket 实时价格数据,支持 13 种语言。

## ✨ 核心特性

- 📱 **移动端优先** — 设计为 `max-w-md` (448px) 容器,完美适配手机屏幕
- 🔄 **实时行情** — 通过 Binance WebSocket 推送 BTC、ETH、SOL 等加密货币实时价格
- 🌍 **多语言支持** — 13 种语言:英语、简体中文、繁体中文、日语、泰语、越南语、印尼语、西班牙语、葡萄牙语、俄语、阿拉伯语、法语、德语
- 🛣️ **完整页面体系** — 28 个页面覆盖交易全流程(现货、杠杆、闪兑、合约、借贷等)
- 🎨 **Tailwind CSS** — 实用类优先的样式方案,深色主题

## 🧰 技术栈

| 类别 | 选型 |
|---|---|
| 构建工具 | Vite 6 |
| 语言 | TypeScript |
| UI 框架 | React 18 |
| 路由 | React Router 7 |
| 样式 | Tailwind CSS 4 |
| 图标 | Lucide React |
| 轮播 | React Slick |
| 动画 | tw-animate-css |

## 📁 项目结构

```
src/
├── app/                      # 应用根
│   ├── App.tsx              # 路由配置 & Provider 嵌套
│   ├── components/          # 28 个页面组件
│   │   ├── HomePage.tsx     # 首页 (含实时行情轮播)
│   │   ├── MarketPage.tsx   # 行情列表
│   │   ├── TradingPage.tsx  # 现货交易
│   │   ├── ForexTradingPage.tsx
│   │   ├── FlashTradingPage.tsx  # 闪兑交易
│   │   ├── FlashContractPage.tsx # 闪兑合约
│   │   ├── PositionsPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── LoginPage.tsx / RegisterPage.tsx
│   │   ├── DepositPage.tsx / DepositHistoryPage.tsx
│   │   ├── WithdrawPage.tsx / WithdrawHistoryPage.tsx
│   │   ├── LoanPage.tsx     # 借贷
│   │   ├── SettingsPage.tsx
│   │   ├── SecurityCenterPage.tsx
│   │   ├──   └─ LoginPasswordPage / TradingPasswordPage / KYCPage
│   │   ├── FundRecordsPage.tsx / RegulatoryPage.tsx
│   │   ├── LanguageSelectPage.tsx / LanguageSelector.tsx
│   │   └── BottomNav.tsx    # 底部导航(首页/行情/订单/闪兑/我的)
│   └── contexts/            # 全局状态
│       ├── LanguageContext.tsx  # 多语言
│       └── LeverageContext.tsx  # 杠杆设置
├── assets/                  # 静态图片(4 个 PNG)
├── styles/                  # CSS 入口
│   ├── index.css            # 唯一被加载的样式文件
│   ├── tailwind.css         # Tailwind v4 + tw-animate-css
│   └── slick.css            # 轮播样式
└── main.tsx                 # React 入口
```

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9(或 pnpm / yarn)

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

默认监听 `http://localhost:5173`(端口被占用时会自动顺延)。

### 生产构建

```bash
npm run build
```

产物输出到 `dist/` 目录,可直接部署到任意静态服务器。

### 预览生产构建

```bash
npm run preview
```

## 🧭 页面路由

| 路径 | 页面 |
|---|---|
| `/` | 首页 |
| `/login` `/register` | 登录/注册 |
| `/language` | 语言选择 |
| `/market` | 行情市场 |
| `/orders` | 持仓 |
| `/flash` | 闪兑合约 |
| `/profile` | 个人中心 |
| `/trading` | 现货交易 |
| `/forex-trading` | 外汇交易 |
| `/flash-trading` | 闪兑交易 |
| `/deposit` `/deposit/history` | 充值 / 充值记录 |
| `/withdraw` `/withdraw/history` | 提现 / 提现记录 |
| `/loan` | 借贷 |
| `/settings` | 设置 |
| `/regulatory` | 监管信息 |
| `/fund-records` | 资金记录 |
| `/security` | 安全中心 |
| `/security/login-password` | 修改登录密码 |
| `/security/trading-password` | 修改交易密码 |
| `/security/kyc` | KYC 身份认证 |

## 🎨 设计约定

- **配色** — 深色主题,主色 `#0f1419`(背景)、`#c4f82a`(品牌强调色,绿)
- **容器** — `max-w-md mx-auto`,模拟手机屏幕宽度
- **图标** — 统一使用 `lucide-react`,不混用 emoji 图标
- **隐藏底部导航** — `/login` `/register` `/language` 三个页面隐藏 `BottomNav`

## 🌐 多语言机制

所有翻译集中在 [src/app/contexts/LanguageContext.tsx](src/app/contexts/LanguageContext.tsx)。

使用方式:

```tsx
import { useLanguage } from '../contexts/LanguageContext';

const { language, setLanguage, t } = useLanguage();
const greeting = t('hello');   // 取当前语言的翻译
```

切换语言后整个应用实时刷新。

## 📊 实时数据接入

首页和行情页通过浏览器原生 `WebSocket` 直接连接:

```
wss://stream.binance.com:9443/ws
```

订阅的币对:

```
BTCUSDT ETHUSDT BNBUSDT SOLUSDT ADAUSDT
TRXUSDT DOGEUSDT XRPUSDT DOTUSDT LINKUSDT
```

通过 REST 接口 `/api/v3/ticker/24hr` 拉取初始 24 小时数据,WebSocket 持续推送实时变动。

## 🔌 扩展建议

如需新增页面:

1. 在 `src/app/components/` 下创建 `XxxPage.tsx`,默认导出组件
2. 在 `src/app/App.tsx` 中 `import` 并注册 `<Route>`
3. 如需底部导航栏入口,编辑 [BottomNav.tsx](src/app/components/BottomNav.tsx)

## 📝 注意事项

- 本项目是**前端 UI 原型**,所有登录、注册、下单、资金操作均为前端模拟,**无后端服务**
- Binance WebSocket 依赖网络可达,某些地区可能需要代理
- 仅在 `max-w-md` 宽度下做了精心设计,大于此宽度的桌面端仅居中显示
## 📝 注意事项
