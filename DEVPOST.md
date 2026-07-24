# Morph: Devpost Submission Content

---

## Name
**Morph**

## Tagline (elevator pitch)
**Software that builds itself.** Drop Morph in and your app rewrites its own source code from a sentence, while your users watch, vote, and become the dev team.

**Alternates (all high-voltage):**
- The last feature you ever code by hand. Morph lets your app build itself from what users say out loud.
- We didn't build an app. We built an app that builds apps, and handed the keyboard to the users.
- Your product now has a mutation rate. Users describe features, three AIs race to build them, the crowd selects, the best code survives. Software that evolves.
- Ship a codebase that edits itself. Live. In production. Without ever breaking.

---

## Inspiration

Software has been frozen since we invented it. You ship a build, and it just... sits there. Dead. Whatever it was on release day is what it stays until a human opens an editor and changes it by hand.

Meanwhile the people using it every single day, the ones who know exactly what's missing, are stuck typing wishes into a feedback box that goes to a spreadsheet that goes nowhere.

We kept asking one question: **why can't software just... build itself?**

Not "AI autocompletes your code." Not "a chatbot writes a file you paste in." We mean: the running app, in production, rewrites its own source code because someone said a sentence, and it does it safely enough that you'd actually let strangers do it.

So we built it. Morph is a tool you drop into any project, and from that moment on, your software is alive. It mutates. It gets scored. The good mutations survive and ship to your repo. The bad ones die in a sandbox and never touch you.

**We turned a codebase into an organism, and we handed the users the keyboard.**

---

## What it does

**Drop Morph into your project and your app starts building itself.**

A beta tester opens your live app and *says out loud*: "make the pricing table sortable." They cannot code. Doesn't matter.

Three seconds later, **the app they're looking at has changed.** Not a mockup. Not a ticket. The actual running software, rewritten, live, in front of their face.

Here's what happened in those three seconds:

**⚡ Three AIs raced.** The moment the words land, three different open-source models fight to write the change. Not one model taking a guess. Three, competing, in parallel.

**🧪 Three sandboxes booted.** Each candidate got its own throwaway machine. Applied the diff. Compiled it. Booted a real dev server. Hit the live preview URL. Only code that *actually builds and actually renders* survives. Broken code dies where it can't hurt anyone.

**🏆 One winner shipped.** The survivor gets committed, pushed to GitHub, and hot-reloaded into the running app. The user sees their idea working. They never opened an editor.

**🗳 Then the crowd votes.** Every user-built feature lands on a live scoreboard. Other testers try it. And here's the part that makes it honest: **we don't count claps, we count undos.** If people keep the feature, it climbs. If they hit undo, it sinks. You cannot fake "I actually kept using this." It's the most brutal, un-gameable product signal that exists.

**👤 And you? You stopped writing the roadmap.** You open Morph and there's a ranked list of features that are *already built, already compiled, already rendering, and already loved by real users.* Your job went from "guess what to build" to "polish what already won."

Your users didn't request the feature. **They shipped it.**

### The part that sounds impossible

"You let random users edit your source code?" Yes. And it cannot break.

The app has a **kernel**, the engine that runs, verifies, and scores mutations, and it is physically untouchable. Any change that reaches for it is rejected *before a single line executes*. Everything else is fair game: users can restyle the entire app, including the chat box they're typing into.

But the app must **survive**. Every candidate has to still build, still render, and still contain the app's anchors, or it's killed automatically. Users get a scalpel, never a grenade.

**It's a codebase you can hand to strangers and still sleep at night.**

---

## How we built it

Four tools, one loop, no glue code.

**🧬 Daytona, the mutation chamber.** Every candidate gets its own ephemeral sandbox: apply the diff, run `npm run build` (does it compile?), boot a dev server and fetch the live preview URL (does it *actually render?*), then `git push` the survivor. This is the whole reason untrusted, user-authored code is safe to run at all. It never gets near your production box, and every step is timed.

**🔥 Fireworks, the three racers.** A user's plain-English wish is turned into real diffs by three models competing simultaneously: **Kimi K2.5** (visual-to-code frontend specialist), **GLM 5.2** (heavyweight general reasoning), and **Qwen3 Coder** (fast, cheap workhorse). Racing three is what turns "a non-coder said a sentence" into "working code that compiles" reliably instead of occasionally.

