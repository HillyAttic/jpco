import "./v3-glass.css";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = { title: "Attendance v3" };

export default function AttendanceV3Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
