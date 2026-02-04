import React from 'react';

export const COLORS = {
  primary: '#F2C200', // Brand Gold Accent
  secondary: '#FFFFFF', // White for primary text elements in dark mode
  textSecondary: '#E0E0E0', // Light gray/White for Body Text
  bg: '#000000', // Pure Black Background
  border: '#333333', // Dark Divider/Border
};

export const LOGO = (className: string = "w-10 h-10") => (
  <img 
    src="/bengalpng.png" 
    alt="Bengal Welding Logo" 
    className={`${className} object-contain`}
    onError={(e) => {
      const target = e.target as HTMLImageElement;
      
      // Step 1: If the local file fails, try the absolute remote path from the official website
      if (!target.getAttribute('data-tried-remote')) {
        target.setAttribute('data-tried-remote', 'true');
        target.src = "https://bengalwelding.co.uk/wp-content/uploads/2025/08/PNG-LOGO.png";
        return;
      }
      
      // Step 2: Final fallback if image is definitely missing locally and remotely
      if (!target.getAttribute('data-tried-fallback')) {
        target.setAttribute('data-tried-fallback', 'true');
        target.src = `https://ui-avatars.com/api/?name=BW&background=F2C200&color=000&bold=true`;
      }
    }}
  />
);

export const BRAND_NAME = "Bengal Welding";