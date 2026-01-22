import { NextRequest, NextResponse } from 'next/server';
import { clientService, Client } from '@/services/client.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for client creation
const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  businessName: z.string().optional(),
  pan: z.string().optional(),
  tan: z.string().optional(),
  gstin: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

/**
 * GET /api/clients
 * List all clients with optional pagination and filters
 * Validates Requirements: 1.3
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000'); // Increased to 1000 to show all clients

    const clients = await clientService.getAll({
      status,
      search,
      limit,
    });

    return NextResponse.json({
      data: clients,
      page,
      limit,
      total: clients.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/clients
 * Create a new client
 * Validates Requirements: 1.3
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const body = await request.json();

    // Validate request body
    const validationResult = createClientSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const clientData = validationResult.data;

    // Create client
    const newClient = await clientService.create(clientData);

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
