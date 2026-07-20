import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/AuthContext";
import SplashScreen from "@/components/common/SplashScreen";

interface PublicRouteProps {
  children: ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
