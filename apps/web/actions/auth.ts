"use server";

import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Company login with real credentials from seeded data
export async function companyLoginAction(email: string, password: string) {
  const cookieStore = await cookies();

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.passwordHash !== password) {
    return { success: false, error: "Invalid credentials" };
  }

  if (user.role !== "company") {
    return { success: false, error: "Not a company account" };
  }

  // Find their company
  const company = await prisma.company.findUnique({
    where: { userId: user.id },
  });

  if (!company) {
    return { success: false, error: "No company linked to this account" };
  }

  // Set cookie for session context
  cookieStore.set("praxis_company_id", company.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return { success: true, companyId: company.id, companyName: company.name };
}

// Quick demo login for judges — logs in as TechForge
export async function mockCompanyLogin() {
  return companyLoginAction("admin@techforge.io", "demo123");
}
