# Cross-Model Agent Orchestrator

**Status:** Parked product idea

**Initial rating:** 7/10 as a generic agent-to-agent service; 8.5/10 when
positioned as an overnight, independently reviewed pull-request service.

## Product thesis

Developers should be able to assign a bounded task, leave, and return to a
tested pull request produced by one coding agent and independently reviewed by
another. The product is not an unstructured conversation between models. Its
value is safe orchestration, independent verification, evidence, and controlled
autonomy.

> Wake up to a tested, independently reviewed pull request with bounded cost
> and no automatic merge.

The Wrestling from Marigold workflow is an initial case study: two capable
agents shared a handoff and produced extensive mechanical verification, but
weeks of iteration were spent optimizing a visual contract that was itself
wrong. A useful orchestrator would distinguish mechanical success from human
approval, limit revision loops, and escalate repeated local failures into a
contract-level review.

## Core workflow

1. The user selects a repository and defines a task, acceptance criteria,
   permissions, test commands, spending cap, and maximum revision count.
2. An implementer agent works in an isolated branch/worktree.
3. Automated tests and builds produce an evidence packet bound to the commit.
4. A different model reviews the exact diff and evidence.
5. Structured findings are returned to the implementer for at most one to three
   revision rounds.
6. The workflow stops on approval, budget exhaustion, repeated failure, or a
   product/visual decision that requires a human.
7. The user receives a draft pull request, findings, test results, costs, and
   unresolved decisions. Nothing merges or deploys automatically.

## Product principles

- Separate implementer, reviewer, and optional arbiter roles.
- Use isolated worktrees; never allow concurrent agents to edit one checkout.
- Exchange structured findings rather than relying on free-form handoff prose.
- Bind every review to an exact commit and evidence packet.
- Treat tests as evidence, not proof of product quality.
- Require human approval for visual, product, destructive, external, and
  high-impact decisions.
- Set explicit time, token, dollar, path, and iteration limits.
- Stop after repeated local corrections and reconsider the specification.
- Never push, merge, deploy, delete, or broaden permissions without explicit
  authorization.

## Connection models

### Bring your own API keys

Customers provide supported OpenAI and Anthropic API credentials. Credentials
are encrypted and used only on the server or in a local runner; they never
appear in browser code. The customer pays model providers directly while the
service charges for orchestration.

This is the lowest-risk initial business model because inference costs do not
sit on the service's balance sheet.

### Hosted usage

The service pays model costs and sells metered credits. This simplifies
onboarding but creates abuse, margin, rate-limit, and cash-flow risk. It should
follow real usage data, not precede it.

### Local runner

A desktop or CLI worker holds repository access and provider credentials on the
customer's machine. The web service manages task state and displays results.
This requires more engineering but offers a stronger privacy and enterprise
story.

Do not build around consumer-session cookies or imply that ChatGPT, Codex, or
Claude subscriptions automatically include third-party API usage.

## Minimum viable product

1. GitHub App installation and repository selection.
2. Task form with acceptance criteria and allowed paths.
3. Implementer and reviewer provider/model selection.
4. Ephemeral isolated workspaces.
5. Configurable test and build commands.
6. Structured review schema: blocker, major, minor, question, evidence.
7. Maximum two revision rounds by default.
8. Spending cap, emergency stop, and full activity log.
9. Draft pull request with diff, tests, findings, and cost report.
10. Human approval required for merge.

Explicitly defer autonomous merging/deployment, large agent teams, a general
workflow designer, visual-computer-use tasks, and unlimited plans.

## Target customers

- Solo developers already using multiple coding agents.
- Small agencies maintaining several repositories.
- Technical founders without dedicated reviewers.
- Teams willing to use AI implementation only with independent review.
- Maintainers running migrations, test expansion, repetitive repairs, and
  documentation-alignment work.

The first showcase should be an objectively testable engineering task rather
than visual or open-ended product design.

## Business model

Start with a subscription for orchestration and bring-your-own provider keys.
Illustrative prices to test, not validated market prices:

- Individual: $39/month
- Professional: $99/month
- Small team: $249/month
- Enterprise/self-hosted runner: negotiated

Differentiate tiers by repositories, concurrent jobs, policy controls, audit
retention, team permissions, and self-hosting. Never advertise unlimited agent
runs.

## Defensibility

Model access is not a moat. Durable value would come from:

- reliable orchestration and recovery;
- repository isolation and permission controls;
- cross-model evaluation data;
- evidence-backed approvals;
- cost and iteration management;
- prompt-injection and secret-handling defenses;
- reusable project memory and organization policy;
- measured knowledge of which reviewer patterns catch real defects.

## Principal risks

- Both models share or reinforce the same incorrect assumption.
- Unbounded review loops burn money without improving the result.
- Passing tests obscure product or visual failure.
- Repository content attempts prompt injection or secret exfiltration.
- Credentials or source code leak through logs or third-party services.
- Concurrent work produces merge conflicts or invalid evidence.
- Provider pricing, terms, authentication, or model availability changes.
- Users assume consumer subscriptions include API usage.
- Automatically merged changes create security or operational liability.

## Validation before substantial engineering

1. Interview 10–15 developers who already use more than one coding agent.
2. Recruit five design partners.
3. Deliver the workflow manually behind a landing page.
4. Charge immediately, even at a discounted early-access price.
5. Measure successful PR rate, useful reviewer findings, unattended completion,
   human interventions, cost per task, and elapsed time.
6. Automate only after users pay for the manual result.

Positive comments are not validation. Payment and repeated use are.

## Open questions

- Which initial task category has the clearest return on model cost?
- Should the first runner be hosted, local, or GitHub Actions based?
- Will users trust BYOK storage, or is a local credential broker necessary?
- What structured review schema produces convergence without suppressing novel
  findings?
- Should customers select models, or choose goals such as cheapest, fastest, or
  most independent?
- What provider terms and trademark language govern commercial integrations?
- Which existing products already own parts of this workflow?

## Next step when resumed

Conduct a current competitor and provider-policy review. Then write a one-page
PRD, a threat model, and a manual concierge pilot specification before creating
the production application.

