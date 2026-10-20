"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ActivityItem, HolidayItem } from "@/types";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Loader2,
  X,
} from "lucide-react";

interface ActivityCalendarProps {
  activities: ActivityItem[];
  loading?: boolean;
  selectedDateKey?: string | null;
  onSelectDateKey?: (dateKey: string | null) => void;
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
  selectedDateKey: controlledDateKey,
  onSelectDateKey,
}: ActivityCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [internalDateKey, setInternalDateKey] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  const selectedDateKey =
    controlledDateKey !== undefined ? controlledDateKey : internalDateKey;

  const setSelectedDateKey = (
    next: string | null | ((prev: string | null) => string | null)
  ) => {
    const resolved =
      typeof next === "function" ? next(selectedDateKey) : next;
    if (onSelectDateKey) {
      onSelectDateKey(resolved);
    } else {
      setInternalDateKey(resolved);
    }
  };

  // Fetch Indonesian Public Holidays & Collective Leave from Tanggal Merah API
  useEffect(() => {
    let active = true;
    setHolidaysLoading(true);

    fetch(`/api/v1/holidays?year=${viewYear}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.data) ? data.data : [];
        setHolidays(list);
      })
      .catch(() => {
        if (active) setHolidays([]);
      })
      .finally(() => {
        if (active) setHolidaysLoading(false);
      });

    return () => {
      active = false;
    };
  }, [viewYear]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, HolidayItem[]>();
    for (const h of holidays) {
      if (!h.date) continue;
      const existing = map.get(h.date) || [];
      existing.push(h);
      map.set(h.date, existing);
    }
    return map;
  }, [holidays]);

  const monthHolidays = useMemo(() => {
    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-`;
    return holidays
      .filter((h) => h.date.startsWith(monthPrefix))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, viewYear, viewMonth]);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();

    for (const act of activities) {
      const dateStr =
        extractDateStr(act.start_date) ||
        extractDateStr(act.target_end_date) ||
        extractDateStr(act.actual_end_date);

      if (!dateStr) continue;

      const existing = map.get(dateStr) || [];
      if (!existing.some((item) => String(item.id) === String(act.id))) {
        existing.push(act);
        map.set(dateStr, existing);
      }
    }

    return map;
  }, [activities]);

  const calendarData = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayJs = new Date(viewYear, viewMonth, 1).getDay();
    const leadingEmptyDays = (firstDayJs + 6) % 7;

    const days: {
      day: number;
      dateKey: string;
      isWeekend: boolean;
      dayHolidays: HolidayItem[];
      hasHoliday: boolean;
      hasLeave: boolean;
      items: ActivityItem[];
    }[] = [];

    let filledDaysCount = 0;
    let emptyWorkdaysCount = 0;
    let offDaysCount = 0;
    const uniqueMonthActivityIds = new Set<string>();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = toDateKey(viewYear, viewMonth, d);
      const dayOfWeek = new Date(viewYear, viewMonth, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayHolidays = holidaysByDate.get(dateKey) || [];
      const hasHoliday = dayHolidays.some((h) => h.type === "holiday");
      const hasLeave = dayHolidays.some((h) => h.type === "leave");
      const isPublicOffDay = hasHoliday || hasLeave;
      const items = activitiesByDate.get(dateKey) || [];

      if (isPublicOffDay) {
        offDaysCount++;
      }

      if (items.length > 0) {
        filledDaysCount++;
        items.forEach((it) => uniqueMonthActivityIds.add(String(it.id)));
      } else if (!isWeekend && !isPublicOffDay) {
        emptyWorkdaysCount++;
      }

      days.push({
        day: d,
        dateKey,
        isWeekend,
        dayHolidays,
        hasHoliday,
        hasLeave,
        items,
      });
    }

    return {
      leadingEmptyDays,
      days,
      filledDaysCount,
      emptyWorkdaysCount,
      offDaysCount,
      totalMonthActivities: uniqueMonthActivityIds.size,
    };
  }, [viewYear, viewMonth, activitiesByDate, holidaysByDate]);

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
  const selectedDayHolidays = selectedDateKey
    ? holidaysByDate.get(selectedDateKey) || []
    : [];

  const getContributionStyle = (
    count: number,
    isWeekend: boolean,
    hasHoliday: boolean,
    hasLeave: boolean
  ) => {
    if (count === 0) {
      if (hasHoliday) {
        return "bg-rose-50/90 border-rose-200 text-rose-700 hover:border-rose-300";
      }
      if (hasLeave) {
        return "bg-amber-50/90 border-amber-200 text-amber-800 hover:border-amber-300";
      }
      return isWeekend
        ? "bg-slate-50/50 border-slate-100 text-slate-300"
        : "bg-slate-50 border-dashed border-slate-200 text-slate-500 hover:border-slate-300";
    }
    if (count === 1) {
      return "bg-emerald-100 border-emerald-300 text-emerald-900";
    }
    if (count <= 3) {
      return "bg-emerald-300 border-emerald-400 text-emerald-950";
    }
    return "bg-emerald-600 border-emerald-700 text-white";
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm sm:p-5">
      {/* Header: Title + Month/Year Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-9 sm:w-9">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  Kalender Activity
                </h2>
                {(loading || holidaysLoading) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Cek tanggal terisi, kosong & hari libur nasional
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTodayMonth}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 active:scale-95 sm:hidden"
          >
            Hari Ini
          </button>
        </div>

        {/* Sleek Month & Year Bar (Fits 100% cleanly on iPhone 15 393px) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 active:scale-95 hover:bg-slate-50"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="relative flex-1 sm:w-36 sm:flex-none">
            <select
              value={viewMonth}
              onChange={(e) => {
                setSelectedDateKey(null);
                setViewMonth(Number(e.target.value));
              }}
              className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-7 text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <div className="relative w-24 shrink-0">
            <select
              value={viewYear}
              onChange={(e) => {
                setSelectedDateKey(null);
                setViewYear(Number(e.target.value));
              }}
              className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-7 text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 active:scale-95 hover:bg-slate-50"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleTodayMonth}
            className="hidden h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex"
          >
            Hari Ini
          </button>
        </div>
      </div>

      {/* Month Summary Pills */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-y border-slate-100 py-2 text-[11px] sm:text-xs">
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {calendarData.filledDaysCount} Terisi
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full border border-dashed border-slate-400 bg-white" />
          {calendarData.emptyWorkdaysCount} Hari Kerja Kosong
        </span>
        {calendarData.offDaysCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            {calendarData.offDaysCount} Libur / Cuti Bersama
          </span>
        )}
      </div>

      {/* Calendar Grid (7 Columns: Sen..Min) */}
      <div className="mt-2.5">
        <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
          {DAY_HEADERS.map((d, i) => (
            <div
              key={d}
              className={`pb-1 text-[10px] font-bold uppercase sm:text-[11px] ${
                i === 5 || i === 6
                  ? "text-rose-500"
                  : "text-slate-500"
              }`}
            >
              {d}
            </div>
          ))}

          {Array.from({ length: calendarData.leadingEmptyDays }).map((_, i) => (
            <div key={`empty-${i}`} className="h-11 sm:h-14" />
          ))}

          {calendarData.days.map(
            ({
              day,
              dateKey,
              isWeekend,
              dayHolidays,
              hasHoliday,
              hasLeave,
              items,
            }) => {
              const count = items.length;
              const isSelected = selectedDateKey === dateKey;
              const isToday = todayKey === dateKey;
              const colorClass = getContributionStyle(
                count,
                isWeekend,
                hasHoliday,
                hasLeave
              );
              const holidayTooltip = dayHolidays
                .map(
                  (h) =>
                    `${h.name} (${
                      h.type === "holiday" ? "Libur Nasional" : "Cuti Bersama"
                    })`
                )
                .join(", ");

              return (
                <button
                  key={dateKey}
                  type="button"
                  title={holidayTooltip || undefined}
                  onClick={() =>
                    setSelectedDateKey((prev) =>
                      prev === dateKey ? null : dateKey
                    )
                  }
                  className={`relative flex h-11 flex-col items-center justify-between rounded-xl border p-1 transition active:scale-95 sm:h-14 sm:p-2 ${colorClass} ${
                    isSelected
                      ? "ring-2 ring-brand-600 ring-offset-1"
                      : isToday
                      ? "ring-1 ring-slate-900/50"
                      : ""
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`text-[11px] font-bold leading-none sm:text-sm ${
                        count < 4 && hasHoliday
                          ? "text-rose-600"
                          : count < 4 && hasLeave
                          ? "text-amber-700"
                          : ""
                      }`}
                    >
                      {day}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {(hasHoliday || hasLeave) && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            hasHoliday
                              ? count >= 4
                                ? "bg-rose-200"
                                : "bg-rose-500"
                              : count >= 4
                              ? "bg-amber-200"
                              : "bg-amber-500"
                          }`}
                        />
                      )}
                      {isToday && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            count >= 4 ? "bg-white" : "bg-brand-600"
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="w-full text-right">
                    {count > 0 ? (
                      <span
                        className={`inline-block rounded px-1 text-[9px] font-bold leading-tight sm:text-[10px] ${
                          count >= 4
                            ? "bg-white/20 text-white"
                            : "bg-black/5 text-current"
                        }`}
                      >
                        {count} <span className="hidden sm:inline">act</span>
                      </span>
                    ) : hasHoliday ? (
                      <span className="block truncate text-[8px] font-bold text-rose-600 sm:text-[9px]">
                        Libur
                      </span>
                    ) : hasLeave ? (
                      <span className="block truncate text-[8px] font-bold text-amber-700 sm:text-[9px]">
                        Cuti Bersama
                      </span>
                    ) : (
                      <span className="text-[9px] opacity-50">-</span>
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* GitHub-style Color Legend (Bottom-Right) */}
      <div className="mt-2.5 flex items-center justify-end">
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400 sm:text-[11px]">
          <span className="inline-flex items-center gap-1 mr-1 text-rose-600 font-medium">
            <span className="h-2.5 w-2.5 rounded border border-rose-200 bg-rose-50" />
            Libur
          </span>
          <span className="inline-flex items-center gap-1 mr-1.5 text-amber-700 font-medium">
            <span className="h-2.5 w-2.5 rounded border border-amber-200 bg-amber-50" />
            Cuti Bersama
          </span>
          <span>Kosong</span>
          <span className="h-3 w-3 rounded border border-dashed border-slate-300 bg-slate-50" />
          <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-100" />
          <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-300" />
          <span className="h-3 w-3 rounded border border-emerald-700 bg-emerald-600" />
          <span>Banyak</span>
        </div>
      </div>

      {/* Selected Date Activity & Holiday Details Panel */}
      {selectedDateKey && (
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <h3 className="text-xs font-bold text-slate-800">
              Detail {Number(selectedDateKey.split("-")[2])}{" "}
              {MONTH_NAMES[Number(selectedDateKey.split("-")[1]) - 1]}{" "}
              {selectedDateKey.split("-")[0]} ({selectedDayItems.length} Activity)
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDateKey(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Holiday / Leave Banner for Selected Date */}
          {selectedDayHolidays.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {selectedDayHolidays.map((h, idx) => {
                const isHoliday = h.type === "holiday";
                return (
                  <div
                    key={`${h.date}-${idx}`}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                      isHoliday
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Flag
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isHoliday ? "text-rose-600" : "text-amber-600"
                        }`}
                      />
                      <span className="font-semibold leading-snug">
                        {h.name}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isHoliday
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isHoliday ? "Libur Nasional" : "Cuti Bersama"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {selectedDayItems.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-500">
              {selectedDayHolidays.length > 0 ? (
                <>Tidak ada activity pada hari libur/cuti ini.</>
              ) : (
                <>
                  Tanggal ini masih <strong>kosong</strong> (belum ada activity).
                </>
              )}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {selectedDayItems.map((act) => {
                const isDone = act.complete_status === "DONE";
                return (
                  <li
                    key={act.id}
                    className="flex items-start justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      {isDone ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 leading-snug">
                          {act.name}
                        </p>
                        {act.project_name && (
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {act.project_name}
                          </p>
                        )}
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

      {/* Monthly Holidays & Collective Leave Summary Footer */}
      {monthHolidays.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hari Libur & Cuti Bersama ({MONTH_NAMES[viewMonth]} {viewYear})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {monthHolidays.map((h, idx) => {
              const dayNum = Number(h.date.split("-")[2]);
              const isHoliday = h.type === "holiday";
              const isSelected = selectedDateKey === h.date;
              return (
                <button
                  key={`${h.date}-${idx}`}
                  type="button"
                  onClick={() =>
                    setSelectedDateKey((prev) =>
                      prev === h.date ? null : h.date
                    )
                  }
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[11px] transition active:scale-95 ${
                    isHoliday
                      ? "border-rose-200/80 bg-rose-50/70 text-rose-800 hover:bg-rose-100/80"
                      : "border-amber-200/80 bg-amber-50/70 text-amber-900 hover:bg-amber-100/80"
                  } ${isSelected ? "ring-1 ring-brand-600" : ""}`}
                >
                  <span
                    className={`shrink-0 rounded px-1 py-0.2 text-[10px] font-bold ${
                      isHoliday
                        ? "bg-rose-200/70 text-rose-900"
                        : "bg-amber-200/70 text-amber-950"
                    }`}
                  >
                    {dayNum} {MONTH_NAMES[viewMonth].slice(0, 3)}
                  </span>
                  <span className="truncate font-medium">{h.name}</span>
                  <span className="shrink-0 text-[9px] opacity-75">
                    ({isHoliday ? "Libur" : "Cuti Bersama"})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
