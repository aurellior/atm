"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("atm_session");
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {
      localStorage.removeItem("atm_session");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    setUser(employee);
    router.replace("/");
  };

  const logout = () => {
    localStorage.removeItem("atm_session");
    setUser(null);
    router.replace("/login");
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
