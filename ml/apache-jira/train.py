"""Train an external resolution-time reference; never a working-effort estimator.
Usage: python ml/apache-jira/train.py /absolute/path/apache-jira.zip
"""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

ROOT = Path(__file__).resolve().parents[2]
PRIORITIES = {'Trivial': 0, 'Minor': 0, 'Major': 1, 'Critical': 2, 'Blocker': 3}
NAMES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']


def prepare(archive):
    with zipfile.ZipFile(archive) as z:
        required = {'issues.csv', 'changelog.csv'}
        if not required.issubset(z.namelist()):
            raise ValueError('The archive must contain issues.csv AND changelog.csv; metadata JSON is not data.')
        print('Reading issue timestamps and categories...', flush=True)
        cols = ['key', 'created', 'resolutiondate', 'priority.name', 'issuetype.name']
        parts = []
        for c in pd.read_csv(z.open('issues.csv'), usecols=cols, chunksize=50000, dtype=str):
            parts.append(c)
        rows = pd.concat(parts, ignore_index=True).drop_duplicates('key')
        # Latest categories can leak future changes. Reconstruct creation-time values
        # from the earliest recorded change's fromString, including a missing value.
        print('Reconstructing initial priority and issue type from changelog...', flush=True)
        changes = []
        cols = ['key', 'created', 'field', 'fromString']
        for c in pd.read_csv(z.open('changelog.csv'), usecols=cols, chunksize=100000, dtype=str):
            c = c[c['field'].str.lower().isin(['priority', 'issuetype'])].copy()
            c['field'] = c['field'].str.lower()
            changes.append(c)
        ch = pd.concat(changes, ignore_index=True)
        ch['created'] = pd.to_datetime(ch['created'], errors='coerce', utc=True)
        if ch['created'].isna().any():
            raise ValueError('Invalid category change timestamps; cannot establish creation-time features.')
        ch = ch.sort_values('created', kind='stable').drop_duplicates(['key', 'field'])
        rows = rows.set_index('key')
        for field, col in [('priority', 'priority.name'), ('issuetype', 'issuetype.name')]:
            first = ch[ch['field'] == field].set_index('key')['fromString']
            keys = rows.index.intersection(first.index)
            rows.loc[keys, col] = first.loc[keys]
        rows['created'] = pd.to_datetime(rows['created'], errors='coerce', utc=True)
        rows['resolved'] = pd.to_datetime(rows['resolutiondate'], errors='coerce', utc=True)
        rows = rows[rows['issuetype.name'].isin(['Task', 'Sub-task'])].copy()
        rows['priority'] = rows['priority.name'].map(PRIORITIES)
        rows['days'] = (rows['resolved'] - rows['created']).dt.total_seconds() / 86400
        rows['month'] = rows['created'].dt.month
        rows = rows.dropna(subset=['created', 'priority', 'month']).sort_values('created')
        return rows


def train(rows, archive):
    cutoff = rows['created'].quantile(.8)
    valid = rows['days'].notna() & (rows['days'] >= 0)
    # Purge training outcomes that were not yet known when the test era began.
    training = rows[valid & (rows['created'] < cutoff) & (rows['resolved'] < cutoff)]
    test_era = rows[rows['created'] >= cutoff]
    test = test_era[valid.reindex(test_era.index)]
    if len(training) < 1000 or len(test) < 200:
        raise ValueError('Insufficient eligible records for time-separated evaluation.')
    x = training[['priority', 'month']].to_numpy()
    y = np.log1p(training['days'].to_numpy())
    xt = test[['priority', 'month']].to_numpy()
    models = []
    for q in [.1, .5, .9]:
        m = GradientBoostingRegressor(loss='quantile', alpha=q, n_estimators=100,
            max_depth=2, min_samples_leaf=100, random_state=42)
        m.fit(x, y)
        models.append(m)
    predictions = np.sort(np.maximum(0, np.expm1(np.array([m.predict(xt) for m in models]).T)), axis=1)
    actual = test['days'].to_numpy()
    baseline = float(training['days'].median())
    mae = float(mean_absolute_error(actual, predictions[:, 1]))
    baseline_mae = float(mean_absolute_error(actual, np.full(len(actual), baseline)))
    cells = {}
    for priority, name in enumerate(NAMES):
        for month in range(1, 13):
            p = sorted(max(0., float(np.expm1(m.predict([[priority, month]])[0]))) for m in models)
            cells[f'{name}:{month}'] = dict(zip(['p10', 'p50', 'p90'], [round(v, 3) for v in p]))
    support = {name: int((training['priority'] == i).sum()) for i, name in enumerate(NAMES)}
    print('Hashing downloaded archive...', flush=True)
    h = hashlib.sha256()
    with open(archive, 'rb') as f:
        for block in iter(lambda: f.read(8 * 1024 * 1024), b''): h.update(block)
    result = {
        'schemaVersion': 1, 'modelVersion': 'apache-jira-quantile-v1',
        'source': 'https://www.kaggle.com/datasets/tedlozzo/apaches-jira-issues',
        'license': 'Apache-2.0 (Kaggle publisher metadata)', 'archiveSha256': h.hexdigest(),
        'target': 'creation-to-resolution calendar days, resolved Task/Sub-task issues only',
        'method': 'Gradient boosting quantile regression; log1p duration; initial priority and creation month',
        'cutoff': cutoff.isoformat(), 'trainingRows': len(training), 'testRows': len(test),
        'testEraRows': len(test_era), 'testEraWithoutValidOutcome': len(test_era) - len(test),
        'maeDays': round(mae, 3), 'baselineMaeDays': round(baseline_mae, 3),
        'coverage80': round(float(np.mean((actual >= predictions[:, 0]) & (actual <= predictions[:, 2]))), 4),
        'beatsBaseline': mae < baseline_mae, 'support': support, 'cells': cells,
        'limitations': [
            'Resolved-only data excludes unresolved issues; this may bias durations downward.',
            'Apache open-source work is not validated on Niveloft teams.',
            'Resolution includes waiting, closure without implementation, and review; it is not working effort.',
            'Niveloft current priority is compared with Apache initial priority; changed priorities reduce comparability.',
            'Ranges describe total lifetime from creation, not remaining time for an already-open task.',
            'This is an external reference only; never use it to replace the project forecast or rank people.'
        ]
    }
    output = ROOT / 'frontend/src/lib/data/apacheJiraModel.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k not in ['cells', 'limitations']}, indent=2), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('archive', type=Path)
    args = p.parse_args()
    train(prepare(args.archive), args.archive)
