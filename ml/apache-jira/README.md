# Apache JIRA experimental reference

This integration adds an external research comparison to the existing Predictions page,
a link from the delivery overview, and deterministic Flurry answers to `Apache benchmark
for my tasks` or `Apache benchmark WEB-12`. The existing project scheduler, 3D curve,
deadline probabilities, and local history model remain authoritative.

## Why it is not used for deadlines

The target is total **calendar days from creation to resolution**, not working effort or
remaining time. Resolution can include closure without implementation. Apache backlog
and review delays cannot be inserted as effort into Niveloft's scheduler without double
counting waiting. Niveloft has no issue-type field, so training is limited to Task/Sub-task.
Current Niveloft priority maps to initial Apache priority; edited priorities reduce
comparability. No task text, user identifiers, or raw records are included in the app.
The aggregate model runs locally using task records already loaded through existing
access controls. No new public endpoint or external data transmission is needed.

## Actual evaluation

- 111,252 training issues; creation and resolution both before 2021-07-16.
- 27,324 later resolved test issues; 5,654 later records without a valid outcome excluded.
- Quantile gradient boosting uses original priority and creation month.
- MAE: 49.853 calendar days; constant training-median baseline: 49.892 days.
- Nominal 80% interval coverage: 88.49% on resolved test outcomes.
- The improvement is negligible (~0.08%). This is **not ready to drive deadlines**.
- Resolved-only selection is biased: unresolved issues do not contribute to evaluation.
- Neither the model nor its interval is validated on Niveloft teams.

There is no automatic promotion to the production forecast. Next steps are prospective
Niveloft snapshots, a survival model including unresolved issues, and evaluation against
the existing local baseline. Avoid individual employee rankings.

## Reproduce

Python 3.12 was used. Download the full Apache ZIP using the Kaggle dataset download,
then run from the repository root:

```sh
python -m venv .venv-jira
. .venv-jira/bin/activate
pip install -r ml/apache-jira/requirements.txt
python ml/apache-jira/train.py /absolute/path/apache-jira.zip
cd frontend
npm ci
npm test -- src/lib/apacheJira.test.ts src/lib/progressForecast.test.ts src/lib/projectLearner.test.ts
npm run build
```

The trainer streams selected columns from the ZIP (about 1.7 GiB compressed); allow
several GiB RAM. It reconstructs original priority/type from the earliest change's
`fromString`, preventing use of final edited categories as creation-time features.
Invalid change timestamps fail closed. No notebook code from uploads is executed.
The supplied support-ticket and project-risk datasets are not mixed into this target.

Output: `frontend/src/lib/data/apacheJiraModel.json`. The 48 priority/month cells encode
the three trained quantile models exactly for the supported discrete input space.
Crossed quantiles are sorted and nonnegative durations enforced. Unsupported inputs
and completed tasks return no reference. No model server or paid API key is required.

## Source and provenance

Dataset: https://www.kaggle.com/datasets/tedlozzo/apaches-jira-issues
Publisher: tedlozzo. Dataset title: Apache JIRA Issues: Changelog, Comments, Links.
License declaration supplied by publisher metadata: Apache 2.0.
Archive SHA-256: `4eac071f770226d6b81f76a703a861c4bfb75853901db3b4c5b93aefe9f2a713`.
Only derived aggregate predictions are distributed; the source archive is not committed.
Metadata licensing is publisher-provided, not an independent rights audit.
