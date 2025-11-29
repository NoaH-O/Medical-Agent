#!/usr/bin/env bash
set -euo pipefail

# Ensure we run from the backend directory so module import paths resolve
cd "$(dirname "$0")"

exec uv run uvicorn app.main:app --reload
