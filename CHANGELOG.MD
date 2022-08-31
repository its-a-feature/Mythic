# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.13] - 2022-08-31

### Changed

- Allowed wrapper payload types to wrap additional wrapper payload types so that you can nest more payload types

## [2.3.12] - 2022-08-25
### Changed
- Updated P2P communications spec to return `mythic_uuid` and `new_uuid` (same value). Eventually `mythic_uuid` will be removed entirely to help reduce the number of mandatory `mythic` strings in agents.