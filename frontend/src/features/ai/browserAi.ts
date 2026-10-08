import type { AiAnswer, AiPlan, ProjectDetail, Task } from '@/api/types';
import { AiReplyError, ANSWER_SCHEMA, buildAskPrompt, buildPlanPrompt, CONTEXT_LEVELS, PLAN_RULES, PLAN_SCHEMA, ReadableError, SYSTEM_RULES, toAnswer, toPlan, type AskInput } from '@/lib/aiPrompt';

/*
 * AI that runs inside the browser: Chrome's built-in model (Gemini Nano) through the Prompt API.
 * No key, no server, and the project's records never leave the device. Chrome downloads the model
 * once (a few GB) the first time someone turns it on, which needs a click.
 * https://developer.chrome.com/docs/ai/prompt-api
 */

export type BrowserAiAvailability = 'checking' | 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported';

interface PromptOptions {
  responseConstraint?: unknown;
  omitResponseConstraintInput?: boolean;
  signal?: AbortSignal;
}
/** The parts of a Prompt API session we use (older and newer Chrome names both). */
export interface LanguageModelSession {
  prompt(input: string, options?: PromptOptions): Promise<string>;
  clone?(): Promise<LanguageModelSession>;
  destroy(): void;
  measureContextUsage?(input: string, options?: PromptOptions): Promise<number>;
  measureInputUsage?(input: string, options?: PromptOptions): Promise<number>;
  contextWindow?: number;
  contextUsage?: number;
  inputQuota?: number;
  inputUsage?: number;
}
interface DownloadMonitor {
  addEventListener(type: 'downloadprogress', listener: (e: { loaded: number }) => void): void;
}
export interface LanguageModelApi {
  availability(options?: unknown): Promise<string>;
  create(options?: unknown): Promise<LanguageModelSession>;
}

export const BROWSER_MODEL_NAME = 'Gemini Nano, in this browser';
const LANGUAGES = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
/** Room kept free for the answer, in tokens. */
const ANSWER_ROOM = 800;
/** Without a way to measure, keep prompts to about 4,000 tokens. */
const CHAR_BUDGET = 16_000;

function api(): LanguageModelApi | null {
  const g = globalThis as { LanguageModel?: LanguageModelApi };
  return g.LanguageModel && typeof g.LanguageModel.availability === 'function' ? g.LanguageModel : null;
}

/** Chrome has used a few spellings over time; map them all onto ours. */
export function normalizeAvailability(v: unknown): Exclude<BrowserAiAvailability, 'checking' | 'unsupported'> {
  switch (v) {
    case 'available':
    case 'readily':
    case 'readily-available':
      return 'available';
    case 'downloadable':
    case 'after-download':
      return 'downloadable';
    case 'downloading':
      return 'downloading';
    default:
      return 'unavailable';
  }
}

// ------------------------------------------------------------------ shared state

export interface BrowserAiState {
  availability: BrowserAiAvailability;
  /** 0–1 while Chrome downloads the model. */
  progress: number | null;
  error: string | null;
}
let state: BrowserAiState = { availability: 'checking', progress: null, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<BrowserAiState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
let base: Promise<LanguageModelSession> | null = null;
let checked = false;

/** Asks Chrome whether its model can be used here (once per page load, or when told to). */
export async function checkBrowserAi(force = false): Promise<BrowserAiAvailability> {
  if (checked && !force) return state.availability;
  checked = true;
  const lm = api();
  if (!lm) {
    set({ availability: 'unsupported' });
    return 'unsupported';
  }
  try {
    const a = normalizeAvailability(await lm.availability(LANGUAGES));
    set({ availability: a });
    return a;
  } catch {
    set({ availability: 'unavailable' });
    return 'unavailable';
  }
}

function createBase(lm: LanguageModelApi): Promise<LanguageModelSession> {
  return lm
    .create({
      ...LANGUAGES,
      initialPrompts: [{ role: 'system', content: SYSTEM_RULES }],
      monitor(m: DownloadMonitor) {
        m.addEventListener('downloadprogress', (e) => {
          if (typeof e.loaded === 'number' && e.loaded < 1) set({ availability: 'downloading', progress: e.loaded });
        });
      },
    })
    .then((s) => {
      set({ availability: 'available', progress: null });
      return s;
    });
}

/**
 * Turns the browser's AI on. Call it straight from a click: Chrome only starts the model download
 * in response to one.
 */
export function enableBrowserAi(): Promise<boolean> {
  const lm = api();
  if (!lm) return Promise.resolve(false);
  set({ error: null, progress: state.availability === 'downloadable' ? 0 : state.progress });
  base = createBase(lm);
  return base.then(
    () => true,
    (e: unknown) => {
      base = null;
      set({ availability: state.availability === 'downloading' ? 'downloadable' : state.availability, progress: null, error: browserAiErrorMessage(e) });
      return false;
    },
  );
}

export function browserAiErrorMessage(e: unknown): string {
  if (e instanceof AiReplyError) {
    // What the model actually wrote is for developers, not for the conversation.
    console.warn('[Flurry] Unusable reply from the AI in this browser:', e.detail);
    return e.message;
  }
  if (e instanceof ReadableError) return e.message;
  const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: unknown }).name) : '';
  if (name === 'NotAllowedError') return 'Chrome needs a click to start the download. Press the button again.';
  if (name === 'QuotaExceededError') return 'The question and this project’s records are too big for the AI in this browser.';
  if (name === 'NotSupportedError') return 'Chrome’s built-in AI can’t run on this device.';
  if (name === 'AbortError') return 'The AI in this browser stopped before it finished. Nothing was changed; try again.';
  console.warn('[Flurry] The AI in this browser failed:', e);
  return 'The AI in this browser didn’t answer. Nothing was changed. Try again, or ask something shorter.';
}

