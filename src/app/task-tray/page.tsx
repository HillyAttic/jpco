'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { TaskList } from '@/components/task-list';
import { TaskCreationModal } from '@/components/task-creation-modal';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { TaskFilter } from '@/components/task-filter';
import {
    CalendarDaysIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClipboardDocumentListIcon,
    ChevronDownIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';

// Day/time period filter options
type DateFilter =
    | 'all'
    | 'today'
    | 'yesterday'
    | 'this-week'
    | 'last-week'
    | 'this-month'
    | 'last-month'
    | 'older';

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string; icon?: string }[] = [
    { value: 'all', label: 'All Tasks' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this-week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'older', label: 'Older' },
];

interface TaskFilters {
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    assignee?: string;
}

// Helper: get start/end of today
function getToday(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

// Helper: get start/end of yesterday
function getYesterday(): { start: Date; end: Date } {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

// Helper: get start/end of this week (Mon-Sun)
function getThisWeek(): { start: Date; end: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is start
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

// Helper: get start/end of last week
function getLastWeek(): { start: Date; end: Date } {
    const thisWeek = getThisWeek();
    const start = new Date(thisWeek.start);
    start.setDate(start.getDate() - 7);
    const end = new Date(thisWeek.start);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

// Helper: get start/end of this month
function getThisMonth(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

// Helper: get start/end of last month
function getLastMonth(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function getDateRange(filter: DateFilter): { start: Date; end: Date } | null {
    switch (filter) {
        case 'today':
            return getToday();
        case 'yesterday':
            return getYesterday();
        case 'this-week':
            return getThisWeek();
        case 'last-week':
            return getLastWeek();
        case 'this-month':
            return getThisMonth();
        case 'last-month':
            return getLastMonth();
        case 'older': {
            const lastMonth = getLastMonth();
            return { start: new Date(2000, 0, 1), end: new Date(lastMonth.start.getTime() - 1) };
        }
        default:
            return null; // 'all'
    }
}

export default function TaskTrayPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [filters, setFilters] = useState<TaskFilters>({});
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');

    useEffect(() => {
        loadTasks();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [tasks, filters, dateFilter]);

    const loadTasks = async () => {
        try {
            setLoading(true);
            const tasksData = await taskApi.getTasks();
            setTasks(tasksData);
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...tasks];

        // Apply date filter
        const dateRange = getDateRange(dateFilter);
        if (dateRange) {
            filtered = filtered.filter((task) => {
                const taskDate = task.dueDate ? new Date(task.dueDate) : task.createdAt ? new Date(task.createdAt) : null;
                if (!taskDate) return false;
                return taskDate >= dateRange.start && taskDate <= dateRange.end;
            });
        }

        // Apply search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(
                (task) =>
                    task.title.toLowerCase().includes(searchTerm) ||
                    (task.description && task.description.toLowerCase().includes(searchTerm))
            );
        }

        // Apply status filter
        if (filters.status) {
            filtered = filtered.filter((task) => task.status === filters.status);
        }

        // Apply priority filter
        if (filters.priority) {
            filtered = filtered.filter((task) => task.priority === filters.priority);
        }

        // Apply assignee filter
        if (filters.assignee) {
            const assigneeTerm = filters.assignee.toLowerCase();
            filtered = filtered.filter((task) =>
                task.assignedTo.some((user) => user.toLowerCase().includes(assigneeTerm))
            );
        }

        setFilteredTasks(filtered);
    };

    const handleTaskCreated = (newTask: Task) => {
        setTasks((prev) => [...prev, newTask]);
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setShowDetailModal(true);
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
        setSelectedTask(updatedTask);
    };

    const handleFiltersChange = (newFilters: TaskFilters) => {
        setFilters(newFilters);
    };

    const handleClearFilters = () => {
        setFilters({});
    };

    // Task stats computed from filtered tasks
    const stats = useMemo(() => {
        const total = filteredTasks.length;
        const completed = filteredTasks.filter((t) => t.status === 'completed').length;
        const inProgress = filteredTasks.filter((t) => t.status === 'in-progress').length;
        const pending = filteredTasks.filter((t) => t.status === 'pending' || t.status === 'todo').length;
        const now = new Date();
        const overdue = filteredTasks.filter(
            (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
        ).length;
        return { total, completed, inProgress, pending, overdue };
    }, [filteredTasks]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                        <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Task Tray
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {stats.total} tasks
                            {dateFilter !== 'all' && (
                                <span className="ml-1">
                                    •{' '}
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                        {DATE_FILTER_OPTIONS.find((o) => o.value === dateFilter)?.label}
                                    </span>
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <ClipboardDocumentListIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>

                <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Completed</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
                </div>

                <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <ClockIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">In Progress</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">{stats.inProgress}</p>
                </div>

                <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <CalendarDaysIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Pending</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
                </div>

                <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Overdue</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
                </div>
            </div>

            {/* Date Filter Pills */}
            <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filter by Period</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {DATE_FILTER_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setDateFilter(option.value)}
                            className={`
                px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium
                transition-all duration-200 border
                ${dateFilter === option.value
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                                }
              `}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Existing Filters (status, priority, search, assignee) */}
            <TaskFilter
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
            />

            {/* Task List */}
            <div className="bg-white dark:bg-gray-dark rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="p-4 sm:p-6">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                                <CalendarDaysIcon className="mx-auto h-12 w-12" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                No tasks found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {dateFilter !== 'all'
                                    ? `No tasks found for "${DATE_FILTER_OPTIONS.find((o) => o.value === dateFilter)?.label}". Try a different period.`
                                    : 'No tasks match the current filters.'}
                            </p>
                            {dateFilter !== 'all' && (
                                <button
                                    onClick={() => setDateFilter('all')}
                                    className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                    Show All Tasks
                                </button>
                            )}
                        </div>
                    ) : (
                        <TaskList tasks={filteredTasks} onTaskClick={handleTaskClick} showStatus={true} />
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            <TaskCreationModal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onTaskCreated={handleTaskCreated}
            />

            {/* Task Detail Modal */}
            <TaskDetailModal
                open={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                task={selectedTask}
                onUpdate={handleTaskUpdate}
            />
        </div>
    );
}
