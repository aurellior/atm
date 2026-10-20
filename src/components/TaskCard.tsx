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
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Loader2,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";

interface TaskCardProps {
  task: TaskItem;
  employees: EmployeeOption[];
  defaultExpanded?: boolean;
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
  onEditTask,
  onTaskMutated,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  // Quick Add / Edit Activity state
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(
    null
  );
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  const [actName, setActName] = useState("");
  const [actValidatorId, setActValidatorId] = useState("");
  const [actTypeId, setActTypeId] = useState("2");
  const [actStatus, setActStatus] = useState<ActivityStatus>("IN_PROGRESS");
  const [actStartDate, setActStartDate] = useState(getTodayStr());
  const [actTargetDate, setActTargetDate] = useState(getTodayStr());
  const [actActualDate, setActActualDate] = useState("");
  const [actNotes, setActNotes] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingActId, setDeletingActId] = useState<string | null>(null);
  const [actError, setActError] = useState("");

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const list = await api.getActivitiesByTask(task.id);
      setActivities(list);
    } catch (err) {
      console.error("Gagal memuat activity:", err);
    } finally {
      setLoadingActivities(false);
    }
  }, [task.id]);

  useEffect(() => {
    if (expanded) {
      fetchActivities();
    }
  }, [expanded, fetchActivities]);

  // Initialize default validator from localStorage or task assignor
  const getDefaultValidatorId = useCallback(() => {
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
  }, [employees, task.assignor_id]);

  const openCreateActivity = () => {
    setEditingActivity(null);
    setActError("");
    setActName("");
    setActValidatorId(getDefaultValidatorId());
    setActTypeId("2");
    setActStatus("IN_PROGRESS");
    setActStartDate(getTodayStr());
    setActTargetDate(getTodayStr());
    setActActualDate("");
    setActNotes("");
    setShowAdvancedFields(false);
    setShowActivityForm(true);
  };

  const openEditActivity = (act: ActivityItem) => {
    setEditingActivity(act);
    setActError("");
    setActName(act.name || "");
    setActValidatorId(
      String(act.validator_id || act.validator?.id || getDefaultValidatorId())
    );
    setActTypeId(String(act.activity_type_id || act.activityType?.id || "2"));
    setActStatus(act.complete_status || "IN_PROGRESS");
    setActStartDate(toInputDate(act.start_date) || getTodayStr());
    setActTargetDate(toInputDate(act.target_end_date) || getTodayStr());
    setActActualDate(toInputDate(act.actual_end_date) || "");
    setActNotes(act.notes || "");
    setShowAdvancedFields(true);
    setShowActivityForm(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName.trim()) {
      setActError("Nama activity wajib diisi");
      return;
    }
    if (!actValidatorId) {
      setActError("Pilih validator terlebih dahulu");
      return;
    }

    setSavingActivity(true);
    setActError("");

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("atm_last_validator", actValidatorId);
      }

      const finalActualDate =
        actActualDate || (actStatus === "DONE" ? getTodayStr() : null);

      if (editingActivity) {
        await api.editActivity({
          task_id: task.id,
          activity_id: editingActivity.id,
          validator_id: actValidatorId,
          activity_type_id: actTypeId,
          name: actName.trim(),
          start_date: actStartDate,
          target_end_date: actTargetDate,
          actual_end_date: finalActualDate,
          complete_status: actStatus,
          notes: actNotes.trim(),
        });
      } else {
        await api.createActivity({
          task_id: task.id,
          validator_id: actValidatorId,
          activity_type_id: actTypeId,
          name: actName.trim(),
          start_date: actStartDate,
          target_end_date: actTargetDate,
          actual_end_date: finalActualDate,
          complete_status: actStatus,
          notes: actNotes.trim(),
        });
      }

      setShowActivityForm(false);
      setEditingActivity(null);
      await fetchActivities();
      onTaskMutated();
    } catch (err: any) {
      setActError(err.message || "Gagal menyimpan activity");
    } finally {
      setSavingActivity(false);
    }
  };

  const handleToggleActivityStatus = async (act: ActivityItem) => {
    const nextStatus: ActivityStatus =
      act.complete_status === "DONE" ? "IN_PROGRESS" : "DONE";
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
        actual_end_date:
          nextStatus === "DONE"
            ? toInputDate(act.actual_end_date) || getTodayStr()
            : null,
        complete_status: nextStatus,
        notes: act.notes || "",
      });
      await fetchActivities();
      onTaskMutated();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status activity");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteActivity = async (act: ActivityItem) => {
    if (!confirm(`Hapus activity "${act.name}"?`)) return;
    setDeletingActId(String(act.id));
    try {
      await api.deleteActivity(task.id, act.id);
      await fetchActivities();
      onTaskMutated();
    } catch (err: any) {
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

  const progress = Math.min(100, Math.max(0, Number(task.progress || 0)));
  const isComplete = progress === 100;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white transition-all ${
        expanded
          ? "border-brand-500/40 shadow-md ring-1 ring-brand-500/10"
          : "border-slate-200 shadow-sm hover:border-slate-300"
      }`}
    >
      {/* Task Header (Clickable to expand/collapse) */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex flex-1 items-start gap-3 text-left"
          >
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
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
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                  {task.name}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isComplete
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isComplete ? "Selesai" : "In Progress"}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {task.assignor?.name && (
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                    Assignor:{" "}
                    <strong className="font-medium text-slate-700">
                      {task.assignor.name}
                    </strong>
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formatShortDate(task.start_date)} →{" "}
                  {formatShortDate(task.target_end_date)}
                </span>
              </div>
            </div>
          </button>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEditTask(task)}
              title="Edit Task"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDeleteTask}
              disabled={deletingTask}
              title="Hapus Task"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
              className="ml-1 flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
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
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete ? "bg-emerald-500" : "bg-brand-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs font-semibold text-slate-600">
            {progress}%
          </span>
        </div>
      </div>

      {/* Expanded Section: Activities List + Quick Input */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Daftar Activity ({activities.length})
            </h4>
            {!showActivityForm && (
              <button
                type="button"
                onClick={openCreateActivity}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Activity
              </button>
            )}
          </div>

          {/* Inline Quick-Add / Edit Activity Form */}
          {showActivityForm && (
            <form
              onSubmit={handleSaveActivity}
              className="mb-4 rounded-xl border border-brand-200 bg-white p-3.5 shadow-sm sm:p-4"
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-brand-700">
                  {editingActivity ? "Edit Activity" : "Input Activity Cepat"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowActivityForm(false);
                    setEditingActivity(null);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {actError && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {actError}
                </div>
              )}

              <div className="space-y-3">
                {/* Main Activity Name Input */}
                <div>
                  <input
                    type="text"
                    placeholder="Apa aktivitas yang Anda kerjakan? *"
                    value={actName}
                    onChange={(e) => setActName(e.target.value)}
                    autoFocus
                    required
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                {/* Quick Row: Validator, Type, Status */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Validator *
                    </label>
                    <select
                      value={actValidatorId}
                      onChange={(e) => setActValidatorId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                    >
                      <option value="" disabled>
                        Pilih Validator
                      </option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Tipe Activity
                    </label>
                    <select
                      value={actTypeId}
                      onChange={(e) => setActTypeId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                    >
                      {ACTIVITY_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Status
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActStatus("IN_PROGRESS")}
                        className={`rounded-xl border py-1.5 text-xs font-semibold transition ${
                          actStatus === "IN_PROGRESS"
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => setActStatus("DONE")}
                        className={`rounded-xl border py-1.5 text-xs font-semibold transition ${
                          actStatus === "DONE"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toggle Advanced Fields (Dates & Notes) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFields((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {showAdvancedFields
                      ? "Sembunyikan tanggal & catatan"
                      : "Atur tanggal & catatan (default: hari ini)"}
                  </button>

                  {showAdvancedFields && (
                    <div className="mt-2.5 space-y-2.5 rounded-xl bg-slate-50 p-3">
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                            Mulai
                          </label>
                          <input
                            type="date"
                            value={actStartDate}
                            onChange={(e) => setActStartDate(e.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                            Target
                          </label>
                          <input
                            type="date"
                            value={actTargetDate}
                            onChange={(e) => setActTargetDate(e.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                            Aktual Selesai
                          </label>
                          <input
                            type="date"
                            value={actActualDate}
                            onChange={(e) => setActActualDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Catatan (Notes)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Tambahkan catatan bila perlu..."
                          value={actNotes}
                          onChange={(e) => setActNotes(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActivityForm(false);
                      setEditingActivity(null);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingActivity}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
                  >
                    {savingActivity && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {editingActivity ? "Update Activity" : "Simpan Activity"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Activities List */}
          {loadingActivities ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              Memuat activity...
            </div>
          ) : activities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <p className="text-xs text-slate-500">
                Belum ada activity di dalam task ini.
              </p>
              {!showActivityForm && (
                <button
                  type="button"
                  onClick={openCreateActivity}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah activity pertama
                </button>
              )}
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
                    className={`flex items-start justify-between gap-3 rounded-xl border bg-white p-3 transition ${
                      isDone
                        ? "border-emerald-200/80 bg-emerald-50/20"
                        : "border-slate-200"
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
                        className="mt-0.5 shrink-0 text-slate-400 transition hover:scale-110"
                      >
                        {isToggling ? (
                          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                        ) : isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300 hover:text-brand-600" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p
                            className={`text-xs font-semibold sm:text-sm ${
                              isDone
                                ? "line-through text-slate-500"
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

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {act.validator?.name && (
                            <span>Validator: {act.validator.name}</span>
                          )}
                          <span>
                            Target: {formatShortDate(act.target_end_date)}
                          </span>
                        </div>

                        {act.notes && (
                          <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {act.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditActivity(act)}
                        title="Edit Activity"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act)}
                        disabled={isDeleting}
                        title="Hapus Activity"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
  );
}
