import { useRef, useState } from 'react';
import { useAiAskProjectMutation, useAiPlanProjectMutation, useAiStatusQuery } from '@/api/endpoints';
import { getErrorMessage } from '@/api/errors';
import type { AiAnswer, AiPlan, AiTurn, ProjectDetail, Task } from '@/api/types';
import { todayIso } from '@/lib/dates';
import { aiRange } from '@/lib/forecastText';
import { forecastProgress } from '@/lib/progressForecast';
import { forecastFromModel } from '@/lib/projectAnalysis';
import type { ProjectModel } from '@/three/projectModel';
import { askInBrowser, browserAiErrorMessage, BROWSER_MODEL_NAME, planInBrowser, type BrowserAiAvailability } from './browserAi';
import { useBrowserAi } from './useBrowserAi';

/** Where a free question goes: the server's AI, the AI in this browser, or neither (the built-in model answers). */
export type AiRoute =
  | { kind: 'checking' }
  | { kind: 'server'; model: string | null }
  | { kind: 'browser'; model: string }
  | { kind: 'none'; reason: string; browser: BrowserAiAvailability };

export interface ProjectQuestion {
  project: ProjectDetail;
  question: string;
  /** Earlier turns about this same project. */
  previous: AiTurn[];
  model: ProjectModel | null;
  /** The project's tasks (needed only by the AI in the browser, which builds its own context). */
  tasks: readonly Task[] | undefined;
}

/**
 * One way to ask the AI about a project, wherever the AI is. The server's AI comes first (its
 * context is gathered on the server after checking membership). Without one, Chrome's built-in
 * model answers on this device from the records this page already has. Both are labelled.
 */
export function useProjectAi() {
  const status = useAiStatusQuery();
  const browser = useBrowserAi();
  const [askServer, serverState] = useAiAskProjectMutation();
  const [planServer, planState] = useAiPlanProjectMutation();
  const [browserBusy, setBrowserBusy] = useState(false);
  const inFlight = useRef(false);

  const route: AiRoute = status.isLoading
    ? { kind: 'checking' }
    : status.data?.available
      ? { kind: 'server', model: status.data.model }
      : browser.availability === 'available'
        ? { kind: 'browser', model: BROWSER_MODEL_NAME }
        : {
            kind: 'none',
            reason: status.isError ? `I couldn’t check the server’s AI (${getErrorMessage(status.error)}).` : (status.data?.reason ?? 'There’s no AI service on the server.'),
            browser: browser.availability,
          };

  /** Throws an Error with a readable message when nothing could be answered. */
  const ask = async ({ project, question, previous, model, tasks }: ProjectQuestion): Promise<AiAnswer> => {
    if (inFlight.current) throw new Error('I’m still answering your last question. Ask again when it’s done.');
    inFlight.current = true;
    // The dates come from Niveloft's own forecast; the AI only explains them.
    const range = model && tasks?.length ? aiRange(forecastProgress({ model, tasks, members: project.members }), model.originMs) : null;
    try {
      if (route.kind === 'server') {
        const scheduled = model ? forecastFromModel(model) : null;
        return await askServer({
          projectId: project.id,
          body: { question: question.slice(0, 500), previous: previous.slice(-3), forecast: scheduled || range ? { finish: scheduled?.finish ?? null, tasks: scheduled?.tasks ?? [], range } : null },
        }).unwrap();
      }
      if (route.kind === 'browser') {
        if (!tasks) throw new Error('This project’s tasks haven’t loaded yet. Try again in a moment.');
        setBrowserBusy(true);
        try {
          return await askInBrowser({ project, tasks, model, question: question.slice(0, 500), previous: previous.slice(-2), today: todayIso(), range });
        } catch (e) {
          throw new Error(browserAiErrorMessage(e));
        }
      }
      throw new Error(route.kind === 'none' ? route.reason : 'Still checking where AI is available.');
    } catch (e) {
      throw e instanceof Error ? e : new Error(getErrorMessage(e));
    } finally {
      inFlight.current = false;
      setBrowserBusy(false);
    }
  };

  /** Flurry's "Plan a project" with AI: draft tasks from a brief. Throws a readable Error when it can't. */
  const plan = async ({ project, tasks, brief }: { project: ProjectDetail; tasks: readonly Task[] | undefined; brief: string }): Promise<AiPlan> => {
    if (inFlight.current) throw new Error('I’m still working on your last request. Ask again when it’s done.');
    inFlight.current = true;
    try {
      if (route.kind === 'server') return await planServer({ projectId: project.id, body: { brief: brief.slice(0, 4000) } }).unwrap();
      if (route.kind === 'browser') {
        setBrowserBusy(true);
        try {
          return await planInBrowser({ project, tasks: tasks ?? [], brief: brief.slice(0, 4000), today: todayIso() });
        } catch (e) {
          throw new Error(browserAiErrorMessage(e));
        }
      }
      throw new Error(route.kind === 'none' ? route.reason : 'Still checking where AI is available.');
    } catch (e) {
      throw e instanceof Error ? e : new Error(getErrorMessage(e));
    } finally {
      inFlight.current = false;
      setBrowserBusy(false);
    }
  };

  return { route, ask, plan, busy: serverState.isLoading || planState.isLoading || browserBusy, browser, refetchStatus: status.refetch, remaining: status.data?.remainingThisHour ?? null };
}
