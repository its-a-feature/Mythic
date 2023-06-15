# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
