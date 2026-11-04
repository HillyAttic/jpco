import "./glass.css";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = { title: "Attendance v2" };

export default function AttendanceV2Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
