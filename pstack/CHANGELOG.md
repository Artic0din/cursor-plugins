# Changelog

All notable changes to this plugin are documented here.

## [Unreleased]

### Added

- Added Codex and Claude Code packaging, portable model settings, and native/T3 workflow instructions while preserving Cursor support.

### Changed

- Required history review before treating a worktree with unavailable session history as safe to remove.

### Fixed

- Kept unavailable, unmatched, or failed history scans out of the safe worktree bucket, isolated host settings writes, and corrected host-specific authoring, invocation, model, and verification instructions.
- Restored native Cursor defaults for why and corrected the multi-phase plan template to pass its required checker.
