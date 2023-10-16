# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
