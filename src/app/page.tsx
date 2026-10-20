"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  ActivityItem,
  EmployeeOption,
  JoinedProject,
  TaskItem,
} from "@/types";
import Navbar from "@/components/Navbar";
import ActivityCalendar from "@/components/ActivityCalendar";
import JoinProjectModal from "@/components/JoinProjectModal";
import TaskFormModal from "@/components/TaskFormModal";
import TaskCard from "@/components/TaskCard";
import {
  Briefcase,
  ClipboardList,
  FolderPlus,
  Loader2,
  Plus,
} from "lucide-react";

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();

  const [calendarActivities, setCalendarActivities] = useState<ActivityItem[]>(
    []
  );
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [projects, setProjects] = useState<JoinedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Modals
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const loadCalendarData = useCallback(async () => {
    setLoadingCalendar(true);
    try {
      const allActs = await api.getCalendarActivities();
      setCalendarActivities(allActs);
    } catch (err) {
      console.error("Gagal memuat kalender activity:", err);
    } finally {
      setLoadingCalendar(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    setLoadingProjects(true);
    try {
      const [joinedList, empList] = await Promise.all([
        api.getJoinedProjects(),
        api.getEmployeesSelect().catch(() => []),
      ]);

      setProjects(joinedList);
      setEmployees(empList);

      if (joinedList.length > 0) {
        setSelectedProjectId((prev) => {
          if (prev && joinedList.some((p) => String(p.id) === prev)) {
            return prev;
          }
          return String(joinedList[0].id);
        });
      } else {
        setSelectedProjectId("");
      }
    } catch (err) {
      console.error("Gagal memuat data awal:", err);
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  const loadTasksForProject = useCallback(async () => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    setLoadingTasks(true);
    try {
      const res = await api.getTasksByProject(selectedProjectId, {
        limit: 50,
      });
      setTasks(res.tasks);
    } catch (err) {
      console.error("Gagal memuat daftar task:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, [selectedProjectId]);

  // Refresh project progress, tasks, and contribution calendar when task/activity changes
  const handleDataMutated = useCallback(async () => {
    await loadTasksForProject();
    try {
      const [joinedList] = await Promise.all([
        api.getJoinedProjects(),
        loadCalendarData(),
      ]);
      setProjects(joinedList);
    } catch {
      // ignore background refresh error
    }
  }, [loadTasksForProject, loadCalendarData]);

  useEffect(() => {
    if (user) {
      loadInitialData();
      loadCalendarData();
    }
  }, [user, loadInitialData, loadCalendarData]);

  useEffect(() => {
    if (selectedProjectId) {
      loadTasksForProject();
    }
  }, [selectedProjectId, loadTasksForProject]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  const activeProject = projects.find(
    (p) => String(p.id) === String(selectedProjectId)
  );

  return (
    <div className="min-h-screen pb-24">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pt-5 sm:px-6">
        {/* GitHub-Contribution Style Monthly Activity Calendar */}
        <ActivityCalendar
          activities={calendarActivities}
          loading={loadingCalendar}
        />

        {/* Project Selector Bar */}
        <section className="mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pilih Project Anda ({projects.length})
            </h2>
            <button
              type="button"
              onClick={() => setIsJoinModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Join Project
            </button>
          </div>

          {loadingProjects ? (
            <div className="flex items-center gap-2 py-6 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              Memuat project...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-2 text-sm font-bold text-slate-900">
                Belum ada project yang diikuti
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Klik tombol Join Project untuk mulai menambahkan Task & Activity.
              </p>
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                <FolderPlus className="h-4 w-4" />
                Join Project Sekarang
              </button>
            </div>
          ) : (
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
              {projects.map((proj) => {
                const isSelected = String(proj.id) === String(selectedProjectId);
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => setSelectedProjectId(String(proj.id))}
                    className={`flex min-w-[200px] shrink-0 flex-col justify-between rounded-2xl border p-3.5 text-left transition sm:min-w-[220px] ${
                      isSelected
                        ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        P{proj.priority} • {proj.type}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? "text-white" : "text-slate-600"
                        }`}
                      >
                        {proj.progress ?? 0}%
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-1 text-sm font-bold">
                      {proj.name}
                    </p>

                    <div className="mt-2.5 flex items-center gap-2">
                      <div
                        className={`h-1.5 flex-1 overflow-hidden rounded-full ${
                          isSelected ? "bg-white/25" : "bg-slate-100"
                        }`}
                      >
                        <div
                          className={`h-full rounded-full ${
                            isSelected ? "bg-white" : "bg-brand-600"
                          }`}
                          style={{ width: `${proj.progress ?? 0}%` }}
                        />
                      </div>
                      <span
                        className={`text-[11px] ${
                          isSelected ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {proj.total_tasks_done ?? 0}/{proj.total_tasks ?? 0} task
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Active Project Tasks & Activities Workspace */}
        {activeProject && (
          <section className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Task di {activeProject.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Klik pada kartu Task untuk membuka atau menambah Activity di
                  dalamnya
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                Tambah Task Baru
              </button>
            </div>

            {/* Task List (Expandable Cards) */}
            <div className="mt-4 space-y-3">
              {loadingTasks ? (
                <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                  Memuat daftar task...
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-2 text-sm font-bold text-slate-900">
                    Belum ada Task pada project ini
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Buat task pertama Anda lalu tambahkan activity harian di
                    dalamnya.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(null);
                      setIsTaskModalOpen(true);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Task Pertama
                  </button>
                </div>
              ) : (
                tasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    employees={employees}
                    defaultExpanded={idx === 0}
                    onEditTask={(t) => {
                      setEditingTask(t);
                      setIsTaskModalOpen(true);
                    }}
                    onTaskMutated={handleDataMutated}
                  />
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Mobile Floating Action Button (FAB) for quick Task creation */}
      {activeProject && (
        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          className="fixed bottom-5 right-5 z-20 flex h-12 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-xs font-bold text-white shadow-lg transition active:scale-95 sm:hidden"
        >
          <Plus className="h-5 w-5" />
          Task Baru
        </button>
      )}

      {/* Join Project Modal */}
      <JoinProjectModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        joinedProjects={projects}
        onSuccess={() => {
          loadInitialData();
          loadCalendarData();
        }}
      />

      {/* Create / Edit Task Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        projectId={selectedProjectId}
        projectName={activeProject?.name}
        employees={employees}
        initialTask={editingTask}
        onSuccess={handleDataMutated}
      />
    </div>
  );
}
