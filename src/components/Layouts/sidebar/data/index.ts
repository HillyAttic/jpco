import * as Icons from "../icons";

// Navigation data with role-based access control
export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "Calendar",
        url: "/calendar",
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "Categories",
        url: "/categories",
        icon: Icons.Table,
        items: [],
      },
      {
        title: "Kanban",
        url: "/kanban",
        icon: Icons.Table,
        items: [],
      },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      {
        title: "Clients",
        url: "/clients",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Non-Recurring",
        url: "/tasks/non-recurring",
        icon: Icons.NonRecurringIcon,
        items: [],
      },
      {
        title: "Recurring",
        url: "/tasks/recurring",
        icon: Icons.RecurringIcon,
        items: [],
      },
      {
        title: "Teams",
        url: "/teams",
        icon: Icons.User,
        items: [],
        requiresRole: ['admin', 'manager'], // Only managers and admins can see this
      },
      {
        title: "Employees",
        url: "/employees",
        icon: Icons.User,
        items: [],
        requiresRole: ['admin', 'manager'], // Only managers and admins can see this
      },
      {
        title: "Attendance",
        icon: Icons.ClockIcon,
        items: [
          {
            title: "Track Attendance",
            url: "/attendance",
          },
          {
            title: "Attendance Tray",
            url: "/attendance/tray",
            requiresRole: ['admin', 'manager'], // Only managers and admins can see this
          },
        ],
      },

      // Authentication menu item hidden - users can access auth pages directly via URL if needed
      // {
      //   title: "Authentication",
      //   icon: Icons.Authentication,
      //   items: [
      //     {
      //       title: "Sign In",
      //       url: "/auth/sign-in",
      //     },
      //     {
      //       title: "Sign Up",
      //       url: "/auth/signup",
      //     },
      //     {
      //       title: "Forgot Password",
      //       url: "/auth/forgot-password",
      //     },
      //   ],
      // },
    ],
  },
];
