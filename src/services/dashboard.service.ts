/**
 * Dashboard Service
 * Aggregates data from tasks and users for dashboard analytics
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { employeeService, Employee } from './employee.service';
import { taskApi } from './task.api';
import { recurringTaskService } from './recurring-task.service';
import { kanbanService } from './kanban.service';

export interface TeamMemberPerformance {
  userId: string;
  name: string;
  email: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksTodo: number;
  totalTasks: number;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
}

class DashboardService {
  /**
   * Get team performance data with actual task assignments
   */
  async getTeamPerformance(currentUserId?: string): Promise<TeamMemberPerformance[]> {
    try {
      // Fetch all active employees/users
      const employees = await employeeService.getAll({ status: 'active' });
      
      // Fetch all tasks (non-recurring)
      const tasks = await taskApi.getTasks();
      
      // Fetch recurring tasks
      const recurringTasks = await recurringTaskService.getAll();
      
      // Fetch kanban tasks
      let kanbanTasks: any[] = [];
      try {
        if (currentUserId) {
          kanbanTasks = await kanbanService.getAllUserTasks(currentUserId);
        }
      } catch (error) {
        console.log('No kanban tasks found or error fetching:', error);
      }

      // Create a map of user performance
      const performanceMap = new Map<string, TeamMemberPerformance>();

      // Initialize performance data for all employees
      employees.forEach(employee => {
        if (employee.id) {
          performanceMap.set(employee.id, {
            userId: employee.id,
            name: employee.name,
            email: employee.email,
            tasksCompleted: 0,
            tasksInProgress: 0,
            tasksTodo: 0,
            totalTasks: 0,
          });
        }
      });

      // Count tasks from regular tasks
      tasks.forEach(task => {
        if (task.assignedTo && Array.isArray(task.assignedTo)) {
          task.assignedTo.forEach(userId => {
            const performance = performanceMap.get(userId);
            if (performance) {
              performance.totalTasks++;
              
              if (task.status === 'completed') {
                performance.tasksCompleted++;
              } else if (task.status === 'in-progress') {
                performance.tasksInProgress++;
              } else if (task.status === 'pending' || task.status === 'todo') {
                performance.tasksTodo++;
              }
            }
          });
        }
      });

      // Count tasks from recurring tasks
      recurringTasks.forEach(task => {
        if (task.contactIds && Array.isArray(task.contactIds)) {
          task.contactIds.forEach(userId => {
            const performance = performanceMap.get(userId);
            if (performance) {
              performance.totalTasks++;
              
              if (task.status === 'completed') {
                performance.tasksCompleted++;
              } else if (task.status === 'in-progress') {
                performance.tasksInProgress++;
              } else if (task.status === 'pending') {
                performance.tasksTodo++;
              }
            }
          });
        }
      });

      // Count tasks from kanban tasks (using assignee name matching)
      kanbanTasks.forEach(task => {
        if (task.assignee && task.assignee.name) {
          // Try to find matching employee by name
          const matchingEmployee = employees.find(emp => 
            emp.name.toLowerCase() === task.assignee.name.toLowerCase()
          );
          
          if (matchingEmployee && matchingEmployee.id) {
            const performance = performanceMap.get(matchingEmployee.id);
            if (performance) {
              performance.totalTasks++;
              
              if (task.status === 'completed') {
                performance.tasksCompleted++;
              } else if (task.status === 'in-progress') {
                performance.tasksInProgress++;
              } else if (task.status === 'todo') {
                performance.tasksTodo++;
              }
            }
          }
        }
      });

      // Convert map to array and filter out users with no tasks
      const teamPerformance = Array.from(performanceMap.values())
        .filter(perf => perf.totalTasks > 0)
        .sort((a, b) => b.totalTasks - a.totalTasks);

      return teamPerformance;
    } catch (error) {
      console.error('Error getting team performance:', error);
      return [];
    }
  }

  /**
   * Get personalized dashboard stats for a specific user
   */
  async getPersonalizedStats(userId: string): Promise<DashboardStats> {
    try {
      // Fetch all tasks
      const tasks = await taskApi.getTasks();
      const recurringTasks = await recurringTaskService.getAll();
      const kanbanTasks = await kanbanService.getAllUserTasks(userId);

      // Filter tasks assigned to this user
      const userTasks = tasks.filter(task => 
        task.assignedTo && task.assignedTo.includes(userId)
      );

      const userRecurringTasks = recurringTasks.filter(task =>
        task.contactIds && task.contactIds.includes(userId)
      );

      // Get employee info to match kanban tasks
      const employee = await employeeService.getById(userId);
      const userKanbanTasks = employee ? kanbanTasks.filter(task =>
        task.assignee && task.assignee.name.toLowerCase() === employee.name.toLowerCase()
      ) : [];

      // Calculate stats
      const allUserTasks = [
        ...userTasks,
        ...userRecurringTasks.map(t => ({ ...t, status: t.status as any })),
        ...userKanbanTasks.map(t => ({ ...t, status: t.status as any }))
      ];

      const totalTasks = allUserTasks.length;
      const completedTasks = allUserTasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = allUserTasks.filter(t => t.status === 'in-progress').length;
      const todoTasks = allUserTasks.filter(t => 
        t.status === 'pending' || t.status === 'todo'
      ).length;

      const now = new Date();
      const overdueTasks = allUserTasks.filter(t => {
        if (t.status === 'completed') return false;
        // Check if task has dueDate property (non-recurring tasks) or nextOccurrence (recurring tasks)
        const dueDate = ('dueDate' in t && t.dueDate) ? new Date(t.dueDate) : 
                       ('nextOccurrence' in t && t.nextOccurrence) ? new Date(t.nextOccurrence) : null;
        return dueDate && dueDate < now;
      }).length;

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        overdueTasks,
      };
    } catch (error) {
      console.error('Error getting personalized stats:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        overdueTasks: 0,
      };
    }
  }

  /**
   * Get overall dashboard stats (for admins/managers)
   */
  async getOverallStats(): Promise<DashboardStats> {
    try {
      const tasks = await taskApi.getTasks();
      const recurringTasks = await recurringTaskService.getAll();

      const allTasks = [
        ...tasks,
        ...recurringTasks.map(t => ({ ...t, status: t.status as any }))
      ];

      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;
      const todoTasks = allTasks.filter(t => 
        t.status === 'pending' || t.status === 'todo'
      ).length;

      const now = new Date();
      const overdueTasks = allTasks.filter(t => {
        if (t.status === 'completed') return false;
        // Check if task has dueDate property (non-recurring tasks) or nextOccurrence (recurring tasks)
        const dueDate = ('dueDate' in t && t.dueDate) ? new Date(t.dueDate) : 
                       ('nextOccurrence' in t && t.nextOccurrence) ? new Date(t.nextOccurrence) : null;
        return dueDate && dueDate < now;
      }).length;

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        overdueTasks,
      };
    } catch (error) {
      console.error('Error getting overall stats:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        overdueTasks: 0,
      };
    }
  }
}

export const dashboardService = new DashboardService();
