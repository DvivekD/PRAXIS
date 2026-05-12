"use server";

import { cookies } from "next/headers";
import { prisma } from "../lib/prisma";

// Company login with real credentials or demo fallback
export async function companyLoginAction(email: string, password: string) {
  const cookieStore = await cookies();

  try {
    // 1. Try real DB check
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && user.passwordHash === password && user.role === "company") {
      const company = await prisma.company.findUnique({
        where: { userId: user.id },
      });

      if (company) {
        cookieStore.set("praxis_company_id", company.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
        return { success: true, companyId: company.id, companyName: company.name };
      }
    }
  } catch (e) {
    console.error("DB query failed, using mock fallback", e);
  }

  // 2. DEMO FALLBACK: Allow any email/password for the "mockup" feel
  // We'll default to TechForge if it's not CloserHQ
  let mockCompanyId = email.includes("closer") ? "closerhq-mock-id" : "techforge-mock-id";
  let mockCompanyName = email.includes("closer") ? "CloserHQ" : "TechForge";

  cookieStore.set("praxis_company_id", mockCompanyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return { success: true, companyId: mockCompanyId, companyName: mockCompanyName };
}

// Quick demo login for judges — logs in as TechForge
export async function mockCompanyLogin() {
  return companyLoginAction("admin@techforge.io", "demo123");
}
