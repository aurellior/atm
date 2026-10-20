"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { CheckSquare, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3.5 py-2.5 sm:px-6 sm:py-3">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm sm:h-9 sm:w-9">
            <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight text-slate-900 sm:text-base">
              Activity Tracker
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Simple Task & Daily Activity Workspace
            </p>
          </div>
        </div>

        {/* User Profile Pill & Logout */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <div className="flex max-w-[185px] items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 py-1 pl-1.5 pr-2.5 sm:max-w-[260px] sm:py-1.5 sm:pl-2 sm:pr-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/profile.jpg"
              alt={user.name}
              className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-slate-200 sm:h-7 sm:w-7"
            />
            <div className="min-w-0 text-left">
              <p className="truncate text-xs font-bold leading-tight text-slate-800">
                {user.name}
              </p>
              <p className="truncate text-[10px] leading-tight text-slate-500">
                {user.role?.name} • {user.team?.name}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Keluar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition active:scale-95 hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden text-xs font-semibold sm:inline">
              Keluar
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
