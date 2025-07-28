# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.62] - 2025-07-28

### Changed

- Updated the webhook/auth buttons to properly check for subscription / online status for tests

## [0.3.61] - 2025-07-25

### Changed

- Fixed an issue with image tiling getting reset on changes

## [0.3.59] - 2025-07-16

### Changed

- Updated some of the search pages to better account for changing search options
- Fixed the callback group search for tasks

## [0.3.58] - 2025-07-16

### Changed

- Updated some of the context in tag search for tasks to include more callback information
- Added fields for Callback/Payload tags to show up

## [0.3.57] - 2025-07-13

### Changed

- Added the option to show more fields right above the tasking bar

## [0.3.56] - 2025-07-11

### Changed

- Added the cursor view back to ace text fields
- Updated the menu dropdown button to not fade into colored rows as much

## [0.3.55] - 2025-07-03

### Changed

- Updated task dialog to allow removal of credentials
- Updated task dialog on ambiguous parameters to open modal
- Updated task dialog to sort credentials most recent at the top to oldest at the bottom

## [0.3.54] - 2025-07-01

### Changed

- Updated the cooking parsing to trim fields

## [0.3.53] - 2025-06-30

### Changed

- Fixed a bug with updating a user's email in the UI

## [0.3.52] - 2025-06-29

### Changed

- Fixed some alignment issues in the search page
- Added an option when searching tasks to filter by operator
- Added the ability to click to zoom into rendered media images

## [0.3.51] - 2025-06-25

### Changed

- Added a payload diff capability via the Actions dropdown on any payload

## [0.3.50] - 2025-06-24

### Changed

- Updated the single task view page to not show console view
- Merged in PR with a few slight tweaks for console view

## [0.3.49] - 2025-06-23

### Changed

- Updated the UI to leverage the new payload/callback tagging capabilities

## [0.3.48] - 2025-06-19

### Changed

- Fixed an issue with cli parsing where JavaScript would think `1` is a valid JSON string

## [0.3.46] - 2025-06-19

### Changed

- Updated the task modals to show the name and description at once

## [0.3.45] - 2025-06-17

### Changed

- Updated tasking field to show more info about cwd and impersonation_context
- Added user setting to show/hide new cwd and impersonation_context tabs
- Added new tab for extra_info field in callbacks to show
- Added ability to color cwd, impersonation context, and extra info separately
- Added ability to generate new payload based on slightly edited config from the payload's Action dropdown

## [0.3.44] - 2025-06-15

### Changed

- Updated the console view to have a output divider
- Updated the tasking prompt color to be a separate color you can specify in your settings
- Updated task/callback links to match the tasking prompt color so they blend better
- Updated the highlighting of text fields to be consistent grey instead of based on the secondary color
  - should help with some whiplash from editing colors
- Updated the time formatting for console view
- Update the command selection pane when building payloads to not show commands you can't include

## [0.3.43] - 2025-06-13

### Changed

- Updated the background image to not tile

## [0.3.42] - 2025-06-12

### Changed

- Updated the way that the "Console" view works for tasking
- Added `cwd` and `impersonation_context` to UI for callbacks

## [0.3.41] - 2025-06-10

### Changed

- Added more safeguards when importing theme configs to make sure there's valid values

## [0.3.40] - 2025-06-09

### Changed

- Updated the default value for blank arrays to be `[]` instead of `[""]`

## [0.3.39] - 2025-06-06

### Changed

- Fixed some rounded corners on the dashboards page
- Updated the Payload Types / C2 Profiles page to have some context if there's no container installed of each type
- Fixed some hasura permissions that were not scoping fetches down to the current operation but all operations you were assigned to

## [0.3.38] - 2025-06-04

### Changed

- Added new button in Artifacts search page to add new artifacts

## [0.3.37] - 2025-06-03

### Changed

- Fixed bug with viewing files for eventing workflows
- Updated comment view on credential types for tasking
- Updated resize bars to be a bit thinner so that their color is less intrustive
- Updated the default dark-mode color for the side bar to be a bit darker

## [0.3.36] - 2025-06-02

### Changed

- Fixed a bug with double-clicking column headers for the active callbacks page that would break while saving preferences

## [0.3.35] - 2025-05-30

### Changed

