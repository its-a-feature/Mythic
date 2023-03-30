# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0rc25] - 2023-03-30

### Changed

- Fixed a bug where an operation's channel wasn't sent down as part of webhook messages, only the url

## [3.0.0rc24] - 2023-03-30

### Changed

- updated how socks messaging works internally to mythic (more go channels instead of mutex locks)
- fixed an issue in the UI where bulk callback hides wasn't working
- fixed an issue with socks stop getting caught in deadlocks 

## [3.0.0rc23] - 2023-03-27

### Changed

- fixed a few pieces of the UI for credentials and callbacks searching
- updated the graphql action for creating credentials so they get emitted to logging as well
- updated nginx reverse proxy to handle ip allow lists as well (so jupyter/docs/graphql all get protection too)
- added cpu limits for a few other services

## [3.0.0rc22] - 2023-03-25

### Changed

- Updated the way that callback updates happen so that it's easier with 
## [3.0.0rc21] - 2023-03-23

### Changed

- fixed an issue with token not getting added for get_tasking requests like in Mythic 2.3.*

## [3.0.0rc20] - 2023-03-23

### Changed
- fixed an issue with tokens selected from the UI not making their way through to the payload containers

## [3.0.0rc19] - 2023-03-23

### Changed

- fixed an issue with token adding/removing with bad SQL syntax
- updated components for adding/removing/updating operations and operator memberships with new hasura action
- updated some tagging on database structure to make mapstructure decoding better

## [3.0.0rc18] - 2023-03-23

### Changed

- updated the mythic rpc callback search functionality to require a callback uuid instead of the callback id since the int id isn't available to translation containers

### Added

- Added new graphql endpoints for adding mitre attack to tasks and updating operations

## [3.0.0rc17] - 2023-03-22

### Changed

- fixed an issue where the `staging_translation` capability for a translation container was missing
- fixed an issue with tasking creation leveraging files not tied to tasks when searched
- updated the database schema to support cascading drops (requires dropping database and creating a new one)
- updated how display_ids are calculated for tasks and callbacks (there was an issue with duplicates once you start deleting tasks/callbacks)
- updated the ui and server to create new tasks/callbacks based on display_id rather than id

### Added
- a new endpoint for deleting callbacks and tasks via scripting

## [3.0.0rc16] - 2023-03-21

### Changed

- fixed an issue where hasura updated permissions weren't captured to disk

## [3.0.0rc15] - 2023-03-20

### Changed

- Updated mythic-cli with mythic_postgres to offer a different postgres.conf file based on if postgres_debug is true

## [3.0.0rc14] - 2023-03-19

### Changed

- fixed an issue when loading multiple commands via RPC that it would stop after the first successful one

## [3.0.0rc13] - 2023-03-17

### Changed

- fixed some issues with P2P connections and auto-adding routes

## [3.0.0rc12] - 2023-03-15

### Changed

- fixed an issue with 16 byte uuid not getting reflected back for agent response (defaulted to always 36 char string)

## [3.0.0rc11] - 2023-03-14

### Changed

- fixed an issue with RSA-based EKE where golang libraries require a slightly different format than before. Added code to auto-detect and fix
- fixed an issue where status wouldn't get updated to submitted
- fixed an issue with SOCKS reusing the same ports causing errors
- fixed an issue with mythic-cli stopping all containers instead of just the specified ones

### Added

- added a function to mythic-cli to remove intermediate images

## [3.0.0rc8] - 2023-03-14

### Changed

- fixed an issue with errors getting overwritten from create_tasking and going to the agent
- fixed an issue with script_only commands always reporting success and going to the agent

## [3.0.0rc7] - 2023-03-13

### Changed

- fixed an issue with the outer UUIDs for checkins appearing wrong thanks to BloodHound user Josh Feehs
- fixed a few issues with process_response and complection function messages
- refactored where the automatically updated build steps happened on errors

## [3.0.0rc6] - 2023-03-12

### Changed

- fixed an issue where selecting "none" for crypto would result in "" as the type instead of "none"

## [3.0.0rc5] - 2023-03-09

### Changed

- fixed issue in command addition that wasn't using $1, $2 for parameterization on database Get request
- fixed issue where mapstructure tag was missing from struct


## [3.0.0rc4] - 2023-03-07

### Changed

- updated the token/callback section to remove an instance of TokenID (should be token_id)
- updated the token/callback section to process tokens then callback tokens if both are provided simultaneously

## [3.0.0rc3] - 2023-03-06

### Changed

- fixed a few bugs in the UI
- fixed a bug where "none" encryption was reporting back as a string instead of a dictionary


## [2.3.13] - 2022-08-31

### Changed

- Allowed wrapper payload types to wrap additional wrapper payload types so that you can nest more payload types

## [2.3.12] - 2022-08-25
### Changed
- Updated P2P communications spec to return `mythic_uuid` and `new_uuid` (same value). Eventually `mythic_uuid` will be removed entirely to help reduce the number of mandatory `mythic` strings in agents.