declare class AuthService {
    static registerUser: (username: string, email: string, password: string, phone?: string) => Promise<{
        email: string;
        phone: string | null;
        role: import("../generated/prisma").$Enums.Role;
        username: string;
        password: string;
        isActive: boolean;
        lastLogin: Date | null;
        profileImage: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    static findUserByEmail: (email: string) => Promise<{
        email: string;
        phone: string | null;
        role: import("../generated/prisma").$Enums.Role;
        username: string;
        password: string;
        isActive: boolean;
        lastLogin: Date | null;
        profileImage: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    } | null>;
    static loginUser: (email: string, password: string) => Promise<{
        id: number;
        token: string;
        role: import("../generated/prisma").$Enums.Role;
        username: string;
        email: string;
        phone: string | null;
    }>;
    static findUserById: (id: number) => Promise<{
        email: string | null;
        phone: string | null;
        role: import("../generated/prisma").$Enums.Role;
        username: string;
        password: string;
        isActive: boolean;
        lastLogin: Date | null;
        profileImage: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    } | null>;
    static getAllUsers: (filter?: {
        role?: string;
    }) => Promise<{
        email: string | null;
        phone: string | null;
        role: import("../generated/prisma").$Enums.Role;
        username: string;
        isActive: boolean;
        lastLogin: Date | null;
        profileImage: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }[]>;
    static updateUser: (id: number, data: {
        username?: string;
        phone?: string;
        profileImage?: string;
        password?: string;
    }) => Promise<{
        phone: string | null;
        role: import("../generated/prisma").$Enums.Role;
        username: string;
        email: string;
        isActive: boolean;
        lastLogin: Date | null;
        profileImage: string | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    static sendPasswordResetOTP: (email: string) => Promise<{
        message: string;
    }>;
    static verifyOTP: (email: string, otp: string) => Promise<{
        message: string;
        userId: number;
    }>;
    static resetPassword: (email: string, otp: string, newPassword: string) => Promise<{
        message: string;
    }>;
    static generateToken(user: {
        id: number;
        role?: string;
    }): string;
}
export default AuthService;
//# sourceMappingURL=authService.d.ts.map