- Fixed the spacing in the payloads table to not have each row extra large when not full

## [0.3.34] - 2025-05-30

### Changed

- State of the vertical navbar (open/close) is saved in user preferences so it'll stay through refresh
- Updated the "InviteLinks" UI button on the settings page to only be enabled if you're an admin and the feature is enabled
- Updated UI and GraphQL to allow bulk file delete
- Added new User Preference to hide browser-based tasking (file browser / process browser) from your normal tasking views
- Updated file media viewer to dynamically update as more chunks for a file are received
- Added a new `task:job_kill` supported UI feature that takes in a raw agent_task_id (uuid)
  - This shows up as a `skull` icon for tasking that has been picked up by the agent but hasn't completed
- Updated UI callback drag columns to match vertical navbar color

## [0.3.33] - 2025-05-21

### Changed

- There was an issue with some apollo useLazyQuery functions, specifically for searching and they are updated

## [0.3.32] - 2025-05-19

### Changed

- Fixed a UI update issue with process browser task ids
- Updated adjacency matrix for process data to check for loops

## [0.3.31] - 2025-05-16

### Changed

- Fixed an issue with updated datagrid components for toggling hiding apitokens

## [0.3.30] - 2025-05-16

### Changed

- Fixed an issue with updated datagrid components in a few UI elements

## [0.3.29] - 2025-05-16

### Changed

- Fixed an issue with updated datagrid components in a few UI elements

## [0.3.28] - 2025-05-11

### Changed

- Updated the cli parsing to accept partial match tab complete for static choice lists 
- Updated MaterialUI libraries
- Updated tags to only show first letter until you hover over them to help minimize space
- Updated Payloads page to be less busy and indicate meaningful data better
- Updated PayloadTypes&C2Profiles page to Installed Services page
  - Added tabs for each kind of installed service with counts
  - Removed dedicated "Consuming Services" page
- Updated default shortcuts for vertical nav bar
- Removed horizontal top nav bar and now only use the vertical navbar
- Fixed an issue with multi-select on the payload builders page
- Updated dashboard home page to have "Operator", "Lead", and "Custom" views
  - Custom view is saved to your preferences and allows you to choose which dashboard elements on which rows you want
  - Dashboard elements have additional action buttons and shortcuts

## [0.3.27] - 2025-04-16

### Changed

- Updated processing for font size so virtualized row height is properly updated

## [0.3.26] - 2025-04-15

### Changed

- Updated the tag search for files to not distinct on tag id but file id

## [0.3.25] - 2025-04-10

### Changed

- Updated the reporting table to indicate comma separated values are needed

## [0.3.24] - 2025-04-10

### Changed

- Updated the lab field for text fields to default to True

## [0.3.23] - 2025-04-08

### Changed

- Updated the graph view's edge color to be more intuitive - green/red vs blue/orange
- Updated the color of selecting agents in the grpah view to be more apparent

## [0.3.22] - 2025-04-07

### Changed

- Fixed credential table to not expand columns

## [0.3.21] - 2025-04-01 

### Changed

- Updated vertical nav bar to link to home when clicking mythic icon
- Updated spacing on fields for home dashboard
- Updated response/task sorting on interactive tasks
- Added a few more tooltips for existing icons
- Updated a few clickable icons to be icon buttons
- Updated payload generation parameter displays
- Fixed a few warning messages from MUI

## [0.3.20] - 2025-03-28

### Changed

- Updated the "table/graph" speeddial button on the active callbacks page to be a side bar instead
- Updated the reverse search to include original params, not just command names
- Removed confirmation popup for non-agent payload types during payload creation for c2 profiles and an exit command
- Updated Eventing workflow wizard to support the new tag_create trigger
- Updated CreateTag API call to go through `createTag` action vs `insert_tag_one` to hook into new eventing
- Added ability to re-trigger dynamic query functions in the modals
- Added the ability to pass along other parameters as well and their values for the dynamic query function
- Updated the backdrop for dynamic query calls to just be that element instead of the whole screen
- Updated the `tags` page

## [0.3.19] - 2025-03-19

### Changed

- Fixed an issue where the "deleted" status wouldn't get updated for file browser UI

## [0.3.18] - 2025-03-11

### Changed

