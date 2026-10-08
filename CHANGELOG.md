# Changelog

All notable changes, by phase. Dates are when the phase was delivered.

## Live release: paid plans in rupees, UPI payments, no demo (2026-10-07)

### Plans and payments
- **Plans per workspace, in rupees:** Free (3 active projects, 5 people per project), Pro ₹999/month or ₹9,990/year (unlimited active projects, 15 people), Team ₹2,499/month or ₹24,990/year (50 people). Viewers are free and never count. Prices and limits: `billing/Plan.java` and `features/public/pricing.ts` (kept in step by tests on both sides).
- **Limits enforced by the server** (`ops/Quotas.java`): creating or reactivating a project past the plan's active projects, and inviting (or promoting a viewer) past its people, answer `422 PLAN_LIMIT` with what to do. `BILLING_ENFORCE_LIMITS=false` turns them off.
- **UPI payments to the operator's UPI ID** (`BILLING_UPI_ID`, default dobhalaaryam-2@okhdfcbank): Settings → Plan and billing shows a QR code and a "Pay with a UPI app" link (`upi://pay`, amount and order reference filled in), the details to pay by hand, then a form for the 12-digit UTR. One UTR pays for one order.
- **Admin → Payments to check** (operators only): approve (the plan switches on; paying again for the same plan adds the next period; moving to a bigger plan converts unused time by value) or reject with a reason. Emails: "payment to check" to the operator, "plan active" and "couldn't confirm" to the customer, and a reminder a week before a plan ends. Plans never renew by themselves.
- New: `V7__billing.sql`, `billing/*` (backend), `features/billing/*`, `pages/AdminPaymentsPage.tsx`, `lib/qr.ts` (a dependency-free QR encoder, checked against a QR decoder). Tests: `BillingTest`, `pricing.test.ts`.

### No demo on the live site
- The in-browser demo API now runs only in local development (`.env.development`); every build talks to the real server, and a Vercel build without `VITE_API_BASE_URL` stops with instructions. The server no longer seeds sample data unless `DEMO_DATA=true`.
- The sample project is gone from the public site: no interactive sample workspace, forecast playground, role views, "step into the demo" logins or Flurry sandbox. The front page explains layers, the forecast and roles in plain sections; the 3D block stays as an illustration only.
- Contact everywhere is dobhalaaryam@gmail.com (site, footer, legal pages, emails); operator access defaults to that account and, when email is on, needs a confirmed address.

### Fixes
- Terms and privacy rewritten for a paid service: UPI payments, confirmation, no auto-renewal, refunds, price changes, payment records, Indian law.
- Messages promised an ownership hand-over that doesn't exist; they now say what's actually possible.
- Visitors no longer see developer hints ("start the backend on port 8080", server URLs) in errors.
- New social image with the current headline; FAQ answers for pricing and paying.
- The server's Docker image no longer compiles tests (run `./mvnw test` before deploying).

## Consistency and honesty pass (2026-10-07)

- **Pricing:** the yearly "save 20%" note is now computed from the plans (Team monthly was $24, a 16.7% saving; it is now $25). "Most popular" became "Recommended for agencies" (there are no sales to back it). An early-access note says paid plans aren't on sale yet and nothing is charged (`EARLY_ACCESS` in `pricing.ts`), with a matching pricing question. The billing switch works with the arrow keys and has one tab stop. Test: `pricing.test.ts`.
- **Sign-up:** `/register?plan=pro` now says which plan was picked and that the workspace starts on Free during early access.
- **Terms and privacy:** no longer describe Niveloft as a free student capstone; new *Plans and payment* section; liability wording works for paid plans; account deletion points to Settings → Data and privacy. Updated 7 October 2026.
- **FAQ, introduction, first steps:** section names match the app (Team, Forecast → Work graph) instead of the old People/Graph/Prediction chapters; the work-graph answer no longer contradicts the legend (every block is the same height); data deletion is self-serve; the Arena is described as an admin tool. The FAQ's machine-readable date now matches the shown date.
- **Front page:** the comparison headline no longer implies customers who switched. Links to `/#pricing`, `/#compare` and other sections stay on target while the lazily loaded sections above them arrive (`settleOnSection`). In the header, Demo and Features were both announced as the current page on `/` (NavLink ignores the hash); fixed.
- **SEO and app metadata:** FAQ description no longer mentions the admin-only Arena; the sign-up description matches the agency positioning; `/login` left out of the sitemap; the web app manifest's description updated.

## Agency repositioning, pricing, a simpler app and safer backend defaults (2026-10-07)

### Front page and public site
- **Repositioned for agencies and dev shops.** New headline (*Deliver client work with proof, not promises.*), "Start free" as the main action, "Try the live demo" second.
- **New sections:** proof points, how it works (agree, deliver with evidence, sign off), a features grid, the project in layers (one compact band instead of five full screens of scrolling), a comparison with task boards and spreadsheets, pricing, and a new closing call to action.
- **Pricing:** Free, Pro and Team plans with a yearly / monthly switch, on the front page and on a new `/pricing` page (with its own static HTML, sitemap entry and questions). Plans live in `frontend/src/features/public/pricing.ts`. Payments are **not connected**: every plan leads to sign-up or the contact form.
- **Navigation:** Demo, Features, Pricing, AI assistant; "Start free" in the header. Footer and FAQ no longer mention a capstone or a working name.

### App
- **Project sections:** Overview, Board, Timeline, Forecast, Team, Settings (was eight chapters over sixteen views). Every existing route still works; Forecast groups Delivery outlook, What if, Work graph and Pace model.
- **Admin tools** (Site health, AI arena) appear only for operators, under *Admin* in the account menu and the command palette.
- **Flurry stays in its corner by default**; Roam is one click away.
- **Delete account** in Settings → Data and privacy (password confirmation).

### Backend
- `POST /api/users/me/delete` erases the signed-in account (name, email, password), deletes projects owned alone, leaves the others and ends every session. Refused (409) while the person owns a project with other members. Test: `AccountDeletionTest`.
- **Swagger UI and API docs are off by default** (`API_DOCS_ENABLED=true` turns them on).
- **Demo accounts are never seeded on a hosted database** unless `DEMO_DATA=true` is set explicitly.
- **Default time zone is UTC** (was Asia/Kolkata); set `PROJECTFLOW_ZONE`.

## The snowpack: Niveloft rebuilt, from the design system to the 3D views (2026-10-06)

Every page and every 3D view is rebuilt around one idea: **a project reads like snow, in layers.** Approved work is the firm base, then work in review, work in progress, and fresh snow on top; each task is one slice of its layer, and the late task holding the most work up is the **weak layer**, in red. The same five colours carry meaning everywhere: the front page's block, Today, each Overview, the strata bars, the charts and the 3D model. The backend's rules, the data, the permissions and the review workflow are unchanged; the API gained two small fields (below).

### Design system
- **Tokens** (`frontend/src/index.css`): a cool snowfield canvas, white surfaces, night-blue ink, glacier blue only for actions, links, focus and the selected item, and the five strata colours (`--strata-todo`, `-progress`, `-review`, `-done`, `-weak`), checked with a colour-blind palette validator against each theme's surface (the dark steps were re-chosen so every neighbouring pair stays apart). `--plate-top`/`--plate-bottom` and `.bg-plate` for the plate a block stands on.
- **Type:** Geist for the interface and Archivo, set wide, for headlines and big readings (`.display-poster`, `.display-wide`, `.reading`). Inter and IBM Plex Mono are gone. No monospaced labels, nothing set in capitals by CSS, sentence case everywhere, and plain punctuation for metadata (commas, colons, parentheses) instead of strings joined with middle dots. Code and commands keep the system monospace.
- **Logo:** a peak drawn as three layers of snow (a glacier-blue cap over two settled layers); the wordmark in Archivo with a diamond for the i's dot. New favicon set, app icons and social image, rendered from the current mark and the real block.
- **Components** restyled: buttons, fields, cards, menus, dialogs, badges, segmented controls, page headers, and a new `StrataBar` (approved, late, in review, in progress, not started) with its legend.

### App shell
- A stable sidebar (the places, your active projects, Flurry, help, your account) and a top bar that names where you are. A project's header gives its health, your role, dates, people and a strata bar; its chapters (Overview, Work, Delivery, Graph, Prediction model, Schedule, People, Settings) stay under the top bar as the page scrolls, with the chapter's views just beneath.
- Gone: the `//` trails, the `//////` section marks, the clock stamp and the titles that decoded into place. The weather behind the pages is now a faint wash of cold light; the snowfall is off unless turned on in *Settings → Appearance*.

