import type { ReactNode } from "react";

export type EquipmentIllustrationKind = "dumbbell" | "barbell" | "bench" | "mat" | "shoe" | "towel" | "timer" | "distance";
const shapes: Record<EquipmentIllustrationKind, ReactNode> = {
  dumbbell: <><path fill="#6ebdb5" d="M13 21h12v30H13zM55 21h12v30H55z"/><path fill="#f2bb57" d="M25 31h30v10H25z"/><path d="M7 29h6M67 29h6M7 43h6M67 43h6"/><path d="M18 26v20M62 26v20"/></>,
  barbell: <><path fill="#6ebdb5" d="M12 15h10v42H12zM58 15h10v42H58z"/><path fill="#f2bb57" d="M5 26h7v20H5zM68 26h7v20h-7z"/><path d="M22 35h36M22 39h36"/></>,
  bench: <><path fill="#6ebdb5" d="m12 18 12-4 18 27H28zM29 39h37v10H29z"/><path d="M32 49 22 63M60 49l8 14M17 63h14M61 63h13"/><path fill="#f2bb57" d="M29 44h4v5h-4z"/></>,
  mat: <><path fill="#6ebdb5" d="m23 16 47 4-15 43-46-5Z"/><path d="m15 46 42 5M13 52l42 5M28 23l32 3"/><ellipse cx="24" cy="16" rx="13" ry="7" fill="#f2bb57"/><path d="M19 16q5-6 11 0"/></>,
  shoe: <><path fill="#6ebdb5" d="M12 31q7 8 17 1l7-13 12 4 8 17 14 6q5 3 3 10H9V39Z"/><path fill="#f2bb57" d="M9 51h64v7H9Z"/><path d="m39 29 11 3M36 35l15 4M55 40l-7 11"/></>,
  towel: <><path fill="#6ebdb5" d="M11 25q0-6 7-6h48q6 0 6 7v18H11Z"/><path fill="#bde0d5" d="M13 42h53q7 0 7 7t-7 7H13q-6 0-6-7t6-7Z"/><path d="M18 25v14M24 25v14M63 47H18M63 52H18"/></>,
  timer: <><path fill="#f2bb57" d="M32 8h16v8H32Z"/><path d="M40 16v5m18-4 7 7"/><circle cx="40" cy="43" r="23" fill="#6ebdb5"/><circle cx="40" cy="43" r="16" fill="#fff9e7"/><path d="M40 31v12l9 5"/></>,
  distance: <><path fill="#f2bb57" d="m40 61-18-26C10 9 67 6 59 34Z"/><circle cx="40" cy="27" r="8" fill="#fff9e7"/><path d="M15 61h12M52 61h13"/><path fill="#6ebdb5" d="m11 57-5 8h14M69 57l5 8H60"/></>,
};
/** Decorative equipment artwork; adjacent text defines actual equipment requirements. */
export function EquipmentIllustration({kind}: {kind:EquipmentIllustrationKind}) {
  return <svg className="quiet-equipment-art" aria-hidden="true" focusable="false" width="80" height="72" viewBox="0 0 80 72" fill="none" stroke="#183f35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]}</svg>;
}
