import { NextRequest } from 'next/server';
import { taskService } from '@/services/task.service';
import { Comment } from '@/types/task.types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const comments = taskService.getCommentsByTaskId(id);
    
    return new Response(JSON.stringify(comments), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch comments' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const commentData = await request.json();
    
    // Validate required fields
    if (!commentData.author || !commentData.content) {
      return new Response(JSON.stringify({ error: 'Author and content are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    const newComment = taskService.addComment(id, {
      author: commentData.author,
      content: commentData.content,
    });
    
    if (!newComment) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    return new Response(JSON.stringify(newComment), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to add comment' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}