### The front page, from scratch (`features/public/home/`, `three/SnowpackScene.ts`)
- **The first screen:** the promise as the heading, set wide and heavy; one action (*Open the sample project*); and three readings from the sample (17 tasks and 6 people, the likely finish window, the chance of finishing on time). Beside it, the sample project as a block of snowpack on a plinth, lit like a product shot, with snow falling. Point at a slice for its task, layer, lateness and owner; click it for the sample workspace; drag to turn the block.
- **Read it in layers:** scrolling lifts the layers apart and reads them top down, one per screen (*Fresh snow on top*, *Settling*, *Waiting for a decision*, *Firm at the base*, *The weak layer*), each with what it means in Niveloft, then closes the block again. On phones the block stays at the top while each layer's words come up beneath it, and slide away under it.
- **The still:** until three.js has loaded, and in browsers without WebGL, the same block is drawn in SVG, projected with the scene's own camera (`three/snowpackFrame.ts`, checked against three.js in its tests), so it fades into the 3D scene in place, labels included. The scene now starts settled for the same reason.
- **The product, working,** as ordinary sections (no panels): the sample workspace, the forecast playground, the four role views, Flurry, the questions, and the ways in (create a workspace, log in, or step into the sample as one of its team). Deep links (`/#product`, `/#how`, `/#roles`, `/#flurry`, `/#questions`) scroll to them.
- Removed: the mountain world, its stations, panels, ascent rail, sound, snow bulletin and stills (`public/home/loft-*.webp`).

### Public pages
- The introduction, questions and answers, Meet Flurry, the privacy policy and terms, the sign-in pages and the 404 drop numbered and capitalised labels and square boxes; the permission table uses icons; the 404 has a curious Flurry and *Go to Today*.

### Today
- Your active projects (up to eight, the least healthy first), each a small block of snowpack made from its task counts, with late work laid down as a red weak layer above the approved base, all drawn in one 3D scene behind the tiles (flat drawings without WebGL; on phones the tiles swipe sideways). Each tile gives health, key, name, share approved, a strata bar and the deadline.
- *Needs you*, grouped by how soon (*Now*, *Soon*, *Worth a look*), each item with an icon for its kind and the rule that raised it; *Up next for you*; *Next three weeks*; *Approved recently*. *Projects* uses the same tiles with each project's description, owner and members.

### Each project's Overview
- Under the delivery forecast, **the project's own snowpack** (`features/overview/`): the front page's block made from the project's tasks, with every late task in red and the weak layer called out in a sentence. Beside it, the layers as a list with counts and shares; pointing at a layer lifts it out of the block, and each opens its tasks, grouped and sorted. Clicking a slice opens its task. The old number grid and the avalanche are gone.

### Charts
- **Recharts is removed.** Charts are drawn by hand in SVG (`features/analytics/svgCharts.tsx`): thin lines, rounded bar ends, 2 px gaps between stacked segments, clean ticks, a readout that follows the pointer and can be walked with the arrow keys, a legend for every multi-series chart, and a table view for every chart. Flow over time is drawn as a snowpack: approved at the bottom.

### The other working pages
- Delivery outlook, Dependencies (larger nodes that never clip their text), What if, Analytics, Prediction model, Graph, Timeline, Milestones, People, Activity and Settings restyled in the system, with sentence-case labels, readings in Archivo and more room.

### 3D
- A shared kit (`three/snowpackKit.ts`): the striated texture of a cut snow wall, a soft contact shadow, layer geometry that follows a surface; the palettes in `three/snowPalette.ts`, kept apart from three.js so the still drawings can use them. Every scene uses filmic tone mapping, a studio environment and the snowpack's lights, plinth and palette.
- In the workspace, scenes draw only when something changes; three.js loads after the first paint and never on pages without 3D (`three/capabilities.ts` has no three.js import). Reduced motion stops the snowfall and the sway.

### Flurry
- New artwork and expressions, and its panel says plainly what answers: *AI model on: llama3.2*, *AI model on, in this browser*, or *No AI model: built-in answers*; plans say *Draft plan by AI (model)* or *Draft plan from your brief’s own lines (no AI)*.

### Backend and demo API
- `TaskCounts` adds `overdueTodo`, `overdueInProgress` and `overdueInReview`, so a block can say which layers late work is in; `UpcomingItem` adds the task `key`; attention titles and search results use plain punctuation. The mock API matches.

### Removed
- The `recharts` dependency; Inter and IBM Plex Mono; the mountain world and its avalanche; the project avalanche, the portfolio skyline, the project cards and towers, the decoding titles, and the unused snow-field helpers.

