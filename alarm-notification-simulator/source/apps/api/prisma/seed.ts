import { hashPassword } from "../src/auth/password.js";
import { config } from "../src/config.js";
import { prisma } from "../src/db/prisma.js";

/**
 * Seeds the two demo accounts used by the simulation. The password comes from
 * SEED_PASSWORD in .env - there is deliberately no hard-coded fallback, so a
 * copy of this repository can never ship with a known password.
 */
async function main() {
  if (!config.SEED_PASSWORD) {
    throw new Error(
      "SEED_PASSWORD is not set in .env. Set it before seeding - there is no default password.",
    );
  }

  const passwordHash = await hashPassword(config.SEED_PASSWORD);

  const accounts = [
    { email: config.SEED_MANAGER_EMAIL, role: "MANAGER", displayName: "值班經理 Duty Manager" },
    { email: config.SEED_ADMIN_EMAIL, role: "ADMIN", displayName: "系統管理員 Administrator" },
  ];

  for (const account of accounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash, role: account.role, displayName: account.displayName, active: true },
      create: {
        email: account.email,
        passwordHash,
        role: account.role,
        displayName: account.displayName,
      },
    });
    console.log(`seeded ${account.role.padEnd(7)} ${user.email}  id=${user.id}`);
  }

  console.log("\nSign in with the password from SEED_PASSWORD in your .env file.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
