/**
 * dsh-restart-button restart helper (spawned detached by the host service).
 *
 * Steps:
 *  1. Wait for the parent dsh process (argv[2]) to exit — poll with
 *     process.kill(pid, 0) up to 60s.
 *  2. Short grace period so the old process releases port 3080.
 *  3. Relaunch the server with the exact same node entry + arguments carried
 *     in DSH_RESTART_ARGS (JSON: { execPath, args }), attached to the same
 *     console the user started dsh from.
 */
import { spawn } from 'node:child_process';

const parentPid = Number(process.argv[2]);
let payload = null;
try {
  payload = JSON.parse(process.env.DSH_RESTART_ARGS ?? 'null');
} catch { /* fall through */ }
if (!payload || typeof payload.execPath !== 'string' || !Array.isArray(payload.args)) {
  console.error('[dsh-restart-button] invalid restart payload');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const deadline = Date.now() + 60_000;
for (;;) {
  try {
    process.kill(parentPid, 0); // throws ESRCH when the parent is gone
  } catch {
    break; // parent exited
  }
  if (Date.now() >= deadline) {
    console.error('[dsh-restart-button] parent did not exit in time; aborting relaunch');
    process.exit(1);
  }
  await sleep(300);
}
await sleep(800); // port-release grace

const child = spawn(payload.execPath, payload.args, { stdio: 'inherit', windowsHide: false });
child.on('error', (error) => {
  console.error('[dsh-restart-button] relaunch failed:', error.message);
  process.exit(1);
});
// Stay alive as the server's parent: exiting here could let an environment's
// kill-on-close job (or console teardown) take the fresh server down with us.
// We exit only when the server itself exits.
child.on('close', () => process.exit(0));
