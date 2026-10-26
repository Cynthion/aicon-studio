# Security Review

How a vulnerability is recorded and kept current. Findings live in **Security Findings** in [`impl/backlog.md`](backlog.md#security-findings), one table row each.

> [!CAUTION]
> A finding is an AI-generated claim until `Human Verified` is `Yes`. Do not base a security or release decision on an unverified finding.

## Columns

| Column           | Holds                                                                        |
| :--------------- | :--------------------------------------------------------------------------- |
| `ID`             | `SEC-<nnn>`, one above the highest ID the table has ever held. Never reused. |
| `Severity`       | `Critical`, `High`, `Medium` or `Low`                                        |
| `Status`         | `Open`, or `Accepted` for a residual risk the maintainer accepts             |
| `Human Verified` | `No` until the maintainer confirms the finding, then `Yes`                   |
| `Vulnerability`  | One sentence on what an attacker can do                                      |
| `Location`       | Links to the affected files, or the boundary when no single file holds it    |

---

## Lifecycle

| When                            | Do                                                                  |
| :------------------------------ | :------------------------------------------------------------------ |
| A vulnerability is found        | Add a row with `Status` `Open` and `Human Verified` `No`            |
| The maintainer verifies it      | Set `Human Verified` to `Yes`                                       |
| The maintainer accepts the risk | Set `Status` to `Accepted`                                          |
| A change fixes it               | Remove the row in that change                                       |
| A change touches its code       | Revalidate it and update `Severity`, `Vulnerability` and `Location` |

- **Tell The Maintainer**: report every added or removed finding with its `ID` and `Severity`.
- **Human Decisions**: `Human Verified` and `Accepted` are set only on the maintainer's word.
- **No Stale Rows**: a row describes the code as it is. A moved file or a partial fix updates the row in the same change.
- **Disclosure**: the repository is public. A row states what an attacker can do in one sentence and never how. A pull request description or commit message names a finding by its `ID` only.
- **Boundary**: the studio listens on the loopback interface only, refuses requests from any other origin or host name, and keeps the API key outside the repository and off the page, see **Guard** in [`tech/pipeline.md`](../tech/pipeline.md#guard). A finding that crosses that boundary is `Critical`.