- Fixed the vertical extra icons on short layouts that wouldn't auto expand to show them

## [0.3.17] - 2025-03-11

### Changed

- Updated the browserscript table to properly apply MUI colors to icons
- Updated the split tasking and regular task output to handle multiple tables better
- Updated the table rendering for task output to try to be a bit more performant

## [0.3.16] - 2025-03-07

### Changed

- Updated all dropdown menus for tasking to be MenuItem and not Native formatted
- Updated dropdown fields for tasking to register newlines
- Fixes for timeskew calculations

## [0.3.15] - 2025-03-04

### Changed

- Added additional error messages on login

## [0.3.14] - 2025-02-26

### Changed

- Updated file preview for 'text' to properly show extra characters
- Updated payloads table description to break words
- Fixed the rendering for multiple tables in a single output

## [0.3.13] - 2025-02-21

### Changed

- Updated the debounce delay on logon to be 0 to prevent failed logons
- Updated graph edges to not be connectable
- Fixed an issue with event notifications not showing up

## [0.3.12] - 2025-02-21

### Changed

- Updated UI to allow changing what's displayed for the task's timestamp field via user settings

## [0.3.11] - 2025-02-20

### Changed

- Updated the background coloring for images to make it a bit easier to see text on harsh background
- Updated default font family
- Updated command and parameter search to include original and updated command names for aliases

## [0.3.10] - 2025-02-13

### Changed

- Updated processing of arrays and typedarrays to have option to not split on newlines

## [0.3.9] - 2025-02-07

### Changed

- Updated the payloads dropdowns to be ordered by build instead of filename

## [0.3.8] - 2025-02-05

### Changed

- Fixed an issue with interactive tasking where up/down arrows would scroll too much

## [0.3.7] - 2025-02-04

### Changed

- Fixed a bug for interactive tasking where event would be none due to debounced input field

## [0.3.6] - 2025-01-31

### Changed

- Added a generic debounce to all MythicText fields to help when there's a lot of input fields in tasking

## [0.3.5] - 2025-01-30

### Changed

- Fixed a bug in the split tasking view where task updates would reset browserscript view preferences
- Added new browserscript table button color options for info, warning, error, secondary, primary, and success
- Added new browserscript table button icons for check, add, x, refresh
- Updated the eventlog page to default to "warning (unresolved)" if there are tracked unresolved issues
  - otherwise, the default is "info"
  
## [0.3.4] - 2025-01-27

### Changed

- Updated the tab completion for command names and parameters to be a case-sensitive "includes" rather than a "startsWith"
- Fixed bug in file browser streaming that would sometimes return file history data out of order
- Fixed a bug in the file search page that would cause horizontal scrolling for uploads
- Fixed a bug where default values for ChooseOneCustom fields wasn't populating
- Fixed a bug where pre-supplied values for ChooseOneCustom fields in modals weren't populating
- Updated some of the default dark colors
- Fixed a bug on the new eventing wizard that would cause scrolling
- 

## [0.3.3] - 2025-01-24

### Changed

- Updated a few of the backgrounds to be partially transparent
  - This helps when people set busy backgrounds so that you can still see the background but read text too
  
## [0.3.2] - 2025-01-24

### Changed

- Updated the default event log filter to be on 'info' instead of 'All Levels'
- Added a top banner if Mythic loses network connection to inform the operator

## [0.3.1] - 2025-01-18

### Changed

- Added the ability to adjust a file's hosting from the tag search

## [0.3.0] - 2025-01-17

### Changed

- Updated Task links to be `T-#` to be clearer
- Updated Callback links to be `C-#` to be clearer
- Updated tab layout to expand vertically instead of horizontally as the number of open tabs grows
- Added new context menu item for active callbacks to allow reordering columns (saved to user preferences)
- Updated vertical navbar shortcut dialog to also allow easier reordering
- Updated active callbacks tabs to allow easier reordering
- Added more UI color customization options (including the ability to export / import user preferences)
- Added a GUI wizard for creating new workflows on the Eventing page
- Added a new configurable trigger per callback - checkins
  - You can configure a workflow to kick off if a specific callback hasn't checked in for over X minutes
- The active callbacks table now shows icons for the above alert configuration and configured socks data
- Updated the file upload search page to included payloads
  - this makes it easier to search across all uploaded files for hashes and UUIDs
