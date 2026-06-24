---
name: db-migration-drift
description: develop branch can't run knex migrate — shared Neon DB has a migration record whose file is on an unmerged branch
metadata:
  type: project
---

As of 2026-06-23, `npm run migrate` on the `develop` branch fails with: "The migration directory is corrupt, the following files are missing: `029_add_room_location_metadata.js`".

The shared Neon database's `knex_migrations` table records `029_add_room_location_metadata.js` as applied, but that file does not exist anywhere on `develop` (it lives on a teammate's unmerged branch). Knex's `migrate:latest` validates that every recorded migration still exists as a file, so it refuses to run any new migration until this is reconciled.

**Why:** the team shares one remote Neon DB while developing on separate branches, so migrations applied from one branch leave records the other branches don't have the files for. Migration numbers also collide (two `029_*` files across branches).

**How to apply:** to run a new migration from `develop`, first merge/pull the branch containing `029_add_room_location_metadata.js` (or otherwise reconcile `knex_migrations`). New migrations on `develop` should be numbered `030+` to avoid colliding with the unmerged `029`. The HIDDEN-room-status feature added `030_add_hidden_room_status.js` (`ALTER TYPE room_status ADD VALUE 'HIDDEN'`), which is idempotent (`IF NOT EXISTS`) and still needs to be applied once the history is reconciled. Related: [[host-integration-status]].
