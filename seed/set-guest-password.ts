import { createClerkClient } from "@clerk/backend";

const NEW_PASSWORD = "kessel-run-2268";

async function main() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const guest = (
    await clerk.users.getUserList({ emailAddress: ["guest@gmail.com"] })
  ).data[0];
  if (!guest) throw new Error("Guest user not found — run db:seed first.");
  await clerk.users.updateUser(guest.id, { password: NEW_PASSWORD });
  console.log("Guest password updated.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
