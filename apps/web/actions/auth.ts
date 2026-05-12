"use server";

import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Company login with real credentials from seeded data
export async function companyLoginAction(email: string, password: string) {
  const cookieStore = await cookies();

  try {
    // Try to find user by email in DB
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      if (user.passwordHash !== password) {
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
  } catch (e) {
    // DB is likely unavailable (e.g. Vercel with SQLite)
    console.error("DB query failed, attempting demo fallback", e);
  }

  // FALLBACK FOR DEMO ACCOUNTS ON VERCEL
  if (password === "demo123") {
    let mockCompanyId = "";
    let mockCompanyName = "";

    if (email === "admin@techforge.io") {
      mockCompanyId = "techforge-mock-id";
      mockCompanyName = "TechForge";
    } else if (email === "admin@closerhq.com") {
      mockCompanyId = "closerhq-mock-id";
      mockCompanyName = "CloserHQ";
    } else {
      return { success: false, error: "Invalid credentials" };
    }

    cookieStore.set("praxis_company_id", mockCompanyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return { success: true, companyId: mockCompanyId, companyName: mockCompanyName };
  }

  return { success: false, error: "Invalid credentials" };
}

// Quick demo login for judges — logs in as TechForge
export async function mockCompanyLogin() {
  return companyLoginAction("admin@techforge.io", "demo123");
}
