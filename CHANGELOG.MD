# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.20-rc11] - 2024-04-23

### Changed

- Fixed a bug where DynamicQueryParameters weren't getting set on first sync

## [3.2.20-rc10] - 2024-04-10

### Changed

- Fixed a few of the SendMythicRPC* calls to fetch all the same data as normal agent processing

## [3.2.20-rc9] - 2024-04-08

### Changed

- Added CallbackDisplayID, PayloadType, IsInteractiveTask, and InteractiveTaskType to RPC Search results and new_task logging data
- Fixed an issue with SendMythicRPCTaskSearch

## [3.2.20-rc8] - 2024-04-05

### Changed

- Fixed an RPC call for generating a new payload that wasn't calling the right function

## [3.2.20-rc7] - 2024-03-29

### Changed

- When payloads are built, files hosted, files written, or agent configurations checked, Mythic now restarts a C2 profile's server in case there were updates
- Added a fix for C2Profile Parameter Type of File

## [3.2.20-rc6] - 2024-03-25

### Changed

- Added support for PushC2OneToMany via gRPC

## [3.2.20-rc5] - 2024-03-19

### Changed

- Added in a check to support an agent's message_format field for `xml` or `json`

## [3.2.20-rc4] - 2024-03-19

### Changed

- Updated SOCKS to also send any read data even during a read error

## [3.2.20-rc3] - 2024-03-19

### Changed

- Updated the logging library to just be zerolog and not zerolog/logr which was messing with logging levels
- Removed a section of socks/rpfwd code that resulted in double closure messages getting sent to the agent
- Updated a section of socks to do multiple reads with smaller buffers

## [3.2.20-rc2] - 2024-03-14

### Changed

- Fixed an issue where rpfwd connections with the same local port wouldn't get tracked on the proxies page as new connections
- Added `xml` tags to agent messages for planned native support of `xml` in addition to `json` message formats

## [3.2.20-rc1] - 2024-03-08

### Changed

- Fixed an issue where port usage wasn't getting tracked for new ports

## [3.2.19] - 2024-03-05

### Changed

- Added `OperatorUsername` and `OperationName` to Callback data sent to tasks

## [3.2.18-rc10] - 2024-03-04

### Changed

- Updated SOCKS/rpfwd traffic to not double send close connection messages to the agent
- Added "AgentType" field to "PayloadType" database table
- Updated SOCKS initial connection to accept more bytes in case client supports many auth mechanisms

## [3.2.18-rc9] - 2024-02-28

### Changed

- Updated the processing of agent `responses` fields to return a 200 response with empty data if there's an error processing data

## [3.2.18-rc8] - 2024-02-22

### Changed

- Fixed a bug where files registered would get a comment with a taskID instead of a task's display id, leading to confusing task numbers

## [3.2.18-rc7] - 2024-02-21 

### Changed

- Added support for exporting and importing c2 profile instances (green save icon next to a c2 profile then export/import)

## [3.2.18-rc6] - 2024-02-19

### Changed

- Added another check for parsing paths for when a parent_path for the file browser is reported as "path\path"

## [3.2.18-rc5] - 2024-02-16

### Changed

- Updated the response to a `download` message from an agent to include the `chunk_num` the agent sent in the response

## [3.2.18-rc4] - 2024-02-12

### Changed

- Added `secrets` and `preferences` as fields for the `operator` table
  - Added migration to add these two fields
  - User secrets are now available in:
    - payload builds
    - new callback functions
    - opsec pre
    - create tasking
    - opsec post
    - completion handlers
    - dynamic query functions
  - The secrets field allows your agent functions to interact with services on behalf of the tasking operator without storing auth tokens on disk
  - Updated the callback import feature to also support commands and allow duplicate payloads UUIDs (not duplicate callback UUIDs though)
  - Updated SOCKS handling to hopefully prevent a few more cases of deadlocking
  - Updated SOCKS/RPFWD/Interactive Tasking to track bytes sent/received through the agent
    - Data is streamed to the SOCKS search page
    - Data is aggregated on the main dashboard
  
- [UI Fixes](/MythicReactUI/CHANGELOG.MD)
- [mythic-cli updates](/Mythic_CLI/Changelog.md)

## [3.2.18-rc3] - 2024-02-09

### Changed

- [UI Fixes](/MythicReactUI/CHANGELOG.MD)
- [mythic-cli updates](/Mythic_CLI/Changelog.md)
- Updated file-based routes to also log file_id