### Found and fixed while checking
- The front page's words sat on top of the block, so it couldn't be pointed at, clicked or turned; only the words themselves take the pointer now.
- The layers not being read were faded to 35% opacity, below the contrast text needs; they now step back to muted text instead. The same on the dependency map, where tasks off the traced chain were faded: they now turn flat and grey with their words at full contrast. A faded month label on Today is solid again.
- Flurry could rest with a corner over a button (the review's *Approve*, say): any control reaching into its spot now counts as occupied, so it moves somewhere clearer.
- The front page rendered every working section before its first screen could paint: they now load after it, and the sample's forecast is worked out once instead of four times.
- On phones, each layer's card covered the block it describes; the block now stays above the cards. The weak layer's label is kept inside the frame on narrow screens.

### Checks
- Type check and syntax: 0 errors; backend compiled with tests: 0 errors; 267 unit tests (new: the still's projection checked against three.js, its labels and red slices, Today's blocks).
- Browser suites, all passing with no page errors: the front page and the workspace (100 checks, new), Flurry, the Delivery outlook and Meet Flurry (68), help, search, forms and printing (89), the calm redesign (7), the Prediction model (10), Flurry's panel and voice (33), the AI in Chrome with a stand-in (14), launch features (24); hover on 23 pages (372 controls).
- Launch audit on 41 routes in both themes at 1440 and 390 px: no contrast, phone-layout, naming or heading findings after the fixes above; 149 internal links, none broken.
- Speed on a simulated slow phone: first paint 4.9 s on `/` (5.7 s before the sections were deferred) and 3.9–4.3 s on `/login`, `/privacy` and `/introduction`.

## Flurry, the character: Meet Flurry, a companion in the workspace, and the Delivery outlook (2026-10-06)

Flurry is shown on its own first (its look, idle pose, floating, dragged reaction and click-to-talk), then placed in the workspace with the behaviours you described, and the answers it gives are tied to the exact project and task in front of you.

### Meet Flurry (`/flurry`)
- A public page (`features/flurry/meet/`, `pages/public/FlurryPage.tsx`, its own pre-rendered `flurry.html`): the character first, with its anatomy (rounded body, two eyes, tiny arms, icy-blue glow), the figure at 120, 72, 56, 40, 32, 24 and 16 px in light and dark, and the eight behaviours (idle, roaming, dragged, clicked, working, task completed, attention needed, dismissed) each running live.
- **A sandbox:** a small stage with a sidebar and three of the sample project's tasks. Drag Flurry and it trails the pointer and settles where you let go; click it for *Ask Flurry · My next task · Delivery outlook* and *Roam · Stay here · Hide*. Its answers come from the sample's records and it says so (*No AI model · built-in answers · sample project*).
- The rules it keeps and what it never does, including that it stays inside Niveloft (a desktop companion would be a separate app). Linked from the front page's *More*, the footer and site search.

### Flurry in the workspace
- **Modes:** *Roam · Stay here · Hide* (replacing *Let Flurry roam*, *Keep Flurry still*, *Minimise* and *Hide*; older settings are carried over). **Size:** small, medium, large. **Motion:** full, calm (reacts, doesn't float or fly) or off. All in its menu and Settings → Flurry.
- **Roaming** only after 30 seconds without keyboard or mouse, between a few fixed safe spots, including the sidebar. It pauses while you type, drag tasks or use a menu, and moves to a clearer spot when a page fills in or scrolls under it.
- **Dragged:** it follows the pointer with a slight trail, arms up, and settles exactly where you let go. A drag no longer opens its menu.
- **Clicked:** it turns towards you and opens a compact menu: what needs you (if anything), **Ask Flurry · My next task · Delivery outlook**, the modes, and *Size, motion and more*.
- **Attention needed:** a small indicator; the menu names the actual review or blocker, each opening the right page. It no longer counts what was already there when the page loaded as new.
- **My next task:** Flurry flies beside that task on the page, points at it and gives one or two sentences with *Open it* / *Not now*.
- **Task completed:** a brief happy reaction after a submit, an approval, a plan created or an estimate applied.
- **Dismissed:** *Hide* retreats into its *Ask Flurry* item in the sidebar, asleep, with **Call back**.
- **Notes are user-triggered by default**; *Let Flurry speak up* (Settings → Flurry) lets it raise new things once each.
- **Phones:** one fixed spot on the bottom edge, expanding into its menu when tapped.

### The Delivery outlook (each project's chapter III)
- **Four readings:** target, median finish, 85% finish by, on-time estimate (`progressForecast` now gives the 85th percentile and a whole-project series, and accepts estimate overrides for scenarios).
- **Path view** over quiet decorative terrain and **Chart view** with a table, both from one forecast snapshot; milestone labels, and the chart's target, median and 85% markers, are laid out in rows so they never overlap, even on a phone. Phones open on the chart.
- **The inspector** names the one task holding the selected milestone up (*Awaiting a decision*, *Running late*, *Holding up delivery*, *Last to finish*) with *Open the review* / *Open task* (`features/delivery/deliveryPath.ts`).
- **Flurry at the milestone:** selecting a milestone brings Flurry beside it (on the chart, just under its button, so its note covers none of the others), pointing at the blocker: *"This review is holding up ONB-10. Open it?"*. Flurry's *Delivery outlook* opens the chapter of the project you're in (or the one most at risk) and does the same.
- **Preview scenario:** smaller scope (estimates) or an assumed pace (time, never saved), with the baseline in grey; *Apply* lists the exact estimate changes, saves them through the normal endpoint with your permissions, and offers Undo.
- In the command palette as *Delivery outlook*.

### Answers tied to what you're looking at (the bugs in the blueprint)
- **Scope is visible and follows the page:** the project you're on, *Task ONB-9* on a task's page, or *All projects* on Today and the other cross-project pages. Flurry no longer opens on another project from the dashboard.
- **It never guesses a project:** a question that needs one gets "Which one is this about?" with a button per project; a question naming another project's task offers to look at it there.
- **Switching project starts a new conversation**, so an old answer never sits under a new project; moving between all projects and one adds a visible *Scope: now …* line.
- **A question about one task gets an answer about that task** (`features/assistant/taskAnswer.ts`): its state, what it waits on and what waits on it in the right direction, a corrected premise ("ONB-9 isn't blocked…"), what isn't recorded (why it's late is never inferred), and the move that fits.
- **Review-aware advice:** late work waiting for review is reported separately, and the advice is to open the review, not to move the date or cut scope. The AI instructions (server and in-browser) gained the same rules: answer the exact question, keep dependency direction straight, don't infer a reason for a delay, and point submitted work at its review.

### Checks
- New unit tests: exact-task answers (5), the task-question intents, the review split in *Review blockers*, the 85th percentile, the project series and estimate overrides (3), the delivery path's blocker, wording, time scale and label layout (11), and standing under a row of controls. 262 in all.
- A new browser suite for Flurry and the outlook (68 checks): the companion's behaviours and settings, the outlook and its scenario, the scoped and exact answers, Meet Flurry and its sandbox, and phones.

## The mountain: snowfall, an avalanche, and a Fuji-like cap where every task sits at its altitude (2026-10-05)

The front page is rebuilt around one idea: *work comes down all at once; Niveloft settles it.* A single Fuji-like mountain replaces the crystals and the platform, with a concept, type and copy of its own rather than a landing-page template.

### Front page
- **One mountain** (`three/MountainWorld.ts`, geometry in `three/summit.ts`): a procedural cone with Fuji's profile, a crater, radial gullies, foothills, distant ranges, pines, a sea of clouds, and a night sky with stars, a moon and the odd shooting star. `three/LoftWorld.ts` is removed.
- **Snowfall and an avalanche:** heavy snow and a storm over the first screen; an avalanche pours down the front flank as a powder cloud with billows, the sample project's seventeen tasks tumbling in it as survey stakes.
- **Scrolling disciplines it:** the storm calms, the snow lifts off the slope and settles on a clean cap in four layers with Fuji's radial streaks, and every task lands at its **altitude** (approved at the summit, then in review, in progress, not started lowest; the lowest layers land first). Each layer is named with its real count (*APPROVED · 6*, *IN REVIEW · 1*, *IN PROGRESS · 4*, *NOT STARTED · 6*).
- **What's in the way burns red:** the late task holding the most work up (worked out from the sample's records in `features/public/loft/survey.ts`: *ONB-9*, two days late, holding up three) is a red beacon with its own tag.
- **A snow bulletin** in the corner (tall screens) reads the sample's real figures: the snowpack (*UNSETTLED → SETTLING → LAYERED*), tasks in place, approved at the summit, the crew, what's in the way.
- **Five stations** replace the crystals: Base camp (the workspace), the Lookout (four views), the Weather station (the forecast, with a turning anemometer), Flurry's hollow and the Hut (questions), each a small building with lit windows and a tag. The camera dives down and flies round the mountain between them; drag to look around; each station's bracketed button opens its panel as before.
- **The summit** replaces the platform: the whole mountain at dawn, *Open the sample project* first, *Create your free workspace* second, and Flurry, *Log in* and the introduction, all visible.
- **Night and first light:** the dark theme is a clear night with moonlit snow and warm windows; the light theme is first light with volcanic rock; both end at dawn.
- **Copy and hierarchy:** one primary action on the first screen (*Open the sample project*, "No sign-up. Nothing you do is saved."), the header's *Open the sample* after the first screen, an ascent rail on large screens, and a lede that says what the picture means.
- **Type:** Archivo (variable, wide and heavy) for the public pages' headlines and the front page's place names (`.display-wide`, `.display-place`).
- Stills, the social image and the alt text are regenerated for the mountain.
- **Slow hardware:** when the world stops animating to save power, it draws where the page is, once, at rest, rather than freezing halfway through a change (stakes in mid-air, tags half faded).
- Tags over the world keep clear of the ascent rail; the beacon's tag sits on a plate in its own red, its leader line running down to the beacon; the sound switch and the scroll hint sit on small plates, so they stay readable over the dark volcanic rock in the light theme. Front-page Flurry never lands on the ascent rail.

### The workspace
- The faint mountain behind every page is now the same Fuji-like cone with its layered cap.

### Checks
- New unit tests: the mountain's geometry, layer bands, stake slots and landing order, the bulletin's share and words (`three/summit.test.ts`), and the survey's counts and beacon (`features/public/loft/survey.test.ts`). 230 in all.
- The Niveloft browser suite's front-page checks are rewritten for the mountain: unsettled at first, layered after a screen of scrolling, the layer counts, the beacon's tag, stake hover and click, the stations, the summit and the ascent rail.

## The avalanche, a roaming Flurry and the workspace in the same weather (2026-09-29)

The front page's look now carries into the app, Flurry roams until it's called, and the ice-brick mark on the front page is replaced by a scattered avalanche that scrolling disciplines into rows of snow on the mountain.

### Front page
- **The avalanche** replaces the ice-brick mark (`three/snowfield.ts`, `three/LoftWorld.ts`). A mountain face with hundreds of snow blocks (one per sample task, 420 on desktop, 220 on phones) tumbling down it in a loose stream with powder billows. Scrolling the first screen disciplines it: blocks fly out of the stream one after another, lowest rows first, and land in ordered rows on the slope, while the scoured, streaked mountain turns to fresh snow. A block is always either in the stream or flying to its row, never left hanging halfway. Hover lifts the nearest blocks and shows their task keys; a click opens the workspace. The camera then climbs the slope into the cloud before the crystals.
- A readout in the corner (*AVALANCHE_01*, *SCATTERED / SETTLING / IN ROWS*, the share in rows) follows the scroll; the scroll hint reads *Scroll to settle the snow*.
- The platform's first shape is now a mountain with its snow laid in rows.
- **Flurry roams the front page**, never landing on the words or controls; clicking it opens its panel. *Keep Flurry still* is in the *Menu*.
- Phones stand further back so the stream stays below the heading, with a little fog behind the heading.

### Flurry
- **It roams** (`features/flurry/roam.ts`, `useFlurryRoam.ts`): rests a few seconds, then flies in a soft, banking arc to another spot along the edges and empty parts of the page. It never lands on the field you're typing in, under the pointer, on open menus, dialogs or notices, or where it just was; it stays clear of the sidebar and the top bar.
- **It notices you:** its eyes follow the pointer; pointing at it or focusing it with the keyboard holds it still, and it looks back (a *curious* expression).
- **Called, it comes:** it flies to the conversation, perches on the card's top edge (or beside it when there's no room above), waves, and stays while it's open; clicking it then takes you to the question box.
- **Out of your way:** it flies off a field you start typing in, holds still while you type, and naps in its home corner after two quiet minutes (new *sleep* expression).
- **Drag it** anywhere: it stays there for half a minute, and the nearest corner becomes its home.
- **Stopping it:** *Let Flurry roam* (⋯ menu and Settings → Flurry), *Keep Flurry still*, *Minimise* and *Hide*; reduced motion stops it automatically. With roaming off it rests in its home corner and steps aside from fields as before. On phones it moves only along the bottom edge.
- The conversation's header shows a small mark instead of a second Flurry while Flurry perches beside it.

### The workspace
- **Weather behind every page** (`components/layout/AppAtmosphere.tsx`): a faint mountain range with its snow in rows along the bottom of the window and light snowfall, behind all content, still under reduced motion, paused in hidden tabs, and switchable in *Settings → Appearance*.
- **Instrument labels:** a `//` trail and a date-and-time stamp in the top bar, `//////` section marks in the sidebar and the assistant, mono eyebrows on page headers, and page titles that decode into place (screen readers get the real title at once).
- **Each project's Overview has its avalanche** (`features/overview/ProjectAvalancheCard.tsx`, `three/ProjectAvalanche.ts`): the project's own tasks as snow on a mountain. Approved work settles into rows in the order it was approved, work in review hovers over its place, the rest is still coming down, and work that holds others up glows amber. Hover a block for its key, title and state; click to open the task. The same information is beside it in words and as a list. It follows statuses only and changes nothing.

