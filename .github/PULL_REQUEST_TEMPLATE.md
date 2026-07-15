## Summary

<!-- What does this PR do, and why? One or two sentences. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Contracts change (requires test coverage)
- [ ] Documentation
- [ ] CI / tooling

## Testing

- [ ] `cd contracts && forge test` passes (if contracts changed)
- [ ] `npm run lint && npm run build` passes (if frontend/SDK changed)
- [ ] New behavior is covered by tests, including failure paths

## Contracts checklist (skip if not applicable)

- [ ] No admin path can touch user liabilities, the jackpot, or reward backing
- [ ] New state transitions are one-way and status-guarded
- [ ] Economics changes preserve: stock leg + fee leg + jackpot leg = price
- [ ] Events emitted for every state transition
- [ ] Custom errors instead of require strings

## Screenshots

<!-- For UI changes: before / after. -->
