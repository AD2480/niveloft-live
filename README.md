> **Vercel deployment:** Start with [VERCEL-START-HERE.md](VERCEL-START-HERE.md) for the exact settings and demo/live options.

# Niveloft

> **Going live?** Follow [DEPLOYMENT.md](DEPLOYMENT.md): the website on Vercel, the server and MySQL on Railway, email through Resend, and UPI payments.

**Deliver client work with proof, not promises.** The project workspace for agencies and dev shops: every task closes with evidence your client can see, and a delivery forecast shows when the work will really land.

- **Plans:** Free (3 active projects, 5 people per project), Pro (₹999 a month or ₹9,990 a year, 15 people per project) and Team (₹2,499 a month or ₹24,990 a year, 50 people per project), per workspace. Viewers (clients) are always free.
- **Payments:** by UPI straight to the operator's UPI ID. The customer enters the UTR; an operator confirms it in **Admin → Payments to check**, which switches the plan on. Nothing renews by itself; a reminder goes out a week before a plan ends. Code: `backend/.../billing/`, `frontend/src/features/billing/`.
- **Contact:** dobhalaaryam@gmail.com (website questions, payments, privacy).
- **No demo mode on the live site.** The in-browser test API only runs in local development (`npm run dev`).

> The longer sections below were written before the agency repositioning and the paid launch (7 October 2026) and still describe the earlier front page and demo in places; [CHANGELOG.md](CHANGELOG.md) has the current state.

| Folder | What it is | Status |
| --- | --- | --- |
| [`frontend/`](frontend/README.md) | React 19 + TypeScript + Vite 7 + Tailwind 4 + Redux Toolkit / RTK Query + React Router 7 + dnd-kit + **three.js**, with charts drawn in SVG | Written, including the snowpack front page, Today and Overview, and Flurry (also runs standalone in a labelled demo mode) |
| [`backend/`](backend/) | Java 21 + Spring Boot 3.5 + Spring Security (JWT) + Spring Data JPA + Flyway + MySQL 8.4 | Written (the Java package is still `dev.projectflow`) |
| [`docs/`](docs/) | [Brand guide](docs/BRAND.md) (the current design), [assessment and phase plan](docs/ASSESSMENT.md), [references](docs/REFERENCES.md), [compliance checklist mapped to the code](docs/COMPLIANCE_MAP.md), and an earlier [design review](docs/DESIGN_REVIEW.md) and [redesign spec](docs/REDESIGN.md) | |

See [CHANGELOG.md](CHANGELOG.md) for what changed in each phase, and [docs/BRAND.md](docs/BRAND.md) for the name, the snowpack, colours, type, logo, Flurry and the 3D blocks.

> **About the name.** "Niveloft" is a working name. Whether the name, the domain, the social handles and a trademark are available still has to be checked before any public launch. Internal identifiers keep the original name (the `dev.projectflow` Java package, the `projectflow` database, `projectflow.*` browser storage keys and the `@projectflow.dev` demo accounts), so existing databases and sign-ins keep working.

## Niveloft at a glance

