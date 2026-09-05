import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/public-shell";
import { TryOneSet } from "@/components/workout/try-one-set";

export const metadata: Metadata = { title: "Try one set" };
export default function TryPage() { return <PublicShell current="home"><TryOneSet /></PublicShell>; }