/** For the React hook (useBrowserAi): subscribe to changes; the first subscriber triggers the check. */
export function subscribeBrowserAi(listener: () => void): () => void {
  listeners.add(listener);
  if (!checked) void checkBrowserAi();
  return () => listeners.delete(listener);
}

export function getBrowserAiState(): BrowserAiState {
  return state;
}

// ------------------------------------------------------------------ asking

async function session(): Promise<LanguageModelSession> {
  const lm = api();
  if (!lm) throw new ReadableError('This browser has no built-in AI.');
  base ??= createBase(lm);
  let b: LanguageModelSession;
  try {
    b = await base;
  } catch (e) {
    base = null;
    throw e;
  }
  // A fresh copy per question, so earlier questions don't fill its context.
  return b.clone ? b.clone() : createBase(lm);
}

/** How many tokens a prompt takes, if this Chrome can say. */
async function measure(s: LanguageModelSession, prompt: string): Promise<number | null> {
  const fn = s.measureContextUsage ?? s.measureInputUsage;
  if (!fn) return null;
  try {
    return await fn.call(s, prompt, { responseConstraint: ANSWER_SCHEMA, omitResponseConstraintInput: true });
  } catch {
    return null;
  }
}

/**
 * Answers a question about a project with the AI in this browser. The prompt is cut down (status
 * history, then finished tasks) until it fits the model's context window.
 */
export async function askInBrowser(input: AskInput): Promise<AiAnswer> {
  const s = await session();
  try {
    const limit = s.contextWindow ?? s.inputQuota ?? null;
    const used = s.contextUsage ?? s.inputUsage ?? 0;
    let chosen: ReturnType<typeof buildAskPrompt> | null = null;
    for (const level of CONTEXT_LEVELS) {
      const built = buildAskPrompt(input, level);
      const tokens = limit ? await measure(s, built.prompt) : null;
      const fits = tokens !== null && limit ? used + tokens + ANSWER_ROOM <= limit : built.prompt.length <= CHAR_BUDGET;
      if (fits) {
        chosen = built;
        break;
      }
    }
    if (!chosen) throw new ReadableError('This project is too big for the AI in this browser. Ask about fewer tasks, or use a server AI.');
    let reply: string;
    try {
      reply = await s.prompt(chosen.prompt, { responseConstraint: ANSWER_SCHEMA, omitResponseConstraintInput: true });
    } catch (e) {
      // Older Chrome without structured output: ask for JSON in words only (the rules already do).
      if (e instanceof TypeError || (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'NotSupportedError')) reply = await s.prompt(chosen.prompt);
      else throw e;
    }
    const asOf = new Date().toISOString();
    return toAnswer(reply, chosen.keys, BROWSER_MODEL_NAME, asOf, [
      `Written by a small AI model running in this browser (Chrome’s built-in Gemini Nano), from this project’s records as of ${asOf.slice(0, 16).replace('T', ' ')} UTC. It’s wrong more often than larger models: check the tasks it cites.`,
      'The records never left this device.',
    ]);
  } finally {
    s.destroy();
  }
}

/**
 * Drafts a plan from a brief with the AI in this browser (Flurry's "Plan a project"). The model must
 * already be on the device; the brief and the project's task titles never leave it.
 */
export async function planInBrowser({ project, tasks, brief, today }: { project: ProjectDetail; tasks: readonly Task[]; brief: string; today: string }): Promise<AiPlan> {
  const lm = api();
  if (!lm) throw new ReadableError('This browser has no built-in AI.');
  const s = await lm.create({ ...LANGUAGES, initialPrompts: [{ role: 'system', content: PLAN_RULES }] });
  try {
    const prompt = buildPlanPrompt(project, tasks, brief, today);
    if (prompt.length > CHAR_BUDGET) throw new ReadableError('The brief and this project’s tasks are too long for the AI in this browser. Shorten the brief and try again.');
    let reply: string;
    try {
      reply = await s.prompt(prompt, { responseConstraint: PLAN_SCHEMA, omitResponseConstraintInput: true });
    } catch (e) {
      if (e instanceof TypeError || (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'NotSupportedError')) reply = await s.prompt(prompt);
      else throw e;
    }
    const people = project.members.filter((m) => m.role !== 'VIEWER').map((m) => m.user.name);
    return toPlan(reply, people, BROWSER_MODEL_NAME, ['Drafted by a small AI model running in this browser (Chrome’s built-in Gemini Nano). The brief never left this device.']);
  } finally {
    s.destroy();
  }
}

/** For tests: forget what was checked and created. */
export function resetBrowserAiForTests(): void {
  state = { availability: 'checking', progress: null, error: null };
  base = null;
  checked = false;
}
