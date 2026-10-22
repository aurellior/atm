"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthEmployee } from "@/types";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextValue {
  user: AuthEmployee | null;
  isLoading: boolean;
  setSession: (employee: AuthEmployee) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  setSession: () => {},
  logout: () => {},
});

function setTokenCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `atm_token=${encodeURIComponent(
    token
  )}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
}

function clearTokenCookie() {
  if (typeof document === "undefined") return;
  document.cookie =
    "atm_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

function isTokenExpired(token?: string): boolean {
  if (!token) return true;
  try {
    const cleanToken = token.startsWith("Bearer ")
      ? token.slice(7).trim()
      : token.trim();
    const parts = cleanToken.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const payload = JSON.parse(atob(padded));
    if (typeof payload.exp === "number") {
      return payload.exp <= Math.floor(Date.now() / 1000);
    }
    return false;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    localStorage.removeItem("atm_session");
    clearTokenCookie();
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("atm_session");
      if (saved) {
        const parsed: AuthEmployee = JSON.parse(saved);
        if (parsed?.token && !isTokenExpired(parsed.token)) {
          setTokenCookie(parsed.token);
          setUser(parsed);
        } else {
          localStorage.removeItem("atm_session");
          clearTokenCookie();
        }
      } else {
        clearTokenCookie();
      }
    } catch {
      localStorage.removeItem("atm_session");
      clearTokenCookie();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for 401/403 unauthorized API responses to auto-logout
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("atm:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("atm:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  useEffect(() => {
    if (isLoading) return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
    } else if (user && pathname === "/login") {
      router.replace("/");
    }
  }, [user, isLoading, pathname, router]);

  const setSession = (employee: AuthEmployee) => {
    localStorage.setItem("atm_session", JSON.stringify(employee));
    if (employee.token) {
      setTokenCookie(employee.token);
    }
    setUser(employee);
    router.replace("/");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
