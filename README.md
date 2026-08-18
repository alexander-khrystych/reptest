# Repertory Role Test by G. Kelly

This project is an online version of repertory role test by George Kelly. Main goals for this project were to standardize and improve data visualization, automate post-test data processing and visualization and make it possible to do this test remotely with your therapist in a convenient way.

**Stack:** Vite · React · TypeScript · Tailwind · Zustand. Live session
sharing and save-&-resume run on a Cloudflare Worker (Durable Objects + KV) — which also runs
fully locally, no Cloudflare account required.

## Features

The app is a WIP. All existing features are fully functional and either are fully complete or require minor polishing at most.

### Improved data representation

The core of this test is data input by a testee. It forms a 22x22 main grid with multiple headers. The same data array is used for creating various graphs, diagrams and grid for more detailed analysis. The results interpretation is always non-deterministic and absolutely unique for every testee since it's based on their own unique life experience. There's no "right" or "wrong" answers, "scale of normality" summaries, etc. Instead, it defines, structures and analyses an array of data. Thus, it's crucial to have all the data visualized in a readable and easy on the eye way, allowing to focus on results interpretation rather than reading the data.

### Automated post-test data processing

Normally, after testee fills out all the data, it's on therapist to process and visualize it in preparation for analisys. The data has to be visualized in 4 separate spreadsheets (3 of which are 22x22 and one is 10x10), a diagram and graph. Usually, it may take up to 2 hours or more, and it's readability heavily depends on therapist's graphical skills. This app automates data processing and visualization, producing readable, easy on the eye tables, graphs and diagrams instantly.

### Save and Resume

Usually, this test takes a few hours just to fill in the data. For that reason, there's a "save and resume" feature. Testee can save the progress (either in a form of a short link or a .json file), then import the session later and pick it up from where they left it.

### Shared session with real-time updates

Repertory grid test is a quite complex test and for that reason it's required to be performed in pair with therapist who acts as a moderator during the data definition and input stage. This app makes it possible to do this test remotely with the therapist "on the line" (phone or video call). During the test, therapist sees all data inputs in real-time in read-only mode.

### Other Features

 - custom grids
 - PDF export
 - main grid demo (filled out with faked data)
 - multi-language support (currently supports only EN, UA and RU)
 - dark mode

### Coming Later

 - add the flow to create a concentrated, more focused 10x10 grid (filtered characters, merged and filtered constructs)
 - characters relations table (currently partially available through the "character pairs" and "highlight on the grid" features on the main table)
 - construct relations table
 - more graphics and diagrams to fully complete the test data analisys
 - a "how to use" guide (low priority due to a therapist involved in the process)
 - "hints & info" along the test flows to answer any question on the go without a need to circle back the "how to use" guide (low priority due to a therapist involved in the process)

## Quicks Start

### Online

This test is available online. It always runs the latest version of `main`. Feel free to try it out.

http://reptestkelly.pages.dev/

### Docker

Requires Docker (Desktop or Engine). No Cloudflare account, no `wrangler login`.

```bash
docker compose up
```

Then open http://localhost:8087.

The relay runs on wrangler's local mode — a bundled `workerd` runtime with a simulated Durable
Object and KV namespace — so from user's persepective, session sharing and save&resume features work offline as if they were deployed to Cloudflare.

### Local deploy without Docker

```bash
pnpm install
pnpm dev         # app   → http://localhost:5173
pnpm party:dev   # relay → http://localhost:8787
```

The two are wired together by default (`VITE_PARTYKIT_HOST` defaults to `localhost:8787`).

### Deploy to Cloudflare

See [DEPLOY.md](DEPLOY.md).
