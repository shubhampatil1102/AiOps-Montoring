import { ReactNode } from "react";

export interface ToastProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export type ToastActionElement = ReactNode;
