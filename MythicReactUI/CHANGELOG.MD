# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.86] - 2024-03-30

### Changed

- Fixed an issue with array values not getting parsed properly when getting set from saved instances in payload creation
- If you select a pre-created profile instance when generating a payload, then the associated c2 profile is toggled on automatically

## [0.1.85] - 2024-03-30

### Changed

- Fixed an issue with array values getting parsed for the saved instance dialog and create payloads

## [0.1.84] - 2024-03-30

### Changed

- Fixed a bug that wasn't hiding callbacks in the UI until a page refresh

## [0.1.83] - 2024-03-25

### Changed

- Added an option to search files by UUID
- Fixed a few searches that used callback id instead of display id resulting in confusing results
- Added an option to search callbacks by payload type
- Added an option to search callback by display id

## [0.1.82] - 2024-03-21

### Changed

- Fixed issue with filtering browser script tables with experimental new table failing to render

## [0.1.81] - 2024-03-19

### Changed

- Updated the rendering of the experimental table to properly sort "Streaming Now" at the top

## [0.1.80] - 2024-03-08

### Changed

- Updated callback select to be sorted descending

## [0.1.79] - 2024-03-06

### Changed

- Fixed bug with browser scripts tasking the wrong callback for dynamic query parameters

## [0.1.78] - 2024-03-05

### Changed

- Added additional checks around the slider on the homepage dashboard to hopefully catch some errors

## [0.1.77] - 2024-03-04

### Changed

- Fixed the download link color when generating payloads to match normal text colors
- Updated processes browser to help address pid-reuse and cyclic references based on old PID values
- Updated checks in callback table for 3rd party service agents

## [0.1.75-76] - 2024-02-29

### Changed

- Added more files to the `media` browserscript and files search page that are represented as "text"
- Updated table's dictionary display buttons to break all words and enable word-wrap
- Updated graphs with more than 50 nodes to be hidden by default and shown after consent
- Updated graph de-selection to be a right-click context menu so that you can't accidentally unselect
- Updated graph selection to allow hiding everything except what's currently selected

### Changed
- Fixed an issue on file search pages where the expand icon wouldn't work and clicking text wouldn't auto-expand 

## [0.1.74] - 2024-02-28

### Changed

- Updated graph views to allow you to select multiple nodes
- Updated graph views to highlight the currently selected nodes
- Updated browserscript graphs to allow you to highlight/hide single edges at a time
- Updated browserscript graphs to allow custom edge actions in addition to node actions
- Updated browserscript "task" buttons to specify "selectCallback"
  - This allows scripts to expose functionality to _other_ callbacks besides the one currently displaying data
- Updated homepage to show timezone selection for chart of activity
  
## [0.1.73] - 2024-02-22

### Changed

- Fixed a bug where the download link for an uploaded file wasn't working
- Added token tracking to the file browser
- Fixed an issue with the experimental table when a size value was 0
- Fixed an issue where opening the process browser wouldn't go to that host's data automatically
- Updated FileBrowser tree to accept clicks anywhere
- Updated FileBrowser tree to accept contextMenu anywhere

## [0.1.72] 2024-02-21

### Changed

- Added an export and import button for saved c2 configuration instances

## [0.1.71] - 2024-02-19

### Changed

- Fixed a bug in the new experimental tables where new callbacks would make all entries offset and wrong until refresh
- Updated `graph` browserscript to support `overlay_img` and `overlay_style` for superimposing two icons on top of each other
  - Updated list of graph icons to include `diamond` and `skull`
## [0.1.70] - 2024-02-16

### Changed

- Updated the experimental callbacks table to save state in a way that's usable with the old table
- Added new ability to render graphs with browser scripts in the format:
  - {graph: {nodes: [], edges: [], group_by: ""} }
  - nodes have
    - a unique `id` string field
    - a `style` dictionary to configure the display of the node
    - an `img` field which is either a URL to an image to render or one of the following strings:
      - group, computer, user, lan, language, list, container, help
      - This list of available icons will grow over time. If you have a request from https://mui.com/material-ui/material-icons/, just let me know!
    - a `data` dictionary
      - the `data` dictionary must have a `label` string that's displayed with the node and any other fields you want
  - group_by can either be `""` or `"label"` for now, but this will expand in time
- Updated graphs to allow you to click on a node and view just that node's edges
- Updated the browserscripts page to show the agent's icon instead of just name to make it easier to find what you're looking for

## [0.1.69] - 2024-02-15

### Changed

- Fixed an issue with displaying Media output types that would crash the screen due to a missing property

## [0.1.68] - 2024-02-14

### Changed