## [3.2.17.1] - 2024-02-08

### Changed

- Adjusted the SOCKS handling functions to use non-blocking sends when dealing with channels to help prevent deadlock
- Adjusted the SOCKS channels to have increased capacity

## [3.2.17] - 2024-02-06

### Changed

- Added ability to export a callback (via callback dropdown) and import callback (via speeddial on top right of callbacks page)
- Added a new environment variable, `global_server_name`, that gets passed down to webhook and logging containers
- Added new `mythic-cli config help` subcommand to get helpful descriptions of all environment variables in .env file
- Updated logging to track user_id, username, and source of requests
- Updated internal MITRE ATT&CK to the latest as of 2024-02-06

## [3.2.16] - 2024-01-28

### Changed

- Added new file view endpoint to not return files as attachments but just as content to render in the browser easier
- Added more checks for processing completion functions

## [3.2.15] - 2024-01-15

### Changed

- Added ability to query and set global settings such as the agent debug message setting from the UI

## [3.2.14] - 2024-01-11

### Changed

- Fixed typo
- Updated go modules

## [3.2.13] - 2024-01-11

### Changed

- Removed the FileRegister MythicRPC Command
- Updated the FileCreate MythicRPC Command to take in TaskID, PayloadUUID, or AgentCallbackID depending on what the context has available
- Added a `size` field for FileMeta to track the final size of files uploaded, download, or screenshots
- Added a `bytes_received` and a `bytes_sent` field for CallbackPorts to eventually track how much data goes through Mythic
- Updated the data passed in for DynamicFunctionQueries to have PayloadOS, PayloadUUID, CallbackDisplayID, and AgentCallbackID too
  - should help making more informed decisions for which files or dynamic data to present to the user

## [3.2.12] - 2024-01-10

### Changed

- Updated the C2 File host webhook to automatically stop and restart a C2 Profile after hosting a file
- Added a new MythicRPC* for getting graph edges associated with a callback
- Added a new MythicRPC* for creating a new task based on AgentCallbackUUID
  - associated Operator for this will be the operator associated with the Callback (i.e. the one that made the payload)
- Added new function for a Payload Type for `on_new_callback`/`onNewCallbackFunction` so that you can take actions based on new callbacks
- Fixed bug with attempts to send `alerts` in `checkin` message not properly tracking them for the new callback
- Support for container version 1.2.0

## [3.2.11] - 2023-01-04

### Changed

- Added a check for file transfers when getting null data
- Added a fix for spawning a new callback off a payload through the UI

## [3.2.10] - 2023-12-26

### Changed

- Fixed an issue with interactive tasking not working if there wasn't also a port open

## [3.2.9] - 2023-12-26

### Changed

- Updated the Dockerfile for Mythic_CLI and mythic-docker for go v1.21 GOPROXY usage changes that broke builds

## [3.2.8] - 2023-12-21

### Changed

- Adding missing hasura files that didn't get exported and added for updating operator status on the settings page

## [3.2.7] - 2023-12-21

### Changed

- Updated to allow SOCKS/rpfwd message format to specify a `port` (uint32) as part of their messages with Mythic
  - This allows multiple instances of rpfwd per callback with proper tracking for which port to go to
  - The `port` sent in the messages is the local port the agent binds to for rpwfd
- Updated the rpfwd remote connectivity test to happen in a goroutine and not block registration

## [3.2.6] - 2023-12-20

### Changed

- Fixed a bug in the staging_rsa refactor for provided RSA public keys

## [3.2.5] - 2023-12-19

### Changed

- Updated some golang packages in mythic_server
- Pulled some PRs for refactoring and beginning of adding unit tests

## [3.2.4] - 2023-12-14

### Changed

- Added a new controlled endpoint for managing operator admin, active, and deleted status

## [3.2.3] - 2023-12-12

### Changed

- Added new database migration for postgres function to convert callback groups into strings for easier searching
- Fixed bugs in mythic rpc functions for CallbackCreate, CallbackDecryptBytes, CallbackUpdate, and FileCreate

## [3.2.2] - 2023-11-17

### Changed

- Adjusted channel size to help with TOCTTOU issue

## [3.2.1] - 2023-11-17

### Changed

- Fixed a TOCTTOU bug with the total number of file chunks received when there are parallelized requests to Mythic

## [3.2.0] - 2023-11-17

### Changed

