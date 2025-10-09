#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATE_ARG="${1:-}"

if [ -n "$DATE_ARG" ]; then
  if ! [[ "$DATE_ARG" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "Error: Invalid date format. Use YYYY-MM-DD" >&2
    exit 1
  fi
  COMMIT_DATE="$DATE_ARG"
else
  COMMIT_DATE=$(date +%Y-%m-%d)
fi

echo "Fetching Picture of the Day for $COMMIT_DATE..."

OUTPUT=$(node "$SCRIPT_DIR/fetch-potd.js" "$DATE_ARG" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "Error: fetch-potd.js failed with exit code $EXIT_CODE" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

if [ -z "$OUTPUT" ]; then
  echo "Error: No output from fetch-potd.js" >&2
  exit 1
fi

if echo "$OUTPUT" | grep -q "Error fetching Picture of the Day"; then
  echo "Error: fetch-potd.js returned an error:" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

echo "Creating commit with date: $COMMIT_DATE..."

git commit --allow-empty --date="${COMMIT_DATE}T00:00:00Z" -m "$OUTPUT"

if [ $? -eq 0 ]; then
  echo "Successfully committed Picture of the Day for $COMMIT_DATE"
else
  echo "Error: git commit failed" >&2
  exit 1
fi
