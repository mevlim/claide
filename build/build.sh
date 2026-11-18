#!/usr/bin/env bash
# Полная пересборка: картинки → страница → приложение в docs/
set -euo pipefail
cd "$(dirname "$0")"
python3 pack_art.py
python3 build2.py
python3 make_app.py
