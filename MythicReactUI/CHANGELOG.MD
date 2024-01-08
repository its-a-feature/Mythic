# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.48] - 2024-01-08

### Changed

- Updated home page to be a dashboard page
- Updated analytics button on operations page to redirect to dashboard page

## [0.1.47] - 2024-01-03

### Changed

- Fixed the context menu "manually add edge" for graph views
- Added context menu for C2 path dialog from callback table view

## [0.1.46] - 2024-01-03

### Changed

- Fixed a bug in split tasking when fetching information about subtasks causing an error

## [0.1.45] - 2023-12-29

### Changed

- Added initial functionality for a "console"-like view of tasks
  - This has no accordions, but still processes browser scripts so are subject to double scroll bars
- Fixed popper click-away functionality to close when selecting other dropdowns so you don't have multiple overlapping

## [0.1.44] - 2023-12-27

### Changed

- Adjusted tasking so valid uuid values for "File" types to prevent needing to re-submit files

## [0.1.43] - 2023-12-27

### Changed

- Updated the main C2 Profile/Payload Types page to be a table instead of a series of cards
- Fixed toast notifications to be centered and stretch

## [0.1.42] - 2023-12-25

### Changed

- fixed an issue with task multiple double converting parsed tasking data to strings

## [0.1.41] - 2023-12-24

### Changed

- fixed an issue with the new task multiple last checkin time
- added an `ip` column to the task multiple and hide multiple dialogs

## [0.1.39] - 2023-12-24

### Changed

- updated the task multiple and hide multiple dialogs

## [0.1.38] - 2023-12-

### Changed

- Added a `Hide Task Errors` option to task filtering on the active callbacks page
- Added option to `clear` all selected commands in the task filtering dialog on the active callbacks page
- Added per-user UI settings to enable showing IP, Hostname, and Callback Groups with each task
- Added the `Callback ID` and `Callback Group` search option to the Task search page
- Adjusted the task search page to return tasks where the most recent is first (similar to the callbacks search page)
- Fixed the single task view that wasn't getting the nearby tasks correctly
- Updated the Settings page to not allow admins to unset their own admin status, active status, or delete themselves
- Updated the Settings page to allow the hide/show of deleted operators

## [0.1.37] - 2023-12-12

### Changed

- Fixed a bug with the ChooseMultiple type for payload building
- Updated the operator settings update username/password modal to be more clear
- Updated payload creation to allow not selecting a C2 Profile (with acceptance prompt)
- Updated callback dialog to modify groupings to sort existing groups in order

## [0.1.36] - 2023-12-04

### Changed

- When right-clicking or clicking a task button within the File Browser or Process Browser, new options are available
  - You can task your current callback or the callback that initially reported the information you're seeing
- Updated some CSS quirks with shadows
- Added a new column for the main active callbacks table for the groups associated with the callback

## [0.1.35] - 2023-11-23

### Changed

- Updated the callbacks table to not filter last checkin time (only sort)
- Updated the callback's table filter entries to do lowercase matching on both the cell value and input value

## [0.1.34] - 2023-11-22

### Changed

- Updated Callback search page to limit the number of IPs shown and add a Groups column
- Updated Callback metadata modal to also show Group membership
- Added Group search to callback search page
- Updated `Task` displays to include the callback number as a clickable link
- Updated `Files` search page to show Groups along with Host information for files uploaded/downloaded
- Updated `Credentials` search page to show Task, Callback, Host, and Group information
- Updated `keylog` search page to handle non-UTF8 encoded strings without errors
- Updated `artifacts` search page to show group information
- Updated `process` search page to show group information

## [0.1.33] - 2023-11-21

### Changed

- Updated File browser and process browsers to sort groups and hosts

## [0.1.32] - 2023-11-21

### Changed

- Fixed a UI bug with sorting IP addresses in the active callbacks table
- Added a feature to save edited tab descriptions so they're reloaded when the tab is opened again

## [0.1.31] - 2023-11-17

### Changed

- Fixed UI bug from previous step that didn't get updated

## [0.1.29] - 2023-11-17

### Changed

- Fixed UI bug after database migrations for Mythic v3.2.0 where mythictree data with NULL callback data wasn't getting shown

## [0.1.28] - 2023-11-17

### Changed

- Added in new `mythictree_groups` for callbacks to split file browser and process browser data more logically
- Fixed a bug where changing operations wouldn't update active callbacks table until refresh 

## [0.1.27] - 2023-11-13

### Changed

- Fixed zIndex issue for task response speeddials not being over the backdrop

## [0.1.26] - 2023-11-09

### Changed

- Added the "File" parameter type to the UI for C2 Profiles
- Updated payload details, saved c2 instances, and payload builds to reflect new "File" parameter types
- Fixed overflowing toast notifications causing information to get cut off

## [0.1.25] - 2023-11-06

- Fixed a UI bug where clicking on a build step status would always say status as "Error" even if the icon was success

## [0.1.24] - 2023-10-31

### Changed

- Fixed an issue where hitting enter from a popup modal would add an extra newline to the tasking field
- Upgraded various react components 

