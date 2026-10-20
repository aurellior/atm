"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { CheckSquare, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900 sm:text-lg">
              Activity Tracker
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Simple Task & Daily Activity Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                {user.role?.name} • {user.team?.name}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Keluar"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