- Updated the task's "View All Parameters" button to also show a variety of important timestamps associated with the task
- Updated the logging level of event notifications related to API usage to the "api" level so they can be filtered out
- Combined the callback table's reorder and visibility dialogs into one
- Fixed an issue with the response display that would error out with extra % signs silently and fail to display emoji
- Callback filters on the active callbacks table now apply to the callbacks graph view as well

## [0.2.75] - 2024-12-31

### Changed

- Updated the hamburger icon to be the same padding as the rest
- Removed the agent/c2 overview table from dashboard page

## [0.2.74] - 2024-12-31

### Changed

- Updated the side bar to have tooltips for the icons
- Updated the tasking bar for callbacks to auto-focus when selecting the tab

## [0.2.73] - 2024-12-31

### Changed

- Fixed an issue with the expanded callback page failing to render
- Updated the page header bars to be smaller

## [0.2.72] - 2024-12-31

### Changed

- Fixed an issue with the new vertical bar shortcut customization
- Adjusted the design of the vertical bar a bit
- Added a horizontal bar to the top to help separate pages from URL

## [0.2.71] - 2024-12-28

### Changed

- Fixed an issue where color wasn't being updated with callback table's dropdown arrow only context menu
- Added an experimental UI option to use a side navigation bar instead of a top one
  - The side navbar allows you to edit/reorder your shortcuts
- Fixed an issue where tasks with no output would have a spinning circle forever

## [0.2.70] - 2024-12-25

### Changed

- Fixed an issue with wrong total counts for task output
- Fixed an issue with task tooltips being too long and not wrapping
- Re-ordered some of the buttons on the hamburger menu to bring more consistently used actions to the top

## [0.2.69]

### Changed

- Added the ability to color individual callbacks
- Added the ability to right-click a tab and collapse all the tasks within it
- Fixed an annoyance where clicking inside a modal and dragging out would close the modal
- Updated the UI to calculate server time_skew and update streaming accordingly
- Fixed an issue with searching tasks by callback ID that wouldn't allow searching of other task options
- Added a "host" field to callback search

## [0.2.68] - 2024-12-18

### Changed

- Updated the interactive tasking page to not always check status field

## [0.2.67] - 2024-12-18

### Changed

- Fixed a login bug after adding additional context to tracked local user state

## [0.2.66] - 2024-12-17

### Changed

- Fixing slight issues with pagination for task responses

## [0.2.65] - 2024-12-12

### Changed

- Fixed an issue with clashing parameter choices and dynamic query choices
  - a parameter that has dynamic query parameter choices will populate the dropdowns in a modal
  - a parameter that has dynamic query parameter choices AND choices defined will have the choices used on the command line with tab and the dynamic choices appear in the modal
  
## [0.2.64] - 2024-12-11

### Changed

- Fixed an issue where modal popups for command augmentation containers would look for the wrong payload type

## [0.2.63] - 2024-12-10

### Changed

- Updated UI to better handle pagination and streaming task responses
- Updated UI to fix bug with submitting payload description update
- Updated UI to fix bug with editing prior modal tasking via command line

## [0.2.62] - 2024-12-04

### Changed

- Fixed a bug for callback tokens not getting passed the .current property of the tracking ref

## [0.2.61] - 2024-11-27

### Changed

- Updated the payloads' page modal boxes to reduce blank space and provide the same text feel as task output

## [0.2.60] - 2024-11-26

### Changed

- Updated how invite links work in the UI allowing more flexibility
- Updated the main dashboard/home page to refresh every minute

## [0.2.59] - 2024-11-20

### Changed

- No longer need to refresh the page on updating your settings
- Added "payloads" search page
- Added commonFontFamily dropdown choice for people that want some common options when changing their preferences

## [0.2.58] - 2024-11-18

### Changed

- Fixed some of the alignment formatting for string cells in creating payloads/tasking

## [0.2.57] - 2024-11-15

### Changed

- Updated the preferences loading to take place on login 

## [0.2.56] - 2024-11-14

### Changed

- Updated the initialization to save the defaults incase the database gets set to empty
- Updated some MythicTooltip pieces to forward some embedded styles

