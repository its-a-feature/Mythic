# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.1-rc19] - 2023-06-05

### Changed

- Fixed a bug where *nix filepaths might be leading // causing file browser issues
- Fixed bug where deleted files that come back weren't getting marked as not deleted
- Fixed an issue in the UI with timestamps not converting properly between UTC and local time

## [3.0.1-rc18] - 2023-06-02

### Changed

- Fixed a bug where agents reporting back file browser paths with UNC formats wouldn't get properly ingested

## [3.0.1-rc17] - 2023-06-01

### Changed

- Fixed a bug where the `get_delegate_tasks` key wasn't getting passed to the delegate message check
- Fixed a bug where rpfwd messages weren't getting checked for delegate messages

## [3.0.1-rc16] - 2023-06-01

### Changed

- Removed ability to check number of consumers for logging/webhooks since it caused the messages to roundrobin instead

## [3.0.1-rc15] - 2023-05-31

### Changed

- Updated the UI to handle boolean parameters with `-paramName` as `true` on the CLI
- Updated the UI to show number of listeners for consuming services as well as green/orange counts
- Updated Mythic to emit a new `new_response` log type for user_output
- Updated the checks for existing containers to re-use rabbitmq channels if possible
- Updated the health check for rabbitmq to just check for ports listening since no alarms are configured
- Fixed an issue when reporting back deleted files that Windows paths with `\\` need to be escaped again, `\\\\`
- Updated task logging to emit when first created and also when task completes

### Added

- Added new `alerts` key for `post_response` messages to send alerts to the operation event log
- Added new `alerts` key for top level messages to send alerts to teh operation event log

## [3.0.1-rc14] - 2023-05-26

### Changed

- Additional error checking for trying to close SOCKS ports

## [3.0.1-rc13] - 2023-05-25

### Changed

- Updated some rabbitmq RPC functionality to not return error on timeouts

## [3.0.1-rc12] - 2023-05-24

### Changed

- Added a check when getting a new callback to see if the payload is deleted, if so then no new callback is created and an alert is thrown to the operator
- Reduced the popup display for some toast notifications when generating tasks
- Attempt to locate and mitigate potential RPC timeout errors

## [3.0.1-rc11] - 2023-05-23

### Changed

- Updated MythicRPCFileUpdateMessage to allow setting DeleteAfterFetch
- Updated UI to support GenerateIOCs and GenerateSampleMessage for C2 containers
- Updated UI to have icons next to options on the Payloads page so it's easier to find what you're looking for
- Updated UI to not base64 encode browser scripts
- Updated mythic_graphql with new GraphQL endpoint and permissions for c2GetIOC and c2SampleMessage functions
- Fixed an issue with additional information incorrectly mapped to map[string]string instead of map[string]interface{}
- Updated message about out-dated `upload` key for file transfers to be an informational debug message rather than a warning
- Updated Jupyter with mythic==0.1.2

## [3.0.1-rc10] - 2023-05-22

### Changed

- Updated the task status values to be more representative of what's going on
- Updated go.mod values

## [3.0.1-rc09] - 2023-05-18

### Changed

- Fixed an issue with the default value for a dictionary not getting populated correctly due to missing struct tags

## [3.0.1-rc08] - 2023-05-18

### Changed

- Fixed a few things in the UI with linking
- Fixed process browser in the UI not reporting process_id when tasking kill/inject
- Fixed an issue where linked p2p agents would get egress connections in the UI

## [3.0.1-rc07] - 2023-05-17

### Changed

- fixed an issue with creating saved c2 instances that wouldn't supply default values for non-supplied parameters
- updated the scripting version for the Jupyter Container
- added two new examples in the Jupyter container for c2 profiles
- fixed an issue with missing operation_id for c2 profile instances for payloads

## [3.0.1-rc05] - 2023-05-16

### Changed

- Reduced the number of toast notifications when syncing or hitting errors with translation containers

## [3.0.1-rc04] - 2023-05-15

### Changed

- Changed from ParseBytes to FromBytes when attempting to parse a 16 byte UUID instead of a 36 byte string UUID

## [3.0.1-rc03] - 2023-05-12

### Changed

- Fixed how timeouts work for translation services so that they don't hang internally on channels

## [3.0.1-rc02] - 2023-05-10

### Changed

- Updated the webhook for creating custom operation event messages to generate sources if none supplied
- Updated to allow users without an operation set to create an operation and create new users
- Fixed an issue when updating operations outside your operation causing an exception
- Two .svg icons for UI dev were ignored via .gitignore, so added them manually back to the repo

## [3.0.0] - 2023-05-10

### Changed

- Updated to actual release instead of release candidates for v3.0.0

## [3.0.0-rc53] - 2023-05-09

### Changed

- Modified MythicRPCProxyStart to support rportfwd
- Updated Dockerfile build to user smaller base images and use multi-stage builds to reduce final size
- Docker images updated:
  - itsafeaturemythic/mythic_base_go       <-- go1.20 with garble and gRPC
  - itsafeaturemythic/mythic_base_python   <-- python 3.11 with the latest mythic_container PyPi package installed
  - itsafeaturemythic/mythic_go_dotnet     <-- mythic_go_base + .NET Core 7.0 SDK, nuget, and the Mono compiler
  - itsafeaturemythic/mythic_python_dotnet <-- mythic_python_base + .NET Core 7.0 SDK, nuget, and the Mono compiler
  - itsafeaturemythic/mythic_go_macos      <-- mythic_go_base + macOS 12.1 SDK
  - itsafeaturemythic/mythic_python_macos  <-- mythic_python_base + macOS 12.1 SDK
  - All docker images now have a rolling `:latest` tag that can be used
  - All docker images (and mythic-cli builds) now work for ARM as well as x86_64
- Fixed an issue with additional attributes not getting captured for commands

## [3.0.0-rc52] - 2023-05-05

### Added

- Added `File` as a valid build parameter type - like files for tasking, this is passed to the `build` function as a file UUID
- ContainerVersion v1.0.2 has the builder side of this addition
- Docker images updated:
  - itsafeaturemythic/mythic_base <-- go1.20 and python 3.11 with the latest mythic_container PyPi package installed
  - itsafeaturemythic/mythic_dotnet <-- mythic_base + .NET Core 7.0 SDK, nuget, and the Mono compiler
  - itsafeaturemythic/mythic_macos <-- mythic_base + macOS 12.1 SDK
- All docker images now have a rolling `:latest` tag that can be used
- All docker images (and mythic-cli builds) now work for ARM as well as x86_64

## [3.0.0-rc51] - 2023-05-04

### Changed

- Updated `mythic-cli` with `update`, `save`, and `load` commands
  - `update` command simply checks Mythic version, mythic-cli version, and mythic UI version locally against either the main branch or the branch specified with `-b`
  - `save` command exports specified docker images to disk for use with load command
  - `load` command loads exported docker images into local docker engine (helpful for offline environments)
- Updated UI to allow `crtl+F` within more output boxes
- Updated Dockerimages
- Updated `mythic` PyPi package in `jupyter` container to `mythic==0.1.0rc9`

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