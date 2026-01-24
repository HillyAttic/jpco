import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * GET /api/debug/user-profile?email=xxx
 * Debug endpoint to check user profile in Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }
    
    // Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return NextResponse.json({
        found: false,
        message: 'No user document found with this email',
        email,
        suggestion: 'The user account may not have been created in the users collection'
      });
    }
    
    const userDocs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({
      found: true,
      count: userDocs.length,
      users: userDocs,
      message: userDocs.length > 1 ? 'Warning: Multiple users found with same email!' : 'User found'
    });
  } catch (error) {
    console.error('Error checking user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to check user profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
