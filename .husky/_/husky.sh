#!/usr/bin/env sh

# Minimal Husky-compatible shim for repos that install hooks by setting
# core.hooksPath directly to `.husky`.
return 0 2>/dev/null || true
