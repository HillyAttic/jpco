/**
 * Read-only diagnostic: compare the step IDs stored in clientProgress against
 * the step IDs each task actually renders (reportTypes / tarSteps / statSteps).
 * Run: npx tsx --env-file=.env.local scripts/diag-workflow-progress.ts
 */
import 'dotenv/config';

async function main() {
  const { adminDb } = await import('../src/lib/firebase-admin');

  const [tasksSnap, clientsSnap] = await Promise.all([
    adminDb.collection('recurring-tasks').get(),
    adminDb.collection('clients').get(),
  ]);

  const clientName = new Map<string, string>();
  clientsSnap.forEach(d => {
    const c: any = d.data();
    clientName.set(d.id, c.clientName || c.businessName || c.name || d.id);
  });

  console.log(`tasks=${tasksSnap.size} clients=${clientsSnap.size}\n`);

  tasksSnap.forEach(doc => {
    const t: any = doc.data();
    const reportTypes: any[] = t.reportTypes || [];
    const hasProgress = t.clientProgress && Object.keys(t.clientProgress).length > 0;
    if (reportTypes.length === 0 && !t.tarEnabled && !t.statEnabled) return;

    console.log('='.repeat(90));
    console.log(`TASK "${t.title}"  id=${doc.id}`);
    console.log(`  tarEnabled=${t.tarEnabled} statEnabled=${t.statEnabled} clientFilter=${t.clientFilter}`);
    console.log(`  reportTypes: ${reportTypes.length === 0 ? '(none)' : ''}`);
    reportTypes.forEach(rt => {
      console.log(`    - id="${rt.id}" name="${rt.name}" enabled=${rt.enabled} steps=${(rt.steps || []).length}`);
      console.log(`      stepIds: ${(rt.steps || []).map((s: any) => s.id).join(', ')}`);
    });
    console.log(`  tarSteps ids: ${(t.tarSteps || []).map((s: any) => s.id).join(', ') || '(none)'}`);
    console.log(`  statSteps ids: ${(t.statSteps || []).map((s: any) => s.id).join(', ') || '(none)'}`);

    if (!hasProgress) {
      console.log('  clientProgress: EMPTY  <-- legacy/task-level mode');
      return;
    }

    console.log(`  clientProgress keys: ${Object.keys(t.clientProgress).length}`);
    Object.entries(t.clientProgress).forEach(([cid, p]: [string, any]) => {
      const ids: string[] = p?.completedStepIds || [];
      const label = cid === '' ? '<EMPTY-STRING-KEY>' : (clientName.get(cid) || cid);
      console.log(`    ${label.padEnd(34)} ids=${ids.length} completedAt=${p?.completedAt} [${ids.join(', ')}]`);
    });
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
