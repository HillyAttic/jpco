import { NextRequest } from 'next/server';
import { taskService } from '@/services/task.service';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') as TaskStatus | undefined,
      priority: searchParams.get('priority') as TaskPriority | undefined,
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
    };

    const tasks = taskService.getAll(filters);
    
    return new Response(JSON.stringify(tasks), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json();
    
    // Validate required fields
    if (!taskData.title) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    const newTask = taskService.create({
      ...taskData,
      status: taskData.status || TaskStatus.TODO,
      priority: taskData.priority || TaskPriority.MEDIUM,
      assignedUsers: taskData.assignedUsers || [],
    });
    
    return new Response(JSON.stringify(newTask), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return new Response(JSON.stringify({ error: 'Failed to create task' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}