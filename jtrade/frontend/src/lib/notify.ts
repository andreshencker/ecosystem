// src/lib/notify.ts
import toast, {Toaster} from "react-hot-toast";

export type NotifyOpts = Parameters<typeof toast>[1];

// Notificación genérica
export const notify = (msg: string, opts?: NotifyOpts) => toast(msg, opts);

// Atajos
export const notifySuccess = (msg: string, opts?: NotifyOpts) =>
    toast.success(msg, opts);

export const notifyError = (msg: string, opts?: NotifyOpts) =>
    toast.error(msg, opts);

export const notifyInfo = (msg: string, opts?: NotifyOpts) =>
    toast(msg, opts);

// Re-export del Toaster para comodidad
export {Toaster};

// Default export para quien haga: import notify from "@/lib/notify"
export default notify;