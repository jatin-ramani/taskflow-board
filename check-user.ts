import { PrismaClient } from "./src/generated/client";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "jatinrmn@gmail.com" },
  });
  console.log("User found:", user ? { id: user.id, email: user.email, hasPassword: !!user.password } : "NOT FOUND");
}

main().catch(console.error).finally(() => prisma.$disconnect());
