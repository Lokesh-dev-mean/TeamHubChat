import React from 'react';
import { CircularProgress } from '@mui/material';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
      <CircularProgress size={40} />
      <p className="text-gray-600">
        Loading TeamHub...
      </p>
    </div>
  );
};

export default LoadingScreen;

