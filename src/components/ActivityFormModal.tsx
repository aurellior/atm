"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  ACTIVITY_TYPES,
  ActivityItem,
  ActivityStatus,
  EmployeeOption,
  HolidayItem,
  TaskItem,
} from "@/types";
import EmployeeSearchSelect from "@/components/EmployeeSearchSelect";
import {
  CalendarDays,
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
  onSuccess: () => Promise<void> | void;
  onSubmitStart?: (
    isEdit: boolean,
    expectedCount: number,
    activityId?: string | number
  ) => void;
  onSubmitEnd?: () => void;
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

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

function formatDayMonth(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  return `${Number(d)} ${SHORT_MONTHS[Number(m) - 1] || m}`;
}

export default function ActivityFormModal({
  isOpen,
  onClose,
  task,
  employees,
  initialActivity,
  defaultDate,
  onSuccess,
  onSubmitStart,
  onSubmitEnd,
}: ActivityFormModalProps) {
  const isEdit = Boolean(initialActivity);

  const [name, setName] = useState("");
  const [validatorId, setValidatorId] = useState("");
  const [typeId, setTypeId] = useState("2");
  const [status, setStatus] = useState<ActivityStatus>("DONE");
  const [startDate, setStartDate] = useState(getTodayStr());
  const [targetDate, setTargetDate] = useState(getTodayStr());
  const [actualDate, setActualDate] = useState("");
  const [notes, setNotes] = useState("");
  const [showMore, setShowMore] = useState(false);

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeYear = useMemo(() => {
    const yr = Number(startDate?.split("-")[0]);
    return yr > 2000 ? yr : new Date().getFullYear();
  }, [startDate]);

  useEffect(() => {
    if (!isOpen || isEdit) return;
    let active = true;
    fetch(`/api/v1/holidays?year=${activeYear}`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        setHolidays(Array.isArray(json?.data) ? json.data : []);
      })
      .catch(() => {
        if (active) setHolidays([]);
      });
    return () => {
      active = false;
    };
  }, [isOpen, isEdit, activeYear]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    setError("");
    const taskStart = toInputDate(task.start_date) || getTodayStr();
    const taskEnd =
      toInputDate(task.target_end_date) || taskStart || getTodayStr();

    const getDefaultValidator = () => {
      // Prioritas utama: selalu mengikuti assignor dari Task induknya
      if (
        task.assignor_id &&
        employees.some((e) => String(e.id) === String(task.assignor_id))
      ) {
        return String(task.assignor_id);
      }
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("atm_last_validator");
        if (saved && employees.some((e) => String(e.id) === saved)) {
          return saved;
        }
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
      setStartDate(toInputDate(initialActivity.start_date) || taskStart);
      setTargetDate(
        toInputDate(initialActivity.target_end_date) ||
          toInputDate(initialActivity.start_date) ||
          taskEnd
      );
      setActualDate(toInputDate(initialActivity.actual_end_date) || "");
      setNotes(initialActivity.notes || "");
      setShowMore(
        Boolean(initialActivity.notes || initialActivity.actual_end_date)
      );
    } else {
      const initialDate = defaultDate || taskStart;
      setName("");
      setValidatorId(getDefaultValidator());
      setTypeId("2");
      setStatus("DONE");
      setStartDate(initialDate);
      setTargetDate(initialDate);
      setActualDate("");
      setNotes("");
      setShowMore(false);
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [
    isOpen,
    initialActivity,
    defaultDate,
    employees,
    task.assignor_id,
    task.start_date,
    task.target_end_date,
  ]);

  // Compute daily breakdown when creating a multi-day activity
  const dateRangeBreakdown = useMemo(() => {
    if (isEdit || !startDate || !targetDate) {
      return { isMultiDay: false, activeDates: [startDate].filter(Boolean), skippedDates: [] };
    }
    if (targetDate <= startDate) {
      return { isMultiDay: false, activeDates: [startDate], skippedDates: [] };
    }

    const startObj = new Date(`${startDate}T00:00:00`);
    const endObj = new Date(`${targetDate}T00:00:00`);
    const diffDays = Math.round(
      (endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 0) {
      return { isMultiDay: false, activeDates: [startDate], skippedDates: [] };
    }

    const holidayMap = new Map<string, string>();
    for (const h of holidays) {
      if (h.date) holidayMap.set(h.date, h.name);
    }

    const activeDates: string[] = [];
    const skippedDates: { date: string; reason: string }[] = [];
    const maxDays = Math.min(diffDays, 60);

    for (let i = 0; i <= maxDays; i++) {
      const cur = new Date(startObj);
      cur.setDate(startObj.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      const dayOfWeek = cur.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        skippedDates.push({
          date: key,
          reason: dayOfWeek === 0 ? "Minggu" : "Sabtu",
        });
      } else if (holidayMap.has(key)) {
        skippedDates.push({
          date: key,
          reason: holidayMap.get(key) || "Libur",
        });
      } else {
        activeDates.push(key);
      }
    }

    return {
      isMultiDay: true,
      activeDates,
      skippedDates,
    };
  }, [isEdit, startDate, targetDate, holidays]);

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
    if (targetDate < startDate) {
      setError("Target selesai tidak boleh lebih awal dari tanggal mulai");
      return;
    }
    if (!isEdit && dateRangeBreakdown.isMultiDay && dateRangeBreakdown.activeDates.length === 0) {
      setError("Semua tanggal dalam rentang tersebut adalah hari libur / akhir pekan");
      return;
    }

    const trimmedName = name.trim();
    const currentValidatorId = validatorId;
    const currentTypeId = typeId;
    const currentStatus = status;
    const currentStartDate = startDate;
    const currentTargetDate = targetDate;
    const finalActualDate =
      actualDate || (status === "DONE" ? startDate : null);
    const trimmedNotes = notes.trim();
    const activeDatesToCreate = dateRangeBreakdown.activeDates;
    const currentIsEdit = isEdit && Boolean(initialActivity);
    const currentActivityId = initialActivity?.id;
    const expectedCount =
      !currentIsEdit && dateRangeBreakdown.isMultiDay
        ? Math.max(1, activeDatesToCreate.length)
        : 1;

    setSubmitting(true);
    setError("");
    onSubmitStart?.(currentIsEdit, expectedCount, currentActivityId);
    onClose();

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("atm_last_validator", currentValidatorId);
      }

      if (currentIsEdit && currentActivityId !== undefined) {
        await api.editActivity({
          task_id: task.id,
          activity_id: currentActivityId,
          validator_id: currentValidatorId,
          activity_type_id: currentTypeId,
          name: trimmedName,
          start_date: currentStartDate,
          target_end_date: currentTargetDate,
          actual_end_date: finalActualDate,
          complete_status: currentStatus,
          notes: trimmedNotes,
        });
      } else {
        await api.createActivity({
          task_id: task.id,
          validator_id: currentValidatorId,
          activity_type_id: currentTypeId,
          name: trimmedName,
          start_date: currentStartDate,
          target_end_date: currentTargetDate,
          actual_end_date: finalActualDate,
          complete_status: currentStatus,
          notes: trimmedNotes,
          dates: activeDatesToCreate,
        });
      }

      await onSuccess();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan activity");
    } finally {
      setSubmitting(false);
      onSubmitEnd?.();
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

            {/* Validator with Search */}
            <EmployeeSearchSelect
              label="Validator"
              required
              employees={employees}
              value={validatorId}
              onChange={setValidatorId}
              placeholder="-- Pilih Validator --"
            />

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
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setStartDate(nextStart);
                    setTargetDate(nextStart);
                  }}
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
                  min={startDate || undefined}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Multi-Day Breakdown Preview */}
            {!isEdit && dateRangeBreakdown.isMultiDay && (
              <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-brand-800">
                  <CalendarDays className="h-4 w-4 shrink-0 text-brand-600" />
                  <span>
                    Otomatis membuat {dateRangeBreakdown.activeDates.length}{" "}
                    Activity harian:
                  </span>
                </div>

                {dateRangeBreakdown.activeDates.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {dateRangeBreakdown.activeDates.map((d) => (
                      <span
                        key={d}
                        className="rounded-md border border-brand-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700"
                      >
                        {formatDayMonth(d)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    Tidak ada hari kerja aktif pada rentang tanggal ini.
                  </p>
                )}

                {dateRangeBreakdown.skippedDates.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Dilewati ({dateRangeBreakdown.skippedDates.length} hari
                    libur/weekend):{" "}
                    {dateRangeBreakdown.skippedDates
                      .map((s) => `${formatDayMonth(s.date)} (${s.reason})`)
                      .join(", ")}
                  </p>
                )}
              </div>
            )}

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
              {isEdit
                ? "Update Activity"
                : dateRangeBreakdown.isMultiDay &&
                  dateRangeBreakdown.activeDates.length > 1
                ? `Simpan ${dateRangeBreakdown.activeDates.length} Activity`
                : "Simpan Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
