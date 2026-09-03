import { X, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Product {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  price: string;
  change: string;
  positive: boolean;
}

interface ProductListSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentSymbol: string;
  title: string;
  subtitle: string;
  searchPlaceholder?: string;
  linkPrefix: string; // '/trading' or '/forex-trading'
}

export function ProductListSidebar({ 
  isOpen, 
  onClose, 
  products, 
  currentSymbol, 
  title, 
  subtitle,
  searchPlaceholder = 'Search symbol...',
  linkPrefix
}: ProductListSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#0f1419] z-50 shadow-2xl animate-slide-in-right overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#3a4a2a] rounded-full flex items-center justify-center">
              <Search className="w-5 h-5 text-[#c4f82a]" />
            </div>
            <div>
              <div className="text-white font-medium">{title}</div>
              <div className="text-xs text-gray-500">{subtitle}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
            />
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto">
          {products.map((product, index) => {
            const isActive = product.symbol === currentSymbol;
            
            return (
              <Link
                key={product.symbol}
                to={linkPrefix}
                onClick={onClose}
                className={`block px-4 py-3 border-b border-gray-800/50 hover:bg-[#1a1a1a] transition-colors ${
                  isActive ? 'bg-[#2a3a2a] border-l-4 border-l-[#c4f82a]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 ${product.color} rounded-full flex items-center justify-center text-xl flex-shrink-0`}>
                    {product.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium mb-0.5">{product.symbol}</div>
                    <div className="text-xs text-gray-500">{product.name}</div>
                  </div>

                  {/* Price & Change */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-white font-medium mb-0.5">{product.price}</div>
                    <div className={`text-xs flex items-center justify-end gap-0.5 ${
                      product.positive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {product.positive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {product.change}
                    </div>
                  </div>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="w-2 h-2 bg-[#c4f82a] rounded-full flex-shrink-0 ml-2" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
