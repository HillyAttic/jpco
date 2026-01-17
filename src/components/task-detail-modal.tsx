'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Select from '@/components/ui/select';
import { 
  XMarkIcon,
  PaperClipIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';

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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setEditingTask({ ...task });
      loadComments(task.id);
    }
  }, [task]);

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
        assignedUsers: editingTask.assignedUsers
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
          <DialogTitle className="flex items-center justify-between">
            <span>Task Details</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Task Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <Input
                value={editingTask.title}
                onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                rows={3}
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <Select
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})}
                  className="w-full"
                >
                  <option value={TaskPriority.LOW}>Low</option>
                  <option value={TaskPriority.MEDIUM}>Medium</option>
                  <option value={TaskPriority.HIGH}>High</option>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <Input
                type="date"
                value={editingTask.dueDate ? (editingTask.dueDate instanceof Date ? editingTask.dueDate.toISOString().split('T')[0] : new Date(editingTask.dueDate).toISOString().split('T')[0]) : ''}
                onChange={(e) => setEditingTask({
                  ...editingTask, 
                  dueDate: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Users
              </label>
              <Input
                value={editingTask.assignedUsers.join(', ')}
                onChange={(e) => setEditingTask({
                  ...editingTask, 
                  assignedUsers: e.target.value.split(',').map(u => u.trim()).filter(u => u)
                })}
                placeholder="Enter usernames separated by commas"
                className="w-full"
              />
            </div>
          </div>
          
          {/* Comments Section */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-gray-500" />
              <h3 className="text-lg font-medium">Comments ({comments.length})</h3>
            </div>
            
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <UserCircleIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{comment.author}</span>
                          <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-gray-700">{comment.content}</p>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}