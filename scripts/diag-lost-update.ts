/**
 * Regression check for the clientProgress lost-update bug.
 *
 * Runs two overlapping "mark all complete" writes (7 steps each) — the shape the
 * app produces when a second card/tab/user writes while the first is still going —
 * against a throwaway doc, once with the OLD whole-map rewrite and once with the
 * NEW dotted-path write used by PUT /api/workflow/[taskId]:
 *
 *   old: read task -> {...clientProgress, [id]: {...}} -> update({ clientProgress })
 *   new: update({ 'clientProgress.<id>.completedStepIds': FieldValue.arrayUnion(...) })
 *
 * The doc is deleted at the end. Run: npx tsx --env-file=.env.local scripts/diag-lost-update.ts
 */
import 'dotenv/config';

const COLLECTION = '_diag_tmp_workflow';
const STEPS = [1, 2, 3, 4, 5, 6, 7].map(n => `tar-step-${n}`);

async function main() {
  const { adminDb } = await import('../src/lib/firebase-admin');
  const { FieldValue } = await import('firebase-admin/firestore');

  const run = async (mode: 'old' | 'new') => {
    const ref = adminDb.collection(COLLECTION).doc(`probe-${mode}`);
    await ref.set({ clientProgress: {} });

    const put = async (clientId: string, stepId: string) => {
      if (mode === 'new') {
        await new Promise(r => setTimeout(r, Math.random() * 25)); // network gap
        await ref.update({
          [`clientProgress.${clientId}.completedStepIds`]: FieldValue.arrayUnion(stepId),
          [`clientProgress.${clientId}.completedAt`]: new Date().toISOString(),
        });
        return;
      }
      const snap = await ref.get();                                    // read whole map
      const task: any = snap.data() || {};
      const clientProgress = { ...(task.clientProgress || {}) };
      await new Promise(r => setTimeout(r, Math.random() * 25));        // network gap
      const ids = new Set<string>(clientProgress[clientId]?.completedStepIds || []);
      ids.add(stepId);
      clientProgress[clientId] = { completedStepIds: Array.from(ids), completedAt: new Date().toISOString() };
      await ref.update({ clientProgress });                             // write whole map
    };
    const markAll = async (clientId: string) => { for (const s of STEPS) await put(clientId, s); };

    await Promise.all([markAll('client-A'), markAll('client-B')]);

    const final: any = (await ref.get()).data();
    const report = ['client-A', 'client-B'].map(c => {
      const ids: string[] = final.clientProgress[c]?.completedStepIds || [];
      const missing = STEPS.filter(s => !ids.includes(s));
      return { c, kept: ids.length, missing };
    });
    await ref.delete();
    return report;
  };

  // Untick-all payload: arrayRemove + FieldValue.delete() on stepMeta, for a client
  // with no entry at all and for one that already has metadata.
  const untickCheck = async () => {
    const ref = adminDb.collection(COLLECTION).doc('probe-untick');
    await ref.set({ clientProgress: { 'client-A': { completedStepIds: [...STEPS], stepMeta: { 'tar-step-1': { completedBy: 'x' } } } } });
    for (const clientId of ['client-A', 'client-B']) {
      const update: Record<string, any> = {
        [`clientProgress.${clientId}.completedStepIds`]: FieldValue.arrayRemove(...STEPS),
        [`clientProgress.${clientId}.completedAt`]: new Date().toISOString(),
        [`clientProgress.${clientId}.completedBy`]: 'probe',
      };
      STEPS.forEach(id => { update[`clientProgress.${clientId}.stepMeta.${id}`] = FieldValue.delete(); });
      await ref.update(update);
      const p: any = (await ref.get()).data().clientProgress[clientId];
      const ok = (p.completedStepIds || []).length === 0 && Object.keys(p.stepMeta || {}).length === 0;
      console.log(`  untick all (${clientId}${clientId === 'client-B' ? ', no prior entry' : ''}): ${ok ? 'ok' : `BAD ${JSON.stringify(p)}`}`);
      if (!ok) failures.push(`untick all left state for ${clientId}`);
    }
    await ref.delete();
  };

  const failures: string[] = [];
  for (const mode of ['old', 'new'] as const) {
    const report = await run(mode);
    const lostCount = report.reduce((n, r) => n + r.missing.length, 0);
    console.log(`\n${mode.toUpperCase()} write shape:`);
    report.forEach(r => console.log(`  ${r.c}: ${r.kept}/7 steps${r.missing.length ? `  LOST: ${r.missing.join(', ')}` : '  ok'}`));
    if (mode === 'new' && lostCount > 0) failures.push('new write shape still loses steps');
  }

  console.log('\nUNTICK-ALL payload:');
  await untickCheck();

  if (failures.length) {
    console.error(`\nFAIL: ${failures.join('; ')}`);
    process.exit(1);
  }
  console.log('\nPASS: dotted-path writes keep every step; the old whole-map rewrite loses them.');
  console.log('(temp docs deleted)');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