**📊 Braintrust, natural selection.** Every mutation is logged as a scored span: compiled, rendered, undone, latency. The scoreboard is a live BTQL query over those spans. The trick we're proudest of: **Fireworks calls route *through* Braintrust's proxy**. One base-URL change and every generation is automatically logged, cached, and evaluable. Zero instrumentation code. The evolutionary fitness function came free.

**🎙 ElevenLabs, you just talk.** No typing, no syntax, no editor. Say what you want. Watch the software become it.

**The stack:** FastAPI orchestrating the loop, Vite + React + TypeScript + shadcn/ui as the living app being reshaped, MongoDB for state, Dockerized backend on EasyPanel, frontend on Netlify, GitHub as the genome.

**The idea that makes it all work** is the kernel/app split. Mutability is a *concept*, not a folder. A mutation may touch any part of the app, even the chat and the scoreboard, as long as the app survives the change. The kernel that runs and judges mutations is permanently sealed. That single invariant is the difference between "reckless" and "shippable."

---

## Challenges we ran into

**Letting strangers edit a live app without it being insane.** This is the entire hard problem. The answer was a hard kernel boundary plus survival verification: mutations run in throwaway sandboxes, get rejected pre-flight if they reach for protected machinery, and are killed automatically if the app stops rendering. Safety isn't a policy here, it's a compile step.

**Making "what users actually want" a number.** Votes get gamed. Enthusiasm lies. Undo-rate doesn't. People vote with whether they *keep* the thing, and that reduced a fuzzy product question to a scored, sortable metric.

**Making non-coders succeed.** Someone describing an outcome is not someone writing a diff. Racing three models and keeping only what compiles *and* renders is what closes that gap. It's the difference between a wish that works and an error message.

**Evaluation without building an evaluation pipeline.** Routing every model call through a scoring proxy gave us per-mutation telemetry, caching, and a live leaderboard from one config line. We deleted an entire subsystem before writing it.

**Models newer than the catalog.** Our three racers were newer than the default model catalog, so each had to be registered as a custom provider before anything would route. Bleeding-edge tax.

---

## Accomplishments that we're proud of

- **We made software that builds itself,** live, in production, from a spoken sentence, and it pushes the result to GitHub.
- **We made it safe enough to hand to strangers.** Users can reshape everything and break nothing. The app cannot be bricked. That guarantee is enforced before any code runs, not hoped for afterward.
- **We turned a product roadmap into natural selection.** Features mutate, get tested for viability, and survive or die based on whether humans keep them.
- **Non-coders ship real code.** No editor, no syntax, no PR. They talk; it exists.
- **Four tools, one loop, zero glue.** Describe, race, sandbox, score, vote, ship.

---

## What we learned

**The person who wants a feature most should be the one who builds it.** Collapsing the distance between "I wish this existed" and "here it is, running" doesn't improve the feedback loop, it deletes it.

**Undo is the most honest signal in software.** Compile checks catch broken code. The undo button catches *unwanted* code. One is engineering; the other is product truth. Nobody can fake still using it.

**Constraints are what make autonomy safe.** The moment we defined an untouchable kernel and a "the app must survive" law, giving an AI, and then giving *the public*, write access to a live codebase stopped being terrifying and started being obvious.

**Diversity beats depth.** Three models racing isn't redundancy. It's the mechanism that makes an amateur's sentence reliably become working software.

---

## What's next for Morph

**One-line install.** A script tag / SDK so any product on earth can become self-building in an afternoon.

**Bigger mutations.** Multi-file, dependency-aware features, not just component tweaks. Whole flows, built by users.

**A self-improving router.** Use the scoreboard's own data to auto-pick the best model per request instead of always racing three. The system gets better at building itself the more it builds itself.

**Vote to PR in one click.** A winning user-built feature becomes a clean pull request in your repo, pre-validated, ready to polish.

**Richer fitness signals.** Visual-diff and real-interaction checks layered on top of compile / render / undo.

**The long game:** every app becomes a living thing with a mutation rate and a user base that evolves it. We stop shipping software and start growing it.

---

## Built With
fastapi, python, react, typescript, vite, shadcn-ui, tailwindcss, daytona, fireworks-ai, braintrust, elevenlabs, mongodb, docker, netlify, easypanel, github-api, kimi-k2, glm, qwen

## "Try it out" links
- GitHub repo: `<add your repo URL>`
- Live app (Netlify): `<add your Netlify URL>`
- Demo video: `<add your video URL>`
