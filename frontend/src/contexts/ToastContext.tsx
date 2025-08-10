import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { bindToast } from '../utils/toast';

type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  severity: ToastSeverity;
  duration: number;
}

interface ToastContextType {
  show: (message: string, severity?: ToastSeverity, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [counter, setCounter] = useState(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, severity: ToastSeverity = 'info', duration = 4000) => {
    setCounter((c) => c + 1);
    const id = Date.now() + counter;
    setToasts((prev) => [...prev, { id, message, severity, duration }]);
  }, [counter]);

  const api = useMemo<ToastContextType>(() => ({
    show,
    success: (m, d) => show(m, 'success', d),
    info: (m, d) => show(m, 'info', d),
    warning: (m, d) => show(m, 'warning', d),
    error: (m, d) => show(m, 'error', d),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Bind global toast utility once mounted */}
      <BindToast api={api} />
      {toasts.map((t) => (
        <Snackbar
          key={t.id}
          open
          onClose={() => remove(t.id)}
          autoHideDuration={t.duration}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={() => remove(t.id)} severity={t.severity} variant="filled" sx={{ width: '100%' }}>
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
};

const BindToast: React.FC<{ api: any }> = ({ api }) => {
  useEffect(() => {
    bindToast(api);
  }, [api]);
  return null;
};


