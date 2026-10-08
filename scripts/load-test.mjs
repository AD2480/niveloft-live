#!/usr/bin/env node
// Simultaneous users against a running ProjectFlow backend. Node 18+, nothing to install.
//
//   node scripts/load-test.mjs                          # 25 users for 30 s against http://localhost:8080/api
//   node scripts/load-test.mjs --users 50 --seconds 60 --writes --race
//
// Options:
//   --api <url>        the API address (default http://localhost:8080/api)
//   --users <n>        simultaneous users (default 25)
//   --seconds <n>      how long to run (default 30)
//   --ramp <n>         seconds to start all users (default 5)
//   --writes           also post comments (about 1 in 5 rounds); leaves comments in the database
//   --race             check that 20 identical requests sent at the same moment create one comment
//   --p95 <ms>         fail if the 95th-percentile response time is slower (default 1500)
//   --email/--password sign in as this account instead of the demo accounts
//
// The demo accounts (DEMO_DATA=true) are used by default. The per-person rate limit (300 a minute)
// will answer some requests with 429: that's the limit working. To measure raw capacity, start the
// backend with API_REQUESTS_PER_MINUTE=0 API_WRITES_PER_MINUTE=0.

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);
const API = opt('api', 'http://localhost:8080/api').replace(/\/$/, '');
const USERS = Number(opt('users', 25));
const SECONDS = Number(opt('seconds', 30));
const RAMP = Number(opt('ramp', 5));
const P95_LIMIT = Number(opt('p95', 1500));
const WRITES = flag('writes');
const RACE = flag('race');
const ACCOUNTS = opt('email')
  ? [{ email: opt('email'), password: opt('password', '') }]
  : ['aarav', 'priya', 'rohan', 'vikram'].map((n) => ({ email: `${n}@projectflow.dev`, password: 'Password@123' }));

const stats = new Map(); // name -> { times: [], statuses: Map }
const record = (name, ms, status) => {
  if (!stats.has(name)) stats.set(name, { times: [], statuses: new Map() });
  const s = stats.get(name);
  s.times.push(ms);
  s.statuses.set(status, (s.statuses.get(status) ?? 0) + 1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
const key = () => globalThis.crypto.randomUUID();

async function call(name, token, path, { method = 'GET', body, headers = {} } = {}) {
  const t0 = performance.now();
  let status = 'NETWORK';
  let json = null;
  let res = null;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    status = res.status;
    json = await res.json().catch(() => null);
  } catch (e) {
    status = e.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK';
  }
  record(name, performance.now() - t0, status);
  return { status, json, res };
}

async function signIn() {
  const tokens = [];
  for (const a of ACCOUNTS) {
    const r = await call('sign in', null, '/auth/login', { method: 'POST', body: a });
    if (r.status === 200) tokens.push(r.json.data.token);
    else console.warn(`Couldn't sign in as ${a.email} (${r.status}${r.json?.message ? `: ${r.json.message}` : ''})`);
  }
  if (!tokens.length) {
    console.error(`No account could sign in at ${API}. Is the backend running with DEMO_DATA=true (or pass --email/--password)?`);
    process.exit(2);
  }
  return tokens;
}

async function user(token, until) {
  while (Date.now() < until) {
    const projects = await call('list projects', token, '/projects?status=ACTIVE&size=50');
    const list = projects.json?.data?.content ?? [];
    if (!list.length) {
      await sleep(500);
      continue;
    }
    const p = pick(list);
    await call('project', token, `/projects/${p.id}`);
    const tasks = await call('board tasks', token, `/projects/${p.id}/tasks?size=500&sort=position`);
    await call('analytics', token, `/projects/${p.id}/analytics`);
    await call('dashboard', token, '/dashboard');
    const t = pick(tasks.json?.data?.content ?? []);
    if (t) {
      await call('task', token, `/tasks/${t.id}`);
      if (WRITES && Math.random() < 0.2) {
        await call('post comment', token, `/tasks/${t.id}/comments`, { method: 'POST', body: { body: `Load test ${new Date().toISOString()}` }, headers: { 'Idempotency-Key': key() } });
      }
    }
    await sleep(100 + Math.random() * 300); // a person reading
  }
}

/** 20 identical requests at the same moment, with one Idempotency-Key: exactly one comment. */
async function race(token) {
  const projects = await call('list projects', token, '/projects?status=ACTIVE&size=50');
  for (const p of projects.json?.data?.content ?? []) {
    const tasks = await call('board tasks', token, `/projects/${p.id}/tasks?size=50`);
    const t = tasks.json?.data?.content?.[0];
    if (!t) continue;
    const k = key();
    const text = `Race check ${k}`;
    const results = await Promise.all(
      Array.from({ length: 20 }, () => call('race comment', token, `/tasks/${t.id}/comments`, { method: 'POST', body: { body: text }, headers: { 'Idempotency-Key': k } })),
    );
    const comments = await call('comments', token, `/tasks/${t.id}/comments`);
    const created = (comments.json?.data ?? []).filter((c) => c.body === text).length;
    const replayed = results.filter((r) => r.res?.headers.get('Idempotent-Replayed') === 'true').length;
    const inFlight = results.filter((r) => r.status === 409).length;
    const ok = created === 1 && results.every((r) => r.status === 201 || r.status === 200 || r.status === 409);
    console.log(`Race: 20 identical requests → ${created} comment created, ${replayed} answered from the first, ${inFlight} told it was in progress. ${ok ? 'PASS' : 'FAIL'}`);
    return ok;
  }
  console.log('Race: no task found to comment on. SKIPPED');
  return true;
}

const q = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);

