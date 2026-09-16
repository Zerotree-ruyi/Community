import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LeverageProvider } from './contexts/LeverageContext';
import { HomePage } from './components/HomePage';
import { MarketPage } from './components/MarketPage';
import { ProfilePage } from './components/ProfilePage';
import { MessagesPage } from './components/MessagesPage';
import { AboutPage } from './components/AboutPage';
import { TradingPage } from './components/TradingPage';
import { ForexTradingPage } from './components/ForexTradingPage';
import { PositionsPage } from './components/PositionsPage';
import { SecurityCenterPage } from './components/SecurityCenterPage';
import { DepositPage } from './components/DepositPage';
import { DepositHistoryPage } from './components/DepositHistoryPage';
import { WithdrawPage } from './components/WithdrawPage';
import { WithdrawHistoryPage } from './components/WithdrawHistoryPage';
import { MyWalletsPage } from './components/MyWalletsPage';
import { LoanPage } from './components/LoanPage';
import { SettingsPage } from './components/SettingsPage';
import { RegulatoryPage } from './components/RegulatoryPage';
import { FundRecordsPage } from './components/FundRecordsPage';
import { LoginPasswordPage } from './components/LoginPasswordPage';
import { TradingPasswordPage } from './components/TradingPasswordPage';
import { KYCPage } from './components/KYCPage';
import { OrderDetailPage } from './components/OrderDetailPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { LanguageSelectPage } from './components/LanguageSelectPage';
import { BottomNav } from './components/BottomNav';

// 任何人都能访问的路由(登录前后都能看)
const PUBLIC_ROUTES = ['/login', '/register', '/language', '/regulatory'];

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [user, location.pathname, navigate]);

  if (!user) return null;     // 重定向前不渲染
  return <>{children}</>;
}

function RedirectIfLoggedIn({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  if (user) return null;
  return <>{children}</>;
}

// Main app content with routing
function AppContent() {
  const location = useLocation();

  // Pages that should not show the bottom navigation
  const hideBottomNav = PUBLIC_ROUTES.includes(location.pathname);

  return (
    <div className="max-w-md mx-auto relative bg-[#0f1419] min-h-screen">
      <Routes>
        {/* 已登录后才能看的页面 */}
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/market" element={<RequireAuth><MarketPage /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><PositionsPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
        <Route path="/about" element={<RequireAuth><AboutPage /></RequireAuth>} />
        <Route path="/trading" element={<RequireAuth><TradingPage /></RequireAuth>} />
        <Route path="/forex-trading" element={<RequireAuth><ForexTradingPage /></RequireAuth>} />
        <Route path="/security" element={<RequireAuth><SecurityCenterPage /></RequireAuth>} />
        <Route path="/deposit" element={<RequireAuth><DepositPage /></RequireAuth>} />
        <Route path="/deposit/history" element={<RequireAuth><DepositHistoryPage /></RequireAuth>} />
        <Route path="/withdraw" element={<RequireAuth><WithdrawPage /></RequireAuth>} />
        <Route path="/withdraw/history" element={<RequireAuth><WithdrawHistoryPage /></RequireAuth>} />
        <Route path="/my-wallets" element={<RequireAuth><MyWalletsPage /></RequireAuth>} />
        <Route path="/loan" element={<RequireAuth><LoanPage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/fund-records" element={<RequireAuth><FundRecordsPage /></RequireAuth>} />
        <Route path="/security/login-password" element={<RequireAuth><LoginPasswordPage /></RequireAuth>} />
        <Route path="/security/trading-password" element={<RequireAuth><TradingPasswordPage /></RequireAuth>} />
        <Route path="/security/kyc" element={<RequireAuth><KYCPage /></RequireAuth>} />
        <Route path="/order/:id" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />

        {/* 公共路由 */}
        <Route path="/login" element={<RedirectIfLoggedIn><LoginPage /></RedirectIfLoggedIn>} />
        <Route path="/register" element={<RedirectIfLoggedIn><RegisterPage /></RedirectIfLoggedIn>} />
        <Route path="/language" element={<LanguageSelectPage />} />
        <Route path="/regulatory" element={<RegulatoryPage />} />

        {/* 兜底:未知路径 → 登录页 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <LeverageProvider>
          <Router>
            <AppContent />
          </Router>
        </LeverageProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;