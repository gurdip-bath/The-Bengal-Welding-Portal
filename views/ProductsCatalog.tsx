import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PRODUCTS } from '../mockData';
import { Product, User } from '../types';
import { BUSINESS_EMAIL, BUSINESS_PHONE } from '../constants';

interface ProductsCatalogProps {
  user?: User | null;
}

function formatProductPrice(product: Product): string {
  const min = product.price_min ?? product.price;
  const max = product.price_max;
  const hasRange = max != null && max !== min;
  const amount = hasRange
    ? `£${min.toLocaleString()} – £${max.toLocaleString()}`
    : `£${min.toLocaleString()}`;
  return amount;
}

const ProductsCatalog: React.FC<ProductsCatalogProps> = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const categories = ['All', ...new Set(MOCK_PRODUCTS.map((p) => p.category))];
  const filteredProducts =
    selectedCategory === 'All'
      ? MOCK_PRODUCTS
      : MOCK_PRODUCTS.filter((p) => p.category === selectedCategory);

  const getQuoteEmailLink = (product: Product) =>
    `mailto:${BUSINESS_EMAIL}?subject=${encodeURIComponent(`Quote request – ${product.name}`)}`;

  const getQuotePhoneLink = () => `tel:${BUSINESS_PHONE.replace(/\s/g, '')}`;

  const handleRequestService = () => {
    navigate('/dashboard?openRequestForm=1');
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#F2C200]">Equipment & Services</h1>
        <p className="text-white opacity-80">Professional commercial kitchen solutions. Contact us for a quote.</p>
      </header>

      {/* Category Filter */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
              selectedCategory === cat
                ? `bg-[#F2C200] text-black border-[#F2C200]`
                : 'bg-black text-gray-500 border-[#333333] hover:border-[#F2C200]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-[#111111] rounded-2xl border border-[#333333] shadow-lg overflow-hidden group flex flex-col hover:border-[#F2C200] transition-colors">
            <div className="h-64 overflow-hidden relative bg-black flex items-center justify-center border-b border-[#333333]">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-3 right-3 bg-[#F2C200] px-2 py-1 rounded-md text-[10px] font-black text-black shadow-lg uppercase tracking-wide">
                {product.category}
              </span>
            </div>
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="font-bold text-lg text-white mb-1">{product.name}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{product.description}</p>
              
              <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-[#333333]">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-[#F2C200]">
                    {product.category === 'Services' ? 'From ' : ''}{formatProductPrice(product)}
                    {product.name === 'Grease Cleaning Service Plan' && <span className="text-sm font-normal text-gray-400">/mo</span>}
                  </span>
                  <div className="flex gap-2">
                    {product.name === 'Grease Cleaning Service Plan' ? (
                      <button 
                        onClick={handleRequestService}
                        className="bg-[#F2C200] text-black px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all"
                      >
                        Request a Service
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <a
                          href={getQuoteEmailLink(product)}
                          className="bg-[#F2C200] text-black px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all inline-flex items-center gap-1"
                        >
                          <i className="fas fa-envelope text-xs"></i>
                          Email
                        </a>
                        <a
                          href={getQuotePhoneLink()}
                          className="bg-[#111111] border border-[#333333] text-[#F2C200] px-4 py-2 rounded-lg text-sm font-bold hover:border-[#F2C200] transition-all inline-flex items-center gap-1"
                        >
                          <i className="fas fa-phone text-xs"></i>
                          Call
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#111111] border border-[#333333] p-6 rounded-2xl flex items-start space-x-4">
        <div className="bg-black border border-[#F2C20033] p-3 rounded-xl text-[#F2C200] shadow-sm">
          <i className="fas fa-tools text-xl"></i>
        </div>
        <div>
          <h4 className="font-bold text-[#F2C200] uppercase tracking-tight">Custom Fabrication?</h4>
          <p className="text-sm text-gray-400 mt-1">
            We specialize in bespoke stainless steel tables and extraction units.
          </p>
          <button className="mt-4 font-bold text-sm text-[#F2C200] hover:text-white transition-colors">
            Contact Engineering Team →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductsCatalog;