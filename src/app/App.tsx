import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { LeverageProvider } from './contexts/LeverageContext';
import { HomePage } from './components/HomePage';
import { MarketPage } from './components/MarketPage';
import { FlashContractPage } from './components/FlashContractPage';
import { ProfilePage } from './components/ProfilePage';
import { TradingPage } from './components/TradingPage';
import { ForexTradingPage } from './components/ForexTradingPage';
import { FlashTradingPage } from './components/FlashTradingPage';
import { PositionsPage } from './components/PositionsPage';
import { SecurityCenterPage } from './components/SecurityCenterPage';
import { DepositPage } from './components/DepositPage';
import { DepositHistoryPage } from './components/DepositHistoryPage';
import { WithdrawPage } from './components/WithdrawPage';
import { WithdrawHistoryPage } from './components/WithdrawHistoryPage';
import { LoanPage } from './components/LoanPage';
import { SettingsPage } from './components/SettingsPage';
import { RegulatoryPage } from './components/RegulatoryPage';
import { FundRecordsPage } from './components/FundRecordsPage';
import { LoginPasswordPage } from './components/LoginPasswordPage';
import { TradingPasswordPage } from './components/TradingPasswordPage';
import { KYCPage } from './components/KYCPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { LanguageSelectPage } from './components/LanguageSelectPage';
import { BottomNav } from './components/BottomNav';

// Main app content with routing
function AppContent() {
  const location = useLocation();
  
  // Pages that should not show the bottom navigation
  const hideBottomNav = ['/login', '/register', '/language'].includes(location.pathname);

  return (
    <div className="max-w-md mx-auto relative bg-[#0f1419] min-h-screen">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/language" element={<LanguageSelectPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/orders" element={<PositionsPage />} />
        <Route path="/flash" element={<FlashContractPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/trading" element={<TradingPage />} />
        <Route path="/forex-trading" element={<ForexTradingPage />} />
        <Route path="/flash-trading" element={<FlashTradingPage />} />
        <Route path="/security" element={<SecurityCenterPage />} />
        <Route path="/deposit" element={<DepositPage />} />
        <Route path="/deposit/history" element={<DepositHistoryPage />} />
        <Route path="/withdraw" element={<WithdrawPage />} />
        <Route path="/withdraw/history" element={<WithdrawHistoryPage />} />
        <Route path="/loan" element={<LoanPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/regulatory" element={<RegulatoryPage />} />
        <Route path="/fund-records" element={<FundRecordsPage />} />
        <Route path="/security/login-password" element={<LoginPasswordPage />} />
        <Route path="/security/trading-password" element={<TradingPasswordPage />} />
        <Route path="/security/kyc" element={<KYCPage />} />
      </Routes>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <LeverageProvider>
        <Router>
          <AppContent />
        </Router>
      </LeverageProvider>
    </LanguageProvider>
  );
}

export default App;