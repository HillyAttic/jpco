'use client';

import React, { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { myTasksService } from '@/services/my-tasks.service';
import { MyTask, TaskList, TASK_LIST_COLORS } from '@/types/my-tasks.types';
import { PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';

/**
 * FIRESTORE COMPOSITE INDEXES REQUIRED:
 * 
 * Collection: my_task_lists
 * - userId (Ascending) + order (Ascending)
 * 
 * Collection: my_tasks
 * - listId (Ascending) + order (Ascending)
 * - userId (Ascending) + order (Ascending)
 */

export default function MyTasksPage() {
    const { user, loading: authLoading } = useEnhancedAuth();
    const router = useRouter();

    const [taskLists, setTaskLists] = useState<TaskList[]>([]);
    const [tasks, setTasks] = useState<MyTask[]>([]);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showCreateListModal, setShowCreateListModal] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Load data
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                setLoading(true);
                const [lists, allTasks] = await Promise.all([
                    myTasksService.getUserTaskLists(user.uid),
                    myTasksService.getAllUserTasks(user.uid),
                ]);

                setTaskLists(lists);
                setTasks(allTasks);

                // Select first list if none selected
                if (lists.length > 0 && !selectedListId) {
                    setSelectedListId(lists[0].id);
                }
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Failed to load tasks');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user]);

    // Handlers
    const handleCreateList = async (name: string, color: string) => {
        if (!user) return;
        try {
            const newList = await myTasksService.createTaskList(user.uid, {
                name,
                color,
                order: taskLists.length,
            });
            setTaskLists([...taskLists, newList]);
            setSelectedListId(newList.id);
            setShowCreateListModal(false);
        } catch (err) {
            console.error('Error creating list:', err);
        }
    };

    const handleDeleteList = async (listId: string) => {
        if (!confirm('Delete this list and all its tasks?')) return;
        try {
            await myTasksService.deleteTaskList(listId);
            setTaskLists(taskLists.filter(l => l.id !== listId));
            setTasks(tasks.filter(t => t.listId !== listId));
            if (selectedListId === listId) {
                const remaining = taskLists.filter(l => l.id !== listId);
                setSelectedListId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err) {
            console.error('Error deleting list:', err);
        }
    };

    const handleAddTask = async () => {
        if (!user || !selectedListId || !newTaskTitle.trim()) return;
        try {
            const listTasks = tasks.filter(t => t.listId === selectedListId);
            const newTask = await myTasksService.createTask({
                listId: selectedListId,
                userId: user.uid,
                title: newTaskTitle.trim(),
                order: listTasks.length,
            });
            setTasks([...tasks, newTask]);
            setNewTaskTitle('');
        } catch (err) {
            console.error('Error creating task:', err);
        }
    };

    const handleToggleTask = async (task: MyTask) => {
        try {
            await myTasksService.updateTask(task.id, { completed: !task.completed });
            setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
        } catch (err) {
            console.error('Error toggling task:', err);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await myTasksService.deleteTask(taskId);
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    };

    // Computed values
    const selectedList = taskLists.find(l => l.id === selectedListId);
    const listTasks = tasks.filter(t => t.listId === selectedListId);
    const activeTasks = listTasks.filter(t => !t.completed);
    const completedTasks = listTasks.filter(t => t.completed);

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading your tasks...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="bg-white dark:bg-gray-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
                        <button
                            onClick={() => setShowCreateListModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5" />
                            New List
                        </button>
                    </div>
                </div>

                {/* Lists Tabs */}
                {taskLists.length > 0 && (
                    <div className="border-b border-gray-200 dark:border-gray-700 px-6">
                        <div className="flex gap-2 overflow-x-auto py-3">
                            {taskLists.map(list => (
                                <button
                                    key={list.id}
                                    onClick={() => setSelectedListId(list.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                                        selectedListId === list.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: list.color }}
                                    />
                                    <span className="font-medium">{list.name}</span>
                                    <span className="text-sm opacity-60">
                                        {tasks.filter(t => t.listId === list.id && !t.completed).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="p-6">
                    {selectedList ? (
                        <>
                            {/* List Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: selectedList.color }}
                                    />
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {selectedList.name}
                                    </h2>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {activeTasks.length} active
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDeleteList(selectedList.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete list"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Add Task Input */}
                            <div className="mb-6">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                        placeholder="Add a new task..."
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={handleAddTask}
                                        disabled={!newTaskTitle.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Active Tasks */}
                            {activeTasks.length > 0 && (
                                <div className="space-y-2 mb-6">
                                    {activeTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group"
                                        >
                                            <button
                                                onClick={() => handleToggleTask(task)}
                                                className="flex-shrink-0 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full border border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors"
                                            />
                                            <span className="flex-1 text-base sm:text-lg text-gray-900 dark:text-white">
                                                {task.title}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Completed Tasks */}
                            {completedTasks.length > 0 && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                        Completed ({completedTasks.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {completedTasks.map(task => (
                                            <div
                                                key={task.id}
                                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group opacity-60"
                                            >
                                                <button
                                                    onClick={() => handleToggleTask(task)}
                                                    className="flex-shrink-0 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-blue-600 flex items-center justify-center"
                                                >
                                                    <CheckIcon className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                                                </button>
                                                <span className="flex-1 text-base sm:text-lg text-gray-900 dark:text-white line-through">
                                                    {task.title}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {activeTasks.length === 0 && completedTasks.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 dark:text-gray-400">
                                        No tasks yet. Add one above to get started!
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                No lists yet. Create your first list to get started!
                            </p>
                            <button
                                onClick={() => setShowCreateListModal(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Create List
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Create List Modal */}
            {showCreateListModal && (
                <CreateListModal
                    onClose={() => setShowCreateListModal(false)}
                    onCreate={handleCreateList}
                />
            )}
        </div>
    );
}

// Create List Modal Component
interface CreateListModalProps {
    onClose: () => void;
    onCreate: (name: string, color: string) => void;
}

function CreateListModal({ onClose, onCreate }: CreateListModalProps) {
    const [name, setName] = useState('');
    const [color, setColor] = useState(TASK_LIST_COLORS[0]);

    const handleSubmit = () => {
        if (name.trim()) {
            onCreate(name.trim(), color);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-md w-full p-6 my-8"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Create New List
                </h3>

                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="List name..."
                    autoFocus
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                />

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Choose a color
                    </label>
                    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start">
                        {TASK_LIST_COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-transform ${
                                    color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-dark scale-110' : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: c }}
                                aria-label={`Color ${c}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}