- Updated file/process browsers to store/merge information based on host + callback id
- Updated callbacks to have `mythictree_groups` attribute to specify which groups data should be displayed with in the UI
- Added new migrations for the above updates
- Adjusted the file writes during `download` commands to flush to disk after each chunk

## [3.1.7] - 2023-11-13

### Changed

- Fixed a non-idempotent sql migration
- Updated file transfers to Mythic to allow parallel messages from the agent
  - Uses golang channels to ensure ordered file writes and f.Seek to get to the right spot in the file

## [3.1.6]

### Changed

- Updated agent messages to allow %encoding and safe base64 encoding for query parameters

## [3.1.5]

### Changed

- Updated rpfwd and SOCKS messages to aggregate through a single channel to ensure message order

## [3.1.4]

### Changed

- Fixed an issue with locks when checking for containers online or not

## [3.1.3]

### Changed

- Fixed a bug in interactive tasking ports that wouldn't pick up messages for multiple interactive tasks port in a single callback

## [3.1.2]

### Changed

- Fixed a bad channel close and double close scenario with interactive ports

## [3.1.1]

### Changed

- Updated the C2 Profile redirector RPC call to add `#` in front of all non-redirector messages to help with apache mod_rewrite configs

## [3.1.0] 

### Changed

- Added new build step option for skipped steps (useful if you have conditional builds)
- Added new "Split Tasking view" as a callback dropdown option for viewing tasking
- Updated Graphing library (react-flow)
- Updated UI to React18
- Can now sort by last checkin time on active callbacks page
- New "PushC2" style available for egress C2 Profiles
  - Updated with Websocket C2 profile
  - Uses gRPC connections between C2 Docker container and Mythic
- New `TypedArray` parameter type available for commands, build parameters, and c2 profile parameters
  - Useful for generic BoF/COFF style tasking where you need data and a type associated with it
  - Data passed down as an array of tuples: `[ [type, value], [type, value] ]`
  - PayloadType Commands need to supply a TypedArray Parsing Function to handle freeform input for typed array values
    - ex: `my_bof -bof_args int:5 char*:testing wstring:"this is my string"` into proper array of arrays
- New "Host File Through C2" option available for all payloads and files via globe icon
  - Up to the C2 profile to support the RPC call from Mythic and make the file available though
  - Updated with `http` and `websocket` C2 profiles
