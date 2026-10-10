import { Link } from 'react-router';
import type { Task } from '@/api/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { apacheJiraModel as model, apacheReference, APACHE_LIMIT } from '@/lib/apacheJira';

export function ApacheReferenceCard({ tasks }: { tasks: readonly Task[] }) {
  const rows = tasks.flatMap(task => {
    const range = apacheReference(task);
    return range ? [{ task, range }] : [];
  });
  return (
    <Card>
      <CardHeader title="Apache JIRA comparison" description="Experimental external model · Calendar days from creation to resolution" />
      <CardBody>
        <p className="text-[13px] leading-relaxed text-muted">{APACHE_LIMIT}</p>
        <p className="mt-3 text-[13px] text-ink">
          Trained on {model.trainingRows.toLocaleString()} resolved tasks. On {model.testRows.toLocaleString()} later resolved issues,
          average absolute error was {model.maeDays.toFixed(1)} days versus {model.baselineMaeDays.toFixed(1)} for a simple median baseline.
          {' '}{model.maeDays < model.baselineMaeDays * 0.95 ? 'Lower external test error does not establish accuracy for your team.' : 'It offers no material improvement over the baseline; do not use it for commitments.'}
        </p>
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] font-medium text-accent focus-visible:outline focus-visible:outline-2">
            Compare {rows.length} supported open tasks
          </summary>
          {rows.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <caption className="pb-2 text-left text-muted">Total lifetime references, not remaining duration. Priority is mapped to Apache’s initial priority.</caption>
                <thead><tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-4">Task</th><th scope="col" className="py-2 pr-4">External median</th><th scope="col" className="py-2">10th–90th percentile</th>
                </tr></thead>
                <tbody>{rows.slice(0, 20).map(({ task, range }) => (
                  <tr key={task.id} className="border-b border-line">
                    <td className="py-2 pr-4"><Link className="text-accent hover:underline" to={`/projects/${task.projectId}/tasks/${task.id}`}>{task.key}</Link></td>
                    <td className="py-2 pr-4">{range.p50.toFixed(1)} days</td>
                    <td className="py-2">{range.p10.toFixed(1)}–{range.p90.toFixed(1)} days</td>
                  </tr>
                ))}</tbody>
              </table>
              {rows.length > 20 ? <p className="mt-2 text-xs text-muted">Showing the first 20 of {rows.length} tasks.</p> : null}
            </div>
          ) : <p className="mt-2 text-sm text-muted">No supported open tasks. Finished tasks and invalid dates are excluded.</p>}
          <p className="mt-3 text-xs text-muted">
            Nominal 80% range covered {(model.coverage80 * 100).toFixed(1)}% of resolved test outcomes.
            {' '}{model.testEraWithoutValidOutcome.toLocaleString()} later issues had no valid resolved outcome and were excluded from evaluation.
            Training outcomes predate {model.cutoff.slice(0, 10)}. No Niveloft data is sent to Kaggle.
          </p>
        </details>
        <p className="mt-4 text-xs text-muted">
          Ask Flurry: “Apache benchmark for my tasks”.{' '}
          <a href={model.source} target="_blank" rel="noreferrer" className="text-accent hover:underline">Dataset source</a>
        </p>
      </CardBody>
    </Card>
  );
}
