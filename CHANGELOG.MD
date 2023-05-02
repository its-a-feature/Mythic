# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0-rc50] - 2023-05-02

### Changed

- Updated agent post_response process dictionary to support `update_deleted` key to mark processes as deleted
- Updated agent post_response process dictionary to support `os` key to mark processes as `windows`, `macOS`, or `linux`
- Updated UI to add new "View Just This Process Tree" option in Info dropdown for process tree view
- Fixed bug with callback graph view's link commands
- Fixed bug with re-added edges in graph view

## [3.0.0rc49] - 2023-04-26

### Changed

- Fixed an issue with marking payloads as deleted when linking agents
- Updated the UI for tasking dropdown boxes are full width
- Updated reporting function to generate JSON output in addition to XML

## [3.0.0rc48] - 2023-04-25

### Changed

- fixed the UI to version 0.1.0 with an update to include the additional webhook types of alert/custom
- adjusted the test webhook function to handle testing the new alert/custom webhook types

## [3.0.0rc47] - 2023-04-25

### Changed

- Fixed an issue where SendMythicRPCFileCreate wasn't setting the is_screenshot or is_download_from_agent fields

## [3.0.0rc46] - 2023-04-24

### Changed

- Moved docker templates back out of this repository and to the MythicMeta/Mythic_Docker_Templates repository

## [3.0.0rc45] - 2023-04-24

### Changed

- Fixed a bug in file uploads that was causing the sha1 and md5 of payloads to not be recorded

## [3.0.0rc44] - 2023-04-21

### Changed

- Updated the payload build and build response to allow for updating the filename as part of the build process

## [3.0.0rc43] - 2023-04-20

### Changed

- Added another check in RSA EKE for PKIX format

## [3.0.0rc42] - 2023-04-20

### Added

- Added two new kinds of webhooks - one for alerts in the operation event log and one for custom webhook data
- Added examples of new webhooks in Jupyter notebook

## [3.0.0rc41] - 2023-04-19

### Added

- Updated MythicCLI to allow setting default operation webhook url and webhook channel in addition to operation name from .env file
- Updated MythicCLI to support `-b` and `--branch` flags when installing from GitHub

### Changed

- Updated some json tags on structs to omit unnecessary nested structure parsing with empty values 
- Fixed the error message for bad messages to Mythic and added more error logging to the UI

## [3.0.0rc38] - 2023-04-18

### Changed

- Added event log notification if a connection is refused due to the IP allow list in the Mythic/.env file

## [3.0.0rc37] - 2023-04-14

### Changed

- For file browsing, if an OS type cannot be inferred based on host, path, and parent path, OS is assumed as Windows
- Fixed an issue with the UI sending the wrong host name for file listings
- Fixed an issue with uploaded files treated like folders in the file browser

## [3.0.0rc35] - 2023-04-13

### Changed

- Fixed an issue with files marked as "delete after fetch" weren't getting deleted
- Fixed some issues with the UI referring to old element IDs instead of display IDs
- Fixed some issues with MythicRPC Credential and File Searches

## [3.0.0rc32] - 2023-04-10

### Changed

- Fixed an issue with RabbitMQ Channels not getting closed after use, resulting in an ID exhaustion

## [3.0.0rc31] - 2023-04-6

### Added

- Added new configuration variable for `mythic_react_debug`
- Added MythicReactUI code to this repository for easier control and development for the community. 
- New image and container are only used when `mythic_react_debug` is set to `true`, otherwise normal nginx container serving static files is used.
- Updated scripting package for Jupyter to mythic==0.1.0rc3
- Updated MythicUI tags to treat http* json fields as clickable links

## [3.0.0rc30] - 2023-04-5

### Changed

- Updated mythic-cli to include a version command
- Updated the agent message Get handler to look at first query parameter, first cookie value, and then message body
- Updated mythic-cli to include a check for the docker version >= 20.10.22

## [3.0.0rc28] - 2023-04-04

### Changed

- Added more to the report generation for the XML side
- Fixed an issue with bad hasura role for non-admins
- Added caching for container information for checking if containers are online
- Updated file tracking for newly created downloads to populate the file browser as well
- Dynamically update file's chunk_size if none is set by the agent to the size of the first chunk

## [3.0.0rc27] - 2023-04-03

### Changed

- Updated the xml reporting a bit further (not done yet)
- Updated processing of agent messages to have a separate case for base64 url encoded messages
- Updated a few issues in the UI

## [3.0.0rc26] - 2023-04-1

### Changed

- Fixed many bugs in mythic_rpc_* functionality that was slightly broken with SQL queries
- Prevented agents from auto-triggering their completion functions multiple times
- Added a flag to not show webhook/logger rabbitmq errors on send
- Updated the payload search rpc functionality to also return the build_phase
- Fixed some UI bugs for various command parameter types

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