- Shift+Tab will cycle backwards through options on the tasking CLI
- Event feed format changed and is now also searchable
- "alerts" keyword in responses from agents now allow setting a source, level (info, warning, debug)
  - New `send_webhook` boolean field to indicate sending a custom webhook notification (even if the level isn't warning)
  - New `webhook_alert` dictionary field for custom data to your webhook that's _not_ displayed to the user in the event log
  - `alert` string field is what's displayed to the user in the event log
- Mythic-cli updated to allow options for setting the main UI to listen on IPv4, IPv6, or both
- Agents can now more easily support multiple C2 profiles and have it reflected in the UI
  - Still only one instance of each c2 profile, but that will change in future releases
- Updated callback's "update_info" and "checkin" actions so that callbacks can update their own metadata
- New "Interactive" tasking type available to allow follow-on input in a PTY format
  - Browser view has limitations compared to a full PTY/TTY since it's still in your browser (supports ASNI colors)
    - Non-ANSI color sequence control sequences are ignored in the browser
  - Use the new supported_ui_feature `SupportedUIFeatures:       []string{"task_response:interactive"},` to enable this for your task in the UI
  - With MythicRPC you can open an "interactive" port with your task which you can connect to with a terminal for full PTY support
    - *NOTE* _ALL_ output is still captured and stored in Mythic and viewable in the UI for the task, so be careful about long-running jobs that dump out a lot of data
    - Inputs from the Web UI will appear as "tasks" that you can search. Inputs via the opened port will _not_ appear as tasks.
- Your issued tasks will auto-expand, so it should reduce a click for tasks that finish immediately (help, clear, script_only)
- File Search page updated to have `Bin` and `Strings` views available without needing to expand the dropdown
- Updated `github.com/MythicMeta/MythicContainer` golang package and `mythic_container` PyPi packages
- New database migrations so that you don't have to blow away the database between updates
- Updated user login notification to be debug level (no UI popup)
- Allow dynamic port binding with MythicRPCProxyStart
  - specify a LocalPort of 0 for Socks/Interactive ports and the next lowest available port will be used and returned
- Allow dynamic port closing with MythicRPCProxyStop
  - specify a LocalPort of 0 for Socks/Interactive ports and Mythic will look up the port based on taskID and port type
- Updated ProxyPorts to track "deleted" status so that they're never actually deleted and can be restarted if needed
  - Allows for a better tracking of which callbacks had/have which ports open
  
## [3.0.1-rc46] - 2023-08-22

### Changed

- Fixed an issue with the task searching MythicRPC call
- Fixed an issue with redirects for the UI with custom ports

## [3.0.1-rc45] - 2023-07-20

### Changed

- Fixed sql query error for linked messages

## [3.0.1-rc44] - 2023-07-18

### Changed

- Updated mythic_server and mythic-cli build processes to incorporate GOPROXY and GO111MODULE build/env settings

## [3.0.1-rc43] - 2023-07-18

### Changed

- Updated the bulk download zip option to save filenames as HOST_filename_uuid.ext to help with uniqueness in names

## [3.0.1-rc42] - 2023-07-17

### Changed

- Fixed an issue where with MythicRPCCallbackUpdate failing to find a callback based on task id

## [3.0.1-rc41] - 2023-07-16

### Changed

- Fixed an issue where linked callbacks were consistently creating new edges

## [3.0.1-rc40] - 2023-07-15

### Changed

- Fixed an issue where linked nodes 3+ deep weren't getting their tasking
- Fixed an issue where linked nodes weren't getting their token values

## [3.0.1-rc39] - 2023-07-14

### Changed

- Adjusted the agent message processing to account for agent messages less than 36 bytes long

## [3.0.1-rc38] - 2023-07-12

### Changed

- Adjusted the rabbitmq piece to force close channels on error

## [3.0.1-rc37] - 2023-07-11

### Changed

- Added some missing return statements for file uploads on error cases

## [3.0.1-rc36] - 2023-07-11

### Changed

- Fixed the following RPC functions: agent storage search, artifact search, process search

## [3.0.1-rc35] - 2023-07-10

### Changed

- Fixed how Mythic leveraged rabbitMQ channels to reduce the channel churn rate and increase throughput dramatically
- Updated Mythic's tasking to support mass-tasking natively without requiring all tasks to happen in sequence
- Fixed an issue with a high volume of new callbacks causing issues with Postgres connections
- Fixed an issue with a high volume of new callbacks resulting in duplicated callback identifiers
- Updated the sqlx connection information to limit the number of concurrent postgres connections

## [3.0.1-rc34] - 2023-07-05

### Changed

- Updated file browser data to track if a folder `has_children` or not so that it's easier to track in the UI
- Updated file download to not un-set `is_screenshot` tag based on default values from agents

## [3.0.1-rc32] - 2023-06-30

### Changed

- Updated the translation container code to only ask the translation container to generate encryption keys if the translation container is doing the encryption (instead of always asking)

## [3.0.1-rc31] - 2023-06-29

### Changed

- Added `file_name` field to Downloads so that you can report back a filename without necessarily returning a full_remote_path. This is particularly useful for screenshots or downloading things in memory.

## [3.0.1-rc30] - 2023-06-29

### Changed

- Updated the RPC File Create function to set the host field

## [3.0.1-rc29] - 2023-06-29

### Changed

- Updated check for marking a callback token as deleted to first fetch the proper token_id

## [3.0.1-rc28] - 2023-06-29

### Changed

- Updated check for container status to use rabbitmq REST api to port 15672 instead of passively declaring queues
- Updated rabbitmq image to rabbitmq:3-management-alpine to support the above bullet

## [3.0.1-rc26] - 2023-06-26

### Changed

- Updated the payload builder message to also include a wrapped_payload_uuid field

## [3.0.1-rc25] - 2023-06-14

### Changed

- Updated the rpfwd logic to not bail out if it can't reach the specified remote ip:port when starting

## [3.0.1-rc24] - 2023-06-12

### Changed

- Updated the logic for tracking up/down containers to only notify after successful database update

## [3.0.1-rc23] - 2023-06-09

### Changed

- Updated grpc translation container code to have a larger (maxInt) send/recv limit

## [3.0.1-rc22] - 2023-06-09

### Changed

- Added a line to reflect back keys from the agent at the "action" level

## [3.0.1-rc21] - 2023-06-08

### Changed

- MythicRPC calls for creating task and subtask now report back a tasking location of `mythic_rpc` instead of `command_line`
- Update file delete webhook to not error out if the file to be deleted has already been deleted

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