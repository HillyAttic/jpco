'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Select from '@/components/ui/select';
import { 
  PaperClipIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdate?: (updatedTask: Task) => void;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

export function TaskDetailModal({ open, onClose, task, onUpdate }: TaskDetailModalProps) {
  const { user } = useEnhancedAuth();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [displayValue, setDisplayValue] = useState('');
  
  // Check if current user is the task creator
  const isTaskCreator = task?.createdBy === user?.uid;

  // Fetch user names
  useEffect(() => {
    const fetchUserNames = async () => {
      try {
        setLoadingUsers(true);
        
        const { auth } = await import('@/lib/firebase');
        const user = auth.currentUser;
        
        if (!user) {
          console.error('User not authenticated');
          setUserNames({});
          setLoadingUsers(false);
          return;
        }

        const token = await user.getIdToken();
        
        const response = await fetch('/api/users/names', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user names');
        }

        const nameMap = await response.json();
        setUserNames(nameMap);
      } catch (error) {
        console.error('Error fetching user names:', error);
        setUserNames({});
      } finally {
        setLoadingUsers(false);
      }
    };

    if (open) {
      fetchUserNames();
    }
  }, [open]);

  useEffect(() => {
    if (task) {
      setEditingTask({ ...task });
      loadComments(task.id);
      
      // Set display value with user names
      if (!loadingUsers && task.assignedTo) {
        const names = task.assignedTo.map(id => userNames[id] || id).join(', ');
        setDisplayValue(names);
      }
    }
  }, [task, userNames, loadingUsers]);

  const loadComments = async (taskId: string) => {
    try {
      const commentsData = await taskApi.getComments(taskId);
      setComments(commentsData.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt)
      })));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleSave = async () => {
    if (!editingTask) return;
    
    setLoading(true);
    try {
      const updatedTask = await taskApi.updateTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        status: editingTask.status,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate,
        assignedTo: editingTask.assignedTo
      });
      
      onUpdate?.(updatedTask);
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!editingTask || !newComment.trim()) return;
    
    try {
      const comment = await taskApi.addComment(editingTask.id, {
        author: 'Current User', // This should come from auth context
        content: newComment.trim()
      });
      
      setComments(prev => [...prev, {
        ...comment,
        createdAt: new Date(comment.createdAt)
      }]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!editingTask) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            View and edit task information, status, and comments
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Task Info */}
          <div className="space-y-4">
            {/* Title - Read-only for non-creators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              {isTaskCreator ? (
                <Input
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full"
                />
              ) : (
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                  {editingTask.title}
                </div>
              )}
            </div>
            
            {/* Description - Read-only for non-creators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              {isTaskCreator ? (
                <Textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                  rows={3}
                  className="w-full"
                />
              ) : (
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white min-h-[80px]">
                  {editingTask.description || 'No description'}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Status - Editable for everyone */}
              <div className={!isTaskCreator ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg p-2 -m-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status {!isTaskCreator && <span className="text-blue-600 text-xs">(You can edit this)</span>}
                </label>
                <Select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({...editingTask, status: e.target.value as TaskStatus})}
                  className="w-full"
                >
                  <option value={TaskStatus.TODO}>To Do</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                </Select>
              </div>
              
              {/* Priority - Read-only for non-creators */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                {isTaskCreator ? (
                  <Select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})}
                    className="w-full"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                  </Select>
                ) : (
                  <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white h-10 flex items-center">
                    {editingTask.priority === TaskPriority.LOW && 'Low'}
                    {editingTask.priority === TaskPriority.MEDIUM && 'Medium'}
                    {editingTask.priority === TaskPriority.HIGH && 'High'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Due Date - Read-only for non-creators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              {isTaskCreator ? (
                <Input
                  type="date"
                  value={editingTask.dueDate ? (editingTask.dueDate instanceof Date ? editingTask.dueDate.toISOString().split('T')[0] : new Date(editingTask.dueDate).toISOString().split('T')[0]) : ''}
                  onChange={(e) => setEditingTask({
                    ...editingTask, 
                    dueDate: e.target.value ? new Date(e.target.value) : new Date()
                  })}
                  className="w-full"
                />
              ) : (
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                  {editingTask.dueDate 
                    ? new Date(editingTask.dueDate).toLocaleDateString()
                    : 'No due date'}
                </div>
              )}
            </div>
            
            {/* Assigned Users - Read-only for non-creators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assigned Users
              </label>
              {isTaskCreator ? (
                <>
                  <Input
                    value={displayValue}
                    onChange={(e) => {
                      setDisplayValue(e.target.value);
                      // Keep the original IDs in editingTask
                      const inputNames = e.target.value.split(',').map(n => n.trim()).filter(n => n);
                      // Try to map names back to IDs, or keep as is if not found
                      const userIdMap = Object.entries(userNames).reduce((acc, [id, name]) => {
                        acc[name.toLowerCase()] = id;
                        return acc;
                      }, {} as Record<string, string>);
                      
                      const ids = inputNames.map(name => {
                        const lowerName = name.toLowerCase();
                        return userIdMap[lowerName] || name;
                      });
                      
                      setEditingTask({
                        ...editingTask, 
                        assignedTo: ids
                      });
                    }}
                    placeholder={loadingUsers ? "Loading users..." : "Enter usernames separated by commas"}
                    className="w-full"
                    disabled={loadingUsers}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {loadingUsers ? 'Loading user names...' : 'Separate multiple users with commas'}
                  </p>
                </>
              ) : (
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                  {displayValue || 'No users assigned'}
                </div>
              )}
            </div>
          </div>
          
          {/* Comments Section */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-medium">Comments ({comments.length})</h3>
            </div>
            
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <UserCircleIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{comment.author}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-gray-700 dark:text-gray-300">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex space-x-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAddComment();
                  }
                }}
              />
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim() || loading}
              >
                Post
              </Button>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : (isTaskCreator ? 'Save Changes' : 'Update Status')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}