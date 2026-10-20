"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmployeeOption, TaskItem } from "@/types";
import EmployeeSearchSelect from "@/components/EmployeeSearchSelect";
import { ClipboardList, Loader2, X } from "lucide-react";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number;
  projectName?: string;
  employees: EmployeeOption[];
  initialTask?: TaskItem | null;
  defaultDate?: string | null;
  onSuccess: () => void;
}

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toInputDate(iso?: string | null) {
  if (!iso) return "";
  return iso.split("T")[0];
}

export default function TaskFormModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  employees,
  initialTask,
  defaultDate,
  onSuccess,
}: TaskFormModalProps) {
  const isEdit = Boolean(initialTask);

  const [name, setName] = useState("");
  const [assignorId, setAssignorId] = useState("");
  const [startDate, setStartDate] = useState(getTodayStr());
  const [targetDate, setTargetDate] = useState(getTodayStr());
  const [actualDate, setActualDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    setError("");
    const fallbackDate = defaultDate || getTodayStr();

    if (initialTask) {
      setName(initialTask.name || "");
      setAssignorId(String(initialTask.assignor_id || ""));
      setStartDate(toInputDate(initialTask.start_date) || fallbackDate);
      setTargetDate(toInputDate(initialTask.target_end_date) || fallbackDate);
      setActualDate(toInputDate(initialTask.actual_end_date) || "");
    } else {
      setName("");
      const savedAssignor =
        typeof window !== "undefined"
          ? localStorage.getItem("atm_last_assignor") || ""
          : "";
      if (
        savedAssignor &&
        employees.some((emp) => String(emp.id) === savedAssignor)
      ) {
        setAssignorId(savedAssignor);
      } else if (employees.length > 0) {
        setAssignorId(String(employees[0].id));
      }
      setStartDate(fallbackDate);
      setTargetDate(fallbackDate);
      setActualDate("");
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialTask, employees, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama task wajib diisi");
      return;
    }
    if (!assignorId) {
      setError("Assignor (pemberi tugas) wajib dipilih");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("atm_last_assignor", assignorId);
      }

      if (isEdit && initialTask) {
        await api.editTask({
          id: initialTask.id,
          assignor_id: assignorId,
          name: name.trim(),
          start_date: startDate,
          target_end_date: targetDate,
          actual_end_date: actualDate || null,
        });
      } else {
        await api.createTask({
          project_id: projectId,
          assignor_id: assignorId,
          name: name.trim(),
          start_date: startDate,
          target_end_date: targetDate,
          actual_end_date: actualDate || null,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* Mobile Drag Handle */}
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pb-3.5 pt-3 sm:pt-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">
                {isEdit ? "Edit Task" : "Tambah Task Baru"}
              </h2>
              {projectName && (
                <p className="truncate text-xs text-slate-500">
                  Project: {projectName}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-4 pb-safe sm:pb-5"
        >
          <div className="space-y-3.5">
            {error && (
              <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Nama Task <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Integrasi API Pembayaran"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <EmployeeSearchSelect
              label="Pemberi Tugas (Assignor)"
              required
              employees={employees}
              value={assignorId}
              onChange={setAssignorId}
              placeholder="-- Pilih Assignor --"
            />

            <div className="grid grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Tanggal Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Target Selesai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Tanggal Selesai Aktual{" "}
                <span className="font-normal text-slate-400">(Opsional)</span>
              </label>
              <input
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-1/2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition active:scale-95 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-1/2 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan" : "Buat Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
