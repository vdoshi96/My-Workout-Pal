import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/db/client", () => ({ getDatabase: () => ({}) }));
vi.mock("@/server/auth/viewer", () => ({ getCurrentViewer: async () => ({uid:"test-owner"}) }));
vi.mock("@/server/repositories/custom-exercises", () => ({ listCustomExercises: async () => [] }));
vi.mock("@/server/repositories/profile-program", () => {
  class RepositoryNotFoundError extends Error {}
  return {RepositoryNotFoundError, getViewerProfileProgram: async () => {throw new RepositoryNotFoundError();}};
});
vi.mock("next/navigation", () => ({redirect: () => {throw new Error("Unexpected setup redirect");}}));
import MemberLibraryPage from "@/app/app/library/page";
it("keeps the member Library searchable before routine setup", async () => {
  const html=renderToStaticMarkup(await MemberLibraryPage({searchParams:Promise.resolve({q:"push-up"})}));
  expect(html).toContain("Push-up");
  expect(html).toContain("Set up your routine");
  expect(html).not.toContain("Create private exercise");
});