### Checks
- New unit tests: the avalanche's settling order and share (`three/snowMath.test.ts`), Flurry's roaming (spots, never under the pointer or on a field, fleeing a field, flights and banking, gaze, perching; `features/flurry/roam.test.ts`) and the project avalanche model (order, blocking, targets, the sentence; `features/overview/avalancheModel.test.ts`).
- The Niveloft browser suite covers the avalanche settling, the front page's Flurry, Flurry roaming, perching, dodging, dragging, roaming off and the rest of its menu, and a new *workspace* part (weather, instrument labels, the project avalanche and its list).

## The front page, as a cinematic journey (2026-09-29)

The front page now looks and moves like the reference video the owner sent: a monochrome 3D world with small monospaced instrument labels, built as Niveloft's own (no name, logo, character, text or brand logos from the reference).

### Added
- **The ridge:** a misty snow ridge with mountains, and the Niveloft mark built from ice bricks, lit from inside, with glowing seams (`three/LoftWorld.ts`). Each brick is a task from the sample project: hovering lifts the nearest bricks and shows their task keys with leader lines; clicking opens the workspace. The promise is the page's heading, in the corner, with one action.
- **The crystals:** a fly-through into a bright void with five faceted ice crystals, one per screen, each with a raised symbol, a label, readings from the sample and *Click to explore*. Each opens a dark summary panel (mono text that brightens under the pointer) with the real thing inside: the sample workspace and the demo sign-in, the role graphs, the forecast playground, Flurry, the questions.
- **The platform:** a ring platform where particles gather into the next step (the mark, Flurry, create, log in, the introduction), with arrows between steps.
- **The instrument frame:** the mark and a *Demo* tag, a *Menu* (sections, pages, search, theme, contact, cookies, legal), *Sound: Off/On*, bracketed controls, decoding labels. IBM Plex Mono is back, for these labels only.
- Deep links (`/#product` and the other sections) open their panels, so site search and the other pages' navigation still land on the right thing.

### Changed
- The earlier ice-sculpture story and the long scrolling sections are replaced by the three places and their panels; all their content is still there, inside the panels.
- New stills, social image and brand guide section.
- Speed: the world is built in two steps (the ridge first, the rest when the browser is idle), its reflection map is small, shaders compile without blocking where possible, phones get lighter materials, and slow hardware drops resolution and then animation.

### Checks
- The Niveloft, polish and calm browser suites were rewritten for the new page; the site-search and FAQ tests understand the crystals' anchors.

## Improvements: delivery forecast first, role graphs, a quieter Flurry and the ice story (2026-09-29)

This release answers two reviews: a hard critique of the product (forecasting, graphs, Flurry, reports, the front page) and a design critique (colour, type, layout, the front page's order). The product is now positioned around one promise: **see what will finish, when, and what’s in the way**, for small software and student teams.

### Flurry
- **AI replies that aren't clean JSON no longer break.** The browser's raw parser error (*Unexpected non-whitespace character after JSON…*) was shown to people. Replies are now read by a balanced-brace scanner that tries each JSON object in the text, falls back to a prose answer when there's no JSON (labelled with a note that the AI didn't use the expected format), and otherwise says in one plain sentence that the reply couldn't be read, with **Try again**. The technical detail goes to the browser console. The backend reads replies the same way (`AiService.parseReply`, with a new test).
- **Small by default.** Flurry rests in a corner as a small figure; opening it shows a compact card (400 px, 520 px for a plan or agenda, at most 640 px tall) instead of a full-height side panel. **Pin** docks it beside the page, and the page makes room. Phones get a full-screen sheet and a small, still button.
- **Corners, never covering fields.** Dragging snaps it to the nearest corner; the menu has *Rest in a corner* for keyboard users. When a field you focus would sit under it, it moves to the opposite corner and comes back after you leave the field. It never pops up on its own and has no speech bubbles; its idle motion is smaller and slower.
- **Greetings and thanks** get a short reply (*Hi Aarav. I’m Flurry…*) instead of a search. New questions: *When will I finish?* (your own forecast) and *Will we make the deadline?* now quote the delivery forecast.
- **It never invents dates.** Dates in an AI answer may only come from the forecast range and scheduler estimate it's given; the range is now part of the prompt (and of the server request, `forecast.range`).
- The owner suggestion in *Review blockers* now says plainly: *a manager can give each one an owner… I won’t assign people for you.*

### Forecasting
- **A delivery forecast leads the Overview and Reports:** the likely finish as a window, the most likely date, the chance of the deadline, what holds it up and the next move, then *remaining work*, *blocked tasks* and *available capacity*, then the timeline, then breakdowns.
- **Three separate answers:** remaining effort, *your* finish (after the work you wait on) and the project's finish. It names the main dependency, the availability assumption, data quality and when the records last changed. *Your time for this project* is a what-if that moves dates, not effort.
- **The engine is dependency-aware:** a Monte Carlo list scheduler where a task starts only when what it waits on is approved, each person does one task at a time and picks up other ready work while waiting, review time is added after submission, and unowned tasks start today (flagged).
- **Calibration is checked, not assumed:** each forecast reports how often its 80% ranges held for finished tasks (leave-one-out), or says there are too few to judge.
- **The plan and the forecast no longer contradict each other:** the scheduler's date is labelled *the plan, if every task takes exactly its estimate*, and the forecast explains why it differs. A health badge that disagrees with the forecast explains itself.
- **Demo data** now has realistic estimates, so its forecast is believable (it had said 0% chance for a project that was on track).
- **No productivity rankings:** the per-person table is labelled as not a ranking, and the Pace tile is replaced by *How good are the ranges?*

### Graphs
- **A 2D work graph is the default** (the chapter is renamed *Graph*): time across, one row per person, recorded work solid, planned work outlined, the forecast as a band, priority as a badge, the Today and Deadline lines, dependencies drawn only for the selected task, and everything else faded while one is selected. Labels stay fixed while time scrolls.
- **A view per role:** a member opens on *What should I work on, and when am I likely to finish?*, a reviewer on *Whose delivery am I blocking?*, an owner or manager on *What threatens delivery, and what change would help?*, a viewer or client on the delivery forecast by milestone.
- Always there: 2D or 3D, a date range, **Show as a list**, **Reset**, and keyboard access (arrow keys, Home, End, Enter, Escape).
- **The 3D model** is quieter: every block has the same height (priority is in the details, never size), matte materials, dependencies only for the selected chain unless you ask for all, a readable default camera, and sentence-case labels.

### Reports and numbers
- Reports open with a compact title row and a project selector, then the forecast, three numbers, the timeline and the breakdowns.
- Progress is **tasks approved** (*N of M*); effort-weighted progress appears only when at least 70% of tasks have estimates.
- **Cycle time** shows its definition, *n*, the median, the middle half and the full range, with a dot strip of every task.
- The project header says *N of M tasks approved* and *X% of the time to the deadline has passed*.

### Design
- **The palette from the design review:** canvas `#F6F7F9`, cards `#FFF`, ink `#17212B`, secondary `#596575`, primary `#245B78`, borders `#DCE3E9`; dark `#10151B` / `#18212B` / `#EDF2F7` / `#A5B2C0` / primary `#A8D8EE` with dark text / `#33404D`.
- **One family, Inter,** with the review's type scale, sentence case everywhere (no uppercase overlines), and tabular figures for keys, tables, dates and metrics. Manrope and IBM Plex Mono are removed.
- Fewer borders and shadows, 12 px card radii, flat primary buttons, no glass behind text. Buttons keep their label in place under the spinner while working. *Saved* notes appear only after a successful save and clear on the next attempt.

