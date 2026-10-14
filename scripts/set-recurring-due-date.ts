/**
 * Audit or set the dueDate of recurring tasks.
 *
 * A recurring task's dueDate month anchors its recurrence phase, and the reports render
 * exactly those months. If the dueDate points at the wrong month the task's columns never
 * include the month being worked in, so completions saved against it are invisible.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/set-recurring-due-date.ts --audit
 *   npx tsx --env-file=.env.local scripts/set-recurring-due-date.ts --set <taskId> 2026-10-31
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing — run with --env-file=.env.local');
  initializeApp({ credential: cert(JSON.parse(raw)) });
}

const db = getFirestore();

const toDate = (value: any): Date | undefined =>
  value?.toDate ? value.toDate() : value ? new Date(value) : undefined;

async function describe(taskId: string, task: any) {
  const { getCurrentPeriod, generateFYMonths, getFinancialYear } = await import('../src/utils/report-utils');
  const dueDate = toDate(task.dueDate);
  const dueMonth = dueDate ? dueDate.getMonth() : undefined;
  const period = getCurrentPeriod(task.recurrencePattern, dueMonth);
  const columns = generateFYMonths(getFinancialYear(period.fullDate), task.recurrencePattern, dueMonth);
  const columnKeys = new Set(columns.map((m: any) => m.key));

  const completions = await db.collection('task-completions').where('recurringTaskId', '==', taskId).get();
  const done = completions.docs.filter(d => d.data().isCompleted).length;
  const visible = completions.docs.filter(d => d.data().isCompleted && columnKeys.has(d.data().monthKey)).length;
  const monthKeys = [...new Set(completions.docs.map(d => d.data().monthKey))].sort();

  return [
    `  title           ${task.title}`,
    `  recurrence      ${task.recurrencePattern}`,
    `  dueDate         ${dueDate ? dueDate.toISOString().slice(0, 10) : '(none)'}`,
    `  current period  ${period.key}`,
    `  report columns  ${columns.map((m: any) => m.key).join(', ')}`,
    `  dueDate in past ${dueDate ? dueDate < new Date() : false}`,
    `  completions     ${done} done, ${visible} visible in those columns (monthKeys: ${monthKeys.join(', ') || 'none'})`,
  ].join('\n');
}

async function audit() {
  const snap = await db.collection('recurring-tasks').get();
  console.log(`${snap.size} recurring tasks\n`);
  for (const doc of snap.docs) {
    console.log(`[${doc.id}]`);
    console.log(await describe(doc.id, doc.data()));
    console.log();
  }
}

async function set(taskId: string, isoDate: string) {
  const when = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(when.getTime())) throw new Error(`Not a date: ${isoDate}`);

  const ref = db.collection('recurring-tasks').doc(taskId);
  const before = await ref.get();
  if (!before.exists) throw new Error(`No recurring task ${taskId}`);

  console.log('BEFORE');
  console.log(await describe(taskId, before.data()));
  await ref.update({ dueDate: Timestamp.fromDate(when) });
  console.log(`\nAFTER (dueDate -> ${isoDate})`);
  console.log(await describe(taskId, (await ref.get()).data()));
}

const [flag, ...rest] = process.argv.slice(2);
const run =
  flag === '--audit' ? audit()
  : flag === '--set' && rest.length === 2 ? set(rest[0], rest[1])
  : Promise.reject(new Error('Usage: --audit | --set <taskId> <YYYY-MM-DD>'));

run.then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
