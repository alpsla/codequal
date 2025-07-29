# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-07-29

### Added
- Logger utility for structured logging in web app
- Support for 'auto' analysis mode in API validation

### Changed
- Updated Jest configurations to use new ts-jest format
- Replaced console statements with structured logging throughout web app
- Improved null safety by removing non-null assertions
- Enhanced type safety by replacing `any` with `unknown`

### Fixed
- Auth middleware tests now properly mock payment method checks
- Request validator tests include all valid analysis modes
- Resolved 39 ESLint warnings in web application
- Fixed ts-jest deprecation warnings across all packages

### Technical Debt
- Migrated from deprecated Jest configuration format
- Improved test mock setup for authentication flow
- Standardized logging approach across the application

---

🤖 Generated with [Claude Code](https://claude.ai/code)