- Fixed an issue with the task multiple dialog not issuing multiple back-to-back tasks
- Updated the active callbacks table with the new table when the experimental feature is set

## [0.1.67] - 2024-02-14

### Changed

- Added tab-complete options for the `help` command
- Updated tab-complete ordering to be based off of a command parameter's ui_position
- Fixed an issue with auto scrolling when paginating

## [0.1.66] - 2024-02-13

### Changed

- Fixed a bug where if multiple commands were possible from a button in the UI, selecing one would close but not issue the task

## [0.1.65] - 2024-02-12

### Changed

- Added 'secrets' to user's settings page
- Fixed scroll issue where only the first bit of output would scroll and then stop

## [0.1.64] - 2024-02-09

### Changed

- Updated graph views to show nodes without edges as well
- Updated the new experimental table to support background coloring for full table cells
- Fixed a bug with multiple dynamic choice options sometimes not setting all values

## [0.1.63] - 2024-02-07

### Changed

- Adjusted the syntax highlighter and wrap options for plaintext output to be hidden by default with a small button
- Updated download text links in snack actions to be normal text color instead of blue

## [0.1.62] - 2024-02-06

### Changed

- Added syntax highlighter and wrap option to plaintext output
- Added a little buffer above the task input field so it's a bit more obvious when the last task's output is done
- Fixed a bug where multiple browserscript elements would be aligned horizontally instead of vertically
- Fixed a bug where cancelling a dialog modal would prevent future dialog modals until page refresh
- Added new features for tagging data:
  - Tag data values can now be formatted in partial markdown for additional configuration options
    - The following format is available: `"key": "[display data](url){:target=\"_blank\"}"`
      - This is displayed as a clickable link text "display data" that opens a new page to `url`
    - The following format is available: `"key": "[display data](url){:target=\"api\",:color=\"success\"}"`
      - This is displayed as a colored webhook icon that hits the url api with a GET request to `url` and has "display data" next to it

## [0.1.61] - 2024-01-29

### Changed

- Fixed a bug with clicking users/hosts on the main home dashboard page going to a blank search page

## [0.1.60] - 2024-01-29

### Changed

- Fixed a bug with the default value checks for saved user settings in the localStorage

## [0.1.59] - 2024-01-28

### Changed

- Added a new `media` type for browser scripting to render pdfs, images, and text inline with tasking
  - The following render inline: "png", "jpg", "gif", "jpeg", "pdf"
  - The following render as text: "txt", "ps1", "php", "json", "yml", "yaml", "config", "cfg", "go"
  - More file extensions will be added over time, please open PRs or issues to add more formats
  - Formats must be able to natively render in Google Chrome and Firefox, so something like a docx won't work
- Added a new `media` button on the files page to render pdfs, images, and syntax highlighted text
- Added a new user setting to disable automatic rendering of media types (requires a manual click each time)
- Updated tooltips to not display immediately, to follow the cursor, and go away faster, so they don't interfere with clicking as much
- Added new `experimental` toggle per-operator in their settings page to try out new experimental features
  - added a new experimental feature for a different kind of table to be rendered for BrowserScript Tables
- Updated size of top/side icons to make it easier for people to navigate
- Moved the dark/light mode toggle from the size to a dedicated icon on top
- Updated the normal `blue plus` for tasks to a `grey cog` that's on the far right of tasks
  - this should clean up the standard output when looking through tasks
- Updated to not show pagination information for task output unless there's more than one page
- Updated rendering for the search page to not implicitly render all other tabs for increased performance

## [0.1.58] - 2024-01-22

### Changed

- Fixed an issue with mismatched command parameter name, cli_name, and display_name not auto populating with modals

## [0.1.57] - 2024-01-17

### Changed

- Fixed an issue with bad date parsing when creating agents

## [0.1.56] - 2024-01-15

### Changed

- Updated the description for agent debug messaging to be clearer what it's referring to

## [0.1.55] - 2024-01-15

### Changed

- Updated the Settings page to offer an ability to modify global settings
  - You must be an admin to do this
  - Currently, you can only toggle on/off the agent debug message setting
  
## [0.1.54] - 2024-01-14

### Changed

- Updated the event page to allow filtering on the message level (all, warning, info, debug)
- Added tooltips on the c2 profiles page

## [0.1.53] - 2024-01-13

### Changed

- Updated the typed array modal to properly add in new element's values

## [0.1.51] - 2024-01-09

### Changed

- Updated the recent checkins count on the dashboard

## [0.1.50] - 2024-01-09

### Changed

- Updated the dashboard page to have more links to the search pages based on what you click
- Updated the console view for a callback to move the speeddial button closer to the task itself

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
