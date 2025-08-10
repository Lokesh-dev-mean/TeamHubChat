import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { validateEnv } from './utils/env'

// Validate environment variables
try {
  validateEnv();
} catch (error) {
  console.error('Environment validation failed:', error);
  // Show error UI instead of crashing
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <div style={{ 
        padding: '20px', 
        color: '#ff0000', 
        textAlign: 'center',
        marginTop: '50px' 
      }}>
        <h1>Configuration Error</h1>
        <p>{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
        <p>Please check your environment configuration and try again.</p>
      </div>
    </React.StrictMode>
  );
  throw error;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
