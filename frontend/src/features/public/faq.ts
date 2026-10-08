/**
 * Questions and answers for the FAQ page (and the site search). Plain text, so the same words go
 * into the page, the search index and the FAQPage structured data for search engines.
 * Keep answers true to what the product does; update FAQ_UPDATED with every change.
 */

export const FAQ_UPDATED = '7 October 2026';
/** The same date for machines (the page's <time dateTime>). Change both together. */
export const FAQ_UPDATED_ISO = '2026-10-07';

export interface FaqEntry {
  /** Stable anchor: /faq#<id>. */
  id: string;
  question: string;
  /** Paragraphs. */
  answer: string[];
  /** Extra words people might search with. */
  keywords?: string;
  link?: { to: string; label: string };
}

export interface FaqGroup {
  id: string;
  title: string;
  entries: FaqEntry[];
}

export const FAQ: FaqGroup[] = [
  {
    id: 'start',
    title: 'Getting started',
    entries: [
      {
        id: 'what-is-projectflow',
        question: 'What is Niveloft?',
        answer: [
          'The project workspace for agencies and dev shops: tasks, owners, deadlines and milestones in one place, with your client able to follow along as a viewer.',
          'Work counts as done only when someone else has checked it against criteria agreed before it began. Flurry, the AI assistant, helps you plan, summarise progress and review blockers, and asks before it changes anything.',
        ],
        keywords: 'about overview tool software',
        link: { to: '/introduction', label: 'Read the five-minute introduction' },
      },
      {
        id: 'is-it-free',
        question: 'Does it cost anything?',
        answer: [
          'You can start free, with up to 3 active projects and up to 5 people per project. Pro (₹999 a month, or ₹9,990 a year) adds unlimited active projects and up to 15 people per project; Team (₹2,499 a month, or ₹24,990 a year) allows up to 50.',
          'Prices are for the whole workspace, not per person, and viewers (usually your clients) are free and unlimited on every plan.',
        ],
        keywords: 'price pricing payment subscription plan rupees inr cost',
        link: { to: '/pricing', label: 'See the plans' },
      },
      {
        id: 'how-to-pay',
        question: 'How do I pay for Pro or Team?',
        answer: [
          'By UPI, from any UPI app. In Settings → Plan and billing, choose a plan, then scan the QR code (or tap “Pay with a UPI app” on your phone). After paying, enter the 12-digit UPI reference (UTR) from your app.',
          'We check every payment by hand and switch your plan on as soon as we’ve found it, usually within a few hours and always within one working day. You get an email when it’s done. Plans don’t renew automatically: we remind you a week before yours ends.',
        ],
        keywords: 'pay payment upi gpay google pay phonepe paytm bhim utr upgrade billing renew',
        link: { to: '/terms#plans', label: 'Payment terms' },
      },
      {
        id: 'first-project',
        question: 'How do I start my first project?',
        answer: [
          'Sign in, press New project on Today or Projects, give it a name, a short key (such as ONB) and its dates. You become its owner and can invite your team, and your client as a viewer, from the project’s Team section.',
        ],
        keywords: 'create new project setup',
        link: { to: '/introduction#first-steps', label: 'Your first ten minutes' },
      },
    ],
  },
  {
    id: 'roles',
    title: 'Roles and permissions',
    entries: [
      {
        id: 'four-roles',
        question: 'What can owners, managers, members and viewers do?',
        answer: [
          'Owners can do everything, including appointing managers and deleting the project. Managers run the work: they assign tasks, invite people and review submissions. Members create tasks and do the work assigned to them. Viewers see everything and change nothing.',
          'The server checks the role on every request, so hiding a button is never the only protection.',
        ],
        keywords: 'owner manager member viewer permission access rights',
        link: { to: '/introduction#roles', label: 'See the full permission table' },
      },
      {
        id: 'only-the-assignee',
        question: 'Why does it say only the assignee can submit?',
        answer: [
          'The assignee is the one person a task is given to. Submitting work for review is their step, so nobody else (not even a manager) can submit it on their behalf. Ask a manager to reassign the task if someone else should hand it in.',
        ],
        keywords: 'assignee submit error only the assignee',
      },
      {
        id: 'review-own-work',
        question: 'Can a manager approve their own work?',
        answer: ['No. A reviewer never judges their own submission. Another manager or the owner has to review it.'],
        keywords: 'approve self review conflict',
      },
      {
        id: 'change-role',
        question: 'How do I change someone’s role?',
        answer: ['In the project’s Team section, choose a new role next to their name. Managers can give the member and viewer roles; only the owner can appoint managers.'],
        keywords: 'promote demote team people',
      },
    ],
  },
  {
    id: 'work',
    title: 'Tasks and reviews',
    entries: [
      {
        id: 'drag-to-done',
        question: 'Why can’t I drag a task to Done?',
        answer: [
          'Done is reached only through an approved review. The assignee submits evidence, and a reviewer checks every acceptance criterion. The server refuses a direct request too, so no one can skip the review.',
        ],
        keywords: 'board drag done column blocked',
      },
      {
        id: 'evidence',
        question: 'What counts as evidence?',
        answer: [
          'Links (a repository, a deployment or any other address), screenshots and files, plus notes for the reviewer. Every checklist item must be ticked and at least one piece of evidence added before submitting.',
        ],
        keywords: 'submit proof attachment upload link file',
      },
      {
        id: 'changes-requested',
        question: 'What happens when a reviewer requests changes?',
        answer: [
          'The task goes back to In progress with the reviewer’s feedback. The next submission becomes version 2, and every earlier version and decision stays on the task.',
        ],
        keywords: 'rework feedback reject version history',
      },
      {
        id: 'upload-limits',
        question: 'How big can uploaded files be?',
        answer: ['Up to 10 MB per file and 55 MB per submission, with 1 GB of evidence per project on the default settings.'],
        keywords: 'file size limit upload attachment',
      },
    ],
  },
  {
    id: 'model',
    title: 'Model, forecast and predictions',
    entries: [
      {
        id: 'what-is-the-model',
        question: 'What is the work graph?',
        answer: [
          'Each project drawn over time, under Forecast → Work graph: time runs left to right, every person has a lane, and each task is a block coloured by its status. Every block is the same height, so nothing looks bigger than it is; priority is shown as a badge.',
          'Switch to the 3D view to turn the project in space, and replay any past day from the recorded status changes.',
        ],
        keywords: '3d three model replay graph timeline',
      },
      {
        id: 'how-predictions-work',
        question: 'How does the forecast work?',
        answer: [
          'It simulates the open work 400 times, using each person’s own pace against their estimates and how long reviews usually take. It shows a likely finish window and the chance of meeting the deadline for each person, each role and the whole project, under the project’s Forecast section.',
          'With little history the range is wide, and the page says so. It’s an estimate, not a promise.',
        ],
        keywords: 'forecast prediction estimate deadline monte carlo',
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI and the assistant',
    entries: [
      {
        id: 'need-ai',
        question: 'Do I need AI to use Niveloft?',
        answer: [
          'No. Flurry’s summaries, blocker reviews, agendas and forecasts are worked out from your project’s records, and plans can be drafted from the lines of your brief, all without an AI service. Each answer says so.',
          'AI answers are an extra on top: from the AI model we run for Flurry, or from the AI built into Chrome if you turn it on. Each answer says which one wrote it.',
        ],
        keywords: 'ai required ollama chrome gemini nano built-in',
      },
      {
        id: 'who-is-flurry',
        question: 'Who is Flurry?',
        answer: [
          'Flurry is Niveloft’s AI project assistant: the small snow creature in the corner of every page once you’re signed in. Click it, or press Alt+A (Option+A on a Mac).',
          'It turns a brief into draft tasks, summarises progress, reviews blockers and missing owners, drafts meeting agendas and answers questions about a project, citing the tasks it used. It only sees what you can see, it says what the records don’t show, and it asks before creating or changing anything.',
          'You can drag Flurry anywhere, minimise or hide it, turn its sounds on and keep it still.',
        ],
        keywords: 'assistant flurry mascot ai helper ask',
      },
      {
        id: 'ai-changes',
        question: 'Can the AI change my project?',
        answer: [
          'No. It can only suggest. It never approves work, assigns people or changes deadlines by itself; any suggested task is shown for a person to check and confirm. It also can’t open links or files, and says so.',
        ],
        keywords: 'ai safety approve assign automatic',
      },
      {
        id: 'arena',
        question: 'What is the Arena?',
        answer: [
          'An internal tool we use to choose Flurry’s AI model: two answer sources reply to the same question side by side, with their names hidden, and we pick the better one. It isn’t part of your workspace.',
        ],
        keywords: 'arena compare models vote blind leaderboard admin',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account, privacy and data',
    entries: [
      {
        id: 'forgot-password',
        question: 'I forgot my password. What now?',
        answer: [
          'Use “Forgot password?” on the sign-in page and we’ll email you a link to choose a new one. If it doesn’t arrive within a few minutes, check your spam folder, or contact us.',
        ],
        keywords: 'reset password login sign in locked',
        link: { to: '/forgot-password', label: 'Reset your password' },
      },
      {
        id: 'password-rules',
        question: 'What makes a valid password?',
        answer: ['8 to 72 characters with at least one letter and one number. The eye button in the field shows what you typed.'],
        keywords: 'password requirements length strength',
      },
      {
        id: 'delete-data',
        question: 'How do I see, export or delete my data?',
        answer: [
          'You can delete your account yourself in Settings → Data and privacy (you’ll be asked for your password). Projects you own alone are deleted with it; if you own a project that has other members, remove them or delete the project first.',
          'For a copy of your data, or anything else about it, send a message with the Contact button or write to the address on the privacy policy. We answer every request about your data.',
        ],
        keywords: 'gdpr delete account export privacy data request',
        link: { to: '/privacy#rights', label: 'Your choices and rights' },
      },
      {
        id: 'what-is-tracked',
        question: 'What does the site measure about visits?',
        answer: [
          'Without your consent, only counts: how often each form is opened, sent, succeeds or fails (no contents, no identity). If you arrived from a link with campaign tags (utm_source and similar), those tags are saved with a new account so we can see which campaigns bring sign-ups.',
          'Analytics that set cookies load only if you agree in the cookie banner.',
        ],
        keywords: 'utm tracking analytics cookies campaign measurement',
        link: { to: '/privacy#collect', label: 'What we collect' },
      },
    ],
  },
  {
    id: 'trouble',
    title: 'Troubleshooting',
    entries: [
      {
        id: 'too-many-requests',
        question: 'Why does it say “too many requests”?',
        answer: [
          'Each person can make a few hundred requests a minute, which protects the server for everyone. The app waits and retries by itself; if you still see the message, wait a minute.',
        ],
        keywords: 'rate limit 429 slow error busy',
      },
      {
        id: 'error-reference',
        question: 'Something went wrong and showed a reference. What do I do?',
        answer: [
          'Copy the reference with the button next to it and send it with the Contact button. It lets us find exactly what happened.',
        ],
        keywords: 'error bug reference request id crash',
      },
      {
        id: 'offline',
        question: 'What happens if my connection drops?',
        answer: [
          'A banner says you’re offline. Pages you’ve opened stay readable, and requests are retried once the connection is back. Changes you send twice by accident are made only once.',
        ],
        keywords: 'offline internet connection network retry',
      },
    ],
  },
];

export const FAQ_ENTRIES: (FaqEntry & { group: string })[] = FAQ.flatMap((g) => g.entries.map((e) => ({ ...e, group: g.title })));

/** Structured data for search engines (schema.org FAQPage). */
export function faqJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ENTRIES.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.answer.join(' ') },
    })),
  }).replace(/</g, '\\u003c');
}