## [0.2.55] - 2024-11-14

### Changed

- Updated the string display dialog for browser script tables to match other text fields
- Updated user preferences to be stored outside of local storage
- Updated Tooltip from MUI to react-tooltip to speed things up a bit

## [0.2.54] - 2024-11-8

### Changed

- Fixed a bug when clicking to filter tasks on the command line

## [0.2.53] - 2024-11-6

### Changed

- Removed File as a tab-completable parameter on the CLI
- Updated tab-completes to use local choices over dynamic query parameters on CLI

## [0.2.52] - 2024-11-5

### Changed

- Fixed bug where right-clicking file browser tree and issuing "list" would list current callback host instead of selected file host
- Fixed bug where selecting "original callback" -> "list" would crash for file browser
- Fixed an alignment issue with trash icons
- Fixed a bug where you could only tab complete the first parameter's options on the command line
- Updated search page for processes to indicate if a process is marked as deleted or not
- Updated process browser to only show active processes
- Updated file browser right-click context menu
- Updated file browser table row action button to not duplicate what's in the context menu for the row
- Updated process browser info buttons 

## [0.2.51] - 2024-10-21

### Changed

- Updated the Callback/Payload add/remove command dialogs to not show deleted commands
- Added label for select options when no options are available in task modals
- Updating the file extension syntax checker to better identify known text files without extensions
  - ex: Makefile, Dockerfile
- Added new field to user settings for showing display parameters or original parameters when doing an up/down arrow through cli history
- Added a check to re-sync payload types when a new wrapper payload type is registered

## [0.2.50] - 2024-10-16

### Changed

- Updated the tab-complete ability for a parameter's `choices` to support partial context
- Updated callbacks table to locally save column widths locally

## [0.2.49] - 2024-10-14

### Changed

- Updated the eventlog page to have options to view only unresolved/resolved warnings
- Fixed some issues with the reverse search box in tasking
- Added an option to stop hosting a file via the host file dialog box
- Fixed but when deleting a tag causing an error
- Added banner_text and banner_color options to operations that applies to every page
- Added a timer for interactive task backdrop notification
- Fixed issue with ChooseMultiple options not being populated in modal based on command line with shift+enter
- Fixed an issue in interactive tasking with empty response being treated as a task
- Added ability to tab-out choices for ChooseOne, ChooseOneCustom, ChooseMultiple, TypedArray, Array fields
  - Includes ones with dynamic query functions set

## [0.2.48] - 2024-10-01

### Changed

- Updated the modal transitions to 'none' to help in virtualized environments

## [0.2.47] - 2024-09-29

### Changed

- Added ability to tab through ChooseOne parameter type values on the command line

## [0.2.46] - 2024-09-27

### Changed

- Updated the default response fetch to 50 from 10 (still changeable in user settings)
- Truncating long command lines to 2 lines wrapped and the full text on hover after 2s
- Updated the copy command parameters speeddial function to also include the command name
- Updated a few of the text-based dialogs to use Ace editors instead of text boxes for more consistency

## [0.2.45] - 2024-09-23

### Changed

- Fixed an issue in light mode with the dropdown for the callbacks graph

## [0.2.44] - 2024-09-14

### Changed

- Updated the tasking UI buttons, console view, and split view to also pass along the payload_type field for tasking
  - This helps with command augmentation containers know which version of a command to execute
  
## [0.2.43] - 2024-09-13

## Changed

- Fixed an issue with export saved c2 profile instances improperly representing dictionaries

## [0.2.42] - 2024-09-10

### Changed

- Updated the C2 config page to not miss keystrokes

## [0.2.41] - 2024-09-09

### Changed

- Updated the toast notifications to not accumulate when you're not looking at the tab
- Updated the toast notifications to dismiss all in queue when you click one
- Updated the nested menu layers to not get hidden behind toast notification's ZIndex
- Updated the C2 Profile/Container File viewer to more closely align with Plaintext views of tasking
- Updated some of the interactive terminal code parsing to start handling some non-ASNI Color cases
- Updated the C2 Profile start/stop button to disable between clicks so you can't accidentally spam it
- Updated C2 Profile debug output view to default to non-wrapped color processed data
- Added option to view standard output with ANSI colors processed

