import { NextRequest, NextResponse } from "next/server";
import {
  isLocalDatabaseConfigured,
  prisma,
  serializeData,
} from "@/server/prisma";
import { verifyRequestToken } from "@/server/auth";
import { getRemoteApiUrl, proxyToRemoteBackend } from "@/server/proxy";

export const dynamic = "force-dynamic";

async function handleRemoteCalendarAggregation(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const baseUrl = getRemoteApiUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(auth ? { Authorization: auth } : {}),
  };

  try {
    const projRes = await fetch(`${baseUrl}/api/v1/projects/join/list`, {
      headers,
      cache: "no-store",
    });
    const projData = await projRes.json().catch(() => ({}));
    const projects = Array.isArray(projData?.projects) ? projData.projects : [];

    const tasksByProject = await Promise.all(
      projects.map(async (proj: any) => {
        const tRes = await fetch(
          `${baseUrl}/api/v1/tasks/${proj.id}/list-personal?page=1&limit=100`,
          { headers, cache: "no-store" }
        );
        const tData = await tRes.json().catch(() => ({}));
        const tasks = Array.isArray(tData?.data?.tasks) ? tData.data.tasks : [];
        return tasks.map((t: any) => ({
          ...t,
          projectName: proj.name,
          projectId: proj.id,
        }));
      })
    );

    const allTasks = tasksByProject.flat();

    const activitiesByTask = await Promise.all(
      allTasks.map(async (task: any) => {
        const aRes = await fetch(
          `${baseUrl}/api/v1/activities/list/personal/${task.id}?page=1&limit=100`,
          { headers, cache: "no-store" }
        );
        const aData = await aRes.json().catch(() => ({}));
        const activities = Array.isArray(aData?.data?.activities)
          ? aData.data.activities
          : [];
        return activities.map((act: any) => ({
          ...act,
          task_name: task.name,
          project_name: task.projectName,
          project_id: task.projectId,
        }));
      })
    );

    return NextResponse.json({
      activities: activitiesByTask.flat(),
    });
  } catch (error: any) {
    console.error("Remote calendar aggregation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load calendar activities" },
      { status: 500 }
    );
  }
}

