import { PrismaClient } from "../src/generated/prisma";
import { encrypt } from "../src/utils/encryption";

const prisma = new PrismaClient();

async function migrateEmails() {
    const users = await prisma.user.findMany();

    for (const user of users) {
        if (user.email) {
            await prisma.user.update({
                where: { id: user.id },
                data: { email: encrypt(user.email) },
            });
            console.log(`Encrypted email for user ID: ${user.id}`);
        }

        if (user.phone) {
            await prisma.user.update({
                where: { id: user.id },
                data: { phone: encrypt(user.phone) },
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