## [0.2.40] - 2024-09-04

### Changed

- Added a button to edit tags while looking at them
- Edited the HostFiles dialog to have an option for marking a file to be alerted or not on download
- Added a size field to the payloads detailed dialog table

## [0.2.39] - 2024-08-30

### Changed

- Updated min widths for fillWidth fields in tables to take at least 150 initially
- Updated auto-tasking for file browser to not apply at the root level

## [0.2.38] - 2024-08-29

### Changed

- Adjusted the file browser a bit to auto close folders with no data in them
- Adjusted the media render view to indicate if chunks are missing

## [0.2.36-37] - 2024-08-28

### Changed

- Fixed a bug where new file listings on blank data could result in a white screen
- Fixed an opacity bug with tag dragging

## [0.2.35] - 2024-08-28

### Changed

- Fixed the file browser tree context menu not showing the originating callback's id
- Fixed eventing create&test window doing a weird cursor replacement

## [0.2.34] - 2024-08-27

### Changed

- Updated the Eventing table to use the same table format as the callbacks table
- Added a test button for the eventing to check for some mistakes before uploading

## [0.2.33] - 2024-08-26

### Changed

- Updated the dropdown for actions in browser scripts to look better in light mode

## [0.2.32] - 2024-08-23

### Changed

- Updated the interactive tasking for search to be a bit better
- Updated interactive tasking to not scroll so much

## [0.2.31] - 2024-08-21

### Changed

- Added the option to use the limit_credentials_by_type field in command parameters to limit UI choices

## [0.2.29-30] - 2024-08-20

### Changed

- Forced visible status on tag labels because they were getting hidden on tasks
- Fixed bad variable name when checking status of updating c2 profile config

- Added the option for ctrl+Enter and cmd/windows+Enter to add new lines when issuing tasking

## [0.2.28] - 2024-08-19

### Changed

- Fixed a bug in file browser where file display wouldn't disappear
- Updated interactive display to not show prompt when not main tasking
- Updated context menu for tables to be at the location of the cursor

## [0.2.27] - 2024-08-19

### Changed

- Fixed a bug in args parsing via the command line that would lose an argument
- Updated the text display for file browser when needing to list out file contents

## [0.2.26] - 2024-08-15

### Changed

- Added a button to view a payload's detailed table from a callback's detailed table
- Added ini syntax highlighting options

## [0.2.25] - 2024-08-14

### Changed

- Fixed an invalid check for command id causing a crash on the tasking console view with help/clear tasks
- Updated normal interact button based on your preferred style of interacting

## [0.2.23] - 2024-08-14

### Changed

- Added better error handling for null values when sorting tables
- Added default value when opening tabs from right clicking
- Added an auto-scroll to the bottom of a tasking/split tasking panel when opening it initially

## [0.2.22] - 2024-08-13

### Changed

- Added a user setting for preferred interact option (accordion, split, or console)
- Added option to double-click callback table row to auto open tasking tab
- Initial updates for the process browser to better represented displayed data
- Updates to process browser to indicate fetching new content
- Updates to process browser for expand/collapse all button

## [0.2.21] - 2024-08-12

### Changed

- Fixed an issue with file browser context menu available through modals
- Added highlighting for .sh files
- Fixed an issue where auto-tasking wouldn't fire for paths that didn't already exist
- Updated dark mode file browser selection colors to be easier to see with info icons
- Updated file browser to show errored task for failed paths to make it easier to see errors
- Added a toast notification on file browser task errors

## [0.2.20] - 2024-08-11

### Changed

- Fixed context menu in mythic tree to not disappear when new data comes in
- Fixed context menus to not shrink and scroll when at the bottom of the screen
- Fixed an issue where trailing slashes on the file browser wouldn't auto-populate data
- Fixed an issue where double data might open when clicking to expand a folder in the file browser tree view
- Fixed issue with 1-2s delay showing callback data as blank with new loading message

## [0.2.19] - 2024-08-09

### Changed

- Added context menu options for the file browser and callbacks table
- Added option in file browser to control/cmd click multiple rows at once
- Major updates to how the file browser works - typing in the bar at the top only fetches data, not issues tasks
  - there's a new option on the table to auto-issue tasks for folders that don't have data (off by default)

