import { createGlobalStyle} from "styled-components"
import {alpha} from "@mui/material/styles";
// hex transparencies https://gist.github.com/lopspower/03fb1cc0ac9f32ef38f4
export const GlobalStyles = createGlobalStyle`
body {
    margin: 0;
    background-color: ${(props) => props.theme.palette.background.default};
    color: ${(props) => props.theme.palette.text.primary};
    font-family: ${(props) => props.theme.typography.fontFamily};
}
html, body, #root {
    height: 100%;
    width: 100%;
    color-scheme: light dark;
}
* {
    box-sizing: border-box;
}
::selection {
    background-color: ${(props) => props.theme.palette.primary.main + "40"};
}
* {
    scrollbar-color: ${(props) => props.theme.borderColor} transparent;
    scrollbar-width: thin;
}
*::-webkit-scrollbar {
    height: 10px;
    width: 10px;
}
*::-webkit-scrollbar-thumb {
    background-color: ${(props) => props.theme.borderColor};
    border: 3px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
}
*::-webkit-scrollbar-track {
    background: transparent;
}
@media screen and (max-width: 1100px) {
    .hideOnSmallWidth {
        display: none;
    }
}
.MuiAccordion-root {
    border: 0px !important;
}
.MuiAccordionDetails-root{
    padding-bottom: 0;
    padding-top: 0;
}
.MuiAccordionSummary-content.Mui-expanded{
    margin: 0px 0px 0px 0px !important;
    min-height: unset;
}
.MuiAccordionSummary-root.Mui-expanded{
    min-height: unset;
}
// placeholder/helper text for input boxes
.MuiFormLabel-root {
    background: transparent;
}
.MuiTableCell-head {
    background-color: ${(props) => props.theme.tableHeader} !important;
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
    border-top: 0;
    border-bottom: 1px solid ${(props) => props.theme.table?.border || props.theme.borderColor};
}
.MuiTableContainer-root.mythicElement {
    border: 1px solid ${(props) => props.theme.table?.border || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    background-color: ${(props) => props.theme.palette.background.paper};
    min-height: 0;
}
.MuiTableContainer-root.mythicElement .MuiTableContainer-root.mythicElement {
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
}
.MuiTableBody-root > .MuiTableRow-root:nth-of-type(even):not(.Mui-selected):not(.selectedCallback):not(.selectedCallbackHierarchy) {
  background-color:  ${(props) => props.theme.table?.rowStripe || props.theme.tableHover + "66"};
}
.alternateRow {
    background-color:  ${(props) => props.theme.table?.rowStripe || props.theme.tableHover + "66"};
}
.MythicResizableGridRowHighlight {
  background-color:  ${(props) => props.theme.table?.rowStripe || props.theme.tableHover + "66"};
} 
.MuiTableRow-hover {
    &:hover,
    &--hovered {
        background-color: ${(props) => props.theme.table?.rowHover || props.theme.tableHover + "CC"} !important;
        color: ${(props) => props.theme.palette.text.primary} !important;
    }
}

.MuiSelect-select.MuiSelect-select{
    padding-left: 10px
}
.MuiListItem-root {
    &:hover,
    &--hovered {
        background-color: ${(props) => props.theme.surfaces?.hover || props.theme.palette.action.hover} !important;
        color: ${(props) => props.theme.palette.text.primary} !important;
    }
}
.menuEntry {
  cursor: pointer;
}

tspan {
  font-size: 15px;
  stroke: none;
}

.MuiTab-root {
    min-height: unset;
    max-width: unset;
}
.MuiSpeedDialAction-staticTooltipLabel {
    white-space: nowrap;
    max-width: none;
}
.MuiSpeedDialAction-fab {
    background-color: ${(props) => props.theme.palette.speedDialAction};
}
.MuiTooltip-tooltip {
    background-color: ${(props) => props.theme.palette.background.contrast};
    color: ${(props) => props.theme.palette.text.contrast};
    box-shadow: ${(props) => props.theme.shadows[1]};
    font-size: 13px;
}
.MuiTooltip-arrow {
    color: ${(props) => props.theme.palette.background.contrast};
}
.MuiTreeItem-root.Mui-selected > .MuiTreeItem-content .MuiTreeItem-label{
    background-color: transparent;
}
.MuiTreeItem-root.Mui-selected:hover > .MuiTreeItem-content .MuiTreeItem-label{
    background-color: transparent;
}
.MuiTreeItem-root:hover > .MuiTreeItem-content .MuiTreeItem-label {
    background-color: transparent;
}
.MuiAppBar-root{
    z-index: 1
}
.ace-monokai .ace_invalid {
    color: #F8F8F0;
    background-color: #52524d;
}
.ace_gutter, .ace_scrollbar {
    z-index: 0 !important
}
.gutter {
  background-color: ${(props) => props.theme.borderColor};
  background-repeat: no-repeat;
  background-position: 50%;
}

.gutter.gutter-horizontal {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
  cursor: col-resize;
  width: 5px !important;
}

.gutter.gutter-vertical {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');
  cursor: row-resize;
  height: 5px !important;
}
.resizer {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 5px;
  background: rgba(0, 0, 0, 0.5);
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.resizer.isResizing {
  background: blue;
  opacity: 1;
}
.groupNode {
    border: 1px solid ${(props) => props.theme.borderColor};
    padding: 5px;
    border-radius: 5px;
    background: ${(props) => props.theme.palette.graphGroupRGBA} !important;
}
.groupEventNode {
    border: 1px solid ${(props) => props.theme.borderColor};
    padding: 2px;
    border-radius: 5px;
    background: ${(props) => props.theme.palette.graphGroupRGBA} !important;
}
.circleImageNode {
     height: 50px;
     display: block;
     border-radius: 0%;
}
.react-flow__edge-path, .react-flow__edge-text, .react-flow__edge-textbg, .react-flow__edge, .react-flow__edges {
   z-index: -1 !important;
}
.context-menu {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius + 2}px;
    box-shadow: ${(props) => props.theme.palette.mode === 'dark' ? "0 18px 48px rgba(0, 0, 0, 40%)" : "0 18px 48px rgba(15, 23, 42, 12%)"};
    position: absolute;
    z-index: 10;
}
.context-menu-button {
    border: none;
    display: block;
    padding: 0.5em;
    text-align: left;
    width: 100%;
    background-color: ${(props) => props.theme.palette.background.paper};
    color: unset;
}

.selectedTask {
    background-color: ${(props) => props.theme.selectedCallbackColor + "DD"} !important;
}
.MythicResizableGrid-headerCellRow {
    display: flex;
    flex-direction: row;
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
}
.MythicResizableGrid-headerCell {
    display: flex;
    align-items: center;
    position: relative;
    padding: 0 8px;
    box-sizing: border-box;
    justify-content: space-between;
    user-select: none;
    border-right: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-bottom: 1px solid ${(props) => props.theme.table?.border || props.theme.borderColor};
    background-color: ${(props) => props.theme.tableHeader} !important;
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    &:first-child-of-type {
        border-left: 0;
    }
    &:hover {
        background-color: ${(props) => props.theme.table?.headerHover || props.theme.tableHover};
        cursor: pointer;
    }
}
.MythicResizableGrid-headerCell .MythicResizableGrid-cellInner {
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.2;
}
.MythicResizableGrid-headerResizeHandle {
    position: absolute;
    top: 0;
    right: 0;
    width: 5px;
    height: 100%;
    cursor: col-resize;
    user-select: none;
    touch-action: none;
    z-index: 2;
}
.MythicResizableGrid-headerResizeHandle::before {
    content: "";
    position: absolute;
    right: 2px;
    width: 0px;
    height: 100%;
    border-left: 1px solid ${(props) => props.theme.palette.text.secondary};
    border-right: 1px solid ${(props) => props.theme.palette.text.secondary};
    opacity: 0.55;
}
.MythicResizableGrid-headerResizeHandle:hover,
.MythicResizableGrid-headerResizeHandleActive {
    background-color: ${(props) => props.theme.palette.info.main + "22"};
}
.MythicResizableGrid-headerResizeHandle:hover::after,
.MythicResizableGrid-headerResizeHandleActive::after {
    background-color: ${(props) => props.theme.palette.info.main};
    opacity: 1;
}
.MythicResizableGrid-headerResizeHandle:hover::before,
.MythicResizableGrid-headerResizeHandleActive::before {
    border-color: ${(props) => props.theme.palette.info.main};
    opacity: 1;
}
.MythicResizableGrid-hoveredRow {
    background-color: ${(props) => props.theme.table?.rowHover || props.theme.tableHover + "CC"};
}
.MythicResizableGrid-cell {
    display: flex;
    align-items: center;
    padding: 0 8px;
    box-sizing: border-box;
    color: ${(props) => props.theme.palette.text.primary};
    font-family: ${(props) => props.theme.typography.fontFamily};
    font-size: 0.86rem;
    font-variant-numeric: tabular-nums;
    border-right: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    cursor: default !important;
}
.MythicResizableGrid-cellInner {
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.MythicInteractiveTerminal {
    background-color: ${(props) => props.theme.outputBackgroundColor};
}
.MythicInteractiveTerminal .xterm {
    height: 100%;
    padding: 6px 8px;
}
.MythicInteractiveTerminal .xterm-viewport {
    background-color: transparent !important;
}
.Toastify__toast {
    word-break: break-all;
    white-space: pre-wrap !important;
    display: flex;
    align-items: center;
    min-width: 100%;
    width: 100%;
}
.MuiPaper-root {
    border: 1px solid ${(props) => props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    background-color: ${(props) => props.theme.palette.background.paper};
    background-image: unset;
}
.no-box-shadow {
    box-shadow: unset;
}
.no-border {
    border: 0px !important;
}

.MuiList-root {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    line-height: 28px;
}
.dropdownMenuColored {
    background-color: ${(props) => props.theme.palette.background.paper} !important;
    border: 1px solid ${(props) => props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    //color: white;
}
// gets the title of the table
.MuiPaper-root > .MuiBox-root:first-child {
    margin: 0 0 0 0;
    padding: 0 0 0 5px;
    min-height: 2rem;
}
.MuiPaper-root > .MuiTableContainer-root.mythicElement {
    display: flex;
    flex-grow: 1;
}
// gets the footer of the table
.MuiPaper-root > .MuiBox-root > * {
    margin: 0;
    padding: 0 60px 0 5px;
    min-height: 2rem;
}
.selectedCallback {
    background-color: ${(props) => props.theme.table?.selected || props.theme.selectedCallbackColor + "CC"};
}
.selectedCallbackHierarchy {
    background-color: ${(props) => props.theme.table?.selectedHierarchy || props.theme.selectedCallbackHierarchyColor + "CC"};
}

.MuiDataGrid-row.Mui-selected {
    background-color: ${(props) => props.theme.table?.selected || props.theme.selectedCallbackColor + "CC"} !important;
}
.roundedBottomCorners {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
}
.MuiInputLabel-root {
    color:  ${(props) => props.theme.palette.text.secondary} !important;
}
.MuiOutlinedInput-notchedOutline {
    border-color: ${(props) => props.theme.borderColor} !important;
}
.MuiInput-underline {
    border-color: ${(props) => props.theme.borderColor} !important;
}
.MuiSelect-outlined {
    border-color: ${(props) => props.theme.borderColor} !important;
}
.Mui-focused {
    border-color: ${(props) => props.theme.palette.primary.main} !important;
}
.MuiInputBase-input {
    border-color: ${(props) => props.theme.borderColor} !important;
}
.MuiInput-root::after {
    border-color: ${(props) => props.theme.palette.primary.main} !important;
}
.MuiTableCell-root {
    padding: 6px 10px;
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    font-variant-numeric: tabular-nums;
    line-height: 1.35;
    vertical-align: middle;
}
.mythic-table-footer {
    background: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 0 0.75rem;
}
.mythic-table-footer .MuiPagination-root {
    padding: 0;
}
.mythic-table-total {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.82rem;
    font-weight: 650;
    padding-left: 0;
    white-space: nowrap;
}
.mythic-table-empty {
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 8rem;
    margin: 0.5rem;
    padding: 1rem;
    text-align: center;
    width: 100%;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    font-size: 0.86rem;
    font-weight: 750;
}
.mythic-table-toolbar {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.5rem;
    height: auto;
    max-height: none;
    min-height: fit-content;
    overflow: visible;
    padding: 0.5rem;
    width: 100%;
}
.mythic-table-toolbar-group {
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: 0.4rem;
    max-width: 100%;
    min-width: min(100%, 9rem);
}
.mythic-table-toolbar-group-grow {
    flex: 1 1 20rem;
    min-width: min(100%, 16rem);
}
.mythic-table-toolbar-group .MuiFormControl-root,
.mythic-table-toolbar-group .MythicTextField-root {
    margin: 0;
    min-width: 0;
}
.mythic-toolbar-select {
    min-height: 32px;
    min-width: min(100%, 10rem);
    width: 100%;
}
.mythic-toolbar-button {
    white-space: nowrap;
}
.mythic-toolbar-button-hover-success {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    box-shadow: none !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
    font-weight: 750;
    min-height: 32px;
    text-transform: none;
}
.mythic-toolbar-button-hover-success:hover {
    background-color: ${(props) => props.theme.palette.success.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.success.main + "88"} !important;
    color: ${(props) => props.theme.palette.success.main} !important;
}
.mythic-toolbar-toggle {
    white-space: nowrap;
}
.mythic-toolbar-icon-button {
    margin-right: 2px;
}
.mythic-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    width: 100%;
}
.mythic-dialog-body-compact {
    gap: 0.55rem;
}
.mythic-dialog-title-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-dialog-title-action {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: none !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
    font-size: 0.76rem;
    font-weight: 750;
    min-height: 30px;
    text-transform: none;
}
.mythic-dialog-title-select {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 11rem;
}
.mythic-detail-section-header {
    align-items: center;
    background-color: ${(props) => props.theme.pageHeader.main};
    background-image: ${(props) => {
        const headerTextColor = props.theme.pageHeaderText?.main || props.theme.palette.text.primary;
        return `linear-gradient(90deg, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.28 : 0.18)} 0%, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.08)} 48%, ${alpha(headerTextColor, props.theme.palette.mode === "dark" ? 0.055 : 0.04)} 100%)`;
    }};
    border: 1px solid ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.55 : 0.38)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: inset 0 1px 0 ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.22)}, 0 2px 6px ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.28 : 0.12)};
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: space-between;
    margin: 0.75rem 0 0.5rem;
    min-height: 58px;
    min-width: 0;
    overflow: hidden;
    padding: 0.7rem 0.85rem 0.7rem 1rem;
    position: relative;
    width: 100%;
}
.mythic-detail-section-header::before {
    background-color: ${(props) => props.theme.palette.primary.main};
    bottom: 0;
    box-shadow: 0 0 0 1px ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.2)};
    content: "";
    left: 0;
    position: absolute;
    top: 0;
    width: 6px;
}
.mythic-section-header {
    background-image: ${(props) => {
        const headerTextColor = props.theme.pageHeaderText?.main || props.theme.palette.text.primary;
        return `linear-gradient(90deg, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.28 : 0.18)} 0%, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.08)} 48%, ${alpha(headerTextColor, props.theme.palette.mode === "dark" ? 0.055 : 0.04)} 100%)`;
    }} !important;
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.55 : 0.38)} !important;
    box-shadow: inset 0 1px 0 ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.22)}, 0 2px 6px ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.28 : 0.12)} !important;
    overflow: hidden !important;
    padding-left: 1rem !important;
    position: relative !important;
}
.mythic-section-header::before {
    background-color: ${(props) => props.theme.palette.primary.main};
    bottom: 0;
    box-shadow: 0 0 0 1px ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.2)};
    content: "";
    left: 0;
    position: absolute;
    top: 0;
    width: 6px;
}
.mythic-detail-section-title {
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    font-size: 1.25rem;
    font-weight: 750;
    letter-spacing: 0;
    line-height: 1.18;
}
.mythic-detail-section-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.45rem;
}
.mythic-detail-section-header .MuiButton-root,
.mythic-detail-section-header .MuiIconButton-root {
    background-color: ${(props) => (props.theme.pageHeaderText?.main || props.theme.palette.text.primary) + "1a"} !important;
    border: 1px solid ${(props) => (props.theme.pageHeaderText?.main || props.theme.palette.text.primary) + "3d"} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    box-shadow: none !important;
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary} !important;
    font-size: 0.76rem;
    font-weight: 750;
    min-height: 32px;
    text-transform: none;
}
.mythic-detail-section-header .MuiButton-root:hover,
.mythic-detail-section-header .MuiIconButton-root:hover {
    background-color: ${(props) => (props.theme.pageHeaderText?.main || props.theme.palette.text.primary) + "29"} !important;
    border-color: ${(props) => (props.theme.pageHeaderText?.main || props.theme.palette.text.primary) + "6b"} !important;
}
.mythic-dialog-section {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
    padding: 0.75rem;
}
.mythic-dialog-section-header {
    align-items: flex-start;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    margin-bottom: 0.65rem;
    min-width: 0;
}
.mythic-dialog-section-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.86rem;
    font-weight: 700;
    line-height: 1.25;
}
.mythic-dialog-section-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-dialog-section-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.4rem;
}
.mythic-dialog-section-actions .MuiButton-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary} !important;
    font-size: 0.74rem;
    font-weight: 750;
    min-height: 28px;
    text-transform: none;
}
.mythic-dialog-section-actions .MuiButton-root:hover {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} !important;
}
.mythic-reorder-list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.45rem;
    max-height: 100%;
    min-height: 0;
    overflow: auto;
    padding: 0.1rem;
}
.mythic-reorder-row {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: none;
    color: ${(props) => props.theme.palette.text.primary};
    display: flex;
    flex: 0 0 auto;
    gap: 0.5rem;
    min-height: 44px;
    min-width: 0;
    padding: 0.45rem 0.55rem;
    transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    width: 100%;
}
.mythic-reorder-row:hover {
    background-color: ${(props) => props.theme.surfaces?.hover || props.theme.palette.action.hover};
    border-color: ${(props) => props.theme.table?.border || props.theme.borderColor};
}
.mythic-reorder-row-dragging {
    background-color: ${(props) => props.theme.palette.primary.main + "1f"};
    border-color: ${(props) => props.theme.palette.primary.main + "88"};
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "0 12px 28px rgba(0,0,0,0.32)" : "0 12px 28px rgba(15,23,42,0.14)"};
}
.mythic-reorder-row-disabled {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.018)"};
}
.mythic-reorder-row-disabled .mythic-reorder-row-title {
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-reorder-drag-handle {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    cursor: grab;
    display: inline-flex;
    flex: 0 0 30px;
    height: 30px;
    justify-content: center;
    width: 30px;
}
.mythic-reorder-drag-handle:active {
    cursor: grabbing;
}
.mythic-reorder-row-main {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    gap: 0.5rem;
    min-width: 0;
}
.mythic-reorder-row-title {
    font-size: 0.82rem;
    font-weight: 750;
    line-height: 1.25;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-reorder-row-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.35rem;
}
.mythic-reorder-select {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-reorder-select .MuiSelect-select {
    min-height: 30px;
    padding-bottom: 0.25rem;
    padding-top: 0.25rem;
}
.mythic-parameter-list {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
}
.mythic-parameter-card {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
    padding: 0.75rem;
}
.mythic-parameter-card-header {
    align-items: flex-start;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-parameter-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-parameter-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.8rem;
    line-height: 1.4;
    margin-top: 0.25rem;
    overflow-wrap: anywhere;
}
.mythic-metadata-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    margin-top: 0.65rem;
    min-width: 0;
}
.mythic-metadata-item {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
    padding: 0.5rem 0.55rem;
}
.mythic-metadata-label {
    color: ${(props) => props.theme.palette.text.secondary};
    display: block;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1.2;
    text-transform: uppercase;
}
.mythic-metadata-value,
.mythic-metadata-code {
    color: ${(props) => props.theme.palette.text.primary};
    display: block;
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.18rem;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-metadata-code {
    font-family: ${(props) => props.theme.typography.fontFamilyMono || "monospace"};
}
.mythic-parameter-notes {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.65rem;
}
.mythic-parameter-note {
    background-color: ${(props) => props.theme.palette.info.main + "12"};
    border: 1px solid ${(props) => props.theme.palette.info.main + "40"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    line-height: 1.4;
    padding: 0.55rem 0.65rem;
}
.mythic-parameter-note strong {
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-code-block {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(0,0,0,0.36)" : "rgba(15,23,42,0.06)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    display: block;
    font-family: ${(props) => props.theme.typography.fontFamilyMono || "monospace"};
    font-size: 0.76rem;
    line-height: 1.45;
    margin: 0.45rem 0 0;
    overflow: auto;
    padding: 0.55rem 0.65rem;
    white-space: pre;
}
.MuiDialogActions-root,
.mythic-dialog-actions {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
    margin: 0;
    padding: 0.65rem 0.9rem;
}
.MuiDialogActions-root > :not(style) ~ :not(style) {
    margin-left: 0;
}
.MuiDialogActions-root .MuiButton-root,
.mythic-dialog-actions .MuiButton-root {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: none !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
    font-size: 0.78rem;
    font-weight: 750;
    justify-content: center;
    letter-spacing: 0;
    line-height: 1.2;
    min-height: 34px;
    min-width: min(100%, 7rem);
    padding: 0.35rem 0.85rem;
    text-transform: none;
    white-space: nowrap;
}
.MuiDialogActions-root .MuiButton-root:hover,
.mythic-dialog-actions .MuiButton-root:hover {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} !important;
    border-color: ${(props) => props.theme.table?.border || props.theme.borderColor} !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorSuccess,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedSuccess,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedSuccess,
.MuiDialogActions-root .mythic-dialog-button-primary,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorSuccess,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedSuccess,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedSuccess,
.mythic-dialog-actions .mythic-dialog-button-primary {
    background-color: ${(props) => props.theme.palette.primary.main} !important;
    border-color: ${(props) => props.theme.palette.primary.main} !important;
    color: ${(props) => props.theme.palette.primary.contrastText} !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorSuccess:hover,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedSuccess:hover,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedSuccess:hover,
.MuiDialogActions-root .mythic-dialog-button-primary:hover,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorSuccess:hover,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedSuccess:hover,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedSuccess:hover,
.mythic-dialog-actions .mythic-dialog-button-primary:hover {
    background-color: ${(props) => props.theme.palette.primary.dark || props.theme.palette.primary.main} !important;
    border-color: ${(props) => props.theme.palette.primary.dark || props.theme.palette.primary.main} !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorWarning,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedWarning,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedWarning,
.MuiDialogActions-root .mythic-dialog-button-warning,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorWarning,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedWarning,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedWarning,
.mythic-dialog-actions .mythic-dialog-button-warning {
    background-color: ${(props) => props.theme.palette.warning.main + "22"} !important;
    border-color: ${(props) => props.theme.palette.warning.main + "88"} !important;
    color: ${(props) => props.theme.palette.warning.main} !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorError,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedError,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedError,
.MuiDialogActions-root .mythic-dialog-button-destructive,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorError,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedError,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedError,
.mythic-dialog-actions .mythic-dialog-button-destructive {
    background-color: ${(props) => props.theme.palette.error.main + "22"} !important;
    border-color: ${(props) => props.theme.palette.error.main + "99"} !important;
    color: ${(props) => props.theme.palette.error.main} !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorInfo,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedInfo,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedInfo,
.MuiDialogActions-root .mythic-dialog-button-info,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorInfo,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedInfo,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedInfo,
.mythic-dialog-actions .mythic-dialog-button-info {
    background-color: ${(props) => props.theme.palette.info.main + "1c"} !important;
    border-color: ${(props) => props.theme.palette.info.main + "66"} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.MuiDialogActions-root .MuiButton-root.Mui-disabled,
.mythic-dialog-actions .MuiButton-root.Mui-disabled {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"} !important;
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.disabled} !important;
}
.mythic-dialog-grid {
    align-items: start;
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--mythic-dialog-grid-min, 16rem)), 1fr));
    min-width: 0;
    width: 100%;
}
.mythic-dialog-choice-row {
    align-items: center;
    display: grid;
    gap: 0.55rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    width: 100%;
}
.mythic-dialog-choice-divider {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 700;
    text-align: center;
}
.mythic-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    width: 100%;
}
.mythic-form-grid {
    align-items: start;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--mythic-form-grid-min, 16rem)), 1fr));
    min-width: 0;
    width: 100%;
}
.mythic-form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-form-field-copy {
    min-width: 0;
}
.mythic-form-field-label {
    color: ${(props) => props.theme.palette.text.primary};
    display: block;
    font-size: 0.78rem;
    font-weight: 750;
    letter-spacing: 0;
    line-height: 1.25;
}
.mythic-form-field-required {
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-form-field-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.1rem;
}
.mythic-form-field-control {
    min-width: 0;
    width: 100%;
}
.mythic-form-field-control .MuiFormControl-root,
.mythic-form-field-control .MuiTextField-root,
.mythic-form .MuiFormControl-root,
.mythic-form .MuiTextField-root {
    margin: 0 !important;
}
.mythic-form-field-control .MuiInputBase-root,
.mythic-form .MuiInputBase-root {
    min-height: 38px;
}
.mythic-form-note {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.8rem;
    line-height: 1.4;
    padding: 0.65rem 0.75rem;
}
.mythic-form-switch-row {
    align-items: center;
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.65rem 0.75rem;
    width: 100%;
}
.mythic-form-switch-control {
    flex: 0 0 auto;
}
.mythic-dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    padding: 0.75rem 0 0.9rem;
    position: relative;
    width: 100%;
}
.mythic-dashboard-custom {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    width: 100%;
}
.mythic-dashboard-row {
    align-items: stretch;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.75rem;
    min-width: 0;
    padding: 0 0.75rem;
    width: 100%;
}
.mythic-dashboard-card {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "0 1px 2px rgba(15,23,42,0.06)"} !important;
    display: flex;
    flex: 1 1 18rem;
    flex-direction: column;
    height: var(--mythic-dashboard-card-height, 18rem);
    max-height: var(--mythic-dashboard-card-height, 18rem);
    min-height: var(--mythic-dashboard-card-height, 18rem);
    min-width: min(100%, 18rem);
    overflow: hidden;
}
.mythic-dashboard-card-header {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.default};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    flex: 0 0 auto;
    gap: 0.65rem;
    justify-content: space-between;
    min-height: 42px;
    min-width: 0;
    padding: 0.55rem 0.65rem;
}
.mythic-dashboard-card-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.86rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.2;
    min-width: 0;
}
.mythic-dashboard-card-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: flex-end;
}
.mythic-dashboard-card-body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0.35rem 0.5rem 0.55rem;
}
.mythic-dashboard-card-body-centered {
    align-items: center;
    justify-content: center;
}
.mythic-dashboard-card-body-empty {
    padding: 0.75rem;
}
.mythic-dashboard-icon-button {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    box-shadow: none !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
    height: 30px;
    padding: 0;
    width: 30px;
}
.mythic-dashboard-icon-button:hover {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} !important;
    border-color: ${(props) => props.theme.table?.border || props.theme.borderColor} !important;
}
.mythic-dashboard-icon-button-danger {
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-dashboard-icon-button-hover-danger:hover {
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-dashboard-icon-button.Mui-disabled {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"} !important;
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.disabled} !important;
}
.mythic-dashboard-primary-button,
.mythic-dashboard-table-action {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    box-shadow: none !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
    font-size: 0.74rem;
    font-weight: 750;
    min-height: 30px;
    text-transform: none;
}
.mythic-dashboard-primary-button {
    background-color: ${(props) => props.theme.palette.primary.main} !important;
    border-color: ${(props) => props.theme.palette.primary.main} !important;
    color: ${(props) => props.theme.palette.primary.contrastText} !important;
}
.mythic-dashboard-primary-button:hover {
    background-color: ${(props) => props.theme.palette.primary.dark || props.theme.palette.primary.main} !important;
    border-color: ${(props) => props.theme.palette.primary.dark || props.theme.palette.primary.main} !important;
}
.mythic-dashboard-table-action:hover {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} !important;
}
.mythic-dashboard-table-action-info {
    background-color: ${(props) => props.theme.palette.info.main + "1c"} !important;
    border-color: ${(props) => props.theme.palette.info.main + "66"} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-dashboard-table-action-info:hover {
    background-color: ${(props) => props.theme.palette.info.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.info.main + "88"} !important;
}
.mythic-dashboard-table-action.Mui-disabled {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"} !important;
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.disabled} !important;
}
.mythic-dashboard-table-body {
    padding: 0;
}
.mythic-dashboard-table-container {
    flex: 1 1 auto;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    overflow: auto;
    width: 100%;
}
.mythic-dashboard-table {
    max-width: 100%;
    overflow: auto;
}
.mythic-dashboard-screenshot-row {
    align-items: center;
    display: flex !important;
    height: 100%;
    justify-content: space-between;
    min-width: 0;
    width: 100%;
}
.mythic-dashboard-screenshot-nav-cell {
    align-items: center;
    border-bottom: 0 !important;
    display: flex !important;
    flex: 0 0 2.75rem;
    justify-content: center;
    min-width: 2.75rem;
    padding: 0.25rem !important;
}
.mythic-dashboard-screenshot-preview-cell {
    align-items: center;
    border-bottom: 0 !important;
    display: flex !important;
    flex: 1 1 auto;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
    padding: 0.25rem !important;
}
.mythic-dashboard-screenshot-image {
    cursor: pointer;
    display: block;
    height: 12.5rem;
    max-height: 100%;
    max-width: 100%;
    min-width: 0;
    object-fit: contain;
    width: 100%;
}
.mythic-dashboard-empty-state {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.02)"};
    border: 1px dashed ${(props) => props.theme.table?.border || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    font-size: 0.82rem;
    gap: 0.75rem;
    justify-content: center;
    line-height: 1.4;
    min-height: 0;
    padding: 1rem;
    text-align: center;
}
.mythic-dashboard-empty-copy {
    max-width: 26rem;
}
.mythic-dashboard-empty-action {
    align-items: center;
    display: flex;
    justify-content: center;
}
.mythic-dashboard-metric-body {
    cursor: pointer;
    padding: 0.45rem 0.65rem 0.65rem;
}
.mythic-dashboard-metric-title-row {
    align-items: center;
    display: flex;
    gap: 0.65rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-dashboard-metric-title-row .MuiFormControl-root {
    margin: 0 !important;
}
.mythic-dashboard-metric-content,
.mythic-dashboard-metric-link {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    justify-content: center;
    min-height: 0;
}
.mythic-dashboard-metric-value {
    color: ${(props) => props.theme.palette.text.primary};
    display: inline-block;
    font-weight: 850 !important;
    letter-spacing: 0;
    line-height: 0.95;
    margin-left: 0.1rem;
}
.mythic-dashboard-metric-total {
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-block;
    font-weight: 700 !important;
    margin-left: 0.35rem;
}
.mythic-dashboard-metric-label {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    font-weight: 750;
    letter-spacing: 0;
    line-height: 1.25;
    margin-top: 0.35rem;
}
.mythic-dashboard-metric-secondary {
    color: ${(props) => props.theme.palette.text.primary};
    font-weight: 850 !important;
    letter-spacing: 0;
    line-height: 1;
    margin-top: 0.1rem;
}
.mythic-dashboard-slider {
    align-self: center;
    margin-top: 0.65rem;
}
.mythic-dashboard-edit-rail {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 0.4rem;
    justify-content: center;
    padding: 0.45rem;
}
.mythic-dashboard-loading-overlay {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)"};
    display: flex;
    inset: 0;
    justify-content: center;
    position: absolute;
    z-index: 5;
}
.mythic-dashboard-loading-card {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "0 12px 28px rgba(0,0,0,0.35)" : "0 12px 28px rgba(15,23,42,0.14)"};
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.84rem;
    font-weight: 750;
    padding: 0.75rem 0.9rem;
}
.mythic-form-code-editor {
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-height: 16rem;
    min-width: 0;
    overflow: hidden;
}
.mythic-dialog-body .MuiFormControl-root,
.mythic-dialog-body .MuiTextField-root {
    margin: 0 !important;
}
.mythic-table-bulk-actions {
    align-items: center;
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem;
    width: 100%;
}
.mythic-table-bulk-actions .mythic-table-row-action {
    flex: 1 1 13rem;
    justify-content: center;
    margin: 0 !important;
}
.mythic-table-row-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}
.mythic-table-row-actions-nowrap {
    flex-wrap: nowrap;
}
.mythic-payload-progress-cell {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-table-row-action {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    box-shadow: none !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
    font-size: 0.74rem;
    font-weight: 750;
    min-height: 30px;
    text-transform: none;
}
.mythic-table-row-action:hover {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} !important;
    border-color: ${(props) => props.theme.table?.border || props.theme.borderColor} !important;
}
.mythic-table-row-action-info {
    background-color: ${(props) => props.theme.palette.info.main + "1c"} !important;
    border-color: ${(props) => props.theme.palette.info.main + "66"} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-table-row-action-info:hover {
    background-color: ${(props) => props.theme.palette.info.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.info.main + "88"} !important;
}
.mythic-table-row-action-hover-info:hover {
    background-color: ${(props) => props.theme.palette.info.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.info.main + "88"} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-table-row-action-hover-success:hover {
    background-color: ${(props) => props.theme.palette.success.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.success.main + "88"} !important;
    color: ${(props) => props.theme.palette.success.main} !important;
}
.mythic-table-row-action-hover-warning:hover {
    background-color: ${(props) => props.theme.palette.warning.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.warning.main + "88"} !important;
    color: ${(props) => props.theme.palette.warning.main} !important;
}
.mythic-table-row-action-hover-danger:hover {
    background-color: ${(props) => props.theme.palette.error.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.error.main + "88"} !important;
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-table-row-action-success {
    background-color: ${(props) => props.theme.palette.success.main + "1c"} !important;
    border-color: ${(props) => props.theme.palette.success.main + "66"} !important;
    color: ${(props) => props.theme.palette.success.main} !important;
}
.mythic-table-row-action-success:hover {
    background-color: ${(props) => props.theme.palette.success.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.success.main + "88"} !important;
}
.mythic-table-row-action-danger {
    background-color: ${(props) => props.theme.palette.error.main + "1c"} !important;
    border-color: ${(props) => props.theme.palette.error.main + "66"} !important;
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-table-row-action-danger:hover {
    background-color: ${(props) => props.theme.palette.error.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.error.main + "88"} !important;
}
.mythic-table-row-action.Mui-disabled {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"} !important;
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.disabled} !important;
}
.mythic-table-row-icon-action {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    box-shadow: none !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
    height: 30px;
    padding: 0;
    width: 30px;
}
.mythic-table-row-icon-action:hover {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} !important;
    border-color: ${(props) => props.theme.table?.border || props.theme.borderColor} !important;
}
.mythic-table-row-icon-action-danger {
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-table-row-icon-action-success {
    color: ${(props) => props.theme.palette.success.main} !important;
}
.mythic-table-row-icon-action-info {
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-table-row-icon-action-warning {
    color: ${(props) => props.theme.palette.warning.main} !important;
}
.mythic-table-row-icon-action-hover-info:hover {
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-table-row-icon-action-hover-success:hover {
    color: ${(props) => props.theme.palette.success.main} !important;
}
.mythic-table-row-icon-action-hover-warning:hover {
    color: ${(props) => props.theme.palette.warning.main} !important;
}
.mythic-table-row-icon-action-hover-danger:hover {
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-eventing-workspace {
    display: flex;
    flex: 1 1 auto;
    gap: 0.5rem;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-split {
    display: flex;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-eventing-sidebar,
.mythic-eventing-content {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-sidebar {
    display: flex !important;
    flex-direction: column;
}
.mythic-eventing-content {
    display: flex !important;
}
.mythic-eventing-content > div {
    min-height: 0;
    min-width: 0;
}
.mythic-eventing-list {
    background: transparent !important;
    border: 0 !important;
    padding: 0.35rem !important;
}
.mythic-eventing-sidebar-toolbar {
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.65rem 0.65rem 0.55rem;
}
.mythic-eventing-sidebar-title-row {
    align-items: flex-start;
    display: flex;
    gap: 0.65rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-eventing-sidebar-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.2;
}
.mythic-eventing-sidebar-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.2;
    margin-top: 0.12rem;
}
.mythic-eventing-sidebar-count {
    align-items: center;
    background-color: ${(props) => props.theme.palette.primary.main + "16"};
    border: 1px solid ${(props) => props.theme.palette.primary.main + "38"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.primary.main};
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    min-height: 1.45rem;
    padding: 0 0.45rem;
}
.mythic-eventing-sidebar-search .MuiOutlinedInput-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    font-size: 0.82rem;
}
.mythic-eventing-sidebar-search .MuiOutlinedInput-input {
    padding-bottom: 0.45rem;
    padding-top: 0.45rem;
}
.mythic-eventing-filter-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.35rem;
    overflow-x: auto;
    scrollbar-width: none;
}
.mythic-eventing-filter-row::-webkit-scrollbar {
    display: none;
}
.mythic-eventing-filter-button {
    align-items: center;
    background-color: transparent;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 750;
    gap: 0.35rem;
    min-height: 1.65rem;
    padding: 0 0.45rem;
    white-space: nowrap;
}
.mythic-eventing-filter-button:hover {
    background-color: ${(props) => props.theme.tableHover};
    border-color: ${(props) => props.theme.palette.primary.main + "44"};
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-eventing-filter-button-active {
    background-color: ${(props) => props.theme.palette.primary.main + "16"};
    border-color: ${(props) => props.theme.palette.primary.main + "66"};
    color: ${(props) => props.theme.palette.primary.main};
}
.mythic-eventing-filter-count {
    color: inherit;
    opacity: 0.78;
}
.mythic-eventing-list-scroll {
    flex-grow: 1;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
}
.mythic-eventing-list-header {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper} !important;
    color: ${(props) => props.theme.palette.text.secondary} !important;
    font-size: 0.74rem !important;
    font-weight: 800 !important;
    letter-spacing: 0 !important;
    line-height: 1.2 !important;
    padding: 0.45rem 0.55rem !important;
    text-transform: none;
}
.mythic-eventing-list-item {
    align-items: flex-start !important;
    border: 1px solid transparent;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    cursor: pointer;
    display: flex !important;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
    min-height: 3.35rem;
    min-width: 0;
    padding: 0.45rem 0.55rem !important;
}
.mythic-eventing-list-item-all {
    margin: 0.45rem 0.35rem 0.2rem !important;
    width: auto !important;
}
.mythic-eventing-list-item:hover {
    background-color: ${(props) => props.theme.tableHover} !important;
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
}
.mythic-eventing-list-item-selected {
    background-color: ${(props) => props.theme.palette.primary.main + "18"} !important;
    border-color: ${(props) => props.theme.palette.primary.main + "66"};
    box-shadow: inset 3px 0 0 ${(props) => props.theme.palette.primary.main};
}
.mythic-eventing-status-dot {
    border-radius: 999px;
    box-shadow: 0 0 0 3px ${(props) => props.theme.palette.background.paper};
    flex: 0 0 0.52rem;
    height: 0.52rem;
    margin-top: 0.42rem;
    width: 0.52rem;
}
.mythic-eventing-status-all {
    background-color: ${(props) => props.theme.palette.info.main};
}
.mythic-eventing-status-runnable {
    background-color: ${(props) => props.theme.palette.success.main};
}
.mythic-eventing-status-needs_approval {
    background-color: transparent;
    border: 2px solid ${(props) => props.theme.palette.warning.main};
    border-radius: 0.16rem;
    transform: rotate(45deg);
}
.mythic-eventing-status-disabled {
    background-color: ${(props) => props.theme.palette.action.disabled};
    position: relative;
}
.mythic-eventing-status-disabled::after {
    background-color: ${(props) => props.theme.palette.background.paper};
    border-radius: 999px;
    content: "";
    height: 2px;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    width: 0.72rem;
}
.mythic-eventing-status-deleted {
    background-color: ${(props) => props.theme.palette.error.main};
}
.mythic-eventing-list-item-content {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-eventing-list-item-main {
    align-items: center;
    display: flex;
    gap: 0.45rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-eventing-list-item-name {
    color: ${(props) => props.theme.palette.text.primary};
    flex: 1 1 auto;
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-list-item-name-deleted {
    color: ${(props) => props.theme.palette.text.secondary};
    text-decoration: line-through;
}
.mythic-eventing-list-item-meta {
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    flex-wrap: wrap;
    font-size: 0.72rem;
    font-weight: 650;
    gap: 0.25rem 0.45rem;
    line-height: 1.2;
    margin-top: 0.22rem;
    min-width: 0;
}
.mythic-eventing-row-chip {
    align-items: center;
    border: 1px solid transparent;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.66rem;
    font-weight: 850;
    line-height: 1;
    min-height: 1.25rem;
    padding: 0 0.35rem;
}
.mythic-eventing-row-chip-all {
    background-color: ${(props) => props.theme.palette.info.main + "16"};
    border-color: ${(props) => props.theme.palette.info.main + "40"};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-eventing-row-chip-runnable {
    background-color: ${(props) => props.theme.palette.success.main + "18"};
    border-color: ${(props) => props.theme.palette.success.main + "42"};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-eventing-row-chip-needs_approval {
    background-color: ${(props) => props.theme.palette.warning.main + "22"};
    border-color: ${(props) => props.theme.palette.warning.main + "66"};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-eventing-row-chip-disabled {
    background-color: ${(props) => props.theme.palette.action.disabledBackground};
    border-color: ${(props) => props.theme.palette.action.disabled};
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-eventing-header-chip-disabled {
    background-color: ${(props) => props.theme.palette.action.disabledBackground} !important;
    border-color: ${(props) => props.theme.palette.action.disabled} !important;
    color: ${(props) => props.theme.palette.text.secondary} !important;
}
.mythic-eventing-header-chip-disabled .MuiChip-icon {
    color: ${(props) => props.theme.palette.text.secondary} !important;
}
.mythic-eventing-runas-chip {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    min-height: 1.2rem;
    padding: 0 0.35rem;
}
.mythic-eventing-row-chip-deleted {
    background-color: ${(props) => props.theme.palette.error.main + "16"};
    border-color: ${(props) => props.theme.palette.error.main + "40"};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-eventing-list-empty {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    font-weight: 650;
    padding: 0.8rem 0.55rem;
    text-align: center;
}
.mythic-eventing-wizard-dialog-content {
    height: min(95vh, 920px);
    margin: 0 !important;
    overflow: hidden;
    padding: 0 !important;
}
.mythic-eventing-wizard {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    min-width: 0;
}
.mythic-eventing-wizard-header {
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.75rem 1rem;
}
.mythic-eventing-wizard-title-row {
    align-items: flex-start;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-eventing-wizard-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 1.02rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-wizard-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.15rem;
}
.mythic-eventing-wizard-progress-chip {
    align-items: center;
    background-color: ${(props) => props.theme.palette.primary.main + "16"};
    border: 1px solid ${(props) => props.theme.palette.primary.main + "38"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.primary.main};
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.74rem;
    font-weight: 850;
    line-height: 1;
    min-height: 1.55rem;
    padding: 0 0.55rem;
}
.mythic-eventing-wizard-content {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}
.mythic-eventing-wizard-content-heading {
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.75rem 1rem;
}
.mythic-eventing-wizard-content-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.9rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-wizard-content-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-eventing-wizard-step {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}
.mythic-eventing-wizard-step-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 0.8rem 1rem;
}
.mythic-eventing-wizard-table-container {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    flex: 1 1 auto;
    overflow: visible !important;
    width: 100%;
}
.mythic-eventing-wizard-table {
    border-collapse: separate !important;
    border-spacing: 0 0.5rem !important;
}
.mythic-eventing-wizard-table .MuiTableHead-root {
    display: none;
}
.mythic-eventing-wizard-table .MuiTableRow-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.018)"};
}
.mythic-eventing-wizard-table .MuiTableCell-root {
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    padding: 0.65rem 0.75rem !important;
    vertical-align: top;
}
.mythic-eventing-wizard-table .MuiTableCell-root:first-of-type {
    border-left: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px 0 0 ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    font-weight: 850;
    text-transform: none;
    width: 10rem;
}
.mythic-eventing-wizard-table .MuiTableCell-root:last-of-type {
    border-radius: 0 ${(props) => props.theme.shape.borderRadius}px ${(props) => props.theme.shape.borderRadius}px 0;
    border-right: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
}
.mythic-eventing-step-table .MuiTableCell-root:first-of-type {
    width: 9rem;
}
.mythic-eventing-wizard-table .MuiTypography-root {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.35rem;
}
.mythic-eventing-metadata-layout {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-eventing-metadata-card {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-metadata-card-wide {
    grid-column: 1 / -1;
}
.mythic-eventing-metadata-card-header {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.012)"};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.7rem 0.75rem 0.6rem;
}
.mythic-eventing-metadata-card-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.88rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-metadata-card-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.16rem;
}
.mythic-eventing-metadata-field-grid {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0.75rem;
}
.mythic-eventing-metadata-field {
    min-width: 0;
    padding: 0.75rem;
}
.mythic-eventing-metadata-field + .mythic-eventing-metadata-field {
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
}
.mythic-eventing-metadata-field-grid .mythic-eventing-metadata-field {
    padding: 0;
}
.mythic-eventing-metadata-field-grid .mythic-eventing-metadata-field + .mythic-eventing-metadata-field {
    border-top: 0;
}
.mythic-eventing-metadata-label {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
    margin-bottom: 0.4rem;
}
.mythic-eventing-metadata-empty {
    align-items: center;
    background-color: ${(props) => props.theme.palette.action.disabledBackground};
    border: 1px solid ${(props) => props.theme.palette.action.disabled};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    font-size: 0.74rem;
    font-weight: 800;
    min-height: 1.65rem;
    padding: 0 0.55rem;
}
.mythic-eventing-metadata-trigger-table {
    border-collapse: separate !important;
    border-spacing: 0 0.4rem !important;
    table-layout: fixed;
    width: 100%;
}
.mythic-eventing-metadata-trigger-table > .MuiTableHead-root {
    display: none;
}
.mythic-eventing-metadata-trigger-table > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root {
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    padding: 0.5rem 0.6rem !important;
}
.mythic-eventing-metadata-trigger-table > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root:first-of-type {
    border-left: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px 0 0 ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 850;
    vertical-align: top;
    width: 38%;
}
.mythic-eventing-metadata-trigger-table > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root:last-of-type {
    border-radius: 0 ${(props) => props.theme.shape.borderRadius}px ${(props) => props.theme.shape.borderRadius}px 0;
    border-right: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    width: 62%;
}
.mythic-eventing-metadata-trigger-table .MuiTable-root:not(.mythic-eventing-metadata-trigger-table) .MuiTableCell-root {
    vertical-align: middle;
}
.mythic-eventing-metadata-trigger-table .MuiTable-root:not(.mythic-eventing-metadata-trigger-table) .MuiTableCell-root:first-of-type {
    padding-right: 0.4rem !important;
    width: 2.5rem !important;
}
.mythic-eventing-metadata-trigger-table .MuiTable-root:not(.mythic-eventing-metadata-trigger-table) .MuiTableCell-root:first-of-type + .MuiTableCell-root {
    padding-left: 0.4rem !important;
}
.mythic-eventing-choice-row {
    align-items: flex-start;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}
.mythic-eventing-choice-separator {
    align-items: center;
    align-self: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 850;
    height: 1.45rem;
    justify-content: center;
    min-width: 1.9rem;
}
.mythic-eventing-choice-custom {
    min-width: 0;
}
.mythic-eventing-array-list {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.mythic-eventing-array-row {
    align-items: center;
    display: flex;
    gap: 0.35rem;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-array-row > .MuiIconButton-root {
    flex: 0 0 auto;
}
.mythic-eventing-array-row > div {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-eventing-file-select {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.mythic-eventing-file-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}
.mythic-eventing-file-chip {
    align-items: center;
    background-color: ${(props) => props.theme.palette.info.main + "12"};
    border: 1px solid ${(props) => props.theme.palette.info.main + "35"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 750;
    line-height: 1.2;
    min-height: 1.45rem;
    padding: 0 0.45rem;
}
.mythic-eventing-metadata-editor {
    min-height: 16rem;
    padding: 0.75rem;
}
.mythic-eventing-metadata-editor > div {
    min-height: 15rem;
}
@media (max-width: 1100px) {
    .mythic-eventing-metadata-layout,
    .mythic-eventing-metadata-field-grid,
    .mythic-eventing-choice-row {
        grid-template-columns: 1fr;
    }
    .mythic-eventing-choice-separator {
        justify-self: start;
    }
}
.mythic-eventing-wizard-toolbar {
    align-items: center;
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    gap: 0.85rem;
    justify-content: space-between;
    padding: 0.7rem 1rem;
}
.mythic-eventing-wizard-toolbar-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.86rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-wizard-toolbar-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 650;
    margin-top: 0.1rem;
}
.mythic-eventing-wizard-toolbar-actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
}
.mythic-eventing-wizard-step-browser {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}
.mythic-eventing-wizard-step-browser-empty {
    display: block;
}
.mythic-eventing-step-nav {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.018)"};
    border-right: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    flex: 0 0 14.5rem;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
}
.mythic-eventing-step-nav-header {
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.7rem 0.75rem 0.55rem;
}
.mythic-eventing-step-nav-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.78rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-nav-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.7rem;
    font-weight: 650;
    line-height: 1.2;
    margin-top: 0.12rem;
}
.mythic-eventing-step-nav-list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.35rem;
    min-height: 0;
    overflow-y: auto;
    padding: 0.55rem;
}
.mythic-eventing-step-nav-item {
    align-items: flex-start;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    cursor: pointer;
    display: flex;
    font-family: inherit;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.45rem 0.5rem;
    text-align: left;
    width: 100%;
}
.mythic-eventing-step-nav-item:hover {
    background-color: ${(props) => props.theme.tableHover};
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-eventing-step-nav-item-active {
    background-color: ${(props) => props.theme.palette.primary.main + "16"};
    border-color: ${(props) => props.theme.palette.primary.main + "55"};
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-eventing-step-nav-number {
    align-items: center;
    background-color: ${(props) => props.theme.palette.primary.main + "18"};
    border: 1px solid ${(props) => props.theme.palette.primary.main + "38"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.primary.main};
    display: inline-flex;
    flex: 0 0 1.45rem;
    font-size: 0.72rem;
    font-weight: 900;
    height: 1.45rem;
    justify-content: center;
    line-height: 1;
}
.mythic-eventing-step-nav-copy {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
}
.mythic-eventing-step-nav-name {
    color: inherit;
    font-size: 0.76rem;
    font-weight: 850;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-step-nav-action {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.66rem;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 0.16rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-wizard-step-scroll-browser {
    flex: 1 1 auto;
    scroll-padding-top: 0.75rem;
}
@media (max-width: 900px) {
    .mythic-eventing-wizard-step-browser {
        flex-direction: column;
    }
    .mythic-eventing-step-nav {
        border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
        border-right: 0;
        flex: 0 0 auto;
        max-height: 10rem;
    }
    .mythic-eventing-step-nav-list {
        flex-direction: row;
        overflow-x: auto;
        overflow-y: hidden;
    }
    .mythic-eventing-step-nav-item {
        flex: 0 0 12rem;
    }
}
.mythic-eventing-step-shell {
    margin-bottom: 0.75rem;
    scroll-margin-top: 0.75rem;
}
.mythic-eventing-step-shell-header {
    align-items: center;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    margin-bottom: 0.35rem;
}
.mythic-eventing-step-shell-title {
    color: ${(props) => props.theme.palette.primary.main};
    font-size: 0.72rem;
    font-weight: 900;
    line-height: 1.2;
    text-transform: none;
}
.mythic-eventing-step-shell-subtitle {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.88rem;
    font-weight: 850;
    line-height: 1.2;
    margin-top: 0.1rem;
}
.mythic-eventing-step-config-card,
.mythic-eventing-wizard-review-card,
.mythic-eventing-wizard-empty {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    overflow: hidden;
}
.mythic-eventing-step-config-card-modern {
    background-color: ${(props) => props.theme.palette.background.paper};
}
.mythic-eventing-step-config-summary {
    align-items: flex-start;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.014)"};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    gap: 0.8rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.75rem;
}
.mythic-eventing-step-config-summary-copy {
    min-width: 0;
}
.mythic-eventing-step-config-summary-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.92rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-config-summary-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.16rem;
}
.mythic-eventing-step-config-summary-actions {
    align-items: flex-start;
    display: flex;
    flex: 0 0 auto;
    gap: 0.55rem;
}
.mythic-eventing-step-action-chip {
    align-items: center;
    background-color: ${(props) => props.theme.palette.info.main + "14"};
    border: 1px solid ${(props) => props.theme.palette.info.main + "45"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.2;
    min-height: 1.65rem;
    padding: 0 0.55rem;
}
.mythic-eventing-step-switch-row {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    cursor: pointer;
    display: flex;
    gap: 0.55rem;
    min-width: 16rem;
    padding: 0.3rem 0.35rem 0.3rem 0.6rem;
}
.mythic-eventing-step-switch-copy {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
}
.mythic-eventing-step-switch-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-switch-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.66rem;
    font-weight: 600;
    line-height: 1.25;
    margin-top: 0.08rem;
}
.mythic-eventing-step-config-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
}
.mythic-eventing-step-config-section {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.01)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-step-config-section-header {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.012)"};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.62rem 0.7rem 0.55rem;
}
.mythic-eventing-step-config-section-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.82rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-config-section-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.14rem;
}
.mythic-eventing-step-config-section-body {
    padding: 0.7rem;
}
.mythic-eventing-step-section-grid,
.mythic-eventing-step-field-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-eventing-step-config-section-wide {
    width: 100%;
}
.mythic-eventing-step-field {
    min-width: 0;
}
.mythic-eventing-step-field-heading {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.35rem;
}
.mythic-eventing-step-field-label {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-field-required {
    align-items: center;
    background-color: ${(props) => props.theme.palette.warning.main + "16"};
    border: 1px solid ${(props) => props.theme.palette.warning.main + "45"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.warning.main};
    display: inline-flex;
    font-size: 0.64rem;
    font-weight: 850;
    line-height: 1;
    min-height: 1.2rem;
    padding: 0 0.35rem;
}
.mythic-eventing-step-field-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.35;
    margin-bottom: 0.45rem;
}
.mythic-eventing-step-field-control {
    min-width: 0;
}
.mythic-eventing-step-dynamic-section {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
}
.mythic-eventing-step-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-step-list-item {
    align-items: flex-start;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.012)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
    padding: 0.5rem;
    width: 100%;
}
.mythic-eventing-step-list-item > .MuiIconButton-root {
    flex: 0 0 auto;
    margin-top: 0.15rem;
}
.mythic-eventing-step-list-content {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-eventing-step-input-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(9rem, 0.75fr) minmax(10rem, 0.8fr) minmax(14rem, 1.45fr);
    min-width: 0;
}
.mythic-eventing-step-output-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(9rem, 0.75fr) minmax(14rem, 1.5fr);
    min-width: 0;
}
.mythic-eventing-step-helper-text {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.4rem;
}
.mythic-eventing-step-empty-inline {
    align-items: center;
    background-color: ${(props) => props.theme.palette.action.disabledBackground};
    border: 1px dashed ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    font-size: 0.74rem;
    font-weight: 700;
    min-height: 2.3rem;
    padding: 0 0.65rem;
}
.mythic-eventing-step-action-data {
    min-width: 0;
}
.mythic-eventing-step-action-data > .MuiTypography-root {
    background-color: ${(props) => props.theme.palette.info.main + "10"};
    border: 1px solid ${(props) => props.theme.palette.info.main + "2f"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0 0 0.65rem;
    padding: 0.55rem 0.65rem;
}
.mythic-eventing-step-action-data > .MuiTable-root {
    border-collapse: separate !important;
    border-spacing: 0 0.5rem !important;
    table-layout: fixed;
    width: 100%;
}
.mythic-eventing-step-action-data > .MuiTable-root > .MuiTableHead-root {
    display: none;
}
.mythic-eventing-step-action-data > .MuiTable-root > .MuiTableBody-root > .MuiTableRow-root {
    background-color: transparent;
}
.mythic-eventing-step-action-data > .MuiTable-root > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.01)"};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    padding: 0.62rem 0.7rem !important;
    vertical-align: top;
}
.mythic-eventing-step-action-data > .MuiTable-root > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root:first-of-type {
    border-left: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px 0 0 ${(props) => props.theme.shape.borderRadius}px;
    width: 34%;
}
.mythic-eventing-step-action-data > .MuiTable-root > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root:last-of-type {
    border-radius: 0 ${(props) => props.theme.shape.borderRadius}px ${(props) => props.theme.shape.borderRadius}px 0;
    border-right: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    width: 66%;
}
.mythic-eventing-step-action-data > .MuiTable-root > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root:first-of-type .MuiTypography-root:first-of-type {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.76rem;
    font-weight: 850 !important;
    line-height: 1.25;
}
.mythic-eventing-step-action-data > .MuiTable-root > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root:first-of-type .MuiTypography-root:not(:first-of-type) {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.2rem;
}
.mythic-eventing-step-config-card .mythic-eventing-wizard-table {
    border-spacing: 0 !important;
}
.mythic-eventing-step-config-card .mythic-eventing-wizard-table .MuiTableRow-root {
    background-color: transparent;
}
.mythic-eventing-step-config-card .mythic-eventing-wizard-table .MuiTableCell-root {
    border-left: 0 !important;
    border-radius: 0 !important;
    border-right: 0 !important;
    border-top: 0 !important;
}
@media (max-width: 1200px) {
    .mythic-eventing-step-input-grid {
        grid-template-columns: 1fr;
    }
}
@media (max-width: 900px) {
    .mythic-eventing-step-config-summary,
    .mythic-eventing-step-config-summary-actions {
        flex-direction: column;
    }
    .mythic-eventing-step-config-summary-actions,
    .mythic-eventing-step-switch-row {
        width: 100%;
    }
    .mythic-eventing-step-section-grid,
    .mythic-eventing-step-field-grid,
    .mythic-eventing-step-output-grid {
        grid-template-columns: 1fr;
    }
}
.mythic-eventing-wizard-empty {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.82rem;
    font-weight: 650;
    padding: 1.4rem;
    text-align: center;
}
.mythic-eventing-wizard-empty-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.92rem;
    font-weight: 850;
    margin-bottom: 0.25rem;
}
.mythic-eventing-wizard-empty-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.76rem;
    font-weight: 650;
}
.mythic-eventing-wizard-review-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.mythic-eventing-wizard-review-toolbar {
    align-items: center;
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.65rem;
}
.mythic-eventing-wizard-editor {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
}
.mythic-eventing-wizard-editor > div {
    height: 100%;
}
.mythic-eventing-wizard-actions {
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    gap: 0.45rem;
    margin: 0 !important;
    padding: 0.65rem 1rem !important;
}
.mythic-eventing-editor-dialog-title {
    align-items: flex-start;
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    padding: 0.85rem 1rem !important;
}
.mythic-eventing-editor-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-editor-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.76rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.15rem;
}
.mythic-eventing-editor-title-actions {
    display: flex;
    flex: 0 0 auto;
    gap: 0.35rem;
}
.mythic-eventing-editor-dialog-content {
    height: min(84vh, 800px);
    margin: 0 !important;
    overflow: hidden;
    padding: 0 !important;
}
.mythic-eventing-editor-dialog-content > div {
    height: 100%;
}
.mythic-eventing-list-item .MuiListItemText-primary {
    font-size: 0.84rem;
    font-weight: 700;
    line-height: 1.25;
}
.mythic-eventing-detail {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;
    margin-left: 0 !important;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    padding: 0.5rem;
}
.mythic-eventing-graph-panel {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.default};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    flex: 0 0 200px;
    min-height: 200px;
    overflow: hidden;
}
.mythic-eventing-flow-canvas {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.default};
    height: 100%;
    min-height: 0;
    position: relative;
    width: 100%;
}
.mythic-eventing-flow-canvas .react-flow__pane {
    cursor: grab;
}
.mythic-eventing-flow-badge {
    align-items: center;
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: 0 6px 18px ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.22 : 0.08)};
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 800;
    left: 0.75rem;
    line-height: 1;
    min-height: 1.75rem;
    padding: 0 0.55rem;
    position: absolute;
    top: 0.75rem;
    z-index: 5;
}
.mythic-eventing-flow-controls {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: 0 6px 18px ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.22 : 0.08)} !important;
    overflow: hidden;
}
.mythic-eventing-flow-controls .react-flow__controls-button {
    background-color: ${(props) => props.theme.palette.background.paper};
    border-bottom-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-eventing-flow-controls .react-flow__controls-button:hover {
    background-color: ${(props) => props.theme.tableHover};
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-eventing-flow-canvas .react-flow__node-eventNode {
    background: transparent !important;
    border: 0 !important;
    box-sizing: border-box;
    box-shadow: none !important;
    padding: 0 !important;
}
.mythic-eventing-flow-canvas .react-flow__node-eventNode.selected,
.mythic-eventing-flow-canvas .react-flow__node-eventNode:focus,
.mythic-eventing-flow-canvas .react-flow__node-eventNode:focus-visible {
    box-shadow: none !important;
}
.mythic-eventing-flow-canvas .groupEventNode {
    background: transparent !important;
    border: 0 !important;
    padding: 0 !important;
}
.mythic-eventing-flow-node {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: 0 8px 22px ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.24 : 0.09)};
    color: ${(props) => props.theme.palette.text.primary};
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
    padding: 0.5rem 0.58rem;
    width: 100%;
}
.mythic-eventing-flow-node-success {
    border-color: ${(props) => props.theme.palette.success.main + "55"};
}
.mythic-eventing-flow-node-running {
    border-color: ${(props) => props.theme.palette.info.main + "55"};
}
.mythic-eventing-flow-node-error {
    border-color: ${(props) => props.theme.palette.error.main + "66"};
}
.mythic-eventing-flow-node-cancelled {
    border-color: ${(props) => props.theme.palette.warning.main + "60"};
}
.mythic-eventing-flow-node-skipped {
    border-color: ${(props) => alpha(props.theme.palette.text.secondary, 0.35)};
}
.mythic-eventing-flow-node-waiting,
.mythic-eventing-flow-node-configured {
    border-color: ${(props) => props.theme.table?.border || props.theme.borderColor};
}
.mythic-eventing-flow-node-main {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-eventing-flow-node-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.82rem !important;
    font-weight: 850 !important;
    line-height: 1.18 !important;
    margin: 0 !important;
    max-width: 15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-flow-node-meta {
    align-items: center;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: space-between;
    margin-top: 0.42rem;
}
.mythic-eventing-flow-node-meta .MuiTypography-root {
    color: ${(props) => props.theme.palette.text.secondary} !important;
    float: none !important;
    font-size: 0.68rem !important;
    line-height: 1.2;
}
.mythic-eventing-flow-node-action {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    font-size: 0.66rem;
    font-weight: 750;
    line-height: 1;
    min-height: 1.28rem;
    padding: 0 0.38rem;
}
.mythic-eventing-status-chip {
    align-items: center;
    background-color: ${(props) => props.theme.palette.action.disabledBackground};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    font-size: 0.7rem;
    font-weight: 850;
    line-height: 1;
    min-height: 1.45rem;
    padding: 0 0.45rem;
    width: fit-content;
}
.mythic-eventing-status-chip .MuiSvgIcon-root {
    font-size: 0.95rem !important;
    margin: 0 0.28rem 0 0 !important;
}
.mythic-eventing-status-chip-success {
    background-color: ${(props) => props.theme.palette.success.main + "16"};
    border-color: ${(props) => props.theme.palette.success.main + "45"};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-eventing-status-chip-running {
    background-color: ${(props) => props.theme.palette.info.main + "16"};
    border-color: ${(props) => props.theme.palette.info.main + "45"};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-eventing-status-chip-error {
    background-color: ${(props) => props.theme.palette.error.main + "16"};
    border-color: ${(props) => props.theme.palette.error.main + "50"};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-eventing-status-chip-cancelled {
    background-color: ${(props) => props.theme.palette.warning.main + "18"};
    border-color: ${(props) => props.theme.palette.warning.main + "52"};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-eventing-status-chip-skipped,
.mythic-eventing-status-chip-configured {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.035)"};
    border-color: ${(props) => props.theme.table?.border || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-eventing-status-chip-waiting {
    background-color: ${(props) => props.theme.palette.action.disabledBackground};
    border-color: ${(props) => props.theme.palette.action.disabled};
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-eventing-detail-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.55rem;
}
.mythic-eventing-detail-chip {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)"};
    border: 1px solid ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.22)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 800;
    gap: 0.35rem;
    line-height: 1;
    min-height: 1.55rem;
    padding: 0 0.48rem;
}
.mythic-eventing-detail-chip-label {
    color: inherit;
    opacity: 0.72;
}
.mythic-eventing-detail-chip-value {
    color: inherit;
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-dialog-header {
    padding: 0.75rem 0.75rem 0.5rem;
}
.mythic-eventing-header-title {
    align-items: center;
    color: inherit;
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-width: 0;
}
.mythic-eventing-header-title > span:last-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-header-duration {
    align-items: flex-end;
    color: inherit;
    display: inline-flex;
    flex-direction: column;
    gap: 0.2rem;
    line-height: 1.2;
    text-align: right;
}
.mythic-eventing-header-duration-label {
    color: inherit;
    font-size: 0.68rem;
    font-weight: 850;
    opacity: 0.7;
}
.mythic-eventing-header-duration .MuiTypography-root {
    color: inherit !important;
    float: none !important;
    font-size: 0.78rem !important;
    font-weight: 800;
}
.mythic-eventing-render-dialog-content {
    height: min(75vh, 720px);
    margin: 0 !important;
    min-height: 24rem;
    overflow: hidden;
    padding: 0 !important;
}
.mythic-eventing-render-dialog-content .mythic-eventing-flow-canvas {
    height: 100%;
}
.mythic-eventing-detail-dialog-content {
    background-color: ${(props) => props.theme.palette.background.default};
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: min(75vh, 760px);
    min-height: 24rem;
    overflow: auto;
    padding: 0.75rem !important;
}
.mythic-eventing-detail-dialog-content-state {
    align-items: stretch;
    justify-content: center;
}
.mythic-eventing-detail-dialog-content > .mythic-eventing-detail-section {
    flex: 0 0 auto;
}
.mythic-eventing-detail-dialog-actions {
    background-color: ${(props) => props.theme.palette.background.paper};
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    gap: 0.45rem;
    margin: 0 !important;
    padding: 0.65rem 1rem !important;
}
.mythic-eventing-detail-section {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-detail-section-header {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)"};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-height: 2.5rem;
    padding: 0.62rem 0.75rem;
}
.mythic-eventing-detail-section-collapsed .mythic-eventing-detail-section-header {
    border-bottom: 0;
}
.mythic-eventing-detail-section-title-stack {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.mythic-eventing-detail-section-toggle {
    align-items: center;
    background: transparent;
    border: 0;
    color: ${(props) => props.theme.palette.text.primary};
    cursor: pointer;
    display: flex;
    flex: 1 1 auto;
    font: inherit;
    gap: 0.45rem;
    margin: -0.25rem 0;
    min-width: 0;
    outline: none;
    padding: 0.25rem 0;
    text-align: left;
}
.mythic-eventing-detail-section-toggle:focus-visible .mythic-eventing-detail-section-title {
    color: ${(props) => props.theme.palette.primary.main};
    text-decoration: underline;
    text-underline-offset: 0.18rem;
}
.mythic-eventing-detail-section-toggle:hover .mythic-eventing-detail-section-title {
    color: ${(props) => props.theme.palette.primary.main};
}
.mythic-eventing-detail-section-toggle-icon {
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 auto;
    transition: transform 140ms ease, color 140ms ease;
}
.mythic-eventing-detail-section-expanded .mythic-eventing-detail-section-toggle-icon {
    color: ${(props) => props.theme.palette.primary.main};
    transform: rotate(180deg);
}
.mythic-eventing-detail-section-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.86rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-detail-section-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.32;
    margin-top: 0.14rem;
}
.mythic-eventing-detail-section-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.4rem;
    justify-content: flex-end;
}
.mythic-eventing-detail-section-body {
    min-width: 0;
    padding: 0.72rem;
}
.mythic-eventing-section-empty {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.01)"};
    border: 1px dashed ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    overflow: hidden;
}
.mythic-eventing-detail-count {
    align-items: center;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 850;
    justify-content: center;
    line-height: 1;
    min-height: 1.45rem;
    min-width: 1.45rem;
    padding: 0 0.4rem;
}
.mythic-eventing-detail-count-active {
    background-color: ${(props) => props.theme.palette.primary.main + "16"};
    border: 1px solid ${(props) => props.theme.palette.primary.main + "45"};
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-eventing-detail-count-empty {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.secondary};
    font-weight: 750;
    opacity: 0.62;
}
.mythic-eventing-detail-accordion {
    background-color: ${(props) => props.theme.palette.background.paper} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    box-shadow: none !important;
    margin: 0 !important;
    overflow: hidden;
}
.mythic-eventing-detail-accordion:before {
    display: none;
}
.mythic-eventing-detail-accordion + .mythic-eventing-detail-accordion {
    margin-top: 0.5rem !important;
}
.mythic-eventing-detail-accordion .MuiAccordionSummary-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.012)"};
    min-height: 2.4rem !important;
    padding: 0 0.7rem !important;
}
.mythic-eventing-detail-accordion .MuiAccordionSummary-content {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.78rem;
    font-weight: 850;
    margin: 0.48rem 0 !important;
}
.mythic-eventing-detail-accordion .MuiAccordionDetails-root {
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.7rem !important;
}
.mythic-eventing-metadata-accordion .MuiAccordionDetails-root {
    max-height: min(48vh, 30rem);
    overflow: auto;
}
.mythic-eventing-metadata-comparison {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}
.mythic-eventing-metadata-comparison-single .mythic-eventing-metadata-pair-grid {
    grid-template-columns: 1fr;
}
.mythic-eventing-metadata-pair {
    min-width: 0;
}
.mythic-eventing-metadata-pair-title {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
    margin-bottom: 0.35rem;
}
.mythic-eventing-metadata-pair-grid,
.mythic-eventing-metadata-static-grid {
    display: grid;
    gap: 0.55rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-eventing-metadata-panel {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.012)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-metadata-panel-title {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.018)"};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.68rem;
    font-weight: 850;
    line-height: 1.2;
    padding: 0.45rem 0.55rem;
}
.mythic-eventing-code-block {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(0,0,0,0.24)" : "rgba(255,255,255,0.72)"};
    color: ${(props) => props.theme.palette.text.primary};
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.72rem;
    line-height: 1.42;
    margin: 0;
    max-height: 18rem;
    min-height: 3.4rem;
    overflow: auto;
    padding: 0.62rem;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-eventing-code-block-empty {
    align-items: center;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    font-family: ${(props) => props.theme.typography.fontFamily};
    font-size: 0.74rem;
    font-weight: 700;
}
.mythic-eventing-detail-table-wrap {
    max-height: 18rem;
    overflow: auto;
}
.mythic-eventing-detail-table-wrap .MuiTable-root {
    min-width: 650px;
}
.mythic-eventing-detail-table-wrap .MuiTableCell-root {
    vertical-align: middle;
}
.mythic-eventing-resource-link {
    word-break: break-all;
}
.mythic-eventing-resource-secondary {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.35;
}
.mythic-eventing-resource-command {
    color: ${(props) => props.theme.palette.text.primary};
    font-weight: 850;
}
@media (max-width: 900px) {
    .mythic-eventing-header-duration {
        align-items: flex-start;
        text-align: left;
    }
    .mythic-eventing-metadata-pair-grid,
    .mythic-eventing-metadata-static-grid {
        grid-template-columns: 1fr;
    }
}
.mythic-service-actions {
    gap: 0.55rem;
}
.mythic-split-action-group {
    box-shadow: none !important;
    display: inline-flex;
    overflow: hidden;
}
.mythic-split-action-group .MuiButton-root,
.mythic-split-action-group .MuiIconButton-root {
    border-radius: 0 !important;
    height: 30px;
    margin-left: -1px;
}
.mythic-split-action-group .MuiButton-root:first-of-type,
.mythic-split-action-group .MuiIconButton-root:first-of-type {
    border-bottom-left-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    border-top-left-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    margin-left: 0;
}
.mythic-split-action-group .MuiButton-root:last-of-type,
.mythic-split-action-group .MuiIconButton-root:last-of-type {
    border-bottom-right-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    border-top-right-radius: ${(props) => props.theme.shape.borderRadius}px !important;
}
.mythic-split-action-group .mythic-table-row-action {
    min-width: 7.5rem;
}
.mythic-split-action-group .mythic-table-row-icon-action {
    width: 34px;
}
.mythic-split-action-group .mythic-table-row-icon-action-success {
    background-color: ${(props) => props.theme.palette.success.main + "1c"} !important;
    border-color: ${(props) => props.theme.palette.success.main + "66"} !important;
}
.mythic-split-action-group .mythic-table-row-icon-action-success:hover {
    background-color: ${(props) => props.theme.palette.success.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.success.main + "88"} !important;
}
.mythic-split-action-group .mythic-table-row-icon-action-danger {
    background-color: ${(props) => props.theme.palette.error.main + "1c"} !important;
    border-color: ${(props) => props.theme.palette.error.main + "66"} !important;
}
.mythic-split-action-group .mythic-table-row-icon-action-danger:hover {
    background-color: ${(props) => props.theme.palette.error.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.error.main + "88"} !important;
}
.mythic-table-row-icon-action.Mui-disabled {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"} !important;
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.disabled} !important;
}
.mythic-menu-item-hover-danger .MuiSvgIcon-root {
    color: inherit !important;
}
.mythic-menu-item-hover-danger:hover,
.mythic-menu-item-hover-danger.Mui-focusVisible {
    background-color: ${(props) => props.theme.palette.error.main + "16"} !important;
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-status-stack {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-dialog-switch-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin: 0;
    width: 100%;
}
.mythic-dialog-preview {
    align-items: center;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    min-height: 38px;
    min-width: 0;
    padding: 0 0.75rem;
}
.mythic-dialog-file-target {
    align-items: center;
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px dashed ${(props) => props.theme.table?.border || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    justify-content: center;
    min-height: 7rem;
    padding: 0.75rem;
}
.mythic-dialog-table-wrap {
    max-height: min(45vh, 28rem);
}
.mythic-transfer-section {
    margin-top: 0.75rem;
}
.mythic-transfer-list {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex-direction: column;
    min-height: 16rem;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-transfer-list-header {
    background-color: ${(props) => props.theme.table?.header || props.theme.tableHeader};
    border-bottom: 1px solid ${(props) => props.theme.table?.border || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.25;
    padding: 0.45rem 0.6rem;
    text-transform: uppercase;
}
.mythic-transfer-list-body {
    flex: 1 1 auto;
    max-height: 30vh;
    min-height: 12rem;
    overflow: auto;
}
.mythic-transfer-list .MuiList-root {
    background: transparent;
    border: 0;
    border-radius: 0;
}
.mythic-transfer-controls {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    justify-content: center;
    padding: 0 0.5rem;
}
.mythic-transfer-controls .MuiButton-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: none !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
    min-height: 30px;
    min-width: 34px;
    padding: 0.25rem 0.45rem;
}
.mythic-transfer-controls .MuiButton-root:hover {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} !important;
}
@media screen and (max-width: 700px) {
    .mythic-dialog-choice-row {
        grid-template-columns: 1fr;
    }
    .mythic-dialog-choice-divider {
        text-align: left;
    }
}
.MuiTabs-root {
    min-height: 34px;
}
.MuiTab-root {
    min-width: unset !important;
    max-width: unset;
    white-space: unset !important;
}
.MuiTabs-scrollButtons {
    width: unset;
}
.MuiTabs-flexContainer {
    flex-wrap: wrap;
}
.MuiTabs-scrollButtons.Mui-disabled {
  opacity: 0.3;
}
.ace_editor{
    background-color: ${(props) => props.theme.outputBackgroundColor + "20"};
}
.ace_gutter {
    //background: transparent !important;
    background-color: ${(props) => props.theme.outputBackgroundColor + "20"} !important;
    color: ${(props) => props.theme.outputTextColor} !important;
}
.ace_editor .ace_text-layer {
    color: ${(props) => props.theme.outputTextColor};
}
.rounded-tab { 
    border-top-left-radius: ${(props) => props.theme.shape.borderRadius}px;
    border-top-right-radius: ${(props) => props.theme.shape.borderRadius}px;
    padding: 2px 10px 0 10px;
    border-top: 1px solid ${(props) => props.theme.borderColor};
    border-left: 1px solid ${(props) => props.theme.borderColor};
    border-right: 1px solid ${(props) => props.theme.borderColor};
    border-bottom: 1px solid ${(props) => props.theme.borderColor};
    position: relative;
    top: 2px;
    word-break: break-all;
}
.empty-table-header {
    border: 1px solid ${(props) => props.theme.borderColor} !important;
    height: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
}
.code-box {
    border: 1px solid ${(props) => props.theme.borderColor} !important;
    padding: 0px 5px 0px 5px;
    overflow: auto;
    white-space: pre;
    background-color: black;
    color: white;
}
`
