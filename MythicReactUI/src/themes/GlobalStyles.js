import { createGlobalStyle} from "styled-components"
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
tr:nth-child(even) {
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
.MuiPaper-root > .MuiTableContainer-root {
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
    line-height: 1.35;
    vertical-align: middle;
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
