"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmployeeOption, TaskItem } from "@/types";
import { ClipboardList, Loader2, X } from "lucide-react";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number;
  projectName?: string;
  employees: EmployeeOption[];
  initialTask?: TaskItem | null;
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
    setError("");

    if (initialTask) {
      setName(initialTask.name || "");
      setAssignorId(String(initialTask.assignor_id || ""));
      setStartDate(toInputDate(initialTask.start_date) || getTodayStr());
      setTargetDate(toInputDate(initialTask.target_end_date) || getTodayStr());
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
      setStartDate(getTodayStr());
      setTargetDate(getTodayStr());
      setActualDate("");
    }
  }, [isOpen, initialTask, employees]);

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEdit ? "Edit Task" : "Tambah Task Baru"}
              </h2>
              {projectName && (
                <p className="text-xs text-slate-500">Project: {projectName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nama Task <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Integrasi API Pembayaran"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Pemberi Tugas (Assignor) <span className="text-red-500">*</span>
            </label>
            <select
              value={assignorId}
              onChange={(e) => setAssignorId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="" disabled>
                -- Pilih Assignor --
              </option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Tanggal Mulai <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Target Selesai <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Tanggal Selesai Aktual{" "}
              <span className="font-normal text-slate-400">(Opsional)</span>
            </label>
            <input
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan Perubahan" : "Buat Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
