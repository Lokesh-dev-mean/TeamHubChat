export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ToastAPI {
  show: (message: string, severity?: ToastSeverity, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
}

const noop = () => {};

export const toast: ToastAPI = {
  show: noop,
  success: noop,
  info: noop,
  warning: noop,
  error: noop,
};

export function bindToast(api: ToastAPI) {
  toast.show = api.show;
  toast.success = api.success;
  toast.info = api.info;
  toast.warning = api.warning;
  toast.error = api.error;
}


