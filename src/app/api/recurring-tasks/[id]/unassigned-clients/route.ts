import { NextRequest, NextResponse } from 'next/server';
import { recurringTaskAdminService } from '@/services/recurring-task-admin.service';
import { clientAdminService } from '@/services/client-admin.service';
import { Client } from '@/services/client.service';

/**
 * Filter clients by compliance flag — mirrors the switch logic in RecurringTaskModal
 */
function filterClientsByCompliance(
  clients: Client[],
  filter: string
): Client[] {
  if (filter === 'all') return clients;

  return clients.filter(client => {
    if (!client.compliance) return false;

    switch (filter) {
      case 'roc': return !!client.compliance.roc;
      case 'gstr1': return !!client.compliance.gstr1;
      case 'gst3b': return !!client.compliance.gst3b;
      case 'iff': return !!client.compliance.iff;
      case 'itr': return !!client.compliance.itr;
      case 'itrAudit': return !!client.compliance.itrAudit;
      case 'taxAudit': return !!client.compliance.taxAudit;
      case 'accounting': return !!client.compliance.accounting;
      case 'clientVisit': return !!client.compliance.clientVisit;
      case 'bank': return !!client.compliance.bank;
      case 'tcs': return !!client.compliance.tcs;
      case 'tds': return !!client.compliance.tds;
      case 'statutoryAudit': return !!client.compliance.statutoryAudit;
      default: return true;
    }
  });
}

/**
 * GET /api/recurring-tasks/[id]/unassigned-clients
 * Calculate unassigned clients dynamically based on the task's clientFilter.
 * Accepts optional `clientFilter` query param to override the stored value
 * (useful when editing a task and the filter hasn't been saved yet).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const task = await recurringTaskAdminService.getById(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Allow query param to override the stored clientFilter (for unsaved edits)
    const searchParams = request.nextUrl.searchParams;
    const clientFilterOverride = searchParams.get('clientFilter');
    const effectiveFilter = (clientFilterOverride || task.clientFilter) && (clientFilterOverride || task.clientFilter) !== 'all'
      ? (clientFilterOverride || task.clientFilter)
      : null;

    // If no specific clientFilter set, fall back to static calculation
    if (!effectiveFilter) {
      const mappedClientIds = new Set<string>();
      if (task.teamMemberMappings) {
        task.teamMemberMappings.forEach(mapping => {
          mapping.clientIds.forEach(clientId => mappedClientIds.add(clientId));
        });
      }

      const totalClientIds = new Set<string>([
        ...mappedClientIds,
        ...(task.contactIds || [])
      ]);

      return NextResponse.json({
        totalCount: totalClientIds.size,
        mappedCount: mappedClientIds.size,
        unassignedCount: totalClientIds.size - mappedClientIds.size,
        unassignedClientIds: Array.from(totalClientIds).filter(id => !mappedClientIds.has(id)),
        lastCalculated: new Date().toISOString(),
      });
    }

    // Dynamic calculation: fetch all active clients and filter by compliance
    const allClients = await clientAdminService.getAll({ status: 'active', limit: 10000 });
    const filteredClients = filterClientsByCompliance(allClients, effectiveFilter);
    const totalCount = filteredClients.length;

    // Collect mapped client IDs ONLY from teamMemberMappings (not contactIds)
    const mappedClientIds = new Set<string>();
    if (task.teamMemberMappings) {
      task.teamMemberMappings.forEach(mapping => {
        mapping.clientIds.forEach(clientId => mappedClientIds.add(clientId));
      });
    }

    const mappedCount = mappedClientIds.size;

    // Calculate unassigned: filtered clients NOT in any team member mapping
    const unassignedClientIds = filteredClients
      .map(c => c.id!)
      .filter(clientId => !mappedClientIds.has(clientId));

    return NextResponse.json({
      totalCount,
      mappedCount,
      unassignedCount: unassignedClientIds.length,
      unassignedClientIds,
      lastCalculated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating unassigned clients:', error);
    return NextResponse.json(
      { error: 'Failed to calculate unassigned clients' },
      { status: 500 }
    );
  }
}