async function handleApiV1Request(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  const pathSegments = context.params.path || [];
  const subPath = "/" + pathSegments.join("/");

  // Public endpoint for Indonesian Holidays & Collective Leave (Tanggal Merah API)
  if (req.method === "GET" && subPath === "/holidays") {
    const year = req.nextUrl.searchParams.get("year") || String(new Date().getFullYear());
    const month = req.nextUrl.searchParams.get("month");
    const type = req.nextUrl.searchParams.get("type");

    const params = new URLSearchParams({ year });
    if (month) params.set("month", month);
    if (type) params.set("type", type);

    try {
      const upstream = await fetch(
        `https://tanggalmerah.upset.dev/api/holidays?${params.toString()}`,
        { next: { revalidate: 86400 } }
      );
      if (!upstream.ok) {
        return NextResponse.json({ success: true, data: [] });
      }
      const json = await upstream.json();
      return NextResponse.json(json);
    } catch (error: any) {
      console.error("Failed to fetch holidays:", error);
      return NextResponse.json({ success: true, data: [] });
    }
  }

  // If DATABASE_URL is not configured yet, proxy server-to-server to remote backend (zero CORS!)
  if (!isLocalDatabaseConfigured()) {
    if (req.method === "GET" && subPath === "/activities/calendar") {
      return handleRemoteCalendarAggregation(req);
    }
    return proxyToRemoteBackend(req, `/api/v1${subPath}`);
  }

  let authUser: { id: string };
  try {
    authUser = verifyRequestToken(req);
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Failed to authenticate token" },
      { status: 403 }
    );
  }

  const employeeId = BigInt(authUser.id);
  const searchParams = req.nextUrl.searchParams;

  try {
    // ==========================================
    // EMPLOYEES ROUTES (/api/v1/employees/*)
    // ==========================================
    if (req.method === "GET" && subPath === "/employees/employee-summary") {
      const summary = await prisma.employeeSummary.findUnique({
        where: { employee_id: employeeId },
      });
      return NextResponse.json(
        serializeData({
          message: "Employee summary retrieved successfully",
          summary,
        })
      );
    }

    if (req.method === "GET" && subPath === "/employees/list-select") {
      const search = searchParams.get("search") || "";
      const whereConditions: any = {
        role: { name: { not: "Admin" } },
        AND: [{ OR: [{ name: { contains: search, mode: "insensitive" } }] }],
      };

      const [employees, total] = await Promise.all([
        prisma.employees.findMany({
          where: whereConditions,
          select: {
            id: true,
            role_id: true,
            team_id: true,
            name: true,
            email: true,
            lead_id: true,
          },
          orderBy: { team_id: "asc" },
        }),
        prisma.employees.count({ where: whereConditions }),
      ]);

      return NextResponse.json(
        serializeData({
          data: {
            message: "successfully get list employees without admin",
            total,
            employees,
          },
        })
      );
    }

    if (req.method === "GET" && subPath === "/employees/roles") {
      const roles = await prisma.roles.findMany({ orderBy: { name: "asc" } });
      return NextResponse.json(
        serializeData({ message: "get list roles successfully", data: roles })
      );
    }

    if (req.method === "GET" && subPath === "/employees/teams") {
      const teams = await prisma.teams.findMany({ orderBy: { name: "asc" } });
      return NextResponse.json(
        serializeData({ message: "get list teams successfully", data: teams })
      );
    }

    // ==========================================
    // PROJECTS ROUTES (/api/v1/projects/*)
    // ==========================================
    if (req.method === "GET" && subPath === "/projects") {
      const projects = await prisma.projects.findMany({
        where: { deleted_at: null },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(
        serializeData({
          message: "get list projects successfully",
          data: projects,
        })
      );
    }

    if (req.method === "GET" && subPath === "/projects/join/list") {
      const employeeProjects = await prisma.projectsJoined.findMany({
        where: { employee_id: employeeId },
        include: {
          project: {
            include: {
              tasks: {
                where: {
                  employee_id: employeeId,
                  deleted_at: null,
                },
              },
              employeesJoined: {
                include: {
                  employee: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });

      const projects = employeeProjects.map((projectJoin) => {
        const myTasks = projectJoin.project.tasks;
        const totalMyTasks = myTasks.length;
        const totalMyTasksDone = myTasks.filter(
          (t) => t.progress === 100
        ).length;
        const myProgress =
          totalMyTasks > 0
            ? Math.round((totalMyTasksDone / totalMyTasks) * 100)
            : 0;

        return {
          id: projectJoin.project.id,
          name: projectJoin.project.name,
          priority: projectJoin.priority,
          type: projectJoin.project.type,
          start_date: projectJoin.project.start_date,
          target_end_date: projectJoin.project.target_end_date,
          progress: myProgress,
          total_tasks: totalMyTasks,
          total_tasks_done: totalMyTasksDone,
          employees_joined: projectJoin.project.employeesJoined.map(
            (ej) => ej.employee
          ),
        };
      });

      return NextResponse.json(serializeData({ projects }));
    }

    if (req.method === "POST" && subPath === "/projects/join") {
      const { projectId, priority } = await req.json();
      const existing = await prisma.projectsJoined.findFirst({
        where: {
          employee_id: employeeId,
          project_id: BigInt(projectId),
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Employee has already joined this project!" },
          { status: 400 }
        );
      }

      const joined = await prisma.projectsJoined.create({
        data: {
          employee_id: employeeId,
          project_id: BigInt(projectId),
          priority: BigInt(priority),
        },
      });

      return NextResponse.json(
        serializeData({
          message: "Joined project successfully!",
          data: joined,
        }),
        { status: 201 }
      );
    }

    if (
      req.method === "GET" &&
      pathSegments[0] === "projects" &&
      pathSegments.length === 2
    ) {
      const projectId = BigInt(pathSegments[1]);
      const project = await prisma.projectsJoined.findFirst({
        where: {
          project_id: projectId,
          employee_id: employeeId,
        },
        include: { project: true },
      });
      return NextResponse.json(serializeData({ data: { project } }));
    }

    // ==========================================
    // TASKS ROUTES (/api/v1/tasks/*)
    // ==========================================
    // GET /api/v1/tasks/:project_id/list-personal
    if (
      req.method === "GET" &&
      pathSegments[0] === "tasks" &&
      pathSegments[2] === "list-personal"
    ) {
      const projectId = BigInt(pathSegments[1]);
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const search = searchParams.get("search") || "";
      const progress = searchParams.get("progress") || "";
      const skip = (page - 1) * limit;

      const whereConditions: any = {
        employee_id: employeeId,
        project_id: projectId,
        deleted_at: null,
        AND: [
          {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { assignor: { name: { contains: search, mode: "insensitive" } } },
            ],
          },
          progress === "complete" ? { progress: { equals: 100 } } : undefined,
          progress === "in progress" ? { progress: { lt: 100 } } : undefined,
        ].filter(Boolean),
      };

      const [tasks, total] = await Promise.all([
        prisma.tasks.findMany({
          where: whereConditions,
          include: {
            employee: {
              select: {
                id: true,
                role_id: true,
                team_id: true,
                name: true,
                email: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                type: true,
                start_date: true,
                target_end_date: true,
                is_opt: true,
                progress: true,
              },
            },
            assignor: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { updated_at: "desc" },
          skip,
          take: limit,
        }),
        prisma.tasks.count({ where: whereConditions }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;
      return NextResponse.json(
        serializeData({
          total,
          page,
          totalPages,
          limit,
          data: { tasks, total, page, limit, totalPages },
        })
      );
    }

    // POST /api/v1/tasks
    if (req.method === "POST" && subPath === "/tasks") {
      const {
        assignor_id,
        project_id,
        name,
        start_date,
        target_end_date,
        actual_end_date,
      } = await req.json();

      const newTask = await prisma.tasks.create({
        data: {
          employee_id: employeeId,
          assignor_id: BigInt(assignor_id),
          project_id: BigInt(project_id),
          name,
          start_date: new Date(start_date),
          target_end_date: new Date(target_end_date),
          actual_end_date: actual_end_date ? new Date(actual_end_date) : null,
          progress: 0,
        },
      });

      return NextResponse.json(
        serializeData({
          message: `Task ${newTask.name} has been created`,
          data: newTask,
        }),
        { status: 201 }
      );
    }

    // PUT /api/v1/tasks/edit
    if (req.method === "PUT" && subPath === "/tasks/edit") {
      const {
        id,
        assignor_id,
        name,
        start_date,
        target_end_date,
        actual_end_date,
      } = await req.json();

      const updatedTask = await prisma.tasks.update({
        where: {
          id: BigInt(id),
          employee_id: employeeId,
        },
        data: {
          assignor_id: BigInt(assignor_id),
          name,
          start_date: new Date(start_date),
          target_end_date: new Date(target_end_date),
          actual_end_date: actual_end_date ? new Date(actual_end_date) : null,
        },
      });

      return NextResponse.json(serializeData({ data: { updatedTask } }));
    }

    // PUT /api/v1/tasks/delete/:id
    if (
      req.method === "PUT" &&
      pathSegments[0] === "tasks" &&
      pathSegments[1] === "delete" &&
      pathSegments[2]
    ) {
      const taskId = BigInt(pathSegments[2]);
      const task = await prisma.tasks.update({
        where: { id: taskId },
        data: { deleted_at: new Date() },
      });
      return NextResponse.json(
        serializeData({
          data: { message: `Task ${task.name} has been marked as deleted` },
        })
      );
    }

    // ==========================================
    // ACTIVITIES ROUTES (/api/v1/activities/*)
    // ==========================================
    // GET /api/v1/activities/calendar
    if (req.method === "GET" && subPath === "/activities/calendar") {
      const activities = await prisma.activities.findMany({
        where: {
          employee_id: employeeId,
          deleted_at: null,
          task: { deleted_at: null },
        },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              project_id: true,
              project: { select: { id: true, name: true } },
            },
          },
          validator: { select: { id: true, name: true } },
          activityType: { select: { id: true, name: true } },
        },
        orderBy: { start_date: "desc" },
      });

      const formatted = activities.map((act) => ({
        ...act,
        task_name: act.task?.name,
        project_name: act.task?.project?.name,
        project_id: act.task?.project_id,
      }));

      return NextResponse.json(serializeData({ activities: formatted }));
    }

    // GET /api/v1/activities/list/personal/:task_id
    if (
      req.method === "GET" &&
      pathSegments[0] === "activities" &&
      pathSegments[1] === "list" &&
      pathSegments[2] === "personal" &&
      pathSegments[3]
    ) {
      const taskId = BigInt(pathSegments[3]);
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "100", 10);
      const search = searchParams.get("search") || "";
      const skip = (page - 1) * limit;

      const whereConditions: any = {
        task_id: taskId,
        employee_id: employeeId,
        deleted_at: null,
        name: { contains: search, mode: "insensitive" },
      };

      const [activities, total] = await Promise.all([
        prisma.activities.findMany({
          where: whereConditions,
          include: {
            employee: {
              select: {
                id: true,
                role_id: true,
                team_id: true,
                name: true,
                email: true,
              },
            },
            task: {
              select: {
                id: true,
                employee_id: true,
                assignor_id: true,
                name: true,
              },
            },
            validator: { select: { id: true, name: true } },
            activityType: { select: { id: true, name: true } },
          },
          orderBy: { updated_at: "desc" },
          skip,
          take: limit,
        }),
        prisma.activities.count({ where: whereConditions }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;
      return NextResponse.json(
        serializeData({
          total,
          page,
          totalPages,
          limit,
          data: { activities, total, page, limit, totalPages },
        })
      );
    }

    // POST /api/v1/activities
    if (req.method === "POST" && subPath === "/activities") {
      const {
        task_id,
        validator_id,
        activity_type_id,
        name,
        start_date,
        target_end_date,
        actual_end_date,
        complete_status,
        notes,
      } = await req.json();

      const newActivity = await prisma.activities.create({
        data: {
          employee_id: employeeId,
          task_id: BigInt(task_id),
          validator_id: BigInt(validator_id),
          activity_type_id: BigInt(activity_type_id),
          name,
          start_date: new Date(start_date),
          target_end_date: new Date(target_end_date),
          actual_end_date: actual_end_date ? new Date(actual_end_date) : null,
          complete_status,
          notes,
        },
      });

      return NextResponse.json(
        serializeData({
          message: `Activity "${newActivity.name}" has been created`,
          data: newActivity,
        }),
        { status: 201 }
      );
    }

    // PUT /api/v1/activities/edit-activity
    if (req.method === "PUT" && subPath === "/activities/edit-activity") {
      const {
        activity_id,
        validator_id,
        activity_type_id,
        name,
        start_date,
        target_end_date,
        actual_end_date,
        complete_status,
        notes,
      } = await req.json();

      const updateActivity = await prisma.activities.update({
        where: { id: BigInt(activity_id) },
        data: {
          validator_id: BigInt(validator_id),
          activity_type_id: BigInt(activity_type_id),
          name,
          start_date: new Date(start_date),
          target_end_date: new Date(target_end_date),
          actual_end_date: actual_end_date ? new Date(actual_end_date) : null,
          complete_status,
          notes,
        },
      });

      return NextResponse.json(
        serializeData({
          message: `Activity ${updateActivity.name} has been updated`,
          data: updateActivity,
        })
      );
    }

    // PUT /api/v1/activities/delete/personal/:task_id/:activity_id
    if (
      req.method === "PUT" &&
      pathSegments[0] === "activities" &&
      pathSegments[1] === "delete" &&
      pathSegments[2] === "personal" &&
      pathSegments[4]
    ) {
      const activityId = BigInt(pathSegments[4]);
      const act = await prisma.activities.update({
        where: { id: activityId },
        data: { deleted_at: new Date() },
      });

      return NextResponse.json(
        serializeData({
          message: `Activity ${act.name} has been marked as deleted`,
        }),
        { status: 201 }
      );
    }

    return NextResponse.json({ message: "Route not found" }, { status: 404 });
  } catch (error: any) {
    console.error("API v1 error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = handleApiV1Request;
export const POST = handleApiV1Request;
export const PUT = handleApiV1Request;
export const DELETE = handleApiV1Request;
