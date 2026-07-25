# my-utils documentation

This directory contains supporting references. Product behavior and route
registration remain authoritative in the source code.

## Current references

| Document | Scope | Authority |
| --- | --- | --- |
| [`../AGENTS.md`](../AGENTS.md) | development workflow and invariants | primary instructions |
| [`../DESIGN-APP.md`](../DESIGN-APP.md) | SPA/dashboard visual system | primary UI reference |
| [`../DESIGN.md`](../DESIGN.md) | marketing/landing styling | reference only |
| [`REFINE.md`](REFINE.md) | Refine framework patterns | framework reference |
| [`../../my-utils-api/docs/UTILS-WORKSPACE.md`](../../my-utils-api/docs/UTILS-WORKSPACE.md) | frontend/backend integration | shared contract |

Historical implementation plans and specifications live under `superpowers/`.
They explain past decisions but do not override current code, `AGENTS.md`, or
the product README.

## Source-of-truth order

When documents disagree, use this order:

1. current executable code and CI configuration;
2. repository `AGENTS.md`;
3. repository README;
4. supporting references in `docs/`;
5. historical plans/specifications.

Update the closest authoritative document whenever a change makes its
description stale.
