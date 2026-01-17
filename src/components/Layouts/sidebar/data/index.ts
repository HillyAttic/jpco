import * as Icons from "../icons";

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
        title: "Profile",
        url: "/profile",
        icon: Icons.User,
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
        title: "Tasks",
        icon: Icons.TaskIcon,
        items: [
          {
            title: "All Tasks",
            url: "/tasks",
          },
          {
            title: "Non-Recurring",
            url: "/tasks/non-recurring",
          },
          {
            title: "Recurring",
            url: "/tasks/recurring",
          },
        ],
      },
      {
        title: "Teams",
        url: "/teams",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Employees",
        url: "/employees",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Attendance",
        url: "/attendance",
        icon: Icons.ClockIcon,
        items: [],
      },
    ],
  },
  {
    label: "PAGES",
    items: [
      {
        title: "Forms",
        icon: Icons.Alphabet,
        items: [
          {
            title: "Form Elements",
            url: "/forms/form-elements",
          },
          {
            title: "Form Layout",
            url: "/forms/form-layout",
          },
        ],
      },
      {
        title: "Tables",
        url: "/tables",
        icon: Icons.Table,
        items: [
          {
            title: "Tables",
            url: "/tables",
          },
        ],
      },
      {
        title: "Settings",
        url: "/pages/settings",
        icon: Icons.Alphabet,
        items: [],
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "Charts",
        icon: Icons.PieChart,
        items: [
          {
            title: "Basic Chart",
            url: "/charts/basic-chart",
          },
        ],
      },
      {
        title: "UI Elements",
        icon: Icons.FourCircle,
        items: [
          {
            title: "Alerts",
            url: "/ui-elements/alerts",
          },
          {
            title: "Buttons",
            url: "/ui-elements/buttons",
          },
        ],
      },
      {
        title: "Authentication",
        icon: Icons.Authentication,
        items: [
          {
            title: "Sign In",
            url: "/auth/sign-in",
          },
          {
            title: "Sign Up",
            url: "/auth/signup",
          },
          {
            title: "Forgot Password",
            url: "/auth/forgot-password",
          },
        ],
      },

    ],
  },
];
