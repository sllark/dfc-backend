import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../utils/encryption";

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

// ===== 🔐 Encryption Middleware =====
prisma.$use(async (params: MiddlewareParams, next: MiddlewareNext) => {
  const model = params.model ?? "";
  const action = params.action ?? "";

  if (model === "User" && ["create", "update"].includes(action)) {
    if (params.args?.data?.email) {
      params.args.data.email = encrypt(params.args.data.email);
    }
    if (params.args?.data?.phone) {
      params.args.data.phone = encrypt(params.args.data.phone);
    }
  }

  if (model === "Service" && ["create", "update"].includes(action)) {
    if (params.args?.data?.accountNo) {
      params.args.data.accountNo = encrypt(params.args.data.accountNo);
    }
  }

  const result = await next(params);

  if (model === "User" && ["findUnique", "findFirst", "findMany"].includes(action)) {
    if (Array.isArray(result)) {
      result.forEach(u => {
        if (u.email) u.email = decrypt(u.email);
        if (u.phone) u.phone = decrypt(u.phone);
      });
    } else if (result) {
      if (result.email) result.email = decrypt(result.email);
      if (result.phone) result.phone = decrypt(result.phone);
    }
  }

  if (model === "Service" && ["findUnique", "findFirst", "findMany"].includes(action)) {
    if (Array.isArray(result)) {
      result.forEach(s => {
        if (s.accountNo) s.accountNo = decrypt(s.accountNo);
      });
    } else if (result) {
      if (result.accountNo) result.accountNo = decrypt(result.accountNo);
    }
  }

  return result;
});

// ===== 📝 Audit Log Middleware =====
prisma.$use(async (params: MiddlewareParams, next: MiddlewareNext) => {
  const model = params.model ?? "";
  const action = params.action ?? "";
  const result = await next(params);

  const userId = params.context?.user?.userId ?? null;

  if (["create", "update", "delete"].includes(action)) {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        model,
        recordId: params.args?.where?.id ?? null,
        details: JSON.stringify(params.args?.data ?? {}),
      },
    });
  }

  return result;
});

// ===== 🔐 RBAC Middleware =====
prisma.$use(async (params: MiddlewareParams, next: MiddlewareNext) => {
  const model = params.model ?? "";
  const action = params.action ?? "";
  const user = params.context?.user;

  if (!user) throw new Error("Unauthorized");

  if (model === "User" && action === "delete" && user.role !== "ADMIN") {
    throw new Error("Forbidden: Admins only");
  }

  return next(params);
});

export default prisma;
