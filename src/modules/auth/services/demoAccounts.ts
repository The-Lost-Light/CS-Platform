import type { LoginCredentials, User } from "../model/types";

export interface DemoAccount extends User {
  id: string;
  email: string;
  avatarColor: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    id: "student-1",
    studentId: "B11204018",
    name: "陳宥軒 (資工三甲)",
    email: "b11204018@university.edu.tw",
    role: "學生 (Student)",
    avatarColor: "var(--chart-1)",
  },
  {
    id: "student-2",
    studentId: "B11204042",
    name: "林博宇 (資工三乙)",
    email: "b11204042@university.edu.tw",
    role: "專題組長 (Team Lead)",
    avatarColor: "var(--chart-5)",
  },
  {
    id: "ta-1",
    studentId: "TA-901",
    name: "張簡助教 (Course TA)",
    email: "ta.se@university.edu.tw",
    role: "課程助教 (TA)",
    avatarColor: "var(--chart-2)",
  },
];

export const DEFAULT_LOGIN_CREDENTIALS: Readonly<LoginCredentials> = {
  studentId: "B11204018",
  name: "陳宥軒",
  password: "••••••••••••",
  role: "學生 (Student)",
};

export function getDemoCredentials(account: User): LoginCredentials {
  return {
    studentId: account.studentId,
    name: account.name,
    role: account.role,
    password: "material2026",
  };
}
