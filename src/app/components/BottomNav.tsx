import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, PieChart, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: '/', icon: Home, label: t('nav.home') },
    { path: '/market', icon: TrendingUp, label: t('nav.market') },
    { path: '/orders', icon: PieChart, label: t('nav.orders') },
    { path: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1f2e] border-t border-gray-800">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1"
            >
              <Icon 
                className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? 'text-[#c4f82a]' : 'text-gray-400'
                }`} 
              />
              <span 
                className={`text-[10px] leading-tight text-center whitespace-nowrap ${
                  isActive ? 'text-[#c4f82a]' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
