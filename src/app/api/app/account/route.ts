import { createAccountDeletionHandler } from "@/server/http/account-deletion-route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const DELETE = createAccountDeletionHandler();
