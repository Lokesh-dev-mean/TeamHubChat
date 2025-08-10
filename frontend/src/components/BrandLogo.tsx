import React from 'react';

const BrandLogo: React.FC<{ size?: number; alt?: string }>
  = ({ size = 48, alt = 'TeamHub' }) => {
  const [srcIndex, setSrcIndex] = React.useState(0);
  const sources = [
    '/logo.png', // place your improved logo here: frontend/public/logo.png
    '/src/assets/teamhub-logo.svg' // fallback
  ];

  return (
    <img
      src={sources[srcIndex]}
      alt={alt}
      width={size}
      height={size}
      style={{ display: 'block' }}
      onError={() => setSrcIndex(Math.min(srcIndex + 1, sources.length - 1))}
    />
  );
};

export default BrandLogo;


