<!-- markdownlint-disable-file -->
<!-- Save as .plan/<slug>.md. One approach only. -->
<!-- Must be executable by someone with no memory of the conversation that produced it. -->

# <slug>: <Requirement Summary>

## Context

<Why this change is being made and the intended outcome. Two or three sentences.>

Research: `.research/<slug>.md`

## Acceptance Criteria

- [ ] <Checkable statement, with how it is verified.>
- [ ] <Checkable statement.>

## Test Cases

<One table per spec file, per **Test First** in `.documentation/impl/testing.md`. Expected values come from the requirement, never from the code. Mark every guess `assumed`.>

`<test/module.spec.ts>`

|  #  | Case | Given | Expected | Source |
| :-: | :--- | :---- | :------- | :----: |
|  1  |      |       |          |        |

## Approach

<The chosen approach. What changes conceptually, and why this way.>

**Rejected**, <alternative>: <why it lost, one line.>

## Changes

| File | Change | Reuses |
| :--- | :----- | :----- |
|      |        |        |

## Verification

| Criterion | Command | Expected |
| :-------- | :------ | :------- |
|           |         |          |

## Out Of Scope

- <What this change deliberately does not do.>

## Risks

- <What could go wrong and the early signal for it. Omit if none.>

---

## Implementation

<!-- Appended by the implement phase. See implement.template.md. -->
