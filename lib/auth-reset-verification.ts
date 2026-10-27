import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function verifyAdministratorAfterPasswordReset(userId: string) {
  try {
    const [administrator] = await db
      .select({
        role: schema.user.role,
        emailVerified: schema.user.emailVerified,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (
      administrator?.role !== "administrator" ||
      administrator.emailVerified
    ) {
      return;
    }

    await db
      .update(schema.user)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.user.id, userId),
          eq(schema.user.role, "administrator"),
          eq(schema.user.emailVerified, false),
        ),
      );
  } catch {
    // Password setup has already succeeded at this point. Do not throw:
    // Better Auth must still revoke every existing session. The account
    // remains unverified and can recover through verification-email resend.
    console.error({
      event: "administrator_email_verification_after_reset_failed",
    });
  }
}
