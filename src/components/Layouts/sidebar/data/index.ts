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
        hideOnMobile: true, // Hide on mobile view
      },
      {
        title: "Categories",
        url: "/categories",
        icon: Icons.Table,
        items: [],
        hideOnMobile: true, // Hide on mobile view
      },
      {
        title: "Kanban",
        url: "/kanban",
        icon: Icons.Table,
        items: [],
        hideOnMobile: true, // Hide on mobile view
      },
      {
        title: "My Tasks",
        url: "/my-tasks",
        icon: Icons.MyTasksIcon,
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
        hideOnMobile: true, // Hide on mobile view
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
      {
        title: "Roster",
        icon: Icons.Calendar,
        items: [
          {
            title: "Update Schedule",
            url: "/roster/update-schedule",
          },
          {
            title: "View Schedule",
            url: "/roster/view-schedule",
            requiresRole: ['admin', 'manager'], // Only managers and admins can see this
          },
        ],
      },
      {
        title: "Reports",
        url: "/reports",
        icon: Icons.ReportsIcon,
        items: [],
        requiresRole: ['admin', 'manager'], // Only managers and admins can see this
      },
    ],
  },
  {
    label: "ADMIN",
    items: [
      {
        title: "Leave Approvals",
        url: "/admin/leave-approvals",
        icon: Icons.CheckCircleIcon,
        items: [],
        requiresRole: ['admin', 'manager'], // Only managers and admins can approve leaves
      },
      {
        title: "Attendance Roster",
        url: "/admin/attendance-roster",
        icon: Icons.Calendar,
        items: [],
        requiresRole: ['admin'], // Only admins can view full attendance roster
      },
      {
        title: "Client Visits",
        url: "/admin/client-visits",
        icon: Icons.MapPinIcon,
        items: [],
        requiresRole: ['admin'], // Only admins can view client visits
      },
      {
        title: "Manager Hierarchy",
        url: "/admin/manager-hierarchy",
        icon: Icons.UsersIcon,
        items: [],
        requiresRole: ['admin'], // Only admins can manage hierarchies
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
