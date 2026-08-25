import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { z } from "zod";

export class FirebaseConfigurationError extends Error {
  constructor() {
    super("Firebase Admin is not configured.");
    this.name = "FirebaseConfigurationError";
  }
}

const adminEnvironment = z.object({
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(40),
  FIREBASE_PROJECT_ID: z.string().min(1),
});

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const parsed = adminEnvironment.safeParse(process.env);
  if (!parsed.success) throw new FirebaseConfigurationError();

  return initializeApp({
    credential: cert({
      clientEmail: parsed.data.FIREBASE_CLIENT_EMAIL,
      privateKey: parsed.data.FIREBASE_PRIVATE_KEY.replaceAll("\\n", "\n"),
      projectId: parsed.data.FIREBASE_PROJECT_ID,
    }),
  });
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
