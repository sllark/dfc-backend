import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ Safe minimal custom types to avoid build errors
interface MiddlewareParams {
  model?: string;
  action?: string;
  args?: any;
  context?: any;
  [key: string]: any;
}

type MiddlewareNext = (params: MiddlewareParams) => Promise<any>;

// ===== 📝 Audit Log Middleware =====
// Note: Encryption/decryption is handled manually in services to avoid conflicts
// Services use encryptDeterministic for emails (for searchability) and encrypt for phones
// Note: RBAC is handled at the route/controller level, not in Prisma middleware
prisma.$use(async (params: MiddlewareParams, next: MiddlewareNext) => {
  const model = params.model ?? "";
  const action = params.action ?? "";
  const result = await next(params);

  // Only create audit logs for write operations
  // Skip if no user context (e.g., during signup/login) - don't fail the operation
  const userId = params.context?.user?.userId ?? null;

  if (["create", "update", "delete"].includes(action)) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          model,
          recordId: params.args?.where?.id ?? params.args?.data?.id ?? null,
          details: JSON.stringify(params.args?.data ?? {}),
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit log fails
      console.error("Audit log creation failed:", error);
    }
  }

  return result;
});

export default prisma;
