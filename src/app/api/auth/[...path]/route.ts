import { NextRequest, NextResponse } from "next/server";
import {
  isLocalDatabaseConfigured,
  prisma,
  serializeData,
} from "@/server/prisma";
import {
  comparePassword,
  createToken,
  hashPassword,
  verifyRequestToken,
} from "@/server/auth";
import { proxyToRemoteBackend } from "@/server/proxy";

export const dynamic = "force-dynamic";

async function handleAuthRequest(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  const pathSegments = context.params.path || [];
  const subPath = "/" + pathSegments.join("/");

  // If DATABASE_URL is not configured yet, proxy server-to-server to remote backend (zero CORS!)
  if (!isLocalDatabaseConfigured()) {
    return proxyToRemoteBackend(req, `/auth${subPath}`);
  }

  try {
    // POST /api/auth/login
    if (req.method === "POST" && subPath === "/login") {
      const body = await req.json();
      const { email, password } = body;

      const employee = await prisma.employees.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      if (!employee) {
        return NextResponse.json(
          { message: "Employee not found" },
          { status: 401 }
        );
      }

      const valid = comparePassword(password, employee.password);
      if (!valid) {
        return NextResponse.json(
          { message: "Invalid password" },
          { status: 401 }
        );
      }

      const token = createToken({ id: employee.id });
      const result = serializeData({
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: {
            id: employee.role.id,
            name: employee.role.name,
          },
          team: {
            id: employee.team.id,
            name: employee.team.name,
          },
          token,
        },
      });

      return NextResponse.json({ data: result }, { status: 200 });
    }

    // GET /api/auth/me
    if (req.method === "GET" && subPath === "/me") {
      const decoded = verifyRequestToken(req);
      const employee = await prisma.employees.findUnique({
        where: { id: BigInt(decoded.id) },
      });
      if (!employee) {
        return NextResponse.json(
          { message: "Employee not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ email: employee.email }, { status: 200 });
    }

    // POST /api/auth/forgot-password
    if (req.method === "POST" && subPath === "/forgot-password") {
      const { email, new_password } = await req.json();
      if (!new_password || new_password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long." },
          { status: 400 }
        );
      }
      const employee = await prisma.employees.findUnique({ where: { email } });
      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }
      const updated = await prisma.employees.update({
        where: { email },
        data: { password: hashPassword(new_password) },
      });
      return NextResponse.json(
        serializeData({
          message: `Employee ${updated.name}'s password has been successfully changed!`,
          data: updated,
        }),
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  } catch (error: any) {
    console.error("Auth API error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
export const PUT = handleAuthRequest;
export const DELETE = handleAuthRequest;
