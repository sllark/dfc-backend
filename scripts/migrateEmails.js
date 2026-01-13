"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/generated/prisma");
const encryption_1 = require("../src/utils/encryption");
const prisma = new prisma_1.PrismaClient();
async function migrateEmails() {
    const users = await prisma.user.findMany();
    for (const user of users) {
        if (user.email) {
            await prisma.user.update({
                where: { id: user.id },
                data: { email: (0, encryption_1.encrypt)(user.email) },
            });
            console.log(`Encrypted email for user ID: ${user.id}`);
        }
        if (user.phone) {
            await prisma.user.update({
                where: { id: user.id },
                data: { phone: (0, encryption_1.encrypt)(user.phone) },
            });
            console.log(`Encrypted phone for user ID: ${user.id}`);
        }
    }
    console.log("Email and phone migration completed!");
    await prisma.$disconnect();
}
migrateEmails().catch((err) => {
    console.error(err);
    prisma.$disconnect();
});
//# sourceMappingURL=migrateEmails.js.map