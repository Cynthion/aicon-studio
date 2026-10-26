---
name: ai-grill-plan
description: Interrogate a plan for gaps, hidden assumptions, and unverifiable criteria before implementation starts. Use when a plan exists and should be challenged rather than executed.
argument-hint: <slug>
effort: high
---

# Grill The Plan

Attack the plan. Your job is to find what is wrong with it, not to improve it.

Read `.plan/<slug>.md` and its research artifact.

## What To Attack

| Target                | Question                                                                                                                                                                                                                                                                                        |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceptance Criteria   | Which one cannot be verified by a command or an observation?                                                                                                                                                                                                                                    |
| Verification          | Which criterion has no command mapped to it?                                                                                                                                                                                                                                                    |
| Assumptions           | What does this assume about existing behavior without citing it?                                                                                                                                                                                                                                |
| Reuse                 | What is being built that already exists somewhere in the repository?                                                                                                                                                                                                                            |
| Conventions           | Which part violates [`impl/testing.md`](../../../.documentation/impl/testing.md), [`impl/ubiquitous-language.md`](../../../.documentation/impl/ubiquitous-language.md), [`impl/angular.md`](../../../.documentation/impl/angular.md) or [`impl/a11y.md`](../../../.documentation/impl/a11y.md)? |
| Scope                 | Which listed change is not required by any criterion?                                                                                                                                                                                                                                           |
| Contracts             | Which API route consumer, project folder contract or golden fixture breaks?                                                                                                                                                                                                                     |
| Failure Paths         | What happens on an endpoint error, a rate limit, an empty project, a missing Chromium?                                                                                                                                                                                                          |
| Documentation         | Which changed behavior has no `user/` or `tech/` update planned?                                                                                                                                                                                                                                |
| Rejected Alternatives | Which was rejected for a reason that does not hold?                                                                                                                                                                                                                                             |
| Out of Scope          | What is excluded that the requirement actually needs?                                                                                                                                                                                                                                           |

## Workflow

1. Read the plan and the research.
2. Verify the plan's claims against the code. A claim that cannot be confirmed is a finding.
3. Report findings ranked by how much damage they would do, each with the question it fails and the evidence.
4. State plainly which parts survived.

## Rules

- **Evidence Or Silence**: A finding cites a file, a contract, or a missing verification step. A hunch is labelled as one.
- **Do Not Fix**: Report the gap. Rewriting the plan is the `ai-plan` agent's job.
- **No Manufactured Findings**: A plan that holds up gets told so. Padding the list destroys the value of the skill.
- **Go After The Expensive Ones**: A wrong assumption about existing behavior costs more than a naming quibble. Rank accordingly.
