"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ACTIVITY_TYPES,
  ActivityItem,
  ActivityStatus,
  EmployeeOption,
  TaskItem,
} from "@/types";
import {
  CheckSquare,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  X,
} from "lucide-react";

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem;
  employees: EmployeeOption[];
  initialActivity?: ActivityItem | null;
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

export default function ActivityFormModal({
  isOpen,
  onClose,
  task,
  employees,
  initialActivity,
  defaultDate,
  onSuccess,
}: ActivityFormModalProps) {
  const isEdit = Boolean(initialActivity);

  const [name, setName] = useState("");
  const [validatorId, setValidatorId] = useState("");
  const [typeId, setTypeId] = useState("2");
  const [status, setStatus] = useState<ActivityStatus>("IN_PROGRESS");
  const [startDate, setStartDate] = useState(getTodayStr());
  const [targetDate, setTargetDate] = useState(getTodayStr());
  const [actualDate, setActualDate] = useState("");
  const [notes, setNotes] = useState("");
  const [showMore, setShowMore] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    setError("");
    const fallbackDate = defaultDate || getTodayStr();

    const getDefaultValidator = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("atm_last_validator");
        if (saved && employees.some((e) => String(e.id) === saved)) {
          return saved;
        }
      }
      if (
        task.assignor_id &&
        employees.some((e) => String(e.id) === String(task.assignor_id))
      ) {
        return String(task.assignor_id);
      }
      return employees[0] ? String(employees[0].id) : "";
    };

    if (initialActivity) {
      setName(initialActivity.name || "");
      setValidatorId(
        String(
          initialActivity.validator_id ||
            initialActivity.validator?.id ||
            getDefaultValidator()
        )
      );
      setTypeId(
        String(
          initialActivity.activity_type_id ||
            initialActivity.activityType?.id ||
            "2"
        )
      );
      setStatus(initialActivity.complete_status || "IN_PROGRESS");
      setStartDate(toInputDate(initialActivity.start_date) || fallbackDate);
      setTargetDate(
        toInputDate(initialActivity.target_end_date) || fallbackDate
      );
      setActualDate(toInputDate(initialActivity.actual_end_date) || "");
      setNotes(initialActivity.notes || "");
      setShowMore(
        Boolean(initialActivity.notes || initialActivity.actual_end_date)
      );
    } else {
      setName("");
      setValidatorId(getDefaultValidator());
      setTypeId("2");
      setStatus("IN_PROGRESS");
      setStartDate(fallbackDate);
      setTargetDate(fallbackDate);
      setActualDate("");
      setNotes("");
      setShowMore(false);
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialActivity, employees, task.assignor_id, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama activity wajib diisi");
      return;
    }
    if (!validatorId) {
      setError("Pilih validator terlebih dahulu");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("atm_last_validator", validatorId);
      }

      const fallbackDate = defaultDate || getTodayStr();
      const finalActualDate =
        actualDate || (status === "DONE" ? fallbackDate : null);

      if (isEdit && initialActivity) {
        await api.editActivity({
          task_id: task.id,
          activity_id: initialActivity.id,
          validator_id: validatorId,
          activity_type_id: typeId,
          name: name.trim(),
          start_date: startDate,
          target_end_date: targetDate,
          actual_end_date: finalActualDate,
          complete_status: status,
          notes: notes.trim(),
        });
      } else {
        await api.createActivity({
          task_id: task.id,
          validator_id: validatorId,
          activity_type_id: typeId,
          name: name.trim(),
          start_date: startDate,
          target_end_date: targetDate,
          actual_end_date: finalActualDate,
          complete_status: status,
          notes: notes.trim(),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan activity");
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
        {/* Mobile Drag Indicator */}
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pb-3.5 pt-3 sm:pt-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">
                {isEdit ? "Edit Activity" : "Tambah Activity"}
              </h2>
              <p className="truncate text-xs text-slate-500">
                Task: {task.name}
              </p>
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

            {/* Activity Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Nama Activity <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Apa aktivitas yang Anda kerjakan?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Validator */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Validator <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={validatorId}
                  onChange={(e) => setValidatorId(e.target.value)}
                  required
                  className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3.5 pr-9 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="" disabled>
                    -- Pilih Validator --
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Type & Status Row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Tipe Activity
                </label>
                <div className="relative">
                  <select
                    value={typeId}
                    onChange={(e) => setTypeId(e.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3.5 pr-9 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Status Penyelesaian
                </label>
                <div className="grid h-11 grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setStatus("IN_PROGRESS")}
                    className={`rounded-lg text-xs font-bold transition ${
                      status === "IN_PROGRESS"
                        ? "bg-white text-amber-700 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("DONE")}
                    className={`rounded-lg text-xs font-bold transition ${
                      status === "DONE"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>

            {/* Start Date & Target Date (2-Column Grid safe for iPhone 15) */}
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

            {/* Optional Notes & Actual Date Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowMore((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {showMore
                  ? "Sembunyikan catatan & tanggal aktual"
                  : "+ Tambah catatan / tanggal selesai aktual"}
              </button>

              {showMore && (
                <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="min-w-0">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Tanggal Selesai Aktual{" "}
                      <span className="font-normal text-slate-400">
                        (Opsional)
                      </span>
                    </label>
                    <input
                      type="date"
                      value={actualDate}
                      onChange={(e) => setActualDate(e.target.value)}
                      className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Catatan (Notes)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Tambahkan catatan bila diperlukan..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Buttons */}
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
              {isEdit ? "Update Activity" : "Simpan Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