- **The front page** shows the sample project as a block of snowpack: cut away like a snow pit and lit like a product shot. The idea behind it: *a project reads like snow, in layers.* Approved work is the firm base; above it, work waiting for review, then work in progress, and on top, fresh snow: work nobody has started. Each task is one slice of its layer. The late task holding the most work up (*ONB-9*, the passkey API, two days late, holding up three tasks) is the **weak layer**, in red, with its own label.
  1. **The first screen.** The promise (*See what will finish, when, and what’s in the way.*) is the page's heading, set wide and heavy; one action, *Open the sample project* ("No sign-up for the sample. Nothing you do there is saved."); and three readings from the sample: 17 tasks and 6 people, the likely finish window, and the chance of finishing on time. Point at a slice for its task, layer and owner; click it and the sample workspace opens; drag to turn the block.
  2. **Read it in layers.** Scrolling lifts the layers apart and reads them top down, one at a time, each with what it means in Niveloft: *Fresh snow on top* (not started, and the two tasks nobody owns, named instead of guessed at), *Settling* (in progress: the forecast simulates each person's real pace), *Waiting for a decision* (in review: Done means reviewed), *Firm at the base* (approved: every change of state is recorded), and *The weak layer*.
  3. **The product, working.** The sample workspace in the real interface, the forecast you can change, the four role views, Flurry, the questions people ask, and the ways in: create a workspace, log in, or step into the sample as one of its team.
  - The block is decoration over ordinary, accessible page content: it's hidden from screen readers, and the words beside it say the same. three.js loads after the first paint; until then, and in browsers without WebGL, a still drawing of the same block is shown, projected with the scene's own camera, so the one fades into the other in place, labels included. With reduced motion the block stands still and the layers jump instead of gliding. On phones the block stays at the top of the screen while each layer's words come up beneath it.
  - No invented customers, logos, quotes or telemetry: every reading on the page comes from the sample project.
  - **Type:** headlines in Archivo, wide and heavy; everything else in Geist. No monospaced labels and no text set in capitals.
- **The sample workspace** on the front page is *Launch the mobile onboarding update*: 17 tasks, 6 people, 3 milestones, a late task that holds others up, a review that's waiting and two tasks nobody owns. Visitors can open a task, move it through the workflow (with the app's rules: blocked work can't start, only a review makes it Done), give work an owner, filter by person, switch between board, list and timeline, and reset. It's clearly labelled and saves nothing anywhere. The same project is in both demo datasets, so signing in to the demo shows the same story.
- **The delivery forecast** leads every project's Overview and the Reports page: the likely finish as a window (not a single date), the most likely date, the chance of making the deadline, what holds it up and the next move, then three numbers (remaining work, blocked tasks, available capacity) and the timeline. It separates **remaining effort**, **your own finish** (after the work you wait on) and **the project's finish**, names the main dependency, and says what it assumes, how good the data is, and how often its ranges have held for finished work. Progress is counted as *tasks approved*; effort-weighted progress appears only when at least 70% of tasks have estimates. Cycle time comes with its definition, its *n* and its spread. People are never ranked.
- **The delivery outlook** (each project's *Delivery* chapter) answers *when is this likely to be delivered?* in four readings: the target, the median finish, the date it's 85% likely to be finished by, and the chance of finishing on time. Below them, one forecast is drawn two ways: a **Path** view (the route to delivery past each milestone, over quiet decorative terrain) and a **Chart** view (approved tasks over time, with a table). Select a milestone and the inspector shows the one task holding it up (*Awaiting a decision*, *Running late*, …) with **Open task**, and Flurry moves beside that milestone, points at its blocker and says, for example, *"This review is holding up ONB-10. Open it?"* **Preview scenario** tries a smaller scope or an assumed pace against the same forecast (the baseline stays in grey) and changes nothing until you've seen the exact list of changes and confirmed. Phones open on the Chart view. See [Delivery outlook](#delivery-outlook).
- **The graph** (each project's *Graph* chapter, and on Reports) is a 2D timeline by default: time across, one row per person, recorded work solid, planned work outlined, the forecast as a band, priority as a badge (never as size), dependencies shown only for the task you select. Each role opens on its own question — a member on *What should I work on, and when am I likely to finish?*, a reviewer on *Whose delivery am I blocking?*, an owner on *What threatens delivery?*, a viewer on the delivery forecast. There's always a list view, a reset, and keyboard access (arrow keys, Enter, Escape). The 3D model is one click away.
- **Flurry** is a small floating snow creature (rounded body, two eyes, tiny arms, an icy-blue glow) that lives at the edge of every signed-in page. **Meet it first at `/flurry`**: its look at every size, each behaviour shown live, and a sandbox to drag it, click it and ask it about the sample project. In the app it floats near an edge, roams between a few safe resting spots only after you've been away for 30 seconds, follows your pointer with a slight trail when dragged, and keeps clear of buttons, fields, text and chart labels. **Click it** for a compact menu: **Ask Flurry**, **My next task** and **Delivery outlook**, plus **Roam**, **Stay here** and **Hide**; size and motion are in Settings → Flurry. A small indicator means something needs you, and the menu says exactly what. Notes are brief and appear when you ask. **Scope is always visible** (the project you're on, the task you're on, or *All projects*), switching project starts a new conversation, and a question about one task ("Why is ONB-9 blocked?") gets an answer about that task. Its first three abilities are **Plan a project** (a brief becomes draft tasks you review before anything is created, with Undo afterwards), **Summarise progress** (facts, estimates and what the records don't show, kept apart) and **Review blockers** (late work that holds others up, missing owners and long review waits, each with a suggested next move). It also drafts meeting agendas, forecasts, suggests what to do next and prepares tasks for you to confirm. See [Flurry, the assistant](#flurry-the-assistant).
- **The app** has a stable sidebar (the places, your active projects, Flurry, help and your account), a top bar that names where you are, and the Niveloft palette and type throughout, in light and dark. Behind the pages there's only a faint wash of cold light; a light snowfall can be turned on in *Settings → Appearance*.
- **Today** opens on your active projects, each a small block of snowpack made from its task counts (approved at the base, late work as a red weak layer), all drawn in one 3D scene behind the tiles (flat drawings without WebGL). Each tile gives the project's health, key, share approved, owner, members and deadline, with a strata bar in the same colours. Then what needs you, grouped by how soon (*Now*, *Soon*, *Worth a look*), your next tasks, the next three weeks and what was approved recently.
- **Each project's Overview** leads with the delivery forecast (when it will likely finish, what holds it up, the next move), then shows **the project's own snowpack:** the front page's block, made from the project's real tasks, with every late task in red and the weak layer called out. Beside it, the layers as a list with counts and shares: pointing at one lifts it out of the block, and each opens its tasks, grouped and sorted. Click a slice to open its task. It only reads the records; nothing in it changes a task.
- **Charts** are drawn by hand in SVG, with no chart library: thin marks, a readout that follows the pointer and can be walked with the arrow keys, a legend, and a table view for every chart. The same five colours (not started, in progress, in review, approved, late) run through the bars, charts and 3D blocks.

## What makes it different

**Every project is a timeline you can read at a glance, and a model you can walk around.** The *Graph* chapter shows the 2D graph described above; its *3D model* view builds the same records in 3D:
- **Axes:** time runs left to right and there's one lane per person. Every block has the same height, so nothing looks bigger than it is; priority is in the task's details.
- **Materials:** stone for not started, graphite for in progress, amber for in review, and **bronze for approved**.
- **Links and markers:** dependencies are drawn for the selected task's chain (or all of them, if you ask), a glass plane marks today and obelisks are milestones. The default camera is a readable three-quarter view, and the *Overview* preset brings it back.
- **Replay:** scrub a timeline to rebuild any past day from the recorded status changes; past today, the scheduler's estimate appears as ghost outlines.
- **History and forecast graph:** inside the app, on each project's *Overview* and under its 3D *Model*. The graph counts every task and every approved task day by day. It's recorded up to today and dashed as an estimate after that. On the Model page it moves with the replay, and clicking or dragging it moves the replay.
- **Analysis:** beside the model, short statements computed from the records, each marked *Recorded* or *Estimate*:
  - the estimated finish against the deadline, saying how many tasks had no estimate;
  - overdue work and what it holds up;
  - reviews waiting and rework;
  - open work per person.
  No AI is involved, so it's always there.
- **Flurry, with voice:** Flurry rests at the edge of every signed-in page; click it for *Ask Flurry*, *My next task* or *Delivery outlook*, press Alt+A to open the conversation as a compact card, or pin it beside the page. It covers planning, progress, blockers, predictive analysis and task management; see [Flurry, the assistant](#flurry-the-assistant) below.
- **A working AI assistant, free:** free questions go to a real AI model, answered from that project's records and the scheduler's estimate. It uses the first of these that's available, and every answer says which one wrote it (see [Turning AI on](#turning-ai-on)):
  1. **The server's AI.** By default the backend finds a free Ollama model running on the same computer by itself, with no keys or settings (`./scripts/setup-local-ai.sh` installs one). Hosted services work too (Groq's or Gemini's free tier, Claude).
  2. **The AI built into Chrome** (Gemini Nano), on your own device. You turn it on once with a click, Chrome downloads the model, and the project's records never leave the computer.
  3. **The built-in model**, which Niveloft trains in your browser on that project's records each time you ask. It's statistics and search rather than a chatbot, and it's labelled as such. See [The built-in model](#the-built-in-model).
  - The server gathers the records after checking membership.
  - Answers cite task keys and list what the records don't show.
  - The AI can suggest a task or a start, which you confirm.
  - Nothing is simulated: without a provider the built-in model answers, labelled as such.
- **Around it:** *Today* shows each active project as a small block of snowpack, and each project's Overview has its own, under the forecast. Every 3D view has a text equivalent beside it, and every one has a still drawing for browsers without WebGL.

A stable sidebar holds the places (Today · My work · Inbox · Projects · Calendar · Reports), your active projects, *Ask Flurry*, help, settings and your account; on phones and tablets it opens as a drawer from the menu button. Each project has eight chapters: Overview, Work, Delivery, Graph, Prediction model, Schedule, People and Settings; the chapters stay under the top bar as the page scrolls, and a chapter's views (Summary, Analytics and Activity under Overview, say) sit just beneath them. The current design is described in [docs/BRAND.md](docs/BRAND.md); [docs/DESIGN_REVIEW.md](docs/DESIGN_REVIEW.md) and [docs/REDESIGN.md](docs/REDESIGN.md) are kept from an earlier redesign.

## What it does

| Question | Where it's answered |
| --- | --- |
| **What needs my attention?** | *Today*: decisions grouped by how soon they're needed, each naming the rule that raised it and the tasks, milestones or people behind it, under your projects' snowpacks. No opaque scores. |
| **How did we get here?** | The project *Model*'s replay, rebuilt from every recorded status change, and the history-and-forecast graph under it. |
| **Will we make the deadline, and how sure is that?** | The delivery forecast at the top of each project's Overview and of Reports: a window, the most likely date, the chance of the deadline, what holds it up, the next move and what it assumes. Or ask Flurry, which quotes the forecast and never works out dates of its own. |
| **When will each person, and each kind of member, be done?** | *Prediction model*: a 3D chart of each person's approved work over time, grouped by role, continued into the future by a simulation of their open work at their own pace, with a range (optimistic to cautious) and the chance of meeting the deadline. Filter by Owners, Managers, Members or Viewers. |
| **What's blocking the work?** | *Dependencies* on each task, the dependency map (interactive graph plus an accessible list), threads in the 3D model, blocked/blocking badges on cards, and *Blocked*/*Blocking* items on Today. |
| **What happens next if…?** | *Plan*: a deterministic what-if scheduler over working days and estimates. Preview a scenario (reassign, re-estimate, time off), then apply it in one transaction; stale scenarios are refused. |
| **What proves it's done?** | Acceptance criteria and checklist on every task, evidence-based submissions, and a *review workspace* where Done is only reachable through an approval with every criterion met. |

Ready for real people: sign-up with email confirmation, sign-in alert emails, forgot/reset password, bot protection, a privacy policy and terms, cookie consent with optional analytics, and per-page SEO tags, sitemap and social image (see [Deploy it](#deploy-it)).

Help and polish: site search (press `/`), a questions-and-answers page, a Contact button on every public page, the AI arena, and an operators' Site health page (see [Help, contact, forms and the Arena](#help-contact-forms-and-the-arena)).

Also: ⌘K / Ctrl K search and commands, a calendar agenda with *Hide completed*, a project *Timeline* with a Today rule, analytics built from recorded events (flow over time, review turnaround, rework, time in status), optional server-side AI assistance that never acts on its own, and live updates over Server-Sent Events.

### Roles, and what "Only the assignee…" means

Each project gives each person one **role**, and it applies in that project only: you can be the Owner of one project and a Member of another. The server checks it on every request.

| Role | What they can do in the project |
| --- | --- |
| **Owner** | Everything, including appointing Managers and deleting the project. You're the Owner of every project you create. |
| **Manager** | Plan and assign tasks and milestones, invite Members and Viewers, and review other people's submitted work. |
| **Member** | Create tasks, work on the tasks assigned to them, submit them with evidence, and comment. |
| **Viewer** | Read everything and change nothing. |

**The assignee isn't a role.** It's the one person a task is assigned to, who can be any Owner, Manager or Member. Only the assignee can submit that task for review, and someone else (a Manager or the Owner, never the submitter) approves it. So *Only the assignee can submit this task* means the task is someone else's. Either its assignee submits it, or a Manager reassigns it to you. The board now names the assignee in that message.

**Where to see yours:** every project's header shows **You: Owner** (or your role). Click it for a table of what each role can do, with your column highlighted. The Overview's Team card has the same guide under *Roles explained*.

**"How will you use Niveloft?"** The front page and the sign-up form ask this: *I run projects*, *I lead a team*, *I do the work* or *I follow along*. The answer sets your start page and the *Your first steps* list on Today. It doesn't grant any permissions: you own the projects you create, and in anyone else's project its Owner sets your role. (If people could pick their own permissions, anyone could approve their own work.) In demo mode, choosing one signs you in as the sample person with that role.

> **Verification status — please read.** This code was written in a sandbox that could not reach the npm registry or Maven Central. The backend was compiled against the real source code of its libraries, but **nothing here has been built with npm or Maven, run as a server, or tested against MySQL**. See [Verify locally](#verify-locally) for exactly which checks ran here and which you need to run. Please report anything that fails.

---

## Run it on macOS with VS Code

You need two terminals: one for the backend, one for the frontend.

### Prerequisites (one-time)

| Tool | Check | Install |
| --- | --- | --- |
| Java 21 (JDK) | `java -version` | `brew install openjdk@21` then follow the `sudo ln -sfn …` line Homebrew prints |
| Node.js 20.19+ (22 LTS recommended) | `node -v` | `brew install node@22` |
| MySQL 8 — **either** Docker Desktop **or** Homebrew MySQL | `docker -v` / `mysql --version` | [Docker Desktop](https://www.docker.com/products/docker-desktop/) or `brew install mysql` |

Maven is **not** needed: the backend ships the Maven Wrapper (`./mvnw`), which downloads Maven on first use.

Open the `projectflow` folder in VS Code (**File → Open Folder…**). Recommended extensions: *Extension Pack for Java*, *Spring Boot Extension Pack*, *ESLint*, *Tailwind CSS IntelliSense*.

### Terminal 1 — database and backend

Open a terminal (**Terminal → New Terminal**). Run each command on its own line exactly as shown. (The macOS terminal doesn't treat `#` as a comment, so don't paste notes after a command.)

Start MySQL with Docker Desktop open. This creates the database, user and password, all named `projectflow`:

```bash
cd backend
docker compose up -d
```

*Or*, with Homebrew MySQL instead of Docker:

```bash
cd backend
brew services start mysql
mysql -u root -e "CREATE DATABASE projectflow; CREATE USER 'projectflow'@'localhost' IDENTIFIED BY 'projectflow'; GRANT ALL ON projectflow.* TO 'projectflow'@'localhost';"
```

Then start the backend. `chmod` is only needed the first time.

```bash
chmod +x mvnw
./mvnw spring-boot:run
```

On first start Flyway creates the schema and the demo data seeder fills an empty database. Wait for `Started ProjectFlowApplication`.

- API: **http://localhost:8080/api**
- Swagger UI: **http://localhost:8080/swagger-ui.html** (set `API_DOCS_ENABLED=true` first; it is off by default)
- Health: **http://localhost:8080/actuator/health**

Configuration comes from environment variables (see `backend/.env.example`; no real secrets are committed). The defaults work for local development. For anything shared, set at least `JWT_SECRET` (`openssl rand -base64 48`) and `DB_PASSWORD`.

#### Turning AI on

**The quickest way, free, on your Mac.** In a terminal at the project folder, run:

```bash
./scripts/setup-local-ai.sh
```

- **What it does:** installs Ollama (with Homebrew, or it tells you where to download it), starts it, downloads `llama3.2` (about 2 GB, once) and checks that it answers.
- **Then:** start or restart the backend. It finds Ollama by itself (`AI_PROVIDER=auto` is the default) and logs *AI: using Ollama model 'llama3.2:latest'*. Flurry's header then says **AI model on: llama3.2:latest**.
- **No terminal?** Install the Ollama app from ollama.com, open it, and run `ollama pull llama3.2`.
- **Starting order doesn't matter:** if you start Ollama after the backend, it's found within a minute.

**No server AI (the demo, or a deployed site without a key)?** In Chrome, open Flurry and press **Turn on AI in this browser**.
- Chrome downloads Google's Gemini Nano once. It needs Chrome 148 or later on a Mac, Windows or Linux computer, about 22 GB of free disk space, and either a graphics chip with more than 4 GB of memory or 16 GB of RAM.
- Answers are then written on your device, and the records never leave it.
- Other browsers, and computers that can't run it, keep the built-in model.

**For a deployed site**, set a free Groq or Gemini key on the backend (see [AI providers](#ai-providers)). A backend on Railway or Render can't reach Ollama on your Mac.

With no AI anywhere, free questions are answered by the [built-in model](#the-built-in-model), labelled as such. The AI-only features (review notes, criteria, status updates) then say how to turn AI on. Keys always stay on the server and never reach the browser.

What AI can do:
- turn a brief into a draft plan in Flurry's *Plan a project* (server AI or the AI in Chrome; without either, a simpler plan is drafted from the brief's own lines and labelled as such);
- answer free questions about a project, in Flurry's panel or the Model chapter's *Ask about this project*, and suggest a task or a start for you to confirm (server AI or the AI in Chrome);
- draft review notes (server AI);
- suggest acceptance criteria (server AI);
- draft a project status update (server AI).

Its limits:
- It sees only records the requesting user can already see. For questions, that's the project's tasks, people, milestones, dependencies, status history and the scheduler estimate shown on the page, but no evidence links or files. The AI in Chrome gets the same records, which the page already has, and they stay on the device.
- If the project is too big for the AI in Chrome's context window, it leaves out the status history first, then finished tasks. If it still doesn't fit, it says so rather than guessing.
- User-written text is escaped and marked as data in the prompt.
- Nothing it produces is saved or applied until a person chooses to.
- Requests are limited per user per hour (`AI_MAX_REQUESTS_PER_HOUR`, default 30). A request counts once the provider has replied, even if the reply can't be used.

#### AI providers

`AI_PROVIDER=auto` (the default) uses Ollama on the same computer when it's running, and otherwise has no server AI. `ollama` does the same with only the address you give. `anthropic` talks to Claude. `openai` talks to anything that speaks the OpenAI *chat completions* format, which covers most providers, including free ones. `none` turns server AI off. Model names change often, so take the current one from the provider's list.

| Provider | Cost | `AI_PROVIDER` | `AI_BASE_URL` | `AI_API_KEY` | `AI_MODEL` |
| --- | --- | --- | --- | --- | --- |
| **Ollama** (runs on your computer) | Free | `auto` (default), or `ollama` | leave unset (or another machine's `http://host:11434`) | not needed | leave unset to pick automatically (llama3.2 first), or name one you've pulled |
| **Groq** | Free tier, with rate limits | `openai` | `https://api.groq.com/openai/v1` | a key from console.groq.com | a model from Groq's model list |
| **Google Gemini** | Free tier, with rate limits | `openai` | `https://generativelanguage.googleapis.com/v1beta/openai/` | a key from Google AI Studio | a Gemini *Flash* model from Google's list |
| **Anthropic Claude** | Paid | `anthropic` | leave unset | your `sk-ant-…` key | a current Claude model id from docs.claude.com |
| **OpenAI**, OpenRouter, others | Varies | `openai` | the provider's `/v1` address | your key | a model id from the provider |

- **Ollama and a deployed backend:** a backend on Railway or Render can't reach Ollama on your Mac. Use Ollama for local runs, and Groq or Gemini for a deployed site.
- **Free tiers:** they may use what you send to improve their products, and they limit requests per minute and per day. Check their terms before sending real project data. Niveloft's own limit is `AI_MAX_REQUESTS_PER_HOUR`.
- **Small local models** answer less reliably than large hosted ones. The prompt still asks them to cite tasks and separate facts from estimates. Niveloft uses Ollama's own API so it can ask for JSON and give the model room for the whole project (an 8,000-token context).
- **Speed:** on a laptop, a local model may take 5–30 seconds per answer, and longer the first time while it loads.

#### The built-in model

With or without an AI provider, Niveloft has its own small model. It's trained in your browser, each time you ask, on the records of the project you're asking about, so it only ever sees what you can already see. Nothing leaves your browser. It's statistics and search, not a chatbot, and it says so.

| It learns | From | Used for |
| --- | --- | --- |
| **Each person's pace:** how long their tasks take against their estimates | Finished tasks with an estimate, pulled towards the team average when there are few | "When will CCP-9 finish?", "How long will the API take?" |
| **What makes work late:** a logistic regression over six features (size estimate, priority, how many tasks it waits on, little time between start and due date, the assignee's usual pace, and how often it was sent back for changes) | Finished tasks and open overdue ones. Its accuracy is measured on tasks it didn't see (leave-one-out). It refuses to predict with fewer than 6 examples, or when every example ended the same way. | "What's likely to slip?", "Is CCP-10 at risk?", with the reasons it learned |
| **Which records match your words:** a TF-IDF search index | Task keys, titles, descriptions, acceptance criteria, assignees and milestones | Anything else: it lists the matching tasks and says it can't reason about *why* in your words |

Every answer ends with what it learned from and how accurate it was (for example *lateness from 9 tasks, right about 78% of the time on tasks it didn't see*).

#### The Prediction model

Each project has a **IV Prediction model** chapter.
- **3D chart:** one lane per person, grouped by role (Owners, Managers, Members, Viewers, and unassigned work). Height is the share of that person's tasks approved.
  - Solid is the record, replayed from status changes.
  - After the Today plane, a translucent shape is the typical prediction, and a paler band runs from the optimistic to the cautious one.
  - Drag to turn it, and point at a lane for that person's numbers.
- **Numbers:** the predicted finish with its range, the chance of meeting the deadline, open work and pace. They're shown for everyone, or for one kind of member at a time (the tabs).
- **Tables:** one card per kind of member, and one row per person. Each row shows their pace, when all their work is likely approved, their chance by the deadline, and their riskiest open task according to the built-in lateness model.
- **How:** a Monte Carlo simulation (400 runs, seeded, so the same records always give the same answer), all in the browser.
  - People work through their open tasks one after another.
  - Each task takes its estimate times the person's learned pace, with that pace's spread.
  - A review wait is then added, learned from how long approved tasks sat in review.
  - Unassigned open work is left out, and the page says how much.
- **States:** there's a loading state, an error state with *Try again*, an empty state for a project without tasks, and a notice when no finished task has an estimate yet.

### Flurry, the assistant

**Flurry** is Niveloft's AI project assistant: a small floating snow creature (a rounded body, two expressive eyes, tiny arms and a soft icy-blue glow, recognisable down to 16 px) that lives at the edge of every signed-in page. **Meet it first at `/flurry`**: its look at every size, each behaviour shown live, a sandbox to drag it, click it and ask it about the sample project, and the rules it keeps. Click it for its menu, choose **Ask Flurry** in the sidebar, or press <kbd>Alt</kbd>+<kbd>A</kbd> (<kbd>Option</kbd>+<kbd>A</kbd> on a Mac). Its header always says what's answering: **AI model on: *model name***, **AI model on, in this browser**, or **No AI model: built-in answers**.

**Scope is always visible.** Next to the question box, *Scope* says what Flurry is looking at: the project whose pages you're on (and *Task ONB-9* on a task's page, where "this task" means that task), or **All projects** on Today, My work and the other cross-project pages. It never guesses a project: a question that needs one gets "Which one is this about?" with a button per project. Switching to another project starts a new conversation, so an answer about one project never sits under another; moving between all projects and one adds a visible *Scope: now …* line.

**Questions about one task get answers about that task.** "Why is ONB-9 blocked?", "What depends on ONB-9?", "What's holding up ONB-10?", "Tell me about ONB-7": the answer names that task's state, what it waits on and what waits on it (in the right direction), corrects a wrong premise ("ONB-9 isn't blocked: nothing it waits on is open…"), lists what the records don't show (why it's late, how much is left), and suggests the move that fits: for work waiting for review, **open its review**, never a new date or less scope. Buttons: *Open the task* (or *Open the review*), *Trace dependencies*, *Compare a scenario*.

- <kbd>Alt</kbd>+<kbd>A</kbd> opens the panel. If it's already open, it moves you into it. From inside the panel, with the text box empty, it closes it, and so does <kbd>Esc</kbd>. It never fires while you're typing in another field, so <kbd>Option</kbd>+<kbd>A</kbd> still types "å" there.
- The conversation stays while the panel is closed, until you press **Clear** or sign out.
- Requests made while the project's records are still loading wait for them, rather than being answered from partial data.

**Its three starting abilities** are offered as buttons when the panel opens (*Find your next move.*):

| Ability | What it does | Needs AI? |
| --- | --- | --- |
| **Plan a project** | Paste or type a brief. Flurry drafts up to 12 tasks (title, description, priority, estimate and suggested order) and shows them for review: untick, rename or keep each one. Nothing is created until you press **Create *n* tasks**; it creates them one by one through the normal endpoint with your permissions, adds the suggested order as dependencies, and offers **Undo: remove these tasks** (which deletes exactly what it created, if you're allowed to). It never guesses owners or deadlines: a task only gets an owner or a due date when your brief names that person or states that date, and both are shown for review first. | Optional: with AI the plan is written by the model, which also lists up to 4 open questions; without, it's drafted from the brief's own headings and lines and labelled *Draft plan · from your brief's own lines · no AI* |
| **Summarise progress** | Three separate lists: **What the records show** (approved/in progress/in review counts, the next milestone), **What that suggests** (estimates, labelled as such) and **What the records don't show** (missing owners, missing estimates, anything that isn't recorded). | No |
| **Review blockers** | Only real problems: late work that holds other work up, open work without an owner, reviews waiting a long time, work due after something it waits on. Each has a suggested next move ("Check with Sneha…"), the tasks it's about, and a *Dismiss*. It never reassigns or reschedules anything itself. | No |

It also answers these:

| You type or say | What happens | Needs AI? |
| --- | --- | --- |
| "Draft an agenda for our check-in" | A meeting agenda drafted from the records (progress, blockers, work without an owner, reviews), to copy and edit before sending | No |
| "Will we make the deadline?" · "What's at risk?" · "What changed this week?" | Answered at once from the records and the scheduler's estimate, labelled *Computed from the records · no AI* | No |
| "What should I work on next?" · "Show my tasks" | Your open tasks across projects, in a suggested order (overdue, then in progress, then due soonest), with the reason for each | No |
| "Create a task to write release notes, high priority, due Friday and assign it to Rohan" | A draft you check; **Review and create** opens the normal task form, filled in. Nothing is saved until you press Create, and **Undo** is offered afterwards. | No |
| "Start LIB-8" · "Open LIB-8" · "Show the 3D model" | Start becomes a confirm button (with the usual permission check, and Undo). Open and show just navigate. | No |
| Anything else ("Why did the search API slip?") | With AI (the server's, or Chrome's on your device): an answer from the project's records, with cited tasks, what the records don't show, and any suggested actions as confirm cards. Without AI: the built-in model's answer (lateness risk and its reasons, finish estimates from people's real pace, or the matching records), labelled as such. | Optional |

**What Flurry will and won't do.** Changes always go through the normal endpoints with your own permissions, so Flurry can't do more than you could by hand. It never approves or rejects work, never assigns people or changes a deadline on its own (an owner or a date only comes from what you typed, is shown before anything is saved, and is saved only when you confirm), and never claims to have opened a link or file: evidence links and files aren't in what it's given, and it says so. Anything it isn't told is reported as *not in the records*, never as a finding. Every change is previewed first and can be undone.

**Flurry on your pages.**

| Behaviour | What Flurry does |
| --- | --- |
| **Idle** | Floats gently near an edge, looks around, and its eyes follow the pointer. Now and then it settles on the sidebar. |
| **Roaming** | Moves between a few fixed, safe resting spots (its home corner, the right edge, under the top bar, beside the sidebar, the sidebar itself), only after you've been away from the keyboard and mouse for 30 seconds. |
| **Dragged** | Follows your pointer with a slight trail, arms up, swaying with the movement, then settles exactly where you let go (with a small squash). |
| **Clicked** | Turns towards you and opens a compact menu: **Ask Flurry**, **My next task** and **Delivery outlook**, what needs you (if anything), **Roam**, **Stay here** and **Hide**, and *Size, motion and more*. |
| **Working** | A restrained thinking animation (two flakes circling), only while a real request is being processed. |
| **Task completed** | A brief happy reaction when work you submitted, approved or planned through Flurry saved, then back to idle. |
| **Attention needed** | A small indicator on Flurry. Its menu then says exactly what: the review waiting for you or the late task holding others up, each opening the right page. |
| **Dismissed** | **Hide** sends it flying into its *Ask Flurry* item in the sidebar, asleep there, with **Call back** beside it. |

- **My next task** works it out from the records (no AI): your overdue work first, then work in progress, then what's due soonest; work that can't start yet (it waits on something unfinished) is skipped and said so. Flurry flies beside that task on the page (when it's listed there), points at it and shows a one- or two-sentence note with **Open it** and **Not now**.
- **Delivery outlook** opens the project's Delivery chapter (the one you're in, or the one most at risk) and Flurry points out what holds its riskiest milestone up (see *Delivery outlook* below).
- **The movement has rules.** It pauses while you type, drag tasks or use a menu. It keeps clear of buttons, fields, text and chart labels: if a page loads, fills in or scrolls under it, it moves to a clearer spot (the sidebar perch when nothing else is free). It flies off a field you start typing in. It never lands under the pointer, and holds still while you point at it or focus it with the keyboard. After three quiet minutes it naps (small *z*s).
- **Notes are brief and appear when you ask** (the menu, or selecting a milestone on the delivery outlook). It speaks up on its own only if you turn on *Let Flurry speak up* in Settings → Flurry, and then once per new thing that needs you. Escape or *Not now* closes a note; closing changes nothing.
- **Roam · Stay here · Hide** in its menu (and Settings → Flurry): *Stay here* keeps it exactly where it is (or where you drag it). **Size** (small, medium, large) and **motion** (*Full*; *Calm*: reacts but doesn't float or fly, moving by a short fade; *Off*: completely still) are in Settings → Flurry, which also has the home corner, sounds (off until you turn them on) and pinning the conversation. Reduced motion always means still.
- **Called, it comes**: Ask Flurry, Alt+A or "Hey Flurry" opens the conversation as a compact card in its home corner, and Flurry flies over and perches on it while it's open. **Pin** docks the conversation on the right and the page makes room for it.
- **On phones** it has one fixed spot on the bottom edge and expands into its menu when tapped; the conversation opens full screen.
- **It stays inside Niveloft.** It moves within the page; roaming your desktop and other apps would need a separate desktop companion, which this isn't.
- **When an AI reply can't be read,** Flurry says so in one plain sentence with **Try again**; the technical detail goes to the browser console, not the conversation.

**Voice.**
- **Talking:** press the microphone in the panel and speak, and your words are sent when you stop.
- **Wake phrase:** under *Voice*, you can turn on **Listen for "Hey Flurry"**. It's off by default and remembered for you, on this browser only (another person signing in on the same browser starts with it off). It listens only while the tab is open and visible. Say "Hey Flurry, what's at risk?", or pause after "Hey Flurry" and then give the command.
  - What's actually running is always shown: Flurry shows a small microphone badge that pulses while it's listening, and the panel header says *Listening*, or *Wake paused* while the tab is hidden or push-to-talk is in use.
  - If the browser blocks the microphone, or its speech service keeps stopping, listening switches off and the panel says why.
- **Answers aloud:** **Read answers aloud** speaks replies.
- **Browsers:** voice uses the browser's own speech recognition, so it works in Chrome, Edge and Safari but not Firefox.
- **Privacy:** those browsers may send audio to their maker (Google or Apple) to transcribe it. Niveloft only receives the text, never audio.
- **Voice never confirms:** it can prepare a change, but confirming always takes a click or a key press.

### Delivery outlook

Each project's **III Delivery** chapter (`/projects/:id/delivery`) answers *when is this likely to be delivered?* Everything on it comes from one forecast run (the same seeded simulation as the Overview's delivery forecast), so the readings, the path, the chart, the table and Flurry's note can't disagree.

- **Four readings:** the **target** (the project's deadline), the **median finish**, **85% finish by** (the date the forecast is 85% sure of), and the **on-time estimate** (the chance of finishing by the target). Each is an estimate, labelled as one.
- **Path view** (the default on larger screens): the route to delivery, from the recent past through each milestone to the likely finish, with the likely-finish window (10–90%) as a band, the median dashed, and today and the target marked. The terrain behind it is decoration, not data, and is hidden from screen readers. Milestones are buttons; their labels are laid out in rows so they never overlap.
- **Chart view** (the default on phones): approved tasks over time, recorded then forecast, with the same window and markers; **Show as a table** lists each milestone with its due date, its likely date, its 85% date and what holds it up.
- **The inspector:** select a milestone and it shows the one task holding it up, under a heading that says what kind of hold-up it is: *Awaiting a decision* (a review), *Running late*, *Holding up delivery* (in progress or not started), or *Last to finish* when nothing blocks it. The card gives the assignee, what it holds up, when it went into review (or its due date) and when it's likely to be approved, with **Open the review** or **Open task**. The blocker is chosen from the records: work the milestone's tasks wait on comes first, then reviews, then late work, then the rest; the reason for a delay is never inferred.
- **Flurry at the milestone:** selecting a milestone (or choosing *Delivery outlook* in Flurry's menu) brings Flurry beside it (on the chart, just under its button, so the note covers none of the others), pointing at the blocker, with one sentence and one button, e.g. *"This review is holding up ONB-10. Open it?"* · **Open the review**. The page, the task and the sentence all come from the same records.
- **Preview scenario** (*Compare scenario* above the views, or Flurry's *Preview scenario* in the inspector): try a **smaller scope** (cut a task's estimate to 75% or 50%) or **less time** (assume someone has 80% or 50% of their recorded time, never more). The baseline stays in grey, the scenario is drawn over it as a dashed amber line, and the result line gives the median, 85% and on-time changes. It's marked *Scenario · not applied* until you press **Apply**, which shows the exact estimate changes, saves them through the normal endpoint with your permissions (only managers or a task's assignee or creator may change an estimate), and offers **Undo**. Time is an assumption only and is never saved; nobody is reassigned and no deadline moves.

### Terminal 2 — frontend

Open a second terminal (the **+** in the terminal panel) and run these one at a time. `npm install` is only needed the first time, and again after a dependency changes. It must finish without `npm error` lines before the next command will work.

```bash
cd frontend
npm install
npm run dev:api
```

`dev:api` sends `/api` requests through the Vite proxy to the real backend.

Open **http://localhost:5174**:
- the front page, with a live sample project;
- **Introduction** for a five-minute guide;
- **Sign in**.

Every demo account uses the password **`Password@123`**. The sign-in page lists them in demo mode, and with the backend when `VITE_SHOW_SAMPLE_ACCOUNTS=true` (set in `.env.backend` for local development; keep it off for anything shared):

| Account | Role it demonstrates |
| --- | --- |
| aarav@projectflow.dev | Owner of *Campus Connect Portal*; has pending invitations |
| priya@projectflow.dev | Manager; reviews submitted work |
| rohan@projectflow.dev | Member; works on assigned tasks and submits them |
| vikram@projectflow.dev | Viewer; read-only |

`npm run dev` (without `:api`) starts a **demo mode** that uses an in-browser mock API and stores data in this browser only. It is labelled *Demo* next to the wordmark and is not the real backend.

Stop either server with <kbd>⌃</kbd> + <kbd>C</kbd>. `docker compose down` stops MySQL (add `-v` to delete its data and reseed next time).

### Ports

| What | URL |
| --- | --- |
| Frontend (Vite) | http://localhost:5174 |
| Backend API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| MySQL | localhost:3306 |
| Ollama (optional, free AI) | http://localhost:11434 |

---

## Verify locally

**This release (the snowpack rebuild: design system, shell, front page, Today, Overview, charts, every working page, the 3D views and Flurry), in short.** What ran here, in the sandbox:
- TypeScript syntax and a strict type check of `frontend/src` against the real library types: 0 errors. The backend (two new fields on the task counts and upcoming items, plainer titles) compiled with `javac` 21 against the real library sources, tests included: 0 errors.
- **267 unit tests passed**, including new ones for the snowpack (layer heights, slices, the scroll story, the weak layer), the still drawing (its projection matched against three.js's own camera to a hundredth of a pixel, its labels where the scene puts them, late slices in red), the Overview's snowpack from a project's tasks, Today's project blocks, and the sample's block.
- **Browser suites on the whole app in Chromium** (demo mode, real library sources, software WebGL): the rebuilt front page and workspace (100 checks, new: the block, its labels and tooltip, the scroll story, the sample workspace, the forecast, the role views, phones, no WebGL, Today, the Overview's snowpack, the charts, and no text in capitals or monospace on 19 pages); Flurry, the Delivery outlook and Meet Flurry (68); help, search, forms and printing (89); the calm redesign (7); the Prediction model (10); Flurry's panel and voice (33); the AI in Chrome with a stand-in (14); launch features served like Vercel (24). The first runs found a real bug (the front page's words covered the block, so it couldn't be pointed at or turned), now fixed, and several checks written for the old pages, which were rewritten for the new ones; the last runs passed with no page errors.
- **Hover:** 372 distinct links and buttons on 23 pages all change visibly on hover.
- **Launch audit** on 41 routes, light and dark, at 1440 and 390 px (contrast against WCAG 2.2 AA, phone layout and tap targets, a name for every control, image, canvas and field, one `h1`): the first run found low contrast where content was faded to show what isn't in focus (the front page's layers not being read, the dependency map's tasks off the traced chain, a month label on Today); they now step back with muted colours instead of transparency, and the final run found nothing. All 149 distinct internal links work. **Speed** on a simulated slow phone: first paint 4.9 s on `/` and 3.9–4.3 s on `/login`, `/privacy` and `/introduction` (see *Speed* below).
- Screenshots were checked by eye: the front page's first screen, every layer of the scroll story and every section below it, in light and dark, at 1440 and 390 px; the still drawing against the 3D block; Today, the Overview, the charts, the review workspace, the timeline and the calendar.

What you need to run yourself: `./mvnw verify`, `npm install && npm run typecheck && npm run lint && npm test && npm run build`, the app against MySQL, a real AI provider, and the front page on real devices (see *Known limitations*).

**Checks that ran in the sandbox** (the real packages couldn't be installed, so stand-ins were used where noted)

- **Frontend syntax:** a TypeScript syntax parse of every `.ts`/`.tsx` file in `frontend/src` found 0 errors.
- **Frontend types:** a strict TypeScript check of `frontend/src`, with the same options as `tsconfig.app.json`, found 0 errors in Niveloft code. It ran against the **real** types and source code of every library, fetched from GitHub at the versions `package.json` selects: React 19 (`@types/react`), React Router 7.6, Redux Toolkit 2.8, React Redux 9.2, React Hook Form 7.60, Zod 3.25, date-fns 4.1, Radix, dnd-kit, Sonner 2.0, lucide-react 0.525, tailwind-merge, clsx, three.js (`@types/three` 0.186) and `vite/client`.
  - Self-test: a copy with eight planted mistakes across these libraries produced exactly those eight errors.
  - Caveats: it ran on TypeScript 6.0 rather than 5.8, and Vitest's `describe`/`it`/`expect` used a small stand-in. `vite.config.ts` was reviewed by hand against Vite 7.3's proxy types rather than type-checked. `frontend/tools/seo.ts` was type-checked with Node's types and a minimal stand-in for Vite's plugin types.
- **Frontend tests:** all 267 unit and mock-API tests passed. They ran with a small stand-in for Vitest, and include:
  - the snowpack: layer heights in proportion to their tasks (an empty layer a hairline), one slice per task, the scroll story, and the weak layer (late, unfinished and holding the most work up); the still drawing's projection checked against three.js, its labels and its red slices; a project's snowpack from its tasks and dependencies; Today's blocks (late work laid down once as the weak layer, heights, the flat drawing);
  - Flurry's answers about one task: the right direction (what it waits on, what waits on it, and through them), a corrected premise when it isn't blocked, what isn't recorded kept apart, *open its review* for submitted work, and no answer for a key that isn't in the project; the phrasings that count as a question about one task;
  - *Review blockers* reporting late work that's waiting for review on its own, with the review as the next move (never a new date or less scope);
  - the delivery path: which task holds a milestone up (work it waits on first, then reviews, then late work), each sentence (*"This review is holding up ONB-10. Open it?"*), *Last to finish* when nothing blocks it, the time scale, and milestone labels laid out without overlapping;
  - the forecast's 85th percentile, its whole-project series, and scenario estimates replacing a task's own;
  - Flurry's roaming: resting spots inside the page (and only the bottom edge on phones), never under the pointer or on a field you're using, preferring empty space and new places, getting away from a field, arcs that start and end on their spots and bank into turns, eyes that look at the pointer, and perching on or beside the conversation inside the window;
  - site search (best match first, word starts, accents, filler words, highlighting) and that every link it and the FAQ point at is a real page section;
  - the FAQ's ids and its structured data (which can't break out of its script tag);
  - UTM tags: reading them, referrals, this site not counting as a referrer, cleaning, taking them out of the address, and passing them to analytics once;
  - form counts: batching, sending only numbers, and telling refusals from failures;
  - Arena pairs (never a source against itself, no fixed A/B) and success-rate arithmetic;
  - the demo API's contact messages (saved once when sent twice, bots refused), form counts (unknown forms ignored), sign-up sources, Site health for operators only, marking messages answered, and Arena votes (members only, known sources, ranking);
  - the built-in model's answers to deadline questions;
  - the Prediction model's simulation: recorded history, slower people finishing later, the same answer every time, grouping by role, unassigned work left out, and the chance of meeting a tight or loose deadline;
  - the request policy: timeouts per kind of call, which failures are retried (and that changes are only retried with an Idempotency-Key, and AI never), waiting for `Retry-After`, and unique keys;
  - the AI in Chrome, against a stand-in for Chrome's Prompt API: every spelling of its availability, the download, structured answers, dropping invented task keys and disallowed suggestions, cutting the records to fit a small context, refusing when nothing fits, and older Chrome without structured output;
  - the prompt: records marked and escaped as data, finished tasks left out to fit, and replies with JSON wrapped in prose;
  - the built-in model: pace shrinkage, learning lateness (leave-one-out accuracy), refusing with too little data, search, and each kind of answer;
  - the pop-up lists' fixed order and grouping (by person, due date and priority);
  - how-you'll-use-it choices: adopted once by a new account, never overwriting an account's own choice, and unknown values ignored;
  - the launch files: one HTML file per public page with its own tags, `app.html` and `404.html` kept out of search, the sitemap, robots.txt, per-page preloads, and the build refusing secrets;
  - analytics redaction (ids, query strings and one-time tokens never reach analytics);
  - sign-up needing accepted terms and an empty honeypot;
  - the assistant's command and question parsing (dates like "Friday" or "14/10", task keys typed or spoken, the wake phrase) and its "what next" ordering;
  - the 3D model's own tests;
  - the sample projects (the library fixture and *Launch the mobile onboarding update*: its counts, the late task that holds others up, the unowned work);
  - Flurry's reports: *Summarise progress* keeping recorded facts, estimates and what's missing apart; *Review blockers* naming only real problems (and not normal sequencing), never assigning people; the meeting agenda; an empty and a finished project;
  - *Plan a project*: splitting a brief into tasks (headings, lists, inline lists, sentences), the 20-task cap, the AI plan prompt (the brief marked as data, the rules) and dropping invalid tasks from an AI's reply;
  - the history series and analysis (assumed estimates, missing history, workload wording);
  - the public permission table, which is computed from the same permission rules as the app.
- **Whole app in Chromium:** the app was bundled from real library sources fetched from GitHub (React Router, Redux Toolkit, React Redux, Zod, React Hook Form, dnd-kit, tailwind-merge, three.js r186 and the Tailwind 4 compiler). It ran in demo mode in headless Chromium with WebGL.
  - Every main page was screenshotted in light and dark, on desktop and phone widths, with no console errors. That includes the front page, the introduction, sign-in and registration, and the Model page with its graph, analysis and assistant (shown in its "not available" state, since demo mode has no AI).
  - The 3D model was driven by keyboard, scrubber, replay and camera presets.
  - **The AI in Chrome, end to end:** with a stand-in for Chrome's `LanguageModel`, 11 checks passed:
    - the offer to turn it on, the download progress, and the header switching to *AI model on, in this browser*;
    - a free question answered and labelled *Gemini Nano, in this browser*;
    - an invented task key dropped, *Not in the records* shown, an allowed suggestion shown as a confirm card and a disallowed one dropped;
    - the model given the rules, the records marked as data, and a JSON schema for its answer;
    - the Model page's *Ask about this project* using it too.
  - **Flurry's panel** was driven end to end, with a stand-in for the browser's speech recognition. 33 checks passed:
    - opening it from Flurry and with Alt+A, closing it with Alt+A from inside, focus going back to Flurry, and Alt+A moving focus into an open panel;
    - *Summarise progress* keeping facts, estimates and gaps apart; *Review blockers* naming what holds work up with a next move, and dismissing a suggestion; a meeting agenda;
    - *Plan a project* asking for the brief, drafting from the brief's own lines (labelled *no AI*), creating nothing until confirmed and then exactly the chosen tasks, and *Undo* removing exactly those;
    - the conversation being kept while the panel is closed;
    - forecast, risks, changes and next-work answers;
    - free questions answered by the built-in model, labelled as such, and saying what it can't do;
    - a spoken task request becoming a draft, then a prefilled form, and a task created only after confirming;
    - starting a task after confirming;
    - push-to-talk;
    - the "Hey Flurry" wake phrase opening the panel and answering, the button and header showing it's listening, the setting being stored per user, and turning it off.
  - Icons, Radix menus and dialogs, and toasts were simple stand-ins in these screenshots; the charts are the app's own.
  - **The front page and the workspace, end to end:** 100 checks passed, with no page errors, using the real Geist and Archivo font files. They cover:
    - the first screen: the promise as the page's heading, set in the wide display face; who it's for, in sentence case; one primary action and the way to sign up; the *Demo* tag; the readings from the sample (17 tasks, 6 people, the likely finish, the chance of finishing on time); the block hidden from screen readers, a still drawing first, then the 3D block; the weak layer's label (*ONB-9, 2 days late*, holding up 3 tasks) and the four layers with their real counts;
    - pointing at a slice naming its task, layer and owner, and a click on it going to the sample workspace;
    - the scroll story: the five layers read top down, one at a time, with their titles and the weak layer's task and what it holds up; past them, the block no longer covering the page;
    - deep links to `/#how`, `/#roles`, `/#flurry` and `/#questions`; the navigation; *Open the sample* in the header; Flurry's section; the five questions opening in place; the ways in (create a workspace, log in, step into the sample as a role); the footer's legal links and cookie settings; nothing left of the old front page and no invented customers; *Create your free workspace* going to sign-up; the night block in the dark theme;
    - the sample workspace (blocked work can't start, submitting, approving, owners, filters, the list and timeline, Reset), the four role views (keyboard included) and the forecast playground (each assumption moving the window, and Reset);
    - without WebGL: the still drawing staying, the layers still read in words, and Today's blocks drawn flat;
    - phones: no sideways scrolling, the heading and main button on the first screen, the block staying at the top while each layer's words pass beneath it, the menu, the sample workspace, Today's projects swiping sideways, Flurry's compact button and full-screen panel, and a project's Overview fitting;
    - the workspace: Today's greeting, each active project a block in one 3D scene (decoration, with the same in words), the strata bar's order, *Needs you* grouped by how soon, a tile opening its project, no clock stamp, avalanche or chart library left, the light behind the pages and the snowfall turning on and off; the Overview's snowpack, its sentence, the layers with counts and shares, a layer opening its tasks, a slice naming and opening its task; a chart's readout following the pointer and the arrow keys, and its table view;
    - no text set in capitals by CSS and no monospaced labels on 19 pages.

    Screenshots of every part of the front page, the sample workspace, Today, the Overview and the phone layouts were checked by eye in light and dark.
  - **Flurry, the Delivery outlook and Meet Flurry, end to end:** 68 checks passed, with no page errors. They cover:
    - the companion: labelled for screen readers; roaming by default but staying put while you work, and moving to another safe spot (not on a control) only after you've been away; not sitting on a control after a page loads; the indicator when something needs you; eyes following the pointer, wherever it rests; curious when pointed at; no pop-ups it wasn't asked for; clicked, the compact menu (*Ask Flurry*, *My next task* and *Delivery outlook*, what needs you, *Roam*, *Stay here* and *Hide*) and turning towards you; *Ask Flurry* perching by the conversation, scoped to all projects on Today, and free again when it closes; dragged, stretching and trailing, settling exactly where it's let go, and a drag not opening the menu; *Stay here*; *My next task*'s note from the records, and Escape closing it with nothing changed; settling while you type; *Hide* into the sidebar, Alt+A still working, and *Call back*; size, motion off and *speak up* in Settings;
    - the Delivery outlook: the four readings; the path by default on a large screen; the terrain marked as decoration; selecting a milestone showing its blocker; Flurry beside the milestone, pointing at the blocker and saying *"ONB-9 is 2 days late and holding up ONB-10. Open it?"*, with *Open it* going to the task; the chart reading the same snapshot and keeping the selection, Flurry's note there covering none of the milestones, and its table; a scenario compared with the baseline and labelled, changing nothing; *Apply* showing the exact change and saving it through the normal task update; Flurry's *Delivery outlook* opening the outlook and pointing out the blocker;
    - the answers: on Today a project question asking which project; "Why is ONB-9 blocked?" answered about ONB-9, correcting the premise and keeping what isn't recorded apart; a visible scope change; dependency direction; work in review getting *open its review*, not a new date; switching projects starting a new conversation;
    - Meet Flurry: the character at every size in both themes, every behaviour live, the rules (including staying inside Niveloft), the sandbox saying there's no AI, dragging and settling, *Delivery outlook* pointing out the blocker, the conversation answering from the sample, *Hide* and *Call back*, and everything still with reduced motion;
    - phones: Flurry's one fixed spot on the bottom edge, staying there and expanding into its menu when tapped; the outlook opening on the chart; Meet Flurry fitting the screen.

    Screenshots of Meet Flurry, its sandbox, the outlook with Flurry at a milestone, and the scoped answers were checked by eye.
  - **Prediction model, end to end:** 10 checks passed, with no page errors:
    - the page opening at its own address, and the chapter showing in the header;
    - the 3D chart drawing;
    - a row per person, and the predicted-finish tile;
    - filters for each kind of member, with the rows following the filter;
    - the method explained;
    - no sideways scrolling on a phone;
    - the empty state for a project without tasks.

    Screenshots in light and dark were checked by eye.
  - **Calm redesign, end to end:** 7 checks passed, with no page errors:
    - the front page's four choices, and the button following the choice;
    - *Try it as Member* signing in as the sample member and opening My tasks;
    - *Your first steps* on Today;
    - the Overview's six cards being the same height in each row;
    - a column's pop-up grouping people alphabetically;
    - no sideways scrolling on a phone.
  - **Help, contact, forms and the Arena, end to end:** 89 checks passed, with no page errors. They cover:
    - the header staying put and lifting with a shadow, the reading-progress line, back to top (and focus returning to the content), and the front page's main button going to the sample;
    - site search: `/` and ⌘K, results as you type with highlights, Enter opening the FAQ answer expanded, the no-results message, Escape;
    - the FAQ: every answer, *Last updated*, structured data, expand and collapse all, the filter and its count, copying an answer's link (checked on the clipboard), *Ask us* starting a message, and closing a started message asking first;
    - the contact form: the error summary jumping to a field, the confirmation taking focus;
    - phones: the menu (every page, search, contact, sign-in; `aria-expanded`), no sideways scrolling on the front page, FAQ, sign-up, Arena, Site health and a project, the app's menu, and the project chapters staying under the top bar;
    - printing (emulated): header, footer and floating buttons hidden, the print header, answers expanded, white paper even in the dark theme, the note in place of the 3D chart; PDFs were rendered and checked by eye;
    - sign-up: UTM tags taken out of the address bar (other parameters kept), the error summary, password rules ticking, the show/hide button;
    - Site health: closed to non-operators (and not in their menu), form success rates, the sign-up's campaign, spending, the tagged-link builder, a contact message arriving and being marked answered;
    - the loading bar, *Updated just now* with refresh, copying a task key, the discard question (*Keep editing* keeps what was typed), ⌘K's help answers, and *Skip to content* on the first Tab;
    - the Arena: the message when only one source is available; with a stand-in for the AI in Chrome, two hidden answers, voting, the sources revealed and the scoreboard updated.

    They also found and fixed an old bug: ticking a checklist item emptied the task page until it was reloaded.
  - **Hover and ARIA:** every distinct link and button on 21 pages (338 of them in the latest run, including the sidebar, Flurry and the front page) was hovered and changed visibly, with a pointer cursor (drag handles show a grab cursor). An ARIA check on the same pages and on the contact, search, command-palette and discard dialogs found nothing: every control named, references to real ids, no duplicate ids, labelled landmarks, one `main` and one `h1`, no skipped heading levels, popup buttons with `aria-expanded`.
  - **Launch features, end to end:** 24 checks passed. They cover:
    - static per-page titles, canonical links and social tags;
    - `noindex` on app pages, a real HTTP 404, robots.txt and the sitemap;
    - the security headers, icons and manifest;
    - the cookie banner (nothing loads before yes; "no" loads nothing; changing the choice later works and is remembered);
    - sign-up validation, the terms box and the hidden honeypot;
    - the sign-up form's four ways of working, and the choice being kept for the new account;
    - a new account landing on the introduction, signed-in pages being `noindex`, and the 404 for signed-in people;
    - one-time tokens being removed from the address bar;
    - no Content-Security-Policy violations.

    They also found and fixed an old bug: after sign-up the app sometimes jumped to Today instead of the introduction.
  - **Served like Vercel:** the pages were served the way `vercel.json` describes, with clean URLs, the app rewrite, a real 404 status and every security header including the Content-Security-Policy. No page logged a policy violation.
  - **Launch audit:** 34 routes (public pages, account pages and every signed-in page) were checked in light and dark, at 1440 px and 390 px wide:
    - text contrast against WCAG 2.2 AA;
    - no sideways scrolling on a phone;
    - tap targets of at least 24×24 px, or spaced as WCAG allows;
    - a text alternative for every image, canvas, icon button and form field;
    - one `h1` per page.

    The first run found low contrast in three colours used on almost every page (the "flow" of the wordmark, the lightest grey, and warning amber), two pages wider than a phone, and a few small targets. All are fixed. After the new palette, the audit was run again: no contrast, naming or phone-width problems in either theme, and one small link on the Milestones page, which was then enlarged. For the Arena release it ran on 38 routes and found four small links in FAQ answers, which were enlarged. **For Niveloft** it ran on 39 routes (adding Settings → Flurry) with the new palette, fonts, sidebar, front page and Flurry: the first run found two three.js deprecation warnings in the console and low contrast on a dimmed setting in Settings → Flurry; both are fixed, and the final run found nothing in either theme at either width, with no console errors.
  - **Links:** all distinct links found on those pages (156 in the latest run) were followed and none is broken. The only external links were the sample project's evidence links, which now use the reserved `.example` domain so they're clearly fictional.
  - **Speed:** measured on a simulated slow phone (Lighthouse's mobile profile: 1.6 Mbps, 150 ms round trips, 4× slower CPU), with a minified, compressed demo-mode bundle. Results:
    - **The snowpack release:** first paint 4.9 s on `/` (729 KB transferred) and 3.9–4.3 s on `/login`, `/privacy` and `/introduction` (534–570 KB). The first run measured 5.7 s on `/`: the page rendered the sample workspace, the forecast and the role views before its first screen could paint. They now load as separate pieces once the first screen is up (or as soon as you scroll near them), and the sample's forecast is worked out once instead of four times; that brought `/` to 4.9 s and its main-thread blocking from 2.5 s to 1.6 s. Most of what remains is the sandbox's many small files over HTTP/1.1 (88 requests); a Vite build served over HTTP/2 has far fewer.
    - **Niveloft:** first paint about 3.5–3.8 s on `/login`, `/privacy` and `/introduction`, and 4.3 s on `/` (largest paint 4.4 s), with 470–660 KB transferred. That's about a second slower than the previous release (2.6 s, 370–540 KB): the new fonts, the sidebar, Flurry and the larger front page add about 100–120 KB.
    - **The mountain release:** first paint 4.5–4.6 s on `/` (774 KB) and 3.9–4.1 s on `/login`, `/privacy` and `/introduction` (520–555 KB); Archivo, the wide display face, is the largest addition (90 KB, loaded only on pages with a wide headline). Building the mountain blocks the main thread for about 1.7–1.9 s after first paint.
    - On `/`, building the 3D scene after the first paint blocks the main thread for about 2.4 s on the slowed CPU (the Niveloft release's world; the mountain now takes 1.7–1.9 s). It starts only once the browser is idle, and the still is showing meanwhile, but on a slow phone the page can feel sluggish for those seconds. Building the terrain in a Web Worker, or keeping the still on low-end phones, would fix that; it isn't done yet.

    The 3D exhibits load after the page is idle, which cut the front page's main-thread blocking by about a third in the earlier release. These numbers come from the sandbox's bundler and a plain HTTP/1.1 server, which splits the code into many more files than Vite does; expect the Vercel build to be at least as fast. Run Lighthouse after deploying for the real figures.
  - The favicon set and the social image were rendered in Chromium from the logo and a frame of the real 3D model. The social image was compressed from 109 KB to 47 KB with no visible change.
- **Backend compile:** all backend main **and test** sources were compiled with `javac` 21 against the **real source code** of their libraries, at the exact versions Spring Boot 3.5.16 selects. The libraries: Spring Framework 6.2.19, Spring Boot 3.5.16, Spring Security 6.5.11, Spring Data 3.5.13, Jakarta Persistence 3.1, Servlet 6.0, Validation 3.0.2, Jackson 2.21, jjwt 0.12.7, swagger-core, JUnit 5.12, AssertJ 3.27, JsonPath 2.9 and Hamcrest 3.0.
  - Result: 0 errors in Niveloft code.
  - Self-test: a copy with three planted mistakes (a wrong import, a wrong Spring method and a wrong MockMvc matcher) produced exactly those three errors.
  - Earlier releases were checked against hand-written stubs, which is how a wrong package for `MissingServletRequestPartException` slipped through; it's fixed.
- **Backend queries and schema:** every derived repository method name (69 property paths) and every JPQL query (8) was checked against the entity fields, and every mapped table and column (129 columns) against the Flyway migrations. None failed.
- **Backend pieces run directly:**
  - *Plan a project*'s check of an AI's reply (`AiService.planTasks`, taken from the source and run with Jackson): 13 checks passed — tasks without titles dropped, text trimmed and cut, only known priorities, real dates and people in the project kept, estimates outside 1–60 days dropped, dependencies only on earlier tasks, and at most 12 tasks;
  - the email sender was run against a stand-in for Resend's API: it sent the right request (key, from, to, subject, reply-to, HTML and text), and it refuses to start without a key;
  - the Turnstile check was run against a stand-in for Cloudflare's verify endpoint: good token, bad token, honeypot;
  - the API rate limit's token bucket (a burst, then an even refill) and the one-line cleaning of browser error reports were run directly;
  - the AI clients were run against stand-ins: an OpenAI-compatible service, and Ollama. For Ollama that covered finding it after a dead address, picking `llama3.2` over other models and skipping embedding models, respecting `AI_MODEL` (and saying so when it isn't installed rather than swapping), reporting when it isn't running, and the request itself (JSON output, 8,000-token context, token limit);
  - also run: the rate limiter, the email texts (escaping, time zone) and client-IP handling behind proxies.
  - the Ollama detection also lists every installed chat model (embeddings left out), and another model answers through the same Ollama (the Arena's server models);
  - **the migrations and the new SQL on a real database engine:** H2 2.3.232 (the version Spring Boot selects, compiled from its source) ran the real migrations V1–V6 in MySQL mode, the mode `./mvnw verify` uses. Then the real `SiteRecords` and `UsageCounters` ran against it through a small stand-in for Spring's `JdbcTemplate`: 27 checks passed, covering contact messages (saved, trimmed, found again as duplicates for ten minutes, marked answered, open ones first), sign-up sources (cleaned tags), form counts per period, the Arena scoreboard, and the database itself refusing a source voted against itself or an unknown outcome;

  They ran with Jackson from the local Gradle install and small stand-ins for Spring's annotations. Spring tests of operations were added:
  - retried creates done once;
  - ten simultaneous submits making one submission;
  - request ids;
  - oversized JSON;
  - browser error reports;
  - usage counters;
  - rate limits and quotas.

  They, a Spring test of the whole account flow, and the other backend tests run only with `./mvnw verify`. The account-flow test covers:
  - sign-up, then confirming the email;
  - the sign-in alert;
  - a password reset ending old sessions;
  - a password change keeping this device signed in;
  - the bot checks.
- **Backend not run:** the Spring tests and application startup were not run. Spring wiring, Flyway itself, MySQL and runtime behaviour are only exercised by `./mvnw verify` (H2) and by running against MySQL on your machine. The new Spring tests (`SiteTest`) cover contact messages, form counts, sign-up sources, Site health access, marking messages answered, Arena votes and the empty model list.
- **Icons:** all 117 lucide icons the app imports exist in lucide-react 0.525.
- **Review:** two independent read-throughs of the Phase 2–6 code were done, and a third of the front page, introduction, graph, analysis and assistant. Their findings are fixed (see CHANGELOG).
- **Not run:**
  - **AI:** it was never called with a real provider here (no key, no network), so its answers are untested. Tests cover the escaping of user text in prompts, the server-side filtering of suggested actions (only *create task* and *start task*, only real task keys) and the unavailable path.
  - **Real voice:** real speech recognition wasn't tested, only the stand-in.

**Checks you need to run** (they could not run here):

Backend: this compiles the code, applies migrations V1–V6 to H2 (in MySQL mode) and runs the workflow, permission, dependency, planning, search, AI-unavailable, live-update, account (sign-up, email confirmation, reset), operations and site (contact, form counts, sign-up sources, Site health, Arena) tests.

```bash
cd backend
./mvnw verify
```

Frontend (run `npm install` first: this release adds Geist (`@fontsource-variable/geist`) and removes Recharts, Inter and IBM Plex Mono):

```bash
cd frontend
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

Then walk through the demo flow below against the real backend (MySQL).

## Demo flow

1. Sign in as **aarav** → *Projects* → **New project**. In its *VI People* chapter invite `priya@projectflow.dev` as Manager and `rohan@projectflow.dev` as Member; each accepts from their *Inbox*.
2. Create three tasks with **acceptance criteria** (one per line) and **estimates**, assigned to Rohan: *API*, *UI*, *Release*.
3. **Dependencies:** on *UI* add "waits on *API*"; on *Release* add "waits on *UI*". Try to make *API* wait on *Release*: it's refused with the loop it would create. Open *V Schedule → Dependencies* to see the chain; switch to *List* for the same information as text. The chain also shows as threads in *III Model*.
4. **Blocker:** give *API* a due date in the past. *Today* now shows it as **Blocking**, and Rohan sees *UI* as **Blocked**, each with the reason.
5. **Scenario:** as aarav open *V Schedule → What if*. Add "Rohan is away 3 days" and re-estimate *API*. Compare the projected finish (labelled as an estimate), then **Apply**. Rohan is notified of moved dates. If someone edits a task in between, the apply is refused as out of date and you recalculate.
6. **Submit:** as **rohan** open *API* → **Start work** → tick the checklist → **Submit for review** with a repository URL, a deployment URL and a screenshot. Dragging the card to *Done* is refused (the server refuses it too: `409 WORKFLOW_VIOLATION`).
7. **Request changes:** as **priya** → *Today* → *Review waiting* → **Open review**. Mark one criterion *Not met*, write feedback, **Request changes**. The task returns to *In Progress*.
8. **Resubmit** as rohan (version 2). The review workspace shows *What was asked in version 1* next to the new evidence.
9. **Approve** as priya with every criterion *Met*. The task is *Done*; both versions and both reviews are kept. *UI* is no longer blocked.
10. **Timeline and analytics:** *V Schedule → Timeline* shows the recorded work against the Today rule and deadline; *I Overview → Analytics* updates flow, review turnaround, rework and time in status. Other signed-in users see these changes live, without refreshing.
11. **Model:** open *III Model*. Drag to turn it, scroll to zoom, or use the arrow keys to move between tasks and Enter to open one. Press **P** (or the play button) to replay the project day by day; *API* turns amber when submitted and bronze when approved.

The seeded data already includes overdue blockers (CCP-10, MBA-4) holding up other work, review revisions (CCP-5, CCP-13, MBA-3), a workload imbalance and completed milestones.

## Deploy it

The frontend is a static site (for example on Vercel). The backend and MySQL need a host that runs containers or Java, such as Railway or Render. `backend/Dockerfile` builds the backend on any host that accepts a Dockerfile. The backend listens on the host's `PORT` if it sets one.

**Backend settings** (environment variables on the backend service; `backend/.env.example` lists them all):

| Key | Value |
| --- | --- |
| `DB_URL` | `jdbc:mysql://HOST:PORT/DATABASE?sslMode=REQUIRED&serverTimezone=UTC&characterEncoding=utf8` |
| `DB_USERNAME` / `DB_PASSWORD` | From your MySQL provider's connection page |
| `JWT_SECRET` | The output of `openssl rand -base64 48`. The server refuses to start without it when the database isn't local. |
| `CORS_ALLOWED_ORIGINS` | The frontend's address, e.g. `https://your-app.vercel.app`, with no `/` at the end (comma-separate several) |
| `APP_URL` | The same address. Links in emails point here. |
| `DEMO_DATA` | `false`. The sample accounts' password is published in this README. |
| `EMAIL_PROVIDER` | `resend` |
| `EMAIL_API_KEY` | Your Resend API key (`re_…`) |
| `EMAIL_FROM` | e.g. `Niveloft <no-reply@yourdomain.com>`, on a domain you verified in Resend |
| `REQUIRE_HTTPS` | `true` |
| `TRUSTED_PROXIES` | `1` (Railway and Render each put one proxy in front of the app) |
| `TURNSTILE_SECRET_KEY` | Optional: your Cloudflare Turnstile secret key |
| `API_REQUESTS_PER_MINUTE` … `EMAIL_MAX_PER_MONTH` | Optional: rate limits, quotas and spending caps (see [Operations](#operations-limits-retries-monitoring-and-backups)); the defaults suit a small team and Resend's free tier |
| `AI_PROVIDER` | `openai` with `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL` for Groq's or Gemini's free tier, or `anthropic` (see [AI providers](#ai-providers)). Left unset, there's no server AI on a host without Ollama; people can still turn on the AI in Chrome, and the built-in model always answers. |

Start with an empty database; Flyway creates the tables on first start.

**Frontend settings** (on Vercel, with *Root Directory* set to `frontend`; `frontend/.env.example` lists them all):

| Key | Value |
| --- | --- |
| `VITE_USE_MOCK_API` | `false` |
| `VITE_API_BASE_URL` | The backend's address plus `/api`, e.g. `https://your-backend.up.railway.app/api`. The build refuses `http://`. |
| `VITE_SHOW_SAMPLE_ACCOUNTS` | `false` |
| `VITE_SITE_URL` | Your site's address (on Vercel the production domain is used when it's empty) |
| `VITE_OPERATOR_NAME` / `VITE_CONTACT_EMAIL` | Who runs the site and how to reach them; shown on the privacy policy and terms |
| `VITE_TURNSTILE_SITE_KEY` | Optional: the Turnstile site key matching the backend's secret |
| `VITE_ANALYTICS` / `VITE_GA_MEASUREMENT_ID` | Optional: `vercel` for Vercel Web Analytics, and/or a GA4 id (`G-…`). Either one turns on the cookie banner. |

`VITE_…` values are built into the site, so redeploy after changing them. Uploaded evidence is stored on the backend's disk (`STORAGE_DIR`). Attach a persistent volume at `/app/data`, or uploads are lost when the backend is redeployed.

### Real sign-ups and account emails

With `EMAIL_PROVIDER=resend`:

1. **New accounts confirm their email.** The confirmation link works once, for 24 hours. The person then signs in with their password; confirming deliberately doesn't sign anyone in. That way, if someone registered your address first, you still have to reset the password, which shuts them out. Until the address is confirmed, signing in says so and offers a new link.
2. **Every sign-in sends an alert** with the time, the device (such as "Chrome on macOS") and the IP address, and a link to reset the password. Alerts only go to confirmed addresses.
3. **Forgot password** emails a link that works once, for 1 hour. Resetting signs the account out everywhere, and sends a "your password was changed" email. So does changing the password in Settings (that device stays signed in).

Details of the account emails and limits:
- **Links:** they're stored only as SHA-256 hashes and work once, even if clicked twice at the same moment. A password reset or change retires every older link and closes the account's live-update streams.
- **Privacy of answers:** they never reveal whether an address has an account, except at sign-up.
- **Names:** confirmation and reset emails don't include the name typed at sign-up.
- **Password length:** passwords over 72 bytes (BCrypt's limit) are refused with a clear message.
- **Rate limits** count only wrong passwords (30 per address and 10 per account per address in 15 minutes). There's deliberately no account-wide limit, which anyone could use to lock a chosen person out. IPv6 addresses are limited per /64 network.

Setting up email:
1. Create a Resend account and an API key.
2. Verify a domain you own in Resend (it gives you DNS records to add).
3. Set `EMAIL_FROM` to an address on that domain.

Without a verified domain, Resend only delivers to your own account's address, which is enough to test with.

- **Local development:** `EMAIL_PROVIDER=log` writes each email, links included, to the backend log instead of sending it.
- **Without email:** with `EMAIL_PROVIDER=none` accounts work at once, and "Forgot password?" is hidden because nothing could be sent.

### Launch checklist: what's in place

| | What's in place | Where |
| --- | --- | --- |
| **Privacy and terms** | A privacy policy and a terms page, in plain language. The policy lists the analytics and bot check this copy actually uses. Sign-up needs a ticked "I agree". | `/privacy`, `/terms` |
| **Secrets** | The frontend holds none; `vite build` fails if the bundle contains an API key or private key. With the real backend, the demo API and its sample password are left out of the bundle. The backend refuses the public default `JWT_SECRET`. | `frontend/tools/seo.ts`, `JwtService` |
| **HTTPS** | Vercel serves HTTPS only and sends HSTS (`vercel.json`). The backend redirects plain HTTP with `REQUIRE_HTTPS=true` and sends HSTS on HTTPS. The build refuses an `http://` API address. | `vercel.json`, `HttpsFilter` |
| **Security headers** | Content-Security-Policy, X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy. The microphone is allowed for voice input only. | `vercel.json` |
| **Cookie consent** | A banner appears only when analytics are configured; "No, thanks" is as easy as yes. *Cookie settings* in the footer and in Settings changes the choice later, and turning analytics off deletes Google's cookies. | `features/consent` |
| **Analytics** | Vercel Web Analytics and/or GA4, loaded only after consent. Addresses are sent with ids and query strings removed. | `features/analytics` |
| **Titles and descriptions** | Every public page has its own title, description, canonical link and social-preview tags. They're in static HTML too, because link previews don't run JavaScript. Signed-in pages are `noindex`. | `src/seo/pages.ts` |
| **Social preview image** | A 1200×630 image with a frame of the real 3D model, compressed to 47 KB. | `public/og-image.png` |
| **Favicon** | SVG (switches for dark browser tabs), ICO, Apple touch icon, and 192/512/maskable app icons, plus a web manifest. | `public/` |
| **Sitemap and robots.txt** | Generated at build time. Signed-in and emailed-link pages are disallowed. | `dist/sitemap.xml`, `dist/robots.txt` |
| **404 page** | A custom page, served with a real 404 status by Vercel (`404.html`). | `PublicNotFoundPage` |
| **Bot protection** | A honeypot field, and limits per IP address and per account on sign-up, sign-in (only failures count), emailed links and resets. Cloudflare Turnstile is optional. | `RateLimiter`, `HumanCheck` |
| **Form validation** | Every form is checked in the browser and again on the server, with the same messages. | `lib/forms.ts`, `Requests.java` |
| **One call to action** | The front page has one button, *Create your free account*. Everything else there is a quiet text link. | `HomePage` |

### After deploying

- Run Lighthouse (Chrome DevTools → Lighthouse, mobile) on `/`, `/login` and `/privacy`.
- Share the address in a chat app to see the social preview.
- Submit `sitemap.xml` in Google Search Console.
- Sign up with a real address and click through the emails.

## Troubleshooting

**"Can’t reach the Niveloft backend" or "The backend isn’t running" on the sign-in page.** The frontend is up but Spring Boot isn't answering on port 8080. Look at the backend terminal:

| What you see there | Fix |
| --- | --- |
| Nothing / you never started it | `cd backend && docker compose up -d && ./mvnw spring-boot:run`, then wait for `Started ProjectFlowApplication` |
| `Communications link failure` or `Connection refused` to MySQL | MySQL isn't running: start Docker Desktop, then `docker compose up -d` (or `brew services start mysql`) |
| `Access denied for user 'projectflow'` | The database user doesn't exist or has another password; see *Option B* above, or set `DB_USERNAME`/`DB_PASSWORD` |
| `Port 8080 was already in use` | Stop the other process (`lsof -i :8080`) or run with `SERVER_PORT=8081` and start the frontend with `PROJECTFLOW_API_TARGET=http://localhost:8081 npm run dev:api` |
| `release version 21 not supported` / `invalid target release` | Maven is using an older JDK: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` |
| `./mvnw: Permission denied` | `chmod +x mvnw` |
| `no such service: #` from Docker | A note after `#` was pasted with the command. Run `docker compose up -d` on its own. |
| `COMPILATION ERROR` | Please send me the first error lines. To start the app while a *test* fails to compile, `./mvnw spring-boot:run -Dmaven.test.skip=true` skips compiling tests. |
| A Flyway error after an earlier run | Reset the local database: `docker compose down -v && docker compose up -d` |

**Frontend terminal errors.**

| What you see there | Fix |
| --- | --- |
| `npm error code EINVALIDTAGNAME` … `Invalid tag name "#"` | A note after `#` was pasted onto the command line. Run `npm install` on its own. |
| `Cannot find package '@tailwindcss/vite'` or `failed to load config from …vite.config.ts` | `npm install` didn't finish. Run it again in the `frontend` folder and wait for it to finish without `npm error` lines. |
| `Port 5174 is in use` | Another dev server is still running. Stop it with <kbd>⌃</kbd> + <kbd>C</kbd> in its terminal. |

**"The backend is running but not healthy".** Spring Boot started but reports `DOWN`, almost always because MySQL went away. Start MySQL and restart the backend.

**"The server failed without explaining why".** The backend returned an error without its usual JSON. The real cause is in the backend terminal (a stack trace); please send it.

## Help, contact, forms and the Arena

**Finding your way**
- **Site search:** press `/` (or ⌘K / Ctrl K) on any public page, or use the search button in the header. It finds every FAQ answer, introduction chapter and policy section as you type, highlights the words it matched and opens the right place (FAQ answers open expanded). It runs in the browser; nothing is sent. Signed in, ⌘K shows the same answers under *Help*, next to your tasks and projects.
- **Questions and answers** (`/faq`): 24 answers in 7 topics, each expandable, with its own link (`/faq#only-the-assignee` opens it) and a *Copy link* button. *Expand all*, *Collapse all*, a filter that narrows the list as you type, *Print*, and *Last updated*. Search engines get the answers as FAQPage structured data. The front page shows the five most asked.
- **Menus on phones:** the public header folds into a menu (pages, search, contact, sign-in, theme); the app's *Index* lists every place, including the Arena, Help and Contact.
- **Getting around long pages:** the header stays at the top with a thin reading-progress line along its edge and a soft shadow once you scroll; a *back to top* button appears after a screen and a bit, and returns keyboard focus to the start of the content; the front page has a down arrow that skips the 3D preview; *Skip to content* is the first thing the Tab key reaches. In a project, the chapters (and the chapter's views) stay under the masthead.

**Contact.** A *Contact* button sits in the corner of every public page (and under your name in the app, in the Index, and next to any error that has a reference). Messages are saved for the operators and, when email is set up (`EMAIL_PROVIDER=resend` and `CONTACT_EMAIL`), emailed to them with the sender as the reply-to address. The form has the same bot protection as sign-up. A message sent twice by accident (a double click, a retry) is saved once.

**Forms.**
- **Errors:** every field says what's wrong; when there's more than one problem, a summary at the top lists them, and each one jumps to its field.
- **Success:** forms end in a clear confirmation (the contact form turns into one), and settings show *Saved* beside the button.
- **Passwords:** every password field has a show/hide button and a Caps Lock warning, and the rules tick off as you type (8+ characters, a letter, a number, both passwords match).
- **Unsaved changes:** closing a changed form (Cancel, ×, Escape, a click outside) asks *Discard your changes?*; leaving the page asks too.
- **Confirmations:** anything that can't be undone asks first: deleting, leaving, removing people, revoking an invitation, removing a dependency, applying a plan, and marking more than a few notifications read.

**Measuring (without tracking people)**
- **Form success rates:** each form reports four moments (shown, sent, accepted, refused or failed) as daily counts. No contents, no identity, no cookies. Operators see them per form, worst first.
- **UTM tracking:** tags on the link someone arrived from (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`), or the referring site, are kept for the visit, taken out of the address bar, and saved with a new account or a contact message. Operators see which campaigns bring sign-ups; Site health has a builder for tagged links. With analytics consent they also reach Google Analytics on the first page view.

**Site health** (`/site-health`, only for accounts in `OPERATOR_EMAILS`): form success rates, where new accounts came from, contact messages (mark them answered), and spending against the caps, for the last 7, 30 or 90 days.

**The Arena** (`/arena`): ask a question about one of your projects; two answer sources reply side by side with their names hidden. Pick the better one (or *about the same*, or *both poor*), and the names are revealed. The scoreboard counts wins across everyone on the site. The sources are the built-in model, the AI in Chrome (when turned on) and every chat model installed in Ollama on the server (or the one hosted model that's configured). Only the outcome is stored, not the question or the answers.

**Loading and freshness.** A thin bar runs along the top of the window while data loads (fast loads show nothing), pages show their shape as soft placeholders instead of a spinner, and data pages say *Updated 3 min ago* with a refresh button.

**Printing.** Pages print on white with dark text, without navigation, buttons or floating controls, with every answer expanded, links followed by their address, and a small header saying what was printed and when. 3D scenes are replaced by a note pointing to the table with the same numbers. FAQ, Reports, a project's summary, the Prediction model and Site health have a *Print* button.

**Hover, focus and screen readers.** Every link and button changes when pointed at (checked on 21 pages), buttons press down slightly when clicked, and focus rings show for keyboard users. Dialogs are named, confirmations are `alertdialog`s, menus say whether they're open, live regions announce copying, saving and search results, and icon-only buttons have names.

## Operations: limits, retries, monitoring and backups

What keeps Niveloft working when many people use it at once, the network drops, or someone (or something) sends too much. Every limit is an environment variable (`backend/.env.example`); 0 turns it off.

**Rate limits.** Over a limit, the API answers `429` with a `Retry-After` header. The app waits that long and retries once or twice before showing the message.

| Limit | Default | Variable |
| --- | --- | --- |
| API calls per signed-in person | 300 a minute | `API_REQUESTS_PER_MINUTE` |
| API calls per IP address without a sign-in | 120 a minute | `API_ANONYMOUS_PER_MINUTE` |
| Changes per person | 60 a minute | `API_WRITES_PER_MINUTE` |
| File uploads per person | 60 an hour | `API_UPLOADS_PER_HOUR` |
| Sign-in, sign-up, emailed links | per address and per account (unchanged) | — |
| AI requests per person | 30 an hour | `AI_MAX_REQUESTS_PER_HOUR` |

**API limits.**
- **Sizes:** JSON bodies up to 512 KB (`API_MAX_JSON_KB`; larger gets `413`). Files up to 10 MB each, 5 per submission, 55 MB per upload, checked in the browser first.
- **Pages:** lists are paginated, at most 100 per page, and 500 tasks per page for the board.
- **Capacity:** a project holds up to 5,000 tasks, 200 people and 1 GB of files. A person can own up to 100 projects. Each limit's message says what to do.

**Spending caps** (whole server; reached: the feature says so and waits for the next day or month, nothing is charged beyond it):
- **AI:** 1,000 requests a day and 5 million tokens a month (`AI_MAX_REQUESTS_PER_DAY`, `AI_MAX_TOKENS_PER_MONTH`). Tokens are counted from the provider's own figures, or estimated at 4 characters each when it doesn't say. A warning is logged at 80%. When a cap is reached the assistant falls back to the AI in Chrome or the built-in model.
- **Email:** 100 a day and 3,000 a month, Resend's free tier (`EMAIL_MAX_PER_DAY`, `EMAIL_MAX_PER_MONTH`). Over it, emails aren't sent and the log says so.
- **Where they're counted:** in the database, so restarts and extra servers can't reset them.

**No duplicates.** Niveloft has no payments or subscriptions, so there's nothing to charge twice. For everything it does create, duplicates are prevented three ways:
1. **An Idempotency-Key on every change.** The app sends one with each create, submit or edit. The same key again (a double click, a retry after a dropped connection) gets the first answer back, marked `Idempotent-Replayed: true`, instead of a second task, comment or submission. A repeat while the first is still running gets `409`; the same key for a different request gets `422`. Keys are kept for 24 hours, per person. Any payment endpoint added later is covered too.
2. **Submitting work locks the task.** Ten simultaneous submits of one task create exactly one submission; the others are told it's already in review.
3. **Database constraints.** One review per submission, one membership per person and project, one number per task.

**Timeouts and failed requests.**
- **Browser:** the app gives up on a call after 20 s (2 minutes for uploads, 200 s for AI). It retries lost connections, timeouts and busy servers (502/503/504) twice with growing waits. Reads always retry; changes only because of their Idempotency-Key; AI never does (each request costs).
  - When the device is offline, a bar across the top says so.
  - A crash in a page shows a recovery screen and is reported to the server log.
- **Server:**
  - requests from slow clients are dropped after 20 s;
  - database queries are stopped after 15 s and transactions after 30 s;
  - waiting more than 10 s for a free database connection gives `503` with "the server is busy, nothing was changed, try again";
  - calls to AI and email services have their own timeouts;
  - deploys finish the requests in flight (graceful shutdown).

**Database.**
- **Indexes (migration V5):** inbox filters, deadlines, milestones, review queues, pending invitations, expired links and storage per project.
- **Queries:**
  - *My work* loads only your tasks;
  - *Projects* loads tasks only for the page shown;
  - the inbox is filtered and paged by the database instead of in memory.
- **Caching:** analytics and status history are cached per project for a minute, and emptied the moment anything in the project changes. The browser keeps each answer for a minute and shares it between pages. Built files are cached for a year, since each name changes when its content does.

**Error logging.** Every request gets an id: the caller's `X-Request-Id` if it's safe, or a new one.
- **Where the id appears:** in every log line of that request, in the response header, and in error bodies. The app shows it on server errors ("Reference: …"), so a report leads straight to the log.
- **What's logged:** failed (5xx) and slow (over 2 s) calls, with their time. Crashes in browsers are logged too, through `POST /api/client-errors`: message, page path and stack only, rate-limited.
- **JSON logs:** set `LOGGING_STRUCTURED_FORMAT_CONSOLE=ecs` for one JSON object per line.

**Uptime monitoring.**
- **Health endpoints:** `/actuator/health` (overall), `/actuator/health/liveness` (the app is running) and `/actuator/health/readiness` (it can serve; the database answers).
- **Railway:** `backend/railway.json` makes Railway wait for readiness before switching traffic, and restart the app if it fails.
- **GitHub Actions:** `.github/workflows/uptime.yml` checks the site and the API every 15 minutes, with three tries each. When they fail, GitHub emails you. Set the repository variables `FRONTEND_URL` and `BACKEND_URL` to turn it on.
- **Other monitors:** UptimeRobot or Better Stack (free) can watch `/actuator/health/readiness` too.

**Testing simultaneous users.**
- **Load test:** `node scripts/load-test.mjs --users 50 --seconds 60 --writes --race` runs 50 people at once against your backend. Each one lists projects, opens boards, analytics, Today and tasks, and (with `--writes`) comments.
  - It reports p50/p95/p99 times per request, status codes and throughput.
  - It fails on any server error or a p95 over 1.5 s.
  - `--race` sends 20 identical comments at the same moment and checks that exactly one is created.
  - For raw capacity, start the backend with `API_REQUESTS_PER_MINUTE=0 API_WRITES_PER_MINUTE=0`, or the rate limit will answer some requests with 429, as designed.
- **Backend tests:** `./mvnw verify` also runs the same race inside the tests (ten simultaneous submits, retried creates) plus the rate limit and quotas.

**Backups, and testing that they restore.**
- `./scripts/backup.sh` saves:
  - the database, as a consistent snapshot taken without stopping the app;
  - the uploaded files;
  - a manifest with checksums and every table's row count.

  It keeps the newest 14 (`KEEP`) and refuses a dump that didn't finish.
- `./scripts/restore.sh backups/projectflow-….sql.gz [--uploads …-uploads.tar.gz]` restores. It asks you to type the database name first, and keeps the files it replaces.
- `./scripts/test-backup-restore.sh` proves a backup works:
  1. It backs up, then restores into a scratch database.
  2. It compares every table (row count and checksum) and every file (SHA-256) with the original.
  3. It prints PASS or FAIL per table, then deletes the scratch copy.

  Run it after changing anything about the database.
- **The tools they use:** the MySQL client if it's installed (`brew install mysql-client`), otherwise the one in the `projectflow-mysql` Docker container.
- **Daily backups on a Mac:** for example, a cron line such as `0 2 * * * cd ~/projectflow && ./scripts/backup.sh`.
- **In production:** also turn on your database host's own backups (Railway's MySQL has them).

## Known limitations

- **The name:** "Niveloft" is a working name. Trademark, domain and social-handle availability haven't been checked. Internal identifiers still say `projectflow` (see the note at the top).
- **The 3D blocks** (the front page's, Today's and each Overview's) were only rendered here in headless Chromium's software renderer (SwiftShader), where they draw at a few frames a second, so the smoothness of the falling snow and of the layers lifting as you scroll couldn't be judged. Check them on a real graphics card, a phone and a low-power laptop. Slow hardware gets no shadows and less snow; reduced motion stops the snow and the sway.
- **The block is an illustration of the records:** the layers' thicknesses, the slices and the red weak layer come from the tasks; the hill of fresh snow, the waves between layers and the plinth are decoration. Everything is built from code, with no bought or borrowed models or textures.
- **The still drawing** matches the 3D block's outline exactly (its projection is tested against three.js), but it's flat-shaded, so the light changes a little as the scene fades in.
- **Flurry's movement is judged, not measured.** It roams only after 30 seconds without keyboard or mouse, between fixed spots, and decides whether a spot is clear by sampling what's under it (controls, text, pictures, chart labels and open menus count as occupied). On a very busy page it may pass over content in flight, and when no spot is clear it rests on the sidebar. Moving content that starts on its own must be possible to stop (WCAG 2.2.2): *Stay here*, *Hide* and motion *Off* do that, and reduced motion stops it automatically. If it distracts your team, change the default mode to `'stay'` in `DEFAULT_FLURRY_PREFS` (`frontend/src/features/flurry/flurryPrefs.ts`).
- **Flurry stays inside the Niveloft tab.** It can't roam your desktop or other apps; that would need a separate desktop companion (an Electron or native app), which isn't built.
- **The Delivery outlook's terrain is decoration.** Only the route's milestones, dates and band carry data; the contours and heights mean nothing, and the page says so. Its blocker is chosen by fixed rules (work the milestone waits on, then reviews, then late work), not by a model; the reason for a delay is never inferred.
- **Scenarios:** *Apply* only changes task estimates (through the normal task update, with your permissions, and Undo). *Less time* is an assumption that is never saved, and a scenario never reassigns people or moves a deadline. Estimates that were cut are a scope decision you still have to make real with the team.
- **Exact-task answers** recognise task keys like `ONB-9` and a few phrasings in English ("why is … blocked", "what depends on …", "what is … holding up"). Other questions about a task go to the AI (or the built-in model), which is instructed the same way but can still be wrong.
- **Meet Flurry's sandbox** runs on the sample project's records in the page, with no AI and no server; nothing in it is saved.
- **The compliance checklist and marketing notes you attached** were used as guardrails for wording and behaviour (no invented customers, no hidden AI, no unrequested pop-ups). They aren't legal implementations: cookie, privacy and accessibility statements still need checking for where you operate.
- **The snowfall behind the app** is off unless turned on in *Settings → Appearance*; it's drawn on a 2D canvas at half the screen's frame rate, stops in hidden tabs and under reduced motion, and is kept faint (at most 8% opacity in the light theme and 14% in the dark) so text keeps its contrast.
- **The Overview's snowpack** draws one slice per task: it's meant for projects of up to a few hundred tasks (with more, the slices get thin; the list beside it stays exact). It only reads statuses, due dates and dependencies, and changes nothing.
- **Today shows at most eight projects as blocks** (the least healthy first); *All projects* lists the rest.
- **The ice artwork you supplied spells the name "NIVELOGT".** The code, the site and the documents all say *Niveloft*; the artwork itself isn't used anywhere in the app. If you want to use that artwork, it needs correcting first.
- **Forecast calibration:** each forecast reports how often its 80% ranges held for tasks that are already finished (a leave-one-out check), but with fewer than about 8 finished tasks that figure is marked as too little to judge. On the demo data it's a check of the method, not proof it will hold for your team. The forecast assumes one task at a time per person, working days only, no holidays, and it can't know about work that hasn't been created yet. Tasks nobody owns are assumed to start today, and that's flagged.
- **Effort-weighted progress** only appears when at least 70% of a project's tasks have estimates; otherwise progress is *tasks approved*, which treats every task as the same size.
- **Flurry's artwork** in the marketing sections is the supplied character image; the app and Meet Flurry draw a lighter vector version of it. Expressions are simple (blink, float, eyes that follow the pointer, a curious lean, being carried, pointing, a wave, a nap, a thinking look, a small cheer, a frown).
- **Plan a project without AI** drafts one task per line or sentence of your brief, with default priority and no estimates. It's labelled as such, and it's a starting point, not a plan. With AI, the plan is only as good as the model (small local models give plainer plans).
- **Flurry's mode, size, motion, spot and pin** are remembered per person on this browser, not on the server.
- **Legal pages:** the privacy policy and terms are a plain-language starting point written for this app, not legal advice. Have them checked for where you operate, and set `VITE_OPERATOR_NAME` and `VITE_CONTACT_EMAIL`.
- **Rate limits:** they're kept in memory, so they reset when the backend restarts and aren't shared between several backend instances (spending caps and duplicate protection are in the database, so they are shared).
- **Operations tools, as tested here:**
  - the backup scripts ran against a stand-in for MySQL built on SQLite: backing up, restoring, comparing, retention, and catching a missing row;
  - the load test ran against a stand-in API;
  - the uptime check ran against local servers.

  None ran against real MySQL or the real backend. Run `./scripts/test-backup-restore.sh` and `node scripts/load-test.mjs --race` on your Mac.
- **Prediction model:** people are assumed to work one task at a time, on working days, with no holidays. It doesn't know about work that hasn't been created yet. The *Your time for this project* choice is a what-if: it moves dates, not the effort.
- **Form success rates** come from people's browsers, and the endpoint is open (it has to be, for sign-in and sign-up), so someone could send made-up counts; they're rate-limited per address and only known forms count, but treat the numbers as indicative. In demo mode, counts still waiting when a page reloads are lost.
- **The Arena** hides the sources' names, but their styles can give them away (the built-in model answers in short findings). The scoreboard adds up everyone's votes on the site, across projects.
- **UTM tags** are first-touch for a visit. Without analytics consent they're kept in memory only, so a reload before signing up loses them.
- **Contact messages** are answered by email; there's no reply thread inside the app.
- **Deleting accounts:** there's no "delete my account" button. Deletion requests go to the operator (the privacy policy says so).
- **Speed:** public pages are rendered in the browser, so the first paint waits for the JavaScript. Prerendering them would make it faster.
- Not compiled or run against MySQL in the sandbox (see above).
- Dependencies are finish-to-start and within one project only. The map highlights the *longest chain of open tasks* counted in tasks; it is deliberately not called a critical path.
- The planner is a deterministic simulation over working days (Mon–Fri) and estimates. It doesn't model partial allocation or holidays beyond the time off you add, and its results are always labelled as estimates.
- Live updates use one SSE connection per browser tab and an in-memory registry, so a multi-instance deployment would need a shared broker. Clients refetch through the normal endpoints; events carry ids only.
- Evidence files are stored on local disk (`backend/data/uploads`) without virus scanning. Only PNG/JPEG/GIF/WebP are shown inline; everything else downloads with `nosniff`.
- Niveloft stores evidence links but never opens or verifies them; neither does the AI.
- Demo mode keeps uploaded files only up to 512 KB each, in browser storage. It has no server AI; the AI in Chrome can be turned on there, and the built-in model always answers.
- The built-in model needs a few finished tasks to learn from. On a new project it says what it lacks rather than guessing; with only a handful of tasks, its accuracy figure is rough.
- *How will you use Niveloft?* (the front page and sign-up) is remembered in this browser, not on the server, so another device asks again. It only sets the start page and first steps; permissions always come from each project's roles.
- AI answers can be wrong. They're instructed to use only the records and to separate facts from estimates, and they cite tasks so you can check. The forecast Flurry sees is the one the page shows, computed in the browser by Niveloft's scheduler and labelled as such to the model.
- The AI in Chrome was tested here against a stand-in for Chrome's Prompt API, not the real Gemini Nano (the sandbox's browser doesn't include it). Chrome's API has changed names between versions; Niveloft accepts the old and new names, but check it in your Chrome. It's a small model: expect shorter, less reliable answers than a hosted AI. Only Chrome has it (not Edge, Safari or Firefox), and not on phones.
- The Ollama support was tested against a stand-in for Ollama's API, not a real model. `./scripts/setup-local-ai.sh` was tested with a stand-in `ollama` command.
- With *Keep me signed in* turned off, the session lives in that browser tab only: new tabs ask you to sign in, and the server token itself still lasts 24 hours.
- Flurry understands commands in English. Its speech recognition depends on the browser (none in Firefox) and on a network connection in most browsers. The wake phrase only works while the tab is open and visible.
- The 3D views need WebGL. Without it they show their text equivalents, with links to the Timeline and dependency map. On very large projects (hundreds of tasks) the model will be slower to turn; it only draws when something changes.

## References and credits

Niveloft is an original implementation. Ideas were adapted from four public repositories. Plane (AGPL-3.0) was used for ideas only, and no code was copied from it. One collision-detection algorithm was adapted from dnd-kit (MIT) with attribution. The Maven Wrapper scripts (Apache-2.0) come from the Apache Maven Wrapper project via spring-petclinic-rest.

- [docs/REFERENCES.md](docs/REFERENCES.md): what was inspected in each repository, which ideas were taken and how they were applied, plus licence and compatibility notes.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): adapted code and licence texts.
- Visual direction: started from a minimal fine-art catalogue look (the design reference supplied during the project), since calmed: cool neutral greys, white cards with soft corners, one blue accent, and even grids with the same preview size on every card. Approved work is still bronze in 3D. No assets were copied.
