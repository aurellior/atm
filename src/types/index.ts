export interface UserRole {
  id: string;
  name: string;
}

export interface UserTeam {
  id: string;
  name: string;
}

export interface AuthEmployee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: UserTeam;
  token: string;
}

export interface EmployeeOption {
  id: string;
  name: string;
  email: string;
  role_id: string;
  team_id: string;
  lead_id?: string | null;
}

export interface EmployeeSummary {
  employee_id: string;
  total_project: string | number;
  total_task: string | number;
  total_task_finished: string | number;
}

export interface JoinedProject {
  id: string;
  name: string;
  priority: string | number;
  type: "INTERNAL" | "EXTERNAL";
  start_date?: string | null;
  target_end_date?: string | null;
  progress: number;
  total_tasks: number;
  total_tasks_done: number;
  employees_joined?: { id: string; name: string }[];
}

export interface MasterProject {
  id: string;
  name: string;
  type: "INTERNAL" | "EXTERNAL";
  start_date?: string | null;
  target_end_date?: string | null;
  progress: number;
}

export interface TaskItem {
  id: string;
  employee_id: string;
  assignor_id: string;
  project_id: string;
  name: string;
  start_date?: string | null;
  target_end_date?: string | null;
  actual_end_date?: string | null;
  progress: number;
  assignor?: {
    id: string;
    name: string;
    email?: string;
  };
}

export type ActivityStatus = "IN_PROGRESS" | "DONE";

export interface ActivityItem {
  id: string;
  employee_id: string;
  task_id: string;
  validator_id: string;
  activity_type_id: string;
  name: string;
  start_date?: string | null;
  target_end_date?: string | null;
  actual_end_date?: string | null;
  complete_status: ActivityStatus;
  notes?: string | null;
  progress?: number | null;
  validator?: {
    id: string;
    name: string;
  };
  activityType?: {
    id: string;
    name: string;
  };
  task?: {
    id: string;
    name: string;
  };
  task_name?: string;
  project_name?: string;
  project_id?: string;
}

export const ACTIVITY_TYPES = [
  { id: "2", name: "New Task", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "1", name: "Off Plan", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "3", name: "Rebaseline", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
] as const;
