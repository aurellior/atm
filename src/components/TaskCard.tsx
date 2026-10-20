"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ACTIVITY_TYPES,
  ActivityItem,
  ActivityStatus,
  EmployeeOption,
  TaskItem,
} from "@/types";
import ActivityFormModal from "@/components/ActivityFormModal";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";

interface TaskCardProps {
  task: TaskItem;
  employees: EmployeeOption[];
  defaultExpanded?: boolean;
  defaultDate?: string | null;
  onEditTask: (task: TaskItem) => void;
  onTaskMutated: () => void;
}

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "-";
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return datePart;
  const months = [
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
  return `${Number(d)} ${months[Number(m) - 1] || m} ${y}`;
}

function toInputDate(iso?: string | null) {
  if (!iso) return "";
  return iso.split("T")[0];
}

export default function TaskCard({
  task,
  employees,
  defaultExpanded = false,
  defaultDate,
  onEditTask,
  onTaskMutated,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  // Activity Modal state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(
    null
  );

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingActId, setDeletingActId] = useState<string | null>(null);

  const fetchActivities = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingActivities(true);
      try {
        const list = await api.getActivitiesByTask(task.id);
        setActivities(list);
        setHasLoadedOnce(true);
      } catch (err) {
        console.error("Gagal memuat activity:", err);
      } finally {
        if (!silent) setLoadingActivities(false);
      }
    },
    [task.id]
  );

  useEffect(() => {
    if (expanded) {
      fetchActivities(hasLoadedOnce);
    }
  }, [expanded, fetchActivities, hasLoadedOnce]);

  const getDefaultValidatorId = useCallback(() => {
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
  }, [employees, task.assignor_id]);

  const handleToggleActivityStatus = async (act: ActivityItem) => {
    const nextStatus: ActivityStatus =
      act.complete_status === "DONE" ? "IN_PROGRESS" : "DONE";
    const actDateStr =
      toInputDate(act.start_date) ||
      toInputDate(act.target_end_date) ||
      getTodayStr();
    const nextActualDate =
      nextStatus === "DONE"
        ? toInputDate(act.actual_end_date) || actDateStr
        : null;

    // Optimistic UI update — instant feedback without spinner flash
    const previousActivities = activities;
    setActivities((prev) =>
      prev.map((item) =>
        String(item.id) === String(act.id)
          ? {
              ...item,
              complete_status: nextStatus,
              actual_end_date: nextActualDate,
            }
          : item
      )
    );
    setTogglingId(String(act.id));

    try {
      await api.editActivity({
        task_id: task.id,
        activity_id: act.id,
        validator_id:
          act.validator_id || act.validator?.id || getDefaultValidatorId(),
        activity_type_id: act.activity_type_id || act.activityType?.id || "2",
        name: act.name,
        start_date: toInputDate(act.start_date) || getTodayStr(),
        target_end_date: toInputDate(act.target_end_date) || getTodayStr(),
        actual_end_date: nextActualDate,
        complete_status: nextStatus,
        notes: act.notes || "",
      });
      fetchActivities(true);
      onTaskMutated();
    } catch (err: any) {
      setActivities(previousActivities);
      alert(err.message || "Gagal mengubah status activity");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteActivity = async (act: ActivityItem) => {
    if (!confirm(`Hapus activity "${act.name}"?`)) return;
    const previousActivities = activities;
    setDeletingActId(String(act.id));
    // Optimistically remove item so there's no jarring reload
    setActivities((prev) =>
      prev.filter((item) => String(item.id) !== String(act.id))
    );
    try {
      await api.deleteActivity(task.id, act.id);
      fetchActivities(true);
      onTaskMutated();
    } catch (err: any) {
      setActivities(previousActivities);
      alert(err.message || "Gagal menghapus activity");
    } finally {
      setDeletingActId(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm(`Hapus task "${task.name}"?`)) return;
    setDeletingTask(true);
    try {
      await api.deleteTask(task.id);
      onTaskMutated();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus task");
      setDeletingTask(false);
    }
  };

  const completedActCount = activities.filter(
    (a) => a.complete_status === "DONE"
  ).length;
  const computedProgress =
    hasLoadedOnce && activities.length > 0
      ? Math.round((completedActCount / activities.length) * 100)
      : Number(task.progress || 0);
  const progress = Math.min(100, Math.max(0, computedProgress));
  const isComplete = progress === 100;

  return (
    <>
      <div
        className={`overflow-hidden rounded-2xl border bg-white transition-all ${
          expanded
            ? "border-brand-500/40 shadow-sm ring-1 ring-brand-500/10"
            : "border-slate-200/90 hover:border-slate-300"
        }`}
      >
        {/* Task Header */}
        <div className="p-3.5 sm:p-5">
          <div className="flex items-start justify-between gap-2.5">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${
                  isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-brand-50 text-brand-600"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span>{progress}%</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
                    {task.name}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isComplete
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {isComplete ? "Selesai" : "In Progress"}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 sm:text-xs">
                  {task.assignor?.name && (
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate max-w-[140px] sm:max-w-none">
                        {task.assignor.name}
                      </span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {formatShortDate(task.start_date)} →{" "}
                    {formatShortDate(task.target_end_date)}
                  </span>
                </div>
              </div>
            </button>

            {/* Action buttons */}
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => onEditTask(task)}
                title="Edit Task"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={deletingTask}
                title="Hapus Task"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                {deletingTask ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="ml-0.5 flex h-8 items-center gap-1 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                <span className="hidden sm:inline">Activity</span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 flex items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isComplete ? "bg-emerald-500" : "bg-brand-600"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-8 text-right text-[11px] font-bold text-slate-600">
              {progress}%
            </span>
          </div>
        </div>

        {/* Expanded Section: Activities List */}
        {expanded && (
          <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Daftar Activity ({activities.length})
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingActivity(null);
                  setIsActivityModalOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Activity
              </button>
            </div>

            {loadingActivities && !hasLoadedOnce ? (
              <div className="space-y-2">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="flex animate-pulse items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3"
                  >
                    <div className="flex flex-1 items-center gap-2.5">
                      <div className="h-5 w-5 rounded-full bg-slate-100" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                        <div className="h-2.5 w-1/3 rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
                <p className="text-xs text-slate-500">
                  Belum ada activity di dalam task ini.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingActivity(null);
                    setIsActivityModalOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-600"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah activity pertama
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => {
                  const isDone = act.complete_status === "DONE";
                  const isToggling = togglingId === String(act.id);
                  const isDeleting = deletingActId === String(act.id);
                  const typeObj = ACTIVITY_TYPES.find(
                    (t) =>
                      t.id ===
                      String(act.activity_type_id || act.activityType?.id)
                  );

                  return (
                    <div
                      key={act.id}
                      className={`flex items-start justify-between gap-2.5 rounded-xl border bg-white p-3 transition ${
                        isDone
                          ? "border-emerald-200/80 bg-emerald-50/20"
                          : "border-slate-200/90"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        {/* One-Tap Toggle Status Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleActivityStatus(act)}
                          disabled={isToggling}
                          title={
                            isDone
                              ? "Klik untuk ubah ke In Progress"
                              : "Klik untuk tandai Selesai (Done)"
                          }
                          className="mt-0.5 shrink-0 text-slate-400 transition active:scale-90"
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 transition-transform" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-300 transition-colors hover:text-brand-600" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p
                              className={`text-xs font-semibold leading-snug sm:text-sm ${
                                isDone
                                  ? "line-through text-slate-400"
                                  : "text-slate-900"
                              }`}
                            >
                              {act.name}
                            </p>
                            {typeObj && (
                              <span
                                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${typeObj.badgeClass}`}
                              >
                                {typeObj.name}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {formatShortDate(act.start_date || act.target_end_date)}
                            </span>
                            {act.validator?.name && (
                              <span>• Validator: {act.validator.name}</span>
                            )}
                          </div>

                          {act.notes && (
                            <p className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                              {act.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingActivity(act);
                            setIsActivityModalOpen(true);
                          }}
                          title="Edit Activity"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(act)}
                          disabled={isDeleting}
                          title="Hapus Activity"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Activity Bottom-Sheet Modal */}
      <ActivityFormModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setEditingActivity(null);
        }}
        task={task}
        employees={employees}
        initialActivity={editingActivity}
        defaultDate={defaultDate}
        onSuccess={async () => {
          await fetchActivities(true);
          onTaskMutated();
        }}
      />
    </>
  );
}
