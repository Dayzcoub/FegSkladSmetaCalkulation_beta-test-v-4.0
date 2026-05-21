# Changelog policy

## Purpose

`CHANGELOG.md` should be readable and useful for current development. It is not an archive dump and should not contain repeated copied sections from previous handoffs.

## Rules

- Newest release entries go first.
- One version gets one section only.
- Each entry should summarize user-visible, architectural or data-contract changes.
- Each entry should mention protected areas when the change intentionally avoids calculations, BOM, warehouse, reservations or backend writes.
- Durable rules belong in active docs, not repeated in every release entry.
- One-off task notes, chat handoff text and copied PR bodies should not be pasted into the changelog.

## History retention

If the changelog is compacted, preserve the old version in Git history and reference the baseline commit in the compacted file.

For the 2026-05-21 cleanup pass, the full pre-cleanup changelog is preserved at baseline commit `df9da58b13fe9a769f38d439b549cbfb39b52f8d`.

## Recommended entry shape

```md
## vX.Y.Z — Short title

- What changed.
- Important behavior/data contract notes.
- Protected flows that were not changed, when relevant.
```