### Front page
- **New order:** the promise and one action over a restrained ice sculpture → four short, skippable steps (*Scattered*, *Assembled*, *Timeline*, *Forecast*, where the window, the deadline and the one blocker appear) → the sample workspace → *The same project, a different question for each person* (the four role graphs on the sample) → *Change an assumption. Watch the forecast move.* (three what-ifs, computed in the browser by the app's own engine) → Flurry → questions → a final action.
- The sculpture is built from the sample project's tasks (`IceSculpture.ts`); the alpine scene is removed. New stills, social image and page title and description.
- The navigation is *Product · Views · Forecast*; site search and footer links point at sections that exist (checked by a test and by the browser suite).
- Demo mode stays explicit: a *Demo* badge in the public header and a notice in the app's sidebar that everything stays in this browser.

### Fixed
- Front page role graphs: one-row lanes no longer overlap their labels, task keys aren't truncated before titles, dates don't hide under the Today and Deadline tags, and the delivery view's rows have room for two lines.
- The public footer leaves room for the floating Contact button.

## Niveloft: rebrand, the alpine front page and Flurry (2026-09-29)

ProjectFlow is now **Niveloft** (a working name: availability is still to be checked), *Project workspace for focused teams. Great work. Clear direction.* See [docs/BRAND.md](docs/BRAND.md).

### Added
- **Brand:** the Niveloft palette (snow, white, graphite, slate, ice blue, glacier, frost, glow) in light and dark, Manrope for display, Inter for text and IBM Plex Mono for keys and numbers (all self-hosted), a new mark (three planes: an *n* and a lit shelter) and wordmark (the i's dot is an ice-blue diamond), and regenerated favicons, app icons, manifest and social image. Radii are 8/12/16 px; main buttons are 48 px, everyday ones 40 px (44 px on touch screens).
- **The front page** is a scroll story inside an original alpine scene drawn with three.js: an illuminated glass pavilion, terrace and tower in a snowy valley. The sample project's tasks rearrange in four chapters: Projects, Tasks, Team and Progress. It has:
  - a still of the same scene that shows at once and stays without WebGL;
  - a separate phone composition, fewer particles and no shadow maps on small screens;
  - reduced motion (chapters snap, no snow), rendering paused off screen and in hidden tabs;
  - optional sound, off by default;
  - chapter buttons, a text equivalent for every chapter, and a *Skip the story* path.
  Then: the product preview, *Plan. Assign. Track.*, features, the interactive sample workspace, Flurry, a use case (no invented customers), questions, a closing call to action and a new footer. The header is *Product · How it works · Log in · Explore demo*.
- **The sample workspace**, *Launch the mobile onboarding update*: 17 tasks, 6 people, 3 milestones, a late task that holds others up, a waiting review and two unowned tasks. Board, list and timeline views, a person filter, a task panel with the app's workflow rules, owners, *Reset*, clearly labelled as a sample that saves nothing. The same project is in both demo datasets.
- **Flurry**, the AI project assistant (replaces *Assistant*):
  - **Plan a project:** a brief becomes up to 12 draft tasks (AI) or tasks drafted from the brief's own lines (no AI, labelled), reviewed before anything is created, then created through the normal endpoint with the suggested order as dependencies, with **Undo**. Server: `POST /api/projects/{id}/ai/plan` (needs permission to create tasks; nothing is saved by the endpoint itself).
  - **Summarise progress:** what the records show, what that suggests (estimates) and what the records don't show, kept apart.
  - **Review blockers:** late work that holds other work up, work without an owner, long review waits, each with a next move and *Dismiss*. It never assigns or reschedules.
  - **Meeting agendas** drafted from the records.
  - **Undo** for tasks it created or started.
  - **In the corner of every signed-in page:** drag it anywhere (remembered per person), move left or right from its menu, minimise, hide, sounds (off by default), *Keep Flurry still*, and reduced motion. It thinks, cheers and frowns only in response to what you asked, and settles while you type elsewhere. On phones it's a compact button. **Settings → Flurry** has the same switches.
  - *Ask Flurry* in the sidebar and in ⌘K, with shortcuts for its three abilities.
- **The app's sidebar:** a stable sidebar with the places, active projects, *Ask Flurry*, help, settings and the account menu, and a top bar naming where you are; a drawer on phones and tablets.
- **Tests:** Flurry's reports, plan drafting from a brief, the plan prompt and its validation (browser and server), the new sample project, and a Spring test for the plan endpoint.

### Changed
- Every page, email, API title, policy and FAQ answer says Niveloft. Internal identifiers keep the old name (`dev.projectflow`, the `projectflow` database, `projectflow.*` storage keys, `@projectflow.dev` demo accounts), so existing data and sign-ins keep working.
- *Sign in* is now *Log in*, and *Create account* is *Create your workspace*.
- The masthead is replaced by the sidebar; the old *Assistant* button by Flurry.

### Fixed
- The account and Flurry menus opened off screen near the bottom of the window; they now open upwards.
- The cookie banner covered the sidebar.
- Focus didn't return to the task after closing the sample workspace's panel.
- three.js r186 warnings in the console (the deprecated `Clock` and the removed soft shadow maps).

## Help, contact, forms and the Arena (2026-09-28)

### Added
- **Site search:** `/`, ⌘K or the header's search button on public pages finds FAQ answers, introduction chapters and policy sections as you type, with the matched words highlighted. In the app, ⌘K lists the same answers under *Help*.
- **Questions and answers** (`/faq`): 24 expandable answers in 7 topics, with links to each answer, *Copy link*, *Expand all* / *Collapse all*, a filter, *Print*, *Last updated* and FAQPage structured data. The front page shows five of them.
- **Contact:** a floating *Contact* button on public pages, and *Contact us* in the app's menus and on error messages. Messages are saved for the operators and emailed to `CONTACT_EMAIL` when email is set up. Honeypot, rate limit and optional Turnstile, as on sign-up. A message sent twice is saved once.
- **Site health** (`/site-health`), for accounts listed in `OPERATOR_EMAILS`: form success rates, sign-up sources, contact messages (mark answered), spending against the caps, and a tagged-link builder.
- **Form success rates:** every form reports shown / sent / accepted / refused / failed as daily counts (no contents, no identity).
- **UTM tracking:** campaign tags (or the referring site) are kept for the visit, removed from the address bar and saved with new accounts and contact messages. With analytics consent, Google Analytics gets them on the first page view.
- **The Arena** (`/arena`): two answer sources (the built-in model, the AI in Chrome, and each chat model installed in Ollama on the server) answer the same question about a project blind; you vote, the names are revealed, and a site-wide scoreboard counts the wins. Only the outcome is stored.
- **Server:** `GET /api/ai/models` and a `model` choice when asking about a project; `POST /api/contact`, `POST /api/metrics/forms`, `GET /api/site-health`, `PATCH /api/site-health/contact/{id}`, `POST /api/arena/votes`, `GET /api/arena/scoreboard`; migration V6 (contact messages, sign-up source columns, Arena votes); `operator` on the signed-in user.
- **Scrolling aids:** a reading-progress line and a shadow on the sticky header, a *back to top* button (it also returns focus to the content), and a down arrow on the front page that skips past the 3D preview.
- **Phone menu** for the public pages (pages, search, contact, sign-in, theme).
- **Copy buttons** for FAQ links, task keys, AI drafts, assistant answers, error references and tagged links. They say *Copied* (and announce it), and fall back when the clipboard is blocked.
- **Print stylesheet:** white paper, dark text, no navigation or buttons, answers expanded, link addresses printed, a header with the page and time, and a note in place of 3D scenes. *Print* buttons on FAQ, Reports, project summary, Prediction model and Site health.
- **Last updated** stamps with a refresh button on Today, My work, Projects, Inbox, Reports, the project summary, the Prediction model and Site health.
- **Loading:** a thin progress bar at the top whenever data loads (quick loads show nothing), page-shaped placeholders with a soft shimmer instead of spinners.
- **Password rules** that tick off as you type on sign-up, reset and change password.
- **Error summaries** listing every problem when a form has more than one, each linking to its field; **success panels** and *Saved* notes.
- **Confirmations** before discarding a changed form (and before leaving the page with one), revoking an invitation, removing a dependency, applying a plan and marking many notifications read.
- **Tests:** site search, the FAQ's links and structured data, UTM parsing and clean-up, form counts, Arena pairs, the demo API's new endpoints, and Spring tests for contact, form counts, sign-up sources, Site health access and Arena votes.

### Changed
- **Sticky headers:** a project's chapters and views stay under the masthead while its pages scroll (views scroll away on phones, to leave room).
- **Hover and press states:** every link and button now visibly reacts to the pointer; buttons press down a pixel when clicked.
- **ARIA:** confirmations are `alertdialog`s; menu buttons say whether they're open; icon-only buttons, the search box and progress bars are named; live regions announce copying, saving and results.
- **The built-in model** answers deadline questions ("Will we make the deadline?"): the scheduler's finish against the deadline, and the tasks most likely to be late.
- **Privacy policy** lists contact messages, UTM tags, form counts and Arena votes.

### Fixed
- Ticking a checklist item on a task page emptied the page until it was reloaded (the saved task was put back into the cache through `transformResponse` a second time).

## Prediction model, and running safely under load (2026-09-28)

### Added
- **Prediction model:** a new project chapter (IV), with a 3D chart of each person's progress, grouped by role (owner, manager, member, viewer).
  - History is a staircase of tasks each person got approved, from the project's recorded status changes.
  - The forecast runs 400 simulations of the work that's left. Each one uses that person's own pace against their estimates (shrunk towards the team's pace while there's little history) and the time reviews usually take.
  - It shows the likely finish (p50) and a range (p10 to p90) for each person, each role and the project, and compares them with the deadline.
  - It says what it learned from, and says plainly when no finished task has an estimate yet (so ranges are wide). Pointing at a row in the table below the chart highlights that person's line; the table gives the same numbers to keyboard and screen-reader users.
  - Loading, empty (no tasks, nobody with a role) and failed states each have their own message.
- **Rate limits:** 300 requests a minute per person, 120 per address without sign-in, 60 changes a minute and 60 uploads an hour. Going over answers 429 with `Retry-After`. Each limit is a setting; 0 turns it off.
- **API limits:** JSON bodies up to 512 KB (413 beyond), up to 5,000 tasks per project, 100 projects per person, 200 members per project and 1 GB of evidence per project (422 `LIMIT_REACHED` beyond).
- **Spending caps** for paid services, counted in the database so restarts don't reset them: AI requests a day, AI tokens a month, emails a day and a month. At a cap, AI answers say so and emails are skipped and logged, so nothing is charged beyond it.
- **No duplicates:** every create and submit from the app carries an `Idempotency-Key`. A retried request gets the first answer back (`Idempotent-Replayed: true`); one still running gets 409; the same key with a different body gets 422. Submitting work also locks the task, so a double click or two tabs make one submission. (ProjectFlow has no payments or subscriptions, so there were none to protect.)
- **Request ids:** every response has `X-Request-Id`, every log line carries it, and error messages show it as a reference.
- **Browser error reports:** crashes and unhandled errors in the browser are sent to `/api/client-errors` and logged (message and page only, no personal data; rate-limited). The privacy page says so.
- **Offline banner** when the browser loses its connection.
- **Database indexes** (migration V5) for notifications by person and type, tasks and milestones by due date, submissions by status, invitations, sign-in tokens and files.
- **Uptime monitoring:** `.github/workflows/uptime.yml` checks the frontend and the backend's readiness every 15 minutes (set `FRONTEND_URL` and `BACKEND_URL` as repository variables). Railway uses `backend/railway.json` to wait for readiness before switching traffic and to restart on failure.
- **Scripts:** `scripts/load-test.mjs` (simultaneous users, with a race check), `scripts/backup.sh`, `scripts/restore.sh` and `scripts/test-backup-restore.sh` (backs up, restores into a scratch database and compares every table).
- **Tests:** retried creates happen once, ten simultaneous submits make one submission, request ids, oversized bodies, error reports, usage counters, rate limits and quotas.

### Changed
- **Timeouts and retries:** requests from the app time out after 20 s (uploads 2 min, AI 200 s). Reads and keyed writes are retried twice on network errors, 502, 503, 504 and 429 (waiting as long as `Retry-After` asks, up to 10 s). AI requests are never retried.
- **Server timeouts:** 20 s for a slow client, 10 s to get a database connection, 15 s for a query, 30 s for a transaction. Running out of any of these answers 503 "busy, try again" instead of hanging. Shutdown finishes the requests in flight.
- **Faster queries:** notifications are filtered and paged by the database; the projects list loads tasks and member counts only for the page shown; *My work* loads only your tasks. Page sizes are capped (100 for lists, 500 for board tasks).
- **Cache:** project analytics and status history are cached per project and cleared as soon as anything in that project changes.
- **Uploads:** a failed submission deletes the files it uploaded.
- **Error messages** for 429, offline, timeouts, limits and caps say what happened and what to do.

## A working AI assistant, free (2026-09-28)

### Added
- **Ollama, found automatically:** the new default is `AI_PROVIDER=auto`. When a free Ollama model runs on the same computer as the backend, it's used with no keys or settings.
  - It picks a good chat model (llama3.2 first) and skips embedding models, or uses `AI_MODEL`.
  - It looks again every few seconds while nothing's found, so Ollama can start after the backend.
  - It talks to Ollama's own API, with JSON output and an 8,000-token context, so a whole project fits.
- **`scripts/setup-local-ai.sh`:** installs Ollama (Homebrew), starts it, downloads llama3.2 and checks it answers.
- **The AI built into Chrome:** with no server AI, the assistant offers *Turn on AI in this browser*. Chrome downloads Gemini Nano once, then answers run on the device, from the records the page already has.
  - The same rules as the server's AI apply: records marked as data, invented task keys dropped, suggestions checked and confirmed by a person.
  - When a project is too big, the prompt is cut down to fit, or it says the project doesn't fit.
  - It works in the Assistant panel and in the Model page's *Ask about this project*, and in demo mode too.

### Changed
- **Free questions** go to the server's AI, else the AI in Chrome, else the built-in model. Every answer says which one wrote it.
- **"No AI" messages** now say how to turn AI on for free, instead of only naming settings.

## Calm and organised: built-in model, free AI, roles, tidy pop-ups (2026-09-27)

### Added
- **Built-in model:** answers free questions without an AI service. It's trained in the browser, each time you ask, on that project's records:
  - each person's pace against their estimates;
  - a lateness model (logistic regression, with its accuracy measured on tasks it didn't see);
  - a search index over the records.
  Answers say what it learned from and how accurate it was, and are labelled *Built-in model · no AI service*.
- **Free AI providers:** `AI_PROVIDER=openai` works with any OpenAI-compatible service, including Ollama on your computer (no key) and the free tiers of Groq and Gemini. Claude stays available with `anthropic`.
- **"How will you use ProjectFlow?"** on the front page and the sign-up form. It sets the start page and a *Your first steps* card on Today, with steps ticked automatically when the records prove them. In demo mode it signs you in as the sample person with that role. It never grants permissions.
- **Roles guide:** *You: Owner* in every project header opens what each role can do, and what an assignee is. The Team card has *Roles explained*.
- **Pop-up lists:**
  - The Overview's To Do, In Progress, In Review, Done and Overdue counts open their tasks in a pop-up, grouped by person, due date or priority. Every row uses the same columns and the same order.
  - Each board column has a *Show as a grouped list* button that opens the same pop-up.

### Changed
- **Light theme:** cool neutral greys and one blue accent replace the stone-and-bronze palette. Cards have soft corners and a faint lift. Buttons use sentence case. Display type is light rather than extra-light. Dark mode matches, and every text colour still meets WCAG AA. The favicon, app icons and social image were regenerated.
- **Overview:** laid out on a strict grid of six equal cards, each previewing at most four rows with a *View all* bar in the same place, opening the rest in a pop-up.
- **Board messages** name the assignee: *Only Priya Nair, the assignee, can submit this task*.
- **Sign-in** goes to the start page for how you said you'd work (for example, My tasks for "I do the work"), unless a link asked for somewhere else.

## Launch-ready: real accounts, emails, legal pages, SEO and audits (2026-09-27)

### Added
- **Real accounts and email:**
  - sign-up with email confirmation;
  - a sign-in alert on every sign-in;
  - forgot password, and reset password (which signs out everywhere);
  - a "password changed" email;
  - emails sent through Resend's HTTPS API (or written to the log for local testing);
  - a new migration: V4 (confirmed email, accepted terms, session version, emailed-link tokens).
- **Bot protection:** a honeypot field, limits per IP address and per account (sign-in counts only failures), and optional Cloudflare Turnstile.
- **Pages:**
  - privacy policy (`/privacy`) and terms (`/terms`), with an "I agree" box on sign-up;
  - a custom 404, served with a real 404 status;
  - check-email, confirm-email, forgot-password and reset-password pages.
- **Cookie consent and analytics:**
  - a banner with equal yes/no, and *Cookie settings* in the footer and in Settings;
  - Vercel Web Analytics and/or GA4, loaded only after consent, with ids and tokens removed from addresses.
- **SEO:**
  - per-page titles, descriptions, canonical links and social-preview tags, also written into static HTML per public page;
  - `noindex` on signed-in pages;
  - sitemap.xml and robots.txt, generated at build time.
- **Social preview image and favicon set:** a 1200×630 image from a real frame of the 3D model; SVG with a dark-tab variant, ICO, Apple touch and app icons, and a web manifest.
- **Security headers and HTTPS:** a Content-Security-Policy and other security headers, HSTS, and a backend HTTPS redirect (`REQUIRE_HTTPS`).

### Changed
- **One call to action on the front page:** *Create your free account*.
- **Colours:** lightest grey, muted grey, warning amber and the wordmark now meet WCAG AA contrast in both themes.
- **Grids** without explicit columns can shrink, so nothing makes a phone page scroll sideways.
- **Tap targets:** bigger footer links, contents links and model checkboxes.
- **3D exhibits** on public pages load once the browser is idle.
- **Sample evidence links** use the reserved `.example` domain.

### Fixed
- **After sign-up**, new accounts sometimes landed on Today instead of the introduction: two redirects raced. Sign-in and sign-up now make one redirect.

### Security
- **Secrets:**
  - the backend refuses to start with the public default `JWT_SECRET` against a non-local database;
  - `vite build` fails if the bundle contains a secret key, or (with the real backend) the demo data;
  - the build refuses an `http://` API address.
- **Sessions:** tokens carry a session version; a password reset or change ends every other session.
- **Emailed links** are single-use (even when clicked twice at once), stored as SHA-256 hashes, and removed from the address bar once read.
- **Password reset and change** retire every older emailed link and close the account's live-update streams.
- **Confirming an email** doesn't sign in, so an address registered by someone else can't be taken over.
- **Sign-in limits** count only wrong passwords, per address and per account-and-address. There's no account-wide lockout that could be used against someone. IPv6 addresses are limited per /64 network.
- **Passwords over 72 bytes** get a clear message instead of a server error.
- **After a password change in one tab**, other tabs adopt the new session instead of signing the first tab out.
- **Google Analytics**' automatic events carry the redacted address too.
- **Names** are left out of confirmation and reset emails.

## Ready to host (2026-09-26)

### Added
- **Hosting files:**
  - `backend/Dockerfile` (a Java 21 container, running as a non-root user) and `.dockerignore`;
  - `frontend/vercel.json`, so app routes work on refresh;
  - a *Deploy it* section in the README listing every setting.

### Changed
- **Port:** the backend listens on the host's `PORT` when one is set (`SERVER_PORT` still wins).

### Fixed
- **False "backend isn't running" warning on a hosted site:** when the frontend and backend are on different addresses, the sign-in page's health check was blocked by CORS. `/actuator/health` now allows the configured origins.
- **Hosted wording:** the sign-in warning no longer gives local terminal commands when the backend is hosted.

## The assistant, with voice; the graph moves inside the app (2026-09-26)

### Added
- **Assistant:** an *Assistant* button on every signed-in page, plus Alt+A and the ⌘K palette, opens a side panel for the current or chosen project.
- **Predictive analysis:** forecast, risks, recent changes and "what should I work on next" are computed from the records and labelled *no AI*. Other questions go to the AI when a provider is configured, or get an honest "needs AI" reply.
- **Task management by command:** "Create a task … due Friday, high priority, assign it to Rohan" becomes a draft that opens the normal task form, filled in. "Start LIB-8" becomes a confirm button, and "Open LIB-8" or "Show the 3D model" navigate. Everything goes through the usual endpoints and permission checks, and nothing changes without a click.
- **AI suggestions:** AI answers may carry suggested actions (*create task*, *start task*). The server keeps only those two types and only real task keys, and shows them as the same confirm cards (also under *Ask about this project* on the Model page).
- **Voice:** push-to-talk, an optional "Hey ProjectFlow" wake phrase and answers read aloud, using the browser's speech recognition and synthesis.
  - The wake phrase is off by default, remembered per user on this browser, and listens only while the tab is visible.
  - The Assistant button and the panel header show whether it's listening now or paused. If the microphone is blocked or the speech service keeps stopping, it switches off and says why.
  - The panel says where audio goes.
  - Voice can prepare a change but never confirm one.
- **Keyboard and focus:** Alt+A opens the panel, moves into it when it's open, and closes it from inside (when the text box is empty). Focus returns to the Assistant button on close. The conversation is kept while the panel is closed.
- **Overview graph:** a *History and forecast* card on each project's Overview, with the graph and the analysis lines that need attention, linking to the 3D model.

### Changed
- **Front page:** keeps a small 3D preview of the sample project. The history-and-forecast graph, analysis and assistant are inside the app only; the sign-in and introduction exhibits no longer show the graph.
- **Model and Overview pages:** now share one hook for building the model (cached queries).
- **Task form:** can start from a draft (title, description, priority, due date, assignee, estimate).

## Front page, introduction, sign-in, history-and-forecast graph and AI assistant (2026-09-26)

### Added
- **Front page (`/`):**
  - a live exhibit of a fictional sample project, using the same 3D model, camera views, replay, graph and analysis as a real project;
  - three ideas, how work moves, a roles table computed from the permission rules, and everything inside the app.
- **Introduction (`/introduction`):** nine short chapters with a sticky index, including an interactive life of a task, how to read the model and forecast, and what the AI assistant can and can't do. New accounts land here unless an invitation link sent them elsewhere.
- **Sign-in and registration:**
  - redesigned under the public header;
  - on large screens, the sample project (sign-in) or the four-stage sculpture (registration);
  - *Keep me signed in* (off keeps the session in this tab only);
  - a Caps Lock warning;
  - sample accounts, shown in demo mode, or with the backend when `VITE_SHOW_SAMPLE_ACCOUNTS=true`.
- **History and forecast graph:** on every project's Model page, under the 3D model. It shows all tasks and approved tasks day by day, recorded up to today and dashed as an estimate after it. It's synced with the replay (click or drag to scrub), with a table of the numbers.
- **Analysis:** beside the model, computed from records and marked *Recorded* or *Estimate*, with the tone in words as well as colour. It covers:
  - the estimated finish against the deadline;
  - open tasks without an estimate (the forecast assumes 1 day each and says so);
  - overdue work and what it holds up;
  - reviews waiting and rework;
  - open tasks per person, listed alphabetically with no ranking.
- **AI assistant:** *Ask about this project*, backed by `POST /api/projects/{id}/ai/ask`.
  - Any member may ask; the server checks membership before gathering the project's records.
  - The page's scheduler estimate is sent along, filtered to the project's own task keys and labelled as an estimate.
  - Answers cite task keys (invented keys are dropped) and list what the records don't show.
  - With no provider configured it says it's unavailable, in demo mode too.

### Changed
- **AI prompts:** user-written text is escaped so it can't close its `<record>` wrapper.
- **Hourly AI limit:** a request counts once the provider replies, even if the reply is unusable; only transport failures are refunded.
- **Long answers:** trimmed so follow-up questions stay within the history limit.
- **Calendar days in the model:** rounded, so due dates don't shift by a day across daylight-saving changes.
- **Touch scrolling:** 3D views embedded in pages (the sample project, the sculpture, the skyline) leave touch scrolling to the page and don't zoom on the mouse wheel.
- **Sign-in on phones:** the exhibit isn't mounted at all, so no three.js download or WebGL.
- **Camera fitting:** the camera centres the model's projection.

## Fix: backend compile error, and run instructions that survive copy and paste (2026-09-26)

- **Backend didn't compile:** `GlobalExceptionHandler` imported `MissingServletRequestPartException` from `org.springframework.web.bind`; it lives in `org.springframework.web.multipart.support`.
- **Why it slipped through:** earlier compile checks used hand-written stand-ins for the Spring APIs, and they had the same mistake.
- **New checks:**
  - The backend (main and tests) is now compiled against the real source code of every library, at the versions Spring Boot 3.5.16 selects. It reports 0 errors.
  - Repository query method names, JPQL queries and entity column names are checked against the entities and migrations.
  - The frontend is type-checked against the libraries' real types. It reports 0 errors, and every imported lucide icon exists in 0.525.
- **README commands:** the command blocks no longer have `# comments` after commands. The macOS terminal (zsh) passes them to the command as arguments, so `npm install  # first time only` failed with `EINVALIDTAGNAME "#"`, and the dev server then couldn't find `@tailwindcss/vite`. Troubleshooting now covers both errors.
- **Changelog:** entries are back in date order.

## Redesign: a project you can walk around (2026-09-26)

Answers the design review in [docs/DESIGN_REVIEW.md](docs/DESIGN_REVIEW.md); the spec is [docs/REDESIGN.md](docs/REDESIGN.md).

### Added
- **Project Model** (chapter III, `/projects/:id/model`): a three.js model built from the project's records.
  - Layout: time runs left to right, one lane per person, and height is priority. Materials are stone, graphite, amber and bronze (approved). Dependency threads, a glass Today plane, milestone obelisks and the deadline are drawn in.
  - Replay: a scrubber rebuilds any day from the recorded status history; past today, scheduler estimates show as labelled ghosts.
  - Controls: camera presets (Overview, Plan, Elevation, Today), toggles, hover details, and a selection panel that highlights what the task waits on and what it unblocks.
  - Keyboard: full keyboard navigation with screen-reader announcements.
- **Portfolio Skyline** on Today: one tower per project, layered by status, with a red sleeve for overdue work, synchronised with a text list.
- **Flow Sculpture** on sign-in and registration: four stages as an interactive sculpture, with the stage names as real text.
- `GET /api/projects/{id}/history` (members only) and the same route in the demo API: every recorded status change, oldest first (time, then id).
- Project cards show a small **tower glyph** of their tasks instead of a coloured letter tile.
- Tests: the 3D model's geometry and replay logic, history ordering and access (backend and demo API).

### Changed
- **Navigation:** the sidebar and top bar are replaced by a typographic **masthead** with five places, and by a full-screen numbered index on phones. Projects have six numbered **chapters** instead of eleven tabs.
- **Today** (formerly Mission Control): the stat tiles, trend chart, project list and activity feed are gone; it's now the skyline, the decisions list, and up next, proven done and next three weeks. *My tasks* is now *My work* and *Analytics* is now *Reports*.
- **Loading:** pages load on demand; three.js only downloads with a 3D view.
- **Autofill:** autofilled inputs keep the app's colours (fixes the blue-grey fields in the registration screenshot).
- **Timeline:** month names no longer run together, and the Today/Deadline labels have their own row.
- **Demo indicator:** the badge by the wordmark no longer repeats as a live-status "Demo".

### Dependencies
- `three` ~0.186.0 and `@types/three` ~0.186.0. Run `npm install` in `frontend` after updating.

## Diagnostics for a backend that isn't reachable (2026-09-26)

- When Spring Boot isn't running, the Vite dev proxy now answers with the API's error shape (`503 BACKEND_UNAVAILABLE`) and a message saying how to start it, instead of an empty 500 that the app could only report as "The server ran into a problem".
- Sign-in and registration pages check `/actuator/health` in backend mode and show what to do if the backend is down or reports `DOWN` (usually MySQL); the notice clears itself once the backend answers.
- A 5xx without details now points to the backend terminal.
- README: *Troubleshooting* table for the common start-up failures.
- Verification: the backend **tests** now also compile against API stubs (main and test sources, 0 errors).

## Review fixes after Phases 2–6 (2026-09-26)

An independent read-through of Phases 2–6 found the issues below; all are fixed.

- **Plan apply stale check covers the whole basis.** The request now carries every open task's version and every dependency id the scenario used (`basis`); if any task was edited, added, finished or deleted, or a dependency changed, nothing is applied (`409 EDIT_CONFLICT`). Previously only the changed tasks were checked. Mock API matches; tests extended.
- **Plan page:** a rejected apply no longer refetches and silently recalculates the scenario; *Recalculate with the latest data* is the only way to clear the stale state. Fixed a TypeScript narrowing error in the scenario builder that would have failed `tsc -b`. The scenario tile no longer turns grey.
- **Per-project page state** (saved plan scenarios) can no longer carry over between projects when navigating back/forward.
- **Dependencies:** concurrent "A waits on B" and "B waits on A" requests can no longer both pass the loop check (row lock on the project). Deleting a dependency you can't access returns 404, the same as an unknown id.
- **Live updates:** removed members and everyone in a deleted project are now told to drop it; SSE timeouts and disconnects are closed quietly instead of logging errors; per-user ticket cap; member lookups are cached briefly so a large plan apply doesn't query once per event.
- **AI:** the provider call no longer holds a database connection (the prompt is built in a short read-only transaction first); a failed provider call no longer uses up the caller's hourly quota.
- **Timeline:** the *Today* and *Deadline* labels were hidden under the sticky header; they now sit in the header and are in the legend. Copy no longer says there are no estimates.
- **Dependency map:** no longer re-scrolls on every click and background refresh.
- **⌘K palette:** Enter can no longer open a result for the previous search text.
- **Task form:** server errors for the estimate now appear on the estimate field; an invalid estimate on the task page is reset to the saved value.

## Phase 6 — Live updates, accessibility and verification

- **Server-Sent Events** (`GET /api/events/stream`) with one-time tickets (`POST /api/events/ticket`, 60 s) because `EventSource` can't send a bearer token. Events are sent after commit, only to current project members, and carry ids only; clients refetch through the normal authorised endpoints. Automatic reconnect with back-off; demo mode syncs across tabs through storage events.
- Contrast and reduced-motion fixes across the new pages.

## Phase 5 — Event-based analytics and focused AI

- Analytics from recorded events: work in each status over time (from `task_status_events`), review turnaround (median hours to review), rework rate and rounds to approval, median time in each status. Workload is shown alphabetically; people are never ranked.
- **AI assistance (optional, server-side):** review notes per criterion with a draft of feedback, acceptance-criteria suggestions, and a draft project status update. Keys stay on the server; context is limited to records the caller can see; the model is told it cannot open links or files and every answer lists its limits; nothing is saved or applied without a person choosing to. With no provider configured every AI endpoint returns `503 AI_UNAVAILABLE` and the UI says so — no simulated answers. Per-user hourly limit.

## Phase 4 — Estimates and the what-if planner

- Optional estimates in working days on tasks (`V3__task_estimates.sql`), always labelled as estimates.
- **Plan** tab: a deterministic scheduler (working days, dependencies, one task at a time per person) projects finish dates. Build a scenario — reassign, re-estimate, add time off — compare it with the current projection, then apply the resulting changes in one transaction (owners/managers). People whose dates move are notified with the reason.

## Phases 2–3 — Mission Control, search, calendar agenda, dependencies, map, timeline

- **Mission Control** dashboard: "what needs attention", each item with the rule that raised it and the records behind it (reviews waiting, changes requested, overdue, due soon and not started, own work awaiting review, project and milestone risk, workload, unassigned work due soon, blocked and blocking tasks); recently approved work with its evidence.
- **⌘K / Ctrl K command palette:** pages, commands and server-side search over the projects and tasks you can access (`GET /api/search`).
- **Calendar agenda view** with *Hide completed*.
- **Dependencies** (`V2__task_dependencies.sql`): finish-to-start, same project only, loops rejected with the chain that would close them; blocked/blocking shown on cards, task pages and Mission Control. Demo data includes overdue blockers (CCP-10, MBA-4).
- **Map** tab: interactive dependency graph (layered, keyboard-focusable, upstream/downstream highlighting) plus an equivalent list view. It shows the longest chain of open tasks counted in tasks and explicitly doesn't call it a critical path.
- **Timeline** tab: tasks grouped by milestone on a date axis with a Today rule and the project deadline, drawn from recorded dates only.

## Phase 1 — Backend, persistence, permissions and the review workflow (2026-09-26)

### Added — backend (`backend/`, new)
- Spring Boot 3.5.16 / Java 21 application with Flyway (`V1__initial_schema.sql`) on MySQL 8.4, `docker-compose.yml` for local MySQL, `.env.example` without secrets, Maven Wrapper.
- Stateless JWT auth (jjwt 0.12.7, BCrypt), consistent `{success, message, data, timestamp}` envelope and `{success:false, status, code, …}` errors.
- Per-project roles enforced on the server: `@PreAuthorize("@projectAccess…")` on every project/task route, then role rules in services (`Permissions`).
- Every endpoint the frontend uses: auth, profile, dashboard, calendar, projects, members, invitations, milestones, tasks (list/filter/sort/paginate, board moves with fractional ordering), comments, notifications, activity, analytics.
- **Acceptance criteria and checklists** on tasks; criteria are snapshotted into each submission.
- **Evidence-based submissions**: typed evidence (repository, deployment, link, screenshot, file), multipart upload to local storage, member-only download at `GET /api/files/{id}` (`nosniff`, inline only for safe image types).
- **Criteria-based review**: approval requires every criterion marked met; changes requested requires feedback; nobody reviews their own work; In Review/Done are unreachable by drag or direct status calls; all versions and reviews are kept.
- Optimistic locking (`@Version` + client version) → `409 EDIT_CONFLICT`.
- `task_status_events` history used for cycle time; first-time approval rate.
- Demo data seeder (empty database only) with overdue work, review revisions (CCP-5, CCP-13, MBA-3), workload imbalance and completed milestones.
- MockMvc integration tests on H2 (MySQL mode): role boundaries, approval bypass, submission preconditions, full request-changes → resubmit → approve cycle, own-review block, evidence access, edit conflicts.
- Swagger UI at `/swagger-ui.html`.

### Added — frontend
- **Review workspace** (`/projects/:id/tasks/:taskId/review`): evidence on the left, per-criterion Met/Not met verdicts and feedback on the right, version switcher, "what was asked in the previous version".
- **Definition of done** card on tasks: editable acceptance criteria and checklist, locked in review/done.
- Submit dialog rebuilt around evidence: repository and deployment fields, extra links, screenshots with previews, checklist blockers you can tick in place, the criteria the reviewer will check.
- Authorised file previews/downloads (token-bearing fetch → object URL).
- Acceptance criteria on task creation (one per line).
- `EDIT_CONFLICT` handling with a reload action.

### Changed
- Frontend dev server moved to **port 5174**; backend mode calls same-origin `/api` through a Vite proxy to `localhost:8080`.
- API contract: `Submission.links/attachments` replaced by `criteria` + typed `evidence`; `Review.results`; `Task.acceptanceCriteria/checklist/version/startedAt`; `ProjectDetail.version`; new activity types and `EDIT_CONFLICT`.
- Board drops that mean "review" now open the review workspace instead of a dialog (the old `ReviewDialog` was removed).
- Analytics: cycle time measured from first start (not creation) to approval; "first-time approval" is the share of reviewed tasks approved on their first submission.
- Demo (mock) API brought to parity with the backend; stored schema bumped to v3 (older browser data is reseeded).
- Visual direction changed to a "gallery" catalogue look: stone canvas, square white panels, thin display type, tracked capitals for navigation and buttons, a single bronze accent.

### Verification
- Ran: TypeScript syntax parse of all frontend sources (0 errors).
- Not run (no registry access in the build sandbox): `./mvnw verify`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and the manual demo flow. See README → *Verify locally*.

## Phase 0 — Frontend with in-browser mock API

- Complete React frontend (projects, board, list, task detail, comments, notifications, milestones, calendar, analytics) running against an in-browser mock API.
