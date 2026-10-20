import {
  ActivityItem,
  ActivityStatus,
  AuthEmployee,
  EmployeeOption,
  EmployeeSummary,
  JoinedProject,
  MasterProject,
  TaskItem,
} from "@/types";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("atm_session");
    if (!raw) return null;
    const parsed: AuthEmployee = JSON.parse(raw);
    return parsed.token || null;
  } catch {
    return null;
  }
}

/**
 * Always calls internal Next.js Route Handlers (/api/auth/* and /api/v1/*)
 * on the same origin, so browser CORS is 100% eliminated!
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = token;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage =
      data?.message || data?.error || `Request gagal (${response.status})`;
    throw new Error(errorMessage);
  }

  return data as T;
}

export const api = {
  // Auth (calls Next.js /api/auth/login)
  async login(email: string, password: string): Promise<AuthEmployee> {
    const res = await apiFetch<{ data: { employee: AuthEmployee } }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    return res.data.employee;
  },

  // Employee & Summary
  async getEmployeeSummary(): Promise<EmployeeSummary | null> {
    const res = await apiFetch<{ summary: EmployeeSummary | null }>(
      "/api/v1/employees/employee-summary"
    );
    return res.summary;
  },

  async getEmployeesSelect(search = ""): Promise<EmployeeOption[]> {
    const res = await apiFetch<{
      data: { employees: EmployeeOption[] };
    }>(`/api/v1/employees/list-select?search=${encodeURIComponent(search)}`);
    return res?.data?.employees || [];
  },

  // Projects
  async getJoinedProjects(): Promise<JoinedProject[]> {
    const res = await apiFetch<{
      projects: JoinedProject[] | { message: string };
    }>("/api/v1/projects/join/list");
    if (Array.isArray(res.projects)) {
      return res.projects;
    }
    return [];
  },

  async getAllProjects(): Promise<MasterProject[]> {
    const res = await apiFetch<{ data: MasterProject[] }>("/api/v1/projects");
    return Array.isArray(res.data) ? res.data : [];
  },

  async joinProject(projectId: string | number, priority: string | number) {
    return apiFetch("/api/v1/projects/join", {
      method: "POST",
      body: JSON.stringify({
        projectId: Number(projectId),
        priority: Number(priority),
      }),
    });
  },

  // Tasks
  async getTasksByProject(
    projectId: string | number,
    params?: {
      search?: string;
      progress?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ tasks: TaskItem[]; total: number; totalPages: number }> {
    const query = new URLSearchParams();
    query.set("page", String(params?.page || 1));
    query.set("limit", String(params?.limit || 50));
    if (params?.search) query.set("search", params.search);
    if (params?.progress) query.set("progress", params.progress);

    const res = await apiFetch<{
      total: number;
      totalPages: number;
      data: { tasks: TaskItem[] };
    }>(`/api/v1/tasks/${projectId}/list-personal?${query.toString()}`);

    return {
      tasks: res?.data?.tasks || [],
      total: res?.total || 0,
      totalPages: res?.totalPages || 1,
    };
  },

  async createTask(payload: {
    assignor_id: string | number;
    project_id: string | number;
    name: string;
    start_date: string;
    target_end_date: string;
    actual_end_date?: string | null;
  }) {
    return apiFetch<{ message: string; data: TaskItem }>("/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        assignor_id: Number(payload.assignor_id),
        project_id: Number(payload.project_id),
        actual_end_date: payload.actual_end_date || null,
      }),
    });
  },

  async editTask(payload: {
    id: string | number;
    assignor_id: string | number;
    name: string;
    start_date: string;
    target_end_date: string;
    actual_end_date?: string | null;
  }) {
    return apiFetch("/api/v1/tasks/edit", {
      method: "PUT",
      body: JSON.stringify({
        ...payload,
        id: Number(payload.id),
        assignor_id: Number(payload.assignor_id),
        actual_end_date: payload.actual_end_date || null,
      }),
    });
  },

  async deleteTask(id: string | number) {
    return apiFetch(`/api/v1/tasks/delete/${id}`, {
      method: "PUT",
    });
  },

  // Activities
  async getCalendarActivities(): Promise<ActivityItem[]> {
    const res = await apiFetch<{ activities: ActivityItem[] }>(
      "/api/v1/activities/calendar"
    );
    return Array.isArray(res?.activities) ? res.activities : [];
  },

  async getActivitiesByTask(
    taskId: string | number,
    params?: { search?: string; complete_status?: string; limit?: number }
  ): Promise<ActivityItem[]> {
    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("limit", String(params?.limit || 100));
    if (params?.search) query.set("search", params.search);
    if (params?.complete_status)
      query.set("complete_status", params.complete_status);

    const res = await apiFetch<{
      data: { activities: ActivityItem[] };
    }>(`/api/v1/activities/list/personal/${taskId}?${query.toString()}`);

    return res?.data?.activities || [];
  },

  async createActivity(payload: {
    task_id: string | number;
    validator_id: string | number;
    activity_type_id: string | number;
    name: string;
    start_date: string;
    target_end_date: string;
    actual_end_date?: string | null;
    complete_status: ActivityStatus;
    notes?: string;
    dates?: string[];
  }) {
    return apiFetch<{
      message: string;
      data: ActivityItem;
      activities?: ActivityItem[];
      count?: number;
    }>("/api/v1/activities", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        task_id: Number(payload.task_id),
        validator_id: Number(payload.validator_id),
        activity_type_id: Number(payload.activity_type_id),
        actual_end_date: payload.actual_end_date || null,
        notes: payload.notes || "",
      }),
    });
  },

  async editActivity(payload: {
    task_id: string | number;
    activity_id: string | number;
    validator_id: string | number;
    activity_type_id: string | number;
    name: string;
    start_date: string;
    target_end_date: string;
    actual_end_date?: string | null;
    complete_status: ActivityStatus;
    notes?: string | null;
  }) {
    return apiFetch<{ message: string; data: ActivityItem }>(
      "/api/v1/activities/edit-activity",
      {
        method: "PUT",
        body: JSON.stringify({
          ...payload,
          task_id: Number(payload.task_id),
          activity_id: Number(payload.activity_id),
          validator_id: Number(payload.validator_id),
          activity_type_id: Number(payload.activity_type_id),
          actual_end_date: payload.actual_end_date || null,
          notes: payload.notes || "",
        }),
      }
    );
  },

  async deleteActivity(taskId: string | number, activityId: string | number) {
    return apiFetch(
      `/api/v1/activities/delete/personal/${taskId}/${activityId}`,
      {
        method: "PUT",
      }
    );
  },
};
