/**
 * Kills the process listening on PORT (default 4000) so `npm run dev` always loads fresh code.
 * Windows + Unix. Ignores errors if nothing is listening.
 */
import { execSync } from 'child_process';
import process from 'process';

const port = process.argv[2] || process.env.PORT || '4000';

function freeWindows() {
  try {
    const out = execSync(`netstat -ano`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      if (!line.includes(`:${port}`) || !line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[free-port] Stopped PID ${pid} on port ${port}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* no netstat output */
  }
}

function freeUnix() {
  try {
    const out = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
    if (!out) return;
    for (const pid of out.split(/\n/).map((s) => s.trim()).filter(Boolean)) {
      if (!/^\d+$/.test(pid)) continue;
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        console.log(`[free-port] Stopped PID ${pid} on port ${port}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* nothing listening */
  }
}

if (process.platform === 'win32') freeWindows();
else freeUnix();