## [0.1.23] - 2023-10-20

### Changed

- Fixed an issue with failed renders when parameters change type but old values are inspected for payload configurations

## [0.1.22] - 2023-10-16

### Changed

- Removed animations from split tasking

## [0.1.21] - 2023-10-10

### Changed

- Fixed an issue with date pickers not showing up after Mui/React upgrade

## [0.1.20] - 2023-10-07

### Changed

- Fixed the toast notifications to not display if the level is debug

## [0.1.19] - 2023-10-06

### Changed

- Fixed an issue with fetching/deleting saved c2 profile parameter instances that wasn't filtered by C2 profile

## [0.1.18] - 2023-10-04

### Changed

- Updated the toast notification when compiling payloads to be updated for Skip steps

## [0.1.17] - 2023-10-03

### Changed

- Fixed the tracking in the interactive task responses to properly update when switching between multiple interactive tasks

## [0.1.16] - 2023-10-02

### Changed

- Updated to React18
- Updated graphing library to react-flow
- Updated to incorporate TypedArray fields
- Updated File search table
- Updated graphs to support multiple egress channels
- Updated event feed view and made event feed searchable
- Updated to support shift+tab doing a backwards cycle for commands and parameters
- Added new task_response:interactive view for interactive tasking
- Updated to support filtering on last checkin
- Added split-tasking view as a callback dropdown option

## [0.1.15-rc38] - 2023-07-20

### Changed

- Fixed an issue with the select all checkbox that would try to download deleted files
- Updated the c2 profiles / payload types page to be less busy

## [0.1.15-rc37] - 2023-07-19

### Changed

- Updated the tasking modal dynamic query functions to carry over info between parameter groups if parameters with the same names exist

## [0.1.15-rc36] - 2023-07-18

### Changed

- Updated the tasking modal to carry over info between parameter groups if parameters with the same names exist

## [0.1.15-rc35] - 2023-07-18

### Changed

- Updated the file download/upload search to use checkboxes and have a toggle for all of them

## [0.1.15-rc34] - 2023-07-17

### Changed

- Updated the subscription when creating a new payload to have the notification go away when the subscription stops

## [0.1.15-rc31] - 2023-07-11

### Changed

- Updated the payload build notification to have a close button instead of a silence button

## [0.1.15-rc30] - 2023-07-10

### Changed

- Removed the extra "task" button for mass tasking - just hit enter or use the already existing task button

## [0.1.15-rc29] - 2023-07-10

### Changed

- Updated the hide multiple callback view to not hide one at a time, but instead do a mass hide 
- Updated the task multiple view to provide a normal CLI interface for tasking (based on the callback you selected to mass task from)
- Updated the task multiple view to issue a mass tasking instead of one at a time

## [0.1.15-rc28] - 2023-07-05

### Changed

- Updated local time displays to use `en-us` when interpreting a 12 clock to prevent weird 00:12pm issues
- Fixed an issue with process browsing sort functions that didn't properly look up data in process metadata

## [0.1.15-rc26] - 2023-07-05

### Changed

- Updated file browser to highlight folders that have known children so it's easier to track

## [0.1.15-rc25] - 2023-06-29

### Changed

- Updated payload building page to not cache query for payload types
- Updated active callbacks table to have a button for adjusting IP instead of right clicking
- Updated c2 profile page's stdout viewer to not cache queries

## [0.1.15-rc24] - 2023-06-21

### Changed

- Removed the `download` tag on download links as they appeared to cause weird network errors

## [0.1.15-rc23] - 2023-06-16

### Changed

- Updated process browser to optionally show user, architecture, and session information

## [0.1.15-rc22] - 2023-06-15

### Changed

- Fixed the browser scripts page to not allow "delete"

## [0.1.15-rc21] - 2023-06-15

### Changed

- Fixed some issues with searching tag data across operations; now you can search via tag name or data within a tag

## [0.1.15-rc20] - 2023-06-15

### Changed

- Fixed issue with extra parameter when searching tag data

## [0.1.15-rc19] - 2023-06-14

### Changed

- Fixed issue with MITRE ATT&CK and filtering on tags

## [0.1.15-rc18] - 2023-06-13

### Changed

- Tasking to add a link manually in the graph view wasn't filtering on only active callbacks

## [0.1.15-rc17] - 2023-06-13

### Changed

- Fixed an issue with the graph view where autosizing would break the ability to right-click nodes

## [0.1.15-rc16] - 2023-06-07

### Changed

- Fixed an issue where up-arrow to a command from a modal and then typing a new command (without clearing first) would cause a parsing error


## [0.1.15-rc15] - 2023-06-07

### Changed

- Adjusted tasking_location to get sent even when there are 0 parameters in the UI

## [0.1.15-rc14] - 2023-06-07

### Changed

- Removed the page reloading when changing current operation
- Added a clear all and dismiss when building payloads for toast notifications

## [0.1.15-rc13] - 2023-06-02

### Changed

- Fixed a bug where timestamps weren't getting properly converted to local time in file browsers
