#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

export AGENT_ENGINE_RESOURCE_NAME="projects/604119988159/locations/us-east1/reasoningEngines/8237273933972242432"
export AGENT_DIRECTORY="app"
export PORT=8080

exec "$DIR/.venv/bin/python" main.py
