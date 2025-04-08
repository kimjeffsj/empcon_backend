import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { appConfig } from "../src/config/app.config";

const prisma = new PrismaClient();

async function main() {
  // Get admin information from environment variables
  const adminEmail = appConfig.admin.email;
  const adminPassword = appConfig.admin.password;

  if (!adminEmail) {
    throw new Error("Admin email is not defined in environment variables");
  }

  if (!adminPassword) {
    throw new Error("Admin password is not defined in environment variables");
  }

  // Hash admin password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  // Create admin if not exists
  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        hireDate: new Date(),
        role: "ADMIN",
      },
    });

    console.log(`Admin user created with ID: ${admin.id}`);
    console.log(`Email: ${adminEmail}`);
    console.log("Password: [Set in environment variables]");
  } else {
    console.log("Admin user already exists");
  }
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
