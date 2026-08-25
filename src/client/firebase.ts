import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export type FirebasePublicConfig = Readonly<{
  apiKey: string;
  appId: string;
  authDomain: string;
  projectId: string;
}>;

export function getFirebaseClientAuth(config: FirebasePublicConfig): Auth {
  const app = getApps().length > 0 ? getApp() : initializeApp(config satisfies FirebaseOptions);
  return getAuth(app);
}
