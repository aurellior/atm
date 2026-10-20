"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { EmployeeOption } from "@/types";
import { Check, ChevronDown, Search, User } from "lucide-react";

interface EmployeeSearchSelectProps {
  label: string;
  required?: boolean;
  employees: EmployeeOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function EmployeeSearchSelect({
  label,
  required = false,
  employees,
  value,
  onChange,
  placeholder = "-- Pilih Karyawan --",
}: EmployeeSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const selectedEmployee = useMemo(() => {
    return employees.find((emp) => String(emp.id) === String(value));
  }, [employees, value]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        (emp.email && emp.email.toLowerCase().includes(q))
    );
  }, [employees, search]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 text-left text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        <div className="flex min-w-0 items-center gap-2">
          {selectedEmployee ? (
            <>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <span className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                  {selectedEmployee.name}
                </span>
                {selectedEmployee.email && (
                  <span className="hidden truncate text-[11px] text-slate-400 sm:inline sm:ml-1.5">
                    ({selectedEmployee.email})
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-400 sm:text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown with Search Input */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          {/* Search Bar */}
          <div className="border-b border-slate-100 p-2">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Employee Options List */}
          <div className="max-h-56 overflow-y-auto overscroll-contain p-1.5">
            {filteredEmployees.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Tidak ada nama yang cocok
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = String(emp.id) === String(value);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      onChange(String(emp.id));
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition ${
                      isSelected
                        ? "bg-brand-50 font-bold text-brand-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold leading-tight text-slate-900">
                        {emp.name}
                      </p>
                      {emp.email && (
                        <p className="truncate text-[10px] text-slate-400">
                          {emp.email}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-brand-600" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
