"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderPlus,
  Loader2,
  Plus,
} from "lucide-react";

const TASKS_PER_PAGE = 10;

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();

  const [calendarActivities, setCalendarActivities] = useState<ActivityItem[]>(
    []
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    string | null
  >(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [projects, setProjects] = useState<JoinedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskPage, setTaskPage] = useState<number>(1);
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [totalTaskPages, setTotalTaskPages] = useState<number>(1);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Modals
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Horizontal scroll & drag state for Project Selector
  const projectScrollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);

  useEffect(() => {
    const el = projectScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [projects.length, loadingProjects]);

  const scrollProjectsBy = (offset: number) => {
    projectScrollRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  const loadCalendarData = useCallback(async (silent = false) => {
    if (!silent) setLoadingCalendar(true);
    try {
      const allActs = await api.getCalendarActivities();
      setCalendarActivities(allActs);
    } catch (err) {
      console.error("Gagal memuat kalender activity:", err);
    } finally {
      if (!silent) setLoadingCalendar(false);
    }
  }, []);

  const loadInitialData = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoadingProjects(true);
      try {
        const [joinedList, empList] = await Promise.all([
          api.getJoinedProjects(),
          api.getEmployeesSelect().catch(() => []),
        ]);

        setProjects(joinedList);
        if (empList.length > 0) setEmployees(empList);

        setSelectedProjectId((prev) => {
          if (prev && joinedList.some((p) => String(p.id) === prev)) {
            return prev;
          }
          return "";
        });
      } catch (err) {
        console.error("Gagal memuat data awal:", err);
      } finally {
        if (!silent) setLoadingProjects(false);
      }
    },
    [user]
  );

  const loadTasksForProject = useCallback(
    async (silent = false) => {
      if (!selectedProjectId) {
        setTasks([]);
        setTotalTasks(0);
        setTotalTaskPages(1);
        return;
      }
      if (!silent) setLoadingTasks(true);
      try {
        const res = await api.getTasksByProject(selectedProjectId, {
          page: taskPage,
          limit: TASKS_PER_PAGE,
        });
        setTasks(res.tasks);
        setTotalTasks(res.total || res.tasks.length);
        setTotalTaskPages(Math.max(1, res.totalPages || 1));
      } catch (err) {
        console.error("Gagal memuat daftar task:", err);
      } finally {
        if (!silent) setLoadingTasks(false);
      }
    },
    [selectedProjectId, taskPage]
  );

  const handleDataMutated = useCallback(async () => {
    await Promise.all([
      loadTasksForProject(true),
      loadCalendarData(true),
      api
        .getJoinedProjects()
        .then((joinedList) => setProjects(joinedList))
        .catch(() => {}),
    ]);
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
    <div className="min-h-screen pb-16">
      <Navbar />

      <main className="mx-auto max-w-5xl px-3.5 pt-4 sm:px-6 sm:pt-5">
        {/* GitHub-Contribution Style Monthly Activity Calendar */}
        <ActivityCalendar
          activities={calendarActivities}
          loading={loadingCalendar}
          selectedDateKey={selectedCalendarDate}
          onSelectDateKey={setSelectedCalendarDate}
        />

        {/* Project Selector Bar */}
        <section className="mt-5 sm:mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pilih Project ({projects.length})
            </h2>
            <div className="flex items-center gap-1.5">
              {projects.length > 3 && (
                <div className="hidden items-center gap-1 sm:flex">
                  <button
                    type="button"
                    onClick={() => scrollProjectsBy(-260)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition active:scale-95 hover:bg-slate-50"
                    title="Geser Kiri"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollProjectsBy(260)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition active:scale-95 hover:bg-slate-50"
                    title="Geser Kanan"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition active:scale-95 hover:bg-brand-100"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Join Project
              </button>
            </div>
          </div>

          {loadingProjects && projects.length === 0 ? (
            <div className="flex gap-2.5 overflow-hidden pb-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-[96px] min-w-[185px] shrink-0 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:min-w-[220px]"
                >
                  <div className="flex justify-between">
                    <div className="h-4 w-16 rounded bg-slate-100" />
                    <div className="h-4 w-8 rounded bg-slate-100" />
                  </div>
                  <div className="mt-3 h-4 w-3/4 rounded bg-slate-100" />
                  <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center">
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
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 hover:bg-brand-700"
              >
                <FolderPlus className="h-4 w-4" />
                Join Project Sekarang
              </button>
            </div>
          ) : (
            <div
              ref={projectScrollRef}
              onMouseDown={(e) => {
                if (!projectScrollRef.current) return;
                isDraggingRef.current = true;
                dragMovedRef.current = false;
                dragStartXRef.current =
                  e.pageX - projectScrollRef.current.offsetLeft;
                dragScrollLeftRef.current = projectScrollRef.current.scrollLeft;
              }}
              onMouseMove={(e) => {
                if (!isDraggingRef.current || !projectScrollRef.current) return;
                const x = e.pageX - projectScrollRef.current.offsetLeft;
                const walk = x - dragStartXRef.current;
                if (Math.abs(walk) > 6) {
                  dragMovedRef.current = true;
                  projectScrollRef.current.scrollLeft =
                    dragScrollLeftRef.current - walk;
                }
              }}
              onMouseUp={() => {
                isDraggingRef.current = false;
              }}
              onMouseLeave={() => {
                isDraggingRef.current = false;
              }}
              className="project-scrollbar -mx-3.5 flex cursor-grab select-none gap-2.5 overflow-x-auto px-3.5 pb-2 active:cursor-grabbing sm:mx-0 sm:px-0"
            >
              {projects.map((proj) => {
                const isSelected = String(proj.id) === String(selectedProjectId);
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      if (dragMovedRef.current) {
                        dragMovedRef.current = false;
                        return;
                      }
                      const idStr = String(proj.id);
                      setSelectedProjectId((prev) =>
                        prev === idStr ? "" : idStr
                      );
                      setTaskPage(1);
                    }}
                    className={`flex min-w-[185px] shrink-0 flex-col justify-between rounded-2xl border p-3.5 text-left transition active:scale-[0.98] sm:min-w-[220px] ${
                      isSelected
                        ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                        : "border-slate-200/90 bg-white text-slate-800 hover:border-slate-300"
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
                        {proj.total_tasks_done ?? 0}/{proj.total_tasks ?? 0}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Active Project Tasks & Activities Workspace */}
        {!activeProject && !loadingProjects && projects.length > 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center sm:mt-6">
            <Briefcase className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-2 text-xs font-bold text-slate-700 sm:text-sm">
              Pilih salah satu Project di atas
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
              Ketuk kartu project untuk melihat dan mengelola daftar Task &
              Activity.
            </p>
          </div>
        )}

        {activeProject && (
          <section className="mt-5 sm:mt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-bold text-slate-900 sm:text-lg">
                    Task: {activeProject.name}
                  </h2>
                  {totalTasks > 0 && (
                    <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      {totalTasks}
                    </span>
                  )}
                  {loadingTasks && tasks.length > 0 && (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Ketuk kartu Task untuk kelola Activity (maks {TASKS_PER_PAGE}{" "}
                  per halaman)
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                Task Baru
              </button>
            </div>

            {/* Task List (Expandable Cards) */}
            <div className="mt-3.5 space-y-3">
              {loadingTasks && tasks.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-1 items-center gap-3">
                          <div className="h-7 w-7 rounded-xl bg-slate-100" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-2/3 rounded-md bg-slate-100" />
                            <div className="h-3 w-1/3 rounded-md bg-slate-100" />
                          </div>
                        </div>
                        <div className="h-8 w-16 rounded-xl bg-slate-100" />
                      </div>
                      <div className="mt-3.5 h-1.5 w-full rounded-full bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
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
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 hover:bg-brand-700"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Task Pertama
                  </button>
                </div>
              ) : (
                <>
                  {tasks.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      employees={employees}
                      defaultExpanded={idx === 0 && taskPage === 1}
                      defaultDate={selectedCalendarDate}
                      onEditTask={(t) => {
                        setEditingTask(t);
                        setIsTaskModalOpen(true);
                      }}
                      onTaskMutated={handleDataMutated}
                    />
                  ))}

                  {/* Pagination Controls (Shown when totalTasks > 0) */}
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 sm:flex-row">
                    <p className="text-xs font-medium text-slate-500">
                      Menampilkan{" "}
                      <span className="font-bold text-slate-800">
                        {(taskPage - 1) * TASKS_PER_PAGE + 1}–
                        {Math.min(taskPage * TASKS_PER_PAGE, totalTasks)}
                      </span>{" "}
                      dari{" "}
                      <span className="font-bold text-slate-800">
                        {totalTasks}
                      </span>{" "}
                      task
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTaskPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={taskPage <= 1 || loadingTasks}
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition active:scale-95 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Prev</span>
                      </button>

                      <div className="flex items-center gap-1 px-1">
                        {Array.from(
                          { length: totalTaskPages },
                          (_, i) => i + 1
                        )
                          .filter(
                            (p) =>
                              p === 1 ||
                              p === totalTaskPages ||
                              Math.abs(p - taskPage) <= 1
                          )
                          .map((p, index, arr) => {
                            const prevPage = arr[index - 1];
                            const showEllipsis =
                              prevPage !== undefined && p - prevPage > 1;
                            return (
                              <React.Fragment key={p}>
                                {showEllipsis && (
                                  <span className="px-1 text-xs text-slate-400">
                                    ...
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setTaskPage(p)}
                                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition active:scale-95 ${
                                    taskPage === p
                                      ? "bg-brand-600 text-white shadow-sm"
                                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {p}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setTaskPage((prev) =>
                            Math.min(totalTaskPages, prev + 1)
                          )
                        }
                        disabled={taskPage >= totalTaskPages || loadingTasks}
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition active:scale-95 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Join Project Modal */}
      <JoinProjectModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        joinedProjects={projects}
        onSuccess={() => {
          loadInitialData(true);
          loadCalendarData(true);
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
