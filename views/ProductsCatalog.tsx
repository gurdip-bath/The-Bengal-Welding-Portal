import React, { useState, useRef } from 'react';
import { MOCK_PRODUCTS } from '../mockData';
import { Product } from '../types';
import { COLORS } from '../constants';

interface ProductsCatalogProps {
  onRequestQuote: (product: Product, notes?: string, image?: string) => void;
}

const ProductsCatalog: React.FC<ProductsCatalogProps> = ({ onRequestQuote }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showToast, setShowToast] = useState(false);
  const [activeSpecialQuoteProduct, setActiveSpecialQuoteProduct] = useState<Product | null>(null);
  
  // Special quote state
  const [specialNotes, setSpecialNotes] = useState('');
  const [specialMedia, setSpecialMedia] = useState<{url: string, type: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['All', ...new Set(MOCK_PRODUCTS.map(p => p.category))];
  const filteredProducts = selectedCategory === 'All' 
    ? MOCK_PRODUCTS 
    : MOCK_PRODUCTS.filter(p => p.category === selectedCategory);

  const handleQuoteRequest = (product: Product) => {
    if (product.name === 'Grease Cleaning Service Plan') {
      setActiveSpecialQuoteProduct(product);
    } else {
      onRequestQuote(product);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onloadend = () => {
        setSpecialMedia({ url: reader.result as string, type: isVideo ? 'video' : 'image' });
      };
      reader.readAsDataURL(file);
    }
  };

  const submitSpecialQuote = () => {
    if (activeSpecialQuoteProduct) {
      // For simplicity, we store the media URL in the same applianceImage field
      onRequestQuote(activeSpecialQuoteProduct, specialNotes, specialMedia?.url);
      setActiveSpecialQuoteProduct(null);
      setSpecialNotes('');
      setSpecialMedia(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#F2C200]">Equipment & Services</h1>
        <p className="text-white opacity-80">Professional commercial kitchen solutions. Request a quote for pricing.</p>
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
                className="w-100% h-full object-cover group-hover:scale-90 transition-transform duration-500"
              />
              <span className="absolute top-3 right-3 bg-[#F2C200] px-2 py-1 rounded-md text-[10px] font-black text-black shadow-lg uppercase tracking-wide">
                {product.category}
              </span>
            </div>
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="font-bold text-lg text-white mb-1">{product.name}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{product.description}</p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#333333]">
                <span className="text-xl font-bold text-[#F2C200]">
                  {product.category === 'Services' ? 'From ' : ''}£{product.price.toLocaleString()}
                </span>
                <button 
                  onClick={() => handleQuoteRequest(product)}
                  className="bg-[#F2C200] text-black px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all"
                >
                  Request Quote
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Special Quote Modal */}
      {activeSpecialQuoteProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#333333] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#F2C200] p-6 text-black flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Service Quote Request</h2>
                <p className="text-xs font-bold opacity-80 uppercase">{activeSpecialQuoteProduct.name}</p>
              </div>
              <button onClick={() => setActiveSpecialQuoteProduct(null)} className="text-black hover:opacity-70">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              <div className="p-4 bg-white/5 border border-[#333333] rounded-2xl">
                <p className="text-sm text-[#F2C200] font-bold uppercase tracking-tight">
                  Professional Assessment:
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  Upload a photo or video of the appliance to help us assess the job.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Service Details & Notes</label>
                <textarea 
                  rows={4}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Tell us about the appliance condition..."
                  className="w-full px-4 py-3 bg-black border border-[#333333] rounded-xl focus:ring-1 focus:ring-[#F2C200] outline-none resize-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Appliance Media (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 border-2 border-dashed border-[#333333] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group"
                >
                  {specialMedia ? (
                    <div className="relative w-full h-48 bg-black rounded-xl overflow-hidden">
                      {specialMedia.type === 'video' ? (
                        <video src={specialMedia.url} className="w-full h-full object-contain" autoPlay muted loop />
                      ) : (
                        <img src={specialMedia.url} alt="Appliance" className="w-full h-full object-cover" />
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSpecialMedia(null); }}
                        className="absolute top-2 right-2 bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-500 group-hover:text-[#F2C200] transition-colors mb-2">
                        <i className="fas fa-clapperboard text-xl"></i>
                      </div>
                      <p className="text-sm font-bold text-gray-300 text-center">Click to upload <b>Photo or Video</b></p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Max 20MB</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    capture="environment"
                  />
                </div>
              </div>

              <button 
                onClick={submitSpecialQuote}
                className="w-full bg-[#F2C200] text-black py-4 rounded-xl font-bold shadow-lg shadow-[#F2C2001A] hover:brightness-110 active:scale-95 transition-all"
              >
                Submit Quote Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#F2C200] text-black px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 animate-bounce z-[120]">
          <i className="fas fa-check-circle text-black"></i>
          <span className="text-sm font-bold uppercase tracking-tight">Request sent! Confirmation email coming soon.</span>
        </div>
      )}

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