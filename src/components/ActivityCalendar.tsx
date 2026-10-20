"use client";

import React, { useMemo, useState } from "react";
import { ActivityItem } from "@/types";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  X,
} from "lucide-react";

interface ActivityCalendarProps {
  activities: ActivityItem[];
  loading?: boolean;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_HEADERS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function toDateKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function extractDateStr(iso?: string | null): string | null {
  if (!iso) return null;
  return iso.split("T")[0];
}

export default function ActivityCalendar({
  activities,
  loading = false,
}: ActivityCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0 = Jan, 8 = Sep
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Map YYYY-MM-DD -> ActivityItem[]
  const activitiesByDate = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();

    const addActivityToDate = (dateKey: string, act: ActivityItem) => {
      const existing = map.get(dateKey) || [];
      if (!existing.some((item) => String(item.id) === String(act.id))) {
        existing.push(act);
        map.set(dateKey, existing);
      }
    };

    for (const act of activities) {
      const startStr = extractDateStr(act.start_date);
      const endStr =
        extractDateStr(act.actual_end_date) ||
        extractDateStr(act.target_end_date) ||
        startStr;

      if (!startStr) continue;

      addActivityToDate(startStr, act);

      // If activity spans multiple days (up to 31 days), mark each active date
      if (endStr && endStr >= startStr) {
        const startDate = new Date(`${startStr}T00:00:00`);
        const endDate = new Date(`${endStr}T00:00:00`);
        const diffDays = Math.round(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays > 0 && diffDays <= 31) {
          for (let i = 1; i <= diffDays; i++) {
            const cur = new Date(startDate);
            cur.setDate(startDate.getDate() + i);
            const key = toDateKey(
              cur.getFullYear(),
              cur.getMonth(),
              cur.getDate()
            );
            addActivityToDate(key, act);
          }
        }
      }
    }

    return map;
  }, [activities]);

  // Build calendar cells for (viewYear, viewMonth)
  const calendarData = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Convert Sunday (0) .. Saturday (6) to Monday (0) .. Sunday (6)
    const firstDayJs = new Date(viewYear, viewMonth, 1).getDay();
    const leadingEmptyDays = (firstDayJs + 6) % 7;

    const days: {
      day: number;
      dateKey: string;
      isWeekend: boolean;
      items: ActivityItem[];
    }[] = [];

    let filledDaysCount = 0;
    let emptyWorkdaysCount = 0;
    const uniqueMonthActivityIds = new Set<string>();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = toDateKey(viewYear, viewMonth, d);
      const dayOfWeek = new Date(viewYear, viewMonth, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const items = activitiesByDate.get(dateKey) || [];

      if (items.length > 0) {
        filledDaysCount++;
        items.forEach((it) => uniqueMonthActivityIds.add(String(it.id)));
      } else if (!isWeekend) {
        emptyWorkdaysCount++;
      }

      days.push({
        day: d,
        dateKey,
        isWeekend,
        items,
      });
    }

    return {
      leadingEmptyDays,
      days,
      filledDaysCount,
      emptyWorkdaysCount,
      totalMonthActivities: uniqueMonthActivityIds.size,
    };
  }, [viewYear, viewMonth, activitiesByDate]);

  const handlePrevMonth = () => {
    setSelectedDateKey(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDateKey(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleTodayMonth = () => {
    const current = new Date();
    setViewYear(current.getFullYear());
    setViewMonth(current.getMonth());
    setSelectedDateKey(
      toDateKey(current.getFullYear(), current.getMonth(), current.getDate())
    );
  };

  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDayItems = selectedDateKey
    ? activitiesByDate.get(selectedDateKey) || []
    : [];

  // GitHub Contribution color level helper
  const getContributionStyle = (count: number, isWeekend: boolean) => {
    if (count === 0) {
      return isWeekend
        ? "bg-slate-50/60 border-slate-100 text-slate-300 hover:border-slate-200"
        : "bg-slate-50 border-dashed border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100/70";
    }
    if (count === 1) {
      return "bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200/80";
    }
    if (count <= 3) {
      return "bg-emerald-300 border-emerald-400 text-emerald-950 hover:bg-emerald-400/80";
    }
    return "bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700";
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Header: Title + Month/Year Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Kalender Kontribusi Activity
              </h2>
              {loading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              )}
            </div>
            <p className="text-xs text-slate-500">
              Pantau tanggal yang sudah terisi activity & tanggal yang masih
              kosong
            </p>
          </div>
        </div>

        {/* Month & Year Navigation */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <select
            value={viewMonth}
            onChange={(e) => {
              setSelectedDateKey(null);
              setViewMonth(Number(e.target.value));
            }}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={viewYear}
            onChange={(e) => {
              setSelectedDateKey(null);
              setViewYear(Number(e.target.value));
            }}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleTodayMonth}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Hari Ini
          </button>
        </div>
      </div>

      {/* Month Summary Pills */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-y border-slate-100 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {calendarData.filledDaysCount} Hari Terisi
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
            <span className="h-2 w-2 rounded-full border border-dashed border-slate-400 bg-white" />
            {calendarData.emptyWorkdaysCount} Hari Kerja Kosong
          </span>
          <span className="text-slate-400">
            ({calendarData.totalMonthActivities} activity di{" "}
            {MONTH_NAMES[viewMonth]})
          </span>
        </div>

        {/* GitHub-style Color Legend */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Kosong</span>
          <span
            className="h-3.5 w-3.5 rounded border border-dashed border-slate-300 bg-slate-50"
            title="0 Activity (Kosong)"
          />
          <span
            className="h-3.5 w-3.5 rounded border border-emerald-300 bg-emerald-100"
            title="1 Activity"
          />
          <span
            className="h-3.5 w-3.5 rounded border border-emerald-400 bg-emerald-300"
            title="2-3 Activity"
          />
          <span
            className="h-3.5 w-3.5 rounded border border-emerald-700 bg-emerald-600"
            title="4+ Activity"
          />
          <span>Banyak</span>
        </div>
      </div>

      {/* Calendar Grid (7 Columns: Sen..Min) */}
      <div className="mt-3">
        <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
          {DAY_HEADERS.map((d, i) => (
            <div
              key={d}
              className={`pb-1 text-[11px] font-bold uppercase ${
                i >= 5 ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {d}
            </div>
          ))}

          {/* Empty cells before the 1st of the month */}
          {Array.from({ length: calendarData.leadingEmptyDays }).map((_, i) => (
            <div key={`empty-${i}`} className="h-11 sm:h-14" />
          ))}

          {/* Days of the month */}
          {calendarData.days.map(({ day, dateKey, isWeekend, items }) => {
            const count = items.length;
            const isSelected = selectedDateKey === dateKey;
            const isToday = todayKey === dateKey;
            const colorClass = getContributionStyle(count, isWeekend);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() =>
                  setSelectedDateKey((prev) =>
                    prev === dateKey ? null : dateKey
                  )
                }
                className={`relative flex h-11 flex-col items-center justify-between rounded-xl border p-1.5 transition sm:h-14 sm:p-2 ${colorClass} ${
                  isSelected
                    ? "ring-2 ring-brand-600 ring-offset-1"
                    : isToday
                    ? "ring-2 ring-slate-900/40"
                    : ""
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-bold leading-none sm:text-sm">
                    {day}
                  </span>
                  {isToday && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        count >= 4 ? "bg-white" : "bg-brand-600"
                      }`}
                      title="Hari ini"
                    />
                  )}
                </div>

                {/* Activity count indicator */}
                <div className="w-full text-right">
                  {count > 0 ? (
                    <span
                      className={`inline-block rounded px-1 text-[10px] font-bold leading-tight ${
                        count >= 4
                          ? "bg-white/20 text-white"
                          : "bg-black/5 text-current"
                      }`}
                    >
                      {count} <span className="hidden sm:inline">act</span>
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-60">-</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Activity Details Panel */}
      {selectedDateKey && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <h3 className="text-xs font-bold text-slate-800 sm:text-sm">
              Activity Tanggal{" "}
              {Number(selectedDateKey.split("-")[2])}{" "}
              {MONTH_NAMES[Number(selectedDateKey.split("-")[1]) - 1]}{" "}
              {selectedDateKey.split("-")[0]} ({selectedDayItems.length})
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDateKey(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedDayItems.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              Tanggal ini masih <strong>kosong</strong> (belum ada activity yang
              tercatat).
            </p>
          ) : (
            <ul className="mt-2.5 space-y-2">
              {selectedDayItems.map((act) => {
                const isDone = act.complete_status === "DONE";
                return (
                  <li
                    key={act.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    <div className="flex items-start gap-2">
                      {isDone ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <div>
                        <p className="font-semibold text-slate-900">
                          {act.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {act.project_name ? `${act.project_name} • ` : ""}
                          {act.task_name || act.task?.name || ""}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isDone
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isDone ? "Done" : "In Progress"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
