#!/usr/bin/env bash
#
# Fails when the up() of a migration contains SQL that can destroy or rewrite production
# data (dropping or renaming tables/columns, truncating, deleting rows, changing a column
# definition) and the file carries no explicit approval.
#
# To approve a deliberate destructive migration, add this comment to the migration file
# after taking a backup and describing the plan in the pull request:
#
#   // destructive-approved: <why it is safe, who reviewed it>
#
# Usage: bash scripts/check-destructive-migrations.sh [migrations directory]

set -euo pipefail

migrations_directory="${1:-src/infrastructure/database/migrations}"
approval_marker="destructive-approved:"
destructive_pattern='DROP[[:space:]]+(TABLE|COLUMN|DATABASE|SCHEMA)|TRUNCATE|DELETE[[:space:]]+FROM|(MODIFY|CHANGE)[[:space:]]+(COLUMN[[:space:]]+)?`|RENAME[[:space:]]+(TABLE|COLUMN)|\.(dropTable|dropColumn|dropColumns|changeColumn|changeColumns|renameColumn|renameTable)\('

if [ ! -d "$migrations_directory" ]; then
  echo "Migrations directory not found: $migrations_directory" >&2
  exit 2
fi

violation_count=0
checked_count=0

for migration_file in "$migrations_directory"/*.ts; do
  [ -e "$migration_file" ] || continue
  checked_count=$((checked_count + 1))

  # Only the body of up(): down() legitimately contains DROP statements.
  up_body="$(awk '/(async )?up\(/{in_up=1} /(async )?down\(/{in_up=0} in_up{print NR": "$0}' "$migration_file")"
  offending_lines="$(printf '%s\n' "$up_body" | grep -Ei "$destructive_pattern" || true)"

  if [ -z "$offending_lines" ]; then
    continue
  fi

  if grep -q "$approval_marker" "$migration_file"; then
    echo "approved destructive migration: $migration_file"
    continue
  fi

  echo "::error file=$migration_file::destructive SQL in up() without '$approval_marker' approval"
  echo "Destructive statements in $migration_file:" >&2
  printf '%s\n' "$offending_lines" | cut -c1-200 >&2
  violation_count=$((violation_count + 1))
done

if [ "$violation_count" -gt 0 ]; then
  echo "" >&2
  echo "$violation_count migration(s) need review. See docs/database-migrations.md." >&2
  exit 1
fi

echo "migration review passed ($checked_count file(s) checked)"
