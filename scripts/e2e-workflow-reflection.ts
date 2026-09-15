/**
 * END-TO-END: does marking progress actually show up in reports?
 *
 * Runs the real data path against the real Firestore, with two throwaway tasks
 * (one dynamic-reportTypes shape, one legacy tarSteps shape) that are deleted in
 * the finally block:
 *
 *   write   recurring page / calendar page  → PUT /api/workflow/[taskId] payload
 *   read    reports page + recurring page   → recurringTaskAdminService.getAll()
 *           (exactly what GET /api/recurring-tasks returns)
 *   render  WorkflowTaskDetailModal logic   → getReportTypes → getStepsForReportType
 *                                             → getClientCompletedStepIds → columns
 *
 * The PUT payload shape written here is locked by
 * src/__tests__/workflow-api-route.test.ts ("writes one client through dotted
 * paths and never rewrites the map") — keep the two in sync.
 *
 * Run: npx tsx --env-file=.env.local scripts/e2e-workflow-reflection.ts
 */
import 'dotenv/config';

const CLIENT_A = 'e2e-client-alpha';
const CLIENT_B = 'e2e-client-beta';
const TITLE_PREFIX = '__E2E__ workflow reflection (auto-deleted)';

type Ctx = Awaited<ReturnType<typeof loadCtx>>;

async function loadCtx() {
  const { recurringTaskAdminService } = await import('../src/services/recurring-task-admin.service');
  const { FieldValue } = await import('firebase-admin/firestore');
  const { adminDb } = await import('../src/lib/firebase-admin');
  const templates = await import('../src/lib/workflow-templates');
  const svc = await import('../src/services/recurring-task.service');
  return { recurringTaskAdminService, FieldValue, adminDb, templates, svc };
}

/** One PUT /api/workflow/[taskId]: dotted sub-paths, merged by Firestore. */
async function putSteps(
  ctx: Ctx,
  taskId: string,
  clientId: string,
  stepIds: string[],
  completed: boolean
) {
  const { adminDb, FieldValue } = ctx;
  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = {
    [`clientProgress.${clientId}.completedStepIds`]: completed
      ? FieldValue.arrayUnion(...stepIds)
      : FieldValue.arrayRemove(...stepIds),
    [`clientProgress.${clientId}.completedAt`]: nowIso,
    [`clientProgress.${clientId}.completedBy`]: 'e2e-probe',
  };
  stepIds.forEach((id) => {
    update[`clientProgress.${clientId}.stepMeta.${id}`] = completed
      ? { completedAt: nowIso, completedBy: 'e2e-probe' }
      : FieldValue.delete();
  });
  await adminDb.collection('recurring-tasks').doc(taskId).update(update);
}

/** Exactly what the reports modal renders for one client row. */
function reportsRow(ctx: Ctx, task: any, clientId: string) {
  const enabled = ctx.templates.getReportTypes(task).find((rt: any) => rt.enabled);
  if (!enabled) return { columns: [] as { shortName: string; done: boolean }[], percent: 0 };
  const steps = ctx.templates.getStepsForReportType(task, enabled.id);
  const completed: string[] = ctx.svc.getClientCompletedStepIds(task, clientId, enabled.id);
  const done = steps.filter((s: any) => completed.includes(s.id));
  return {
    columns: steps.map((s: any) => ({ shortName: s.shortName, done: completed.includes(s.id) })),
    percent: steps.length ? Math.round((done.length / steps.length) * 100) : 0,
  };
}

/** What /api/recurring-tasks hands the reports page (JSON round-trip included). */
async function fetchAsReportsDoes(ctx: Ctx, taskId: string) {
  const all = await ctx.recurringTaskAdminService.getAll();
  const task = all.find((t: any) => t.id === taskId);
  if (!task) throw new Error(`task ${taskId} not returned by getAll()`);
  const viaJson = JSON.parse(JSON.stringify(task)); // route serializes before sending
  if (task.clientProgress && !viaJson.clientProgress) {
    throw new Error('clientProgress did not survive JSON serialization');
  }
  return viaJson;
}