const tokens = await signIn();
console.log(`${USERS} simultaneous users for ${SECONDS} s against ${API} (${tokens.length} accounts${WRITES ? ', with writes' : ''})…`);
const started = Date.now();
const until = started + SECONDS * 1000;
await Promise.all(Array.from({ length: USERS }, (_, i) => sleep((RAMP * 1000 * i) / USERS).then(() => user(tokens[i % tokens.length], until))));
const elapsed = (Date.now() - started) / 1000;
const raceOk = RACE ? await race(tokens[0]) : true;

let total = 0;
let failures = 0;
let limited = 0;
const all = [];
const rows = [];
for (const [name, s] of stats) {
  const sorted = [...s.times].sort((a, b) => a - b);
  all.push(...sorted);
  total += sorted.length;
  let bad = 0;
  for (const [st, n] of s.statuses) {
    if (st === 429) limited += n;
    else if (typeof st !== 'number' || st >= 500) bad += n;
  }
  failures += bad;
  rows.push([name, sorted.length, bad, q(sorted, 0.5), q(sorted, 0.95), q(sorted, 0.99), sorted[sorted.length - 1] ?? 0, [...s.statuses].map(([k, v]) => `${k}×${v}`).join(' ')]);
}
all.sort((a, b) => a - b);
const pad = (v, n) => String(v).padStart(n);
console.log(`\n${'request'.padEnd(16)}${pad('count', 7)}${pad('failed', 8)}${pad('p50', 8)}${pad('p95', 8)}${pad('p99', 8)}${pad('max', 8)}  statuses`);
for (const [name, n, bad, p50, p95, p99, max, st] of rows) {
  console.log(`${name.padEnd(16)}${pad(n, 7)}${pad(bad, 8)}${pad(Math.round(p50), 8)}${pad(Math.round(p95), 8)}${pad(Math.round(p99), 8)}${pad(Math.round(max), 8)}  ${st}`);
}
const p95 = q(all, 0.95);
console.log(`\n${total} requests in ${elapsed.toFixed(1)} s (${(total / elapsed).toFixed(1)}/s). Overall p95 ${Math.round(p95)} ms. Server errors or lost requests: ${failures}. Rate-limited (429): ${limited}.`);
if (limited) console.log('429s are the per-person rate limit doing its job. For raw capacity, run the backend with API_REQUESTS_PER_MINUTE=0 API_WRITES_PER_MINUTE=0.');
const pass = failures === 0 && p95 <= P95_LIMIT && raceOk;
console.log(pass ? 'PASS' : `FAIL${failures ? ' (server errors)' : ''}${p95 > P95_LIMIT ? ` (p95 over ${P95_LIMIT} ms)` : ''}${raceOk ? '' : ' (race check)'}`);
process.exit(pass ? 0 : 1);
