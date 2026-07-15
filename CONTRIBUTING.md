# Contributing

Thanks for your interest in StockPackz. This guide gets you from clone to merged PR.

## Prerequisites

- Node.js ≥ 20 and npm
- [Foundry](https://getfoundry.sh) (for contract work)

## Setup

```bash
git clone https://github.com/stockpackz/stockpackz.git
cd stockpackz

# Frontend
npm install
npm run dev            # http://localhost:3000

# Contracts
cd contracts
forge build
forge test
```

## Project layout

| Path | What lives there |
| --- | --- |
| `contracts/src` | Protocol contracts (core, adapters, vaults, membership, progression) |
| `contracts/test` | Foundry tests — deterministic randomness via mock coordinator |
| `src/` | Next.js frontend (App Router) |
| `sdk/` | TypeScript SDK |
| `examples/` | Runnable SDK examples |
| `docs/` | Protocol docs, rendered at `/docs` in the app |

## Testing

Every contract change must ship with tests. The suite must pass in full:

```bash
cd contracts && forge test
```

Frontend changes must lint and build:

```bash
npm run lint && npm run build
```

Guidelines:

- Test failure paths, not just happy paths — settlement failures, refunds, stale oracles, empty vaults.
- Use injected random words (`MockRandomnessCoordinator.fulfill`) for deterministic draws.
- New economic behavior needs an invariant statement in the test name or comment.

## Pull requests

1. Fork and branch from `main`: `git checkout -b feat/short-description`
2. Keep PRs focused — one logical change per PR.
3. Fill in the PR template, including the testing checklist.
4. CI must be green (contracts + frontend workflows).
5. A maintainer review is required before merge.

## Coding standards

**Solidity**

- Solidity `0.8.26`, `forge fmt` formatting
- OpenZeppelin primitives over hand-rolled security (SafeERC20, AccessControl, ReentrancyGuard, Pausable)
- Checks-effects-interactions, custom errors over require strings, events for every state transition
- No new module may let an admin touch user liabilities — extend the liability accounting instead

**TypeScript / React**

- Strict TypeScript; no `any` without justification
- Prettier defaults, ESLint clean
- Server-authoritative logic: draws and settlement math never trust the client

## Commit style

[Conventional Commits](https://www.conventionalcommits.org):

```
feat(contracts): add pack printer key accrual
fix(frontend): gate reveal on settled draw
docs: expand threat model for oracle failures
test(contracts): cover subsidy refund return-path
```

## Security issues

Never open a public issue for a vulnerability — follow [SECURITY.md](SECURITY.md).