// ── assertions ───────────────────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function scenario(ctx: Ctx, label: string, taskData: Record<string, unknown>, created: string[]) {
  console.log(`\n── ${label} ───────────────────────────────────────────────`);
  const task = await ctx.recurringTaskAdminService.create({
    title: `${TITLE_PREFIX} · ${label}`,
    description: 'temporary end-to-end probe',
    recurrencePattern: 'monthly',
    startDate: new Date(),
    dueDate: new Date(),
    priority: 'low',
    status: 'pending',
    contactIds: [],
    completionHistory: [],
    isPaused: false,
    ...taskData,
  } as any);

  const taskId = task.id!;
  created.push(taskId); // register for cleanup before any assertion can throw
  const fresh = await fetchAsReportsDoes(ctx, taskId);
  const stepIds = ctx.templates
    .getStepsForReportType(fresh, ctx.templates.getReportTypes(fresh).find((rt: any) => rt.enabled)!.id)
    .map((s: any) => s.id);

  check('reports starts at 0% with no progress', reportsRow(ctx, fresh, CLIENT_A).percent === 0);

  // 1. recurring page → "Mark all complete"
  await putSteps(ctx, taskId, CLIENT_A, stepIds, true);
  let view = reportsRow(ctx, await fetchAsReportsDoes(ctx, taskId), CLIENT_A);
  check(
    'mark all complete reflects as 7/7 Done in reports',
    view.percent === 100 && view.columns.every((c) => c.done),
    JSON.stringify(view.columns)
  );

  // 2. calendar page → same write for another client, overlapping the first
  await Promise.all([
    putSteps(ctx, taskId, CLIENT_A, stepIds, true),
    putSteps(ctx, taskId, CLIENT_B, stepIds, true),
  ]);
  const both = await fetchAsReportsDoes(ctx, taskId);
  check(
    'overlapping mark-alls keep both clients at 100%',
    reportsRow(ctx, both, CLIENT_A).percent === 100 && reportsRow(ctx, both, CLIENT_B).percent === 100,
    `A=${reportsRow(ctx, both, CLIENT_A).percent}% B=${reportsRow(ctx, both, CLIENT_B).percent}%`
  );

  // 3. single step toggle
  await putSteps(ctx, taskId, CLIENT_B, [stepIds[3]], false);
  const toggled = reportsRow(ctx, await fetchAsReportsDoes(ctx, taskId), CLIENT_B);
  check(
    'single untick flips exactly one column back to Incomplete',
    toggled.percent === 86 && toggled.columns[3].done === false && toggled.columns.filter((c) => c.done).length === 6,
    JSON.stringify(toggled.columns)
  );

  // 4. isolation
  check('the other client is untouched by that toggle', reportsRow(ctx, await fetchAsReportsDoes(ctx, taskId), CLIENT_A).percent === 100);

  // 5. untick all
  await putSteps(ctx, taskId, CLIENT_A, stepIds, false);
  const cleared = reportsRow(ctx, await fetchAsReportsDoes(ctx, taskId), CLIENT_A);
  check('untick all clears every column', cleared.percent === 0 && cleared.columns.every((c) => !c.done));

  // 6. re-mark must be idempotent (users will click it again after a backfill)
  await putSteps(ctx, taskId, CLIENT_A, stepIds, true);
  await putSteps(ctx, taskId, CLIENT_A, stepIds, true);
  const reMarked = await fetchAsReportsDoes(ctx, taskId);
  const stored = reMarked.clientProgress[CLIENT_A].completedStepIds;
  check(
    're-marking twice does not duplicate step ids',
    stored.length === stepIds.length && new Set(stored).size === stepIds.length,
    `stored=${stored.length}`
  );
  check('re-marked client is back to 100%', reportsRow(ctx, reMarked, CLIENT_A).percent === 100);

  return taskId;
}

/**
 * The init path: a task with no steps yet is initialized by POST
 * /api/workflow/[taskId] (which writes the template steps). Until it works, the
 * workflow can never be marked at all. It used to write `completedAt: undefined`
 * and Firestore rejected the whole document.
 */
async function initScenario(ctx: Ctx, created: string[]) {
  console.log(`\n── uninitialized task → init → mark ───────────────────────`);
  const task = await ctx.recurringTaskAdminService.create({
    title: `${TITLE_PREFIX} · init`,
    description: 'temporary end-to-end probe',
    recurrencePattern: 'monthly',
    startDate: new Date(),
    dueDate: new Date(),
    priority: 'low',
    status: 'pending',
    contactIds: [],
    completionHistory: [],
    isPaused: false,
    tarEnabled: true, // enabled but no steps stored yet
  } as any);
  const taskId = task.id!;
  created.push(taskId);

  let initError: unknown = null;
  try {
    // exactly what POST /api/workflow/[taskId] performs
    await ctx.adminDb.collection('recurring-tasks').doc(taskId).update({
      tarSteps: ctx.templates.initializeWorkflowSteps('TAR'),
      tarEnabled: true,
    });
  } catch (e) {
    initError = e;
  }
  check('init write to Firestore succeeds (no undefined values)', initError === null, String(initError));

  const fresh = await fetchAsReportsDoes(ctx, taskId);
  const steps = ctx.templates.getStepsForReportType(fresh, 'tar');
  check('task now has the 7 TAR steps', steps.length === 7, `got ${steps.length}`);
  check('stored steps carry no undefined fields', steps.every((s: any) => !Object.values(s).includes(undefined)));

  const stepIds = steps.map((s: any) => s.id);
  await putSteps(ctx, taskId, CLIENT_A, stepIds, true);
  const marked = await fetchAsReportsDoes(ctx, taskId);
  check('a freshly initialized task can be marked and reads 100% in reports', reportsRow(ctx, marked, CLIENT_A).percent === 100);
}

async function main() {
  const ctx = await loadCtx();
  const { initializeWorkflowSteps } = ctx.templates;
  const created: string[] = [];

  try {
    await scenario(ctx, 'dynamic reportTypes', {
      reportTypes: [
        {
          id: 'tar',
          name: 'TAR Reports',
          badgeLabel: 'TAX AUDIT',
          badgeClass: 'bg-purple-100',
          description: 'Tax Audit Report',
          enabled: true,
          steps: initializeWorkflowSteps('TAR'),
        },
      ],
    }, created);

    await scenario(ctx, 'legacy tarSteps', {
      tarEnabled: true,
      tarSteps: initializeWorkflowSteps('TAR'),
    }, created);

    await initScenario(ctx, created);
  } finally {
    // Delete by title scan too, so a crashed earlier run cannot leave probes behind.
    const probes = (await ctx.recurringTaskAdminService.getAll()).filter((t: any) =>
      String(t.title).startsWith(TITLE_PREFIX)
    );
    for (const p of probes) {
      await ctx.adminDb.collection('recurring-tasks').doc(p.id!).delete();
    }
    const leftovers = (await ctx.recurringTaskAdminService.getAll()).filter((t: any) =>
      String(t.title).startsWith(TITLE_PREFIX)
    );
    console.log(
      `\ncleanup: ${created.length} probe task(s) this run, ${probes.length} deleted, leftovers=${leftovers.length}`
    );
    if (leftovers.length > 0) failures.push('probe tasks left behind in Firestore');
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.error(`FAILED: ${failures.join(' | ')}`);
    process.exit(1);
  }
  console.log('E2E PASS — a mark made from the tasks/calendar pages reads back as Complete in reports.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
