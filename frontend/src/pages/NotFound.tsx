import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

const NotFound: React.FC = () => {
  return (
    <div className="container mx-auto max-w-lg">
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-12 text-center rounded-lg shadow-lg">
          <h1 className="text-8xl font-bold text-primary mb-4">
            404
          </h1>
          <h2 className="text-3xl font-semibold mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button
            component={Link}
            to="/"
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            className="px-8 py-3"
          >
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;