## [0.2.18] - 2024-08-08

### Changed

- Adjusted the border bounds for a few elements in the UI to minimize blank space
- Added a right-click context menu to the active callbacks table
- Added a sub-menu structure to the active callbacks menu to keep the menu from getting too long
- Added an option to open multiple callback tabs at once

## [0.2.17] - 2024-08-07

### Changed

- updated the file preview window to display additional context and change names of tabs slightly
- fixed a bug that resulted in double "FilePreviewed" tags in the UI
- updated the sizes of file browser icons to stay consistent
- updated body of file browser table to provide context about if there's no data loaded or collected
- updated border bounds for interactive tasks
- fixed checkbox alignment in file searches
- moved location of file preview to info column in file browser to maintain text alignment in filenames

## [0.2.16] - 2024-08-06

### Changed

- Fixed issue in showing egress pathing in UI for 2+ linked nodes

## [0.2.15] - 2024-08-06

### Changed

- Fixed the lack of auto-scrolling for console display style

## [0.2.14] - 2024-08-05

### Changed

- Updated the proxy search page to hide stopped proxies by default
- Updated the proxy search page to have custom button on rpfwd proxies to manually test connectivity (5s timeout)
- Updated table columns and handle drag animations
- Updated task search to default to command + parameters with a separate option for just command

## [0.2.13] - 2024-08-05

### Changed

- Updated the 'download' option in file previews to not be a long button
- Updated indicator for eventing to be with the taskID instead of username

## [0.2.12] - 2024-08-02

### Changed

- Fixed the create credential dialog while issuing tasks using the old graphql mutation

## [0.2.11] - 2024-08-02

### Changed

- Fixed a duplicating issue when trying to up/down arrow through tasking
- Added button to auto-format output as JSON for text views and update mode to JSON

## [0.2.10] - 2024-07-31

### Changed

- small fix for browser script tables with titles not having column handles properly aligned

## [0.2.9] - 2024-07-31

### Changed

- Adjusted file previews to provide download, string preview, hex preview, and media preview all at once via tabs
- updated file searching to use new preview options
- fixed file/process browsers to support column resizing
- updated mythic-cli to add option for setting mythic_server to host based networking (vs bridge)

## [0.2.8] - 2024-07-30

### Changed

- Fixed an issue with adjusting table columns
- fixed an issue with download history not working in the file browser
- updated file browser download history options with file, hex, and string previews
- updated the new tag dialog to move the "new" down as a "plus" sign
- updated comments on tasks to appear inline (with cut off elipsis)

## [0.2.6] - 2024-07-29

### Changed

- fixed browser scripts not toggling
- fixed condensed view browser script for numbers not showing up
- saved preferences for user changing panel sizes on active callbacks page
- saved preferences for user filtering tables on active callbacks page
- adjusted tooltip timer to be .75s instead of 1s
- auto scroll to selected callback in the top panel of active callbacks when selecting corresponding tab
- unhighlight callback when tab is closed
- highlight active tab to mirror highlighting of table row
- updated tabs to reduce extra space

## [0.2.4] - 2024-07-29

### Changed

- adjusted auto scrolling of tasks to not happen unless you're scrolled to the bottom already
- using the old callbacks table view, the callback you're interacting with will be highlighted
- tasks are auto expanded on the single task view page
- the file browser now has some "history" for the last 20 folders visited with forward/backward arrows
- the file browser now has an "up" button to go up one folder in addition to double clicking a folder to go down one
- fixed an issue where sometimes a task's output browser script wouldn't render
- condensed the views of tables in browser scripts, file browser, process browser, and active callbacks table to be able to view more at once
  - removed agent icons from the active callbacks table and replaced with text of payload type name to make things cleaner when compact
- updated interactive callback controls to have a different background color to make the input fields more obvious
- adjusted task displays to link to both task and callbacks along with tooltips on hover
- fixed an issue where you could do multiple context menues in the file browser tree view
- fixed pty's command history to reset after issuing a task so that it's more consistent

## [0.2.3] - 2024-07-17

### Changed

- Fixed a bug with exporting payload configs due to a back-end name change of the graphql query

## [0.2.2] - 2024-07-17

### Changed

- Fixed a bug with viewing c2 profile parameters in the UI

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
