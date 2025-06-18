import { createGlobalStyle} from "styled-components"
// hex transparencies https://gist.github.com/lopspower/03fb1cc0ac9f32ef38f4
export const GlobalStyles = createGlobalStyle`
body {
    margin: 0
}
html, body, #root {
    height: 100%;
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
    font-weight: bold;
}
tr:nth-child(even) {
  background-color:  ${(props) => props.theme.palette.mode === 'dark' ? props.theme.tableHover + "0D" : props.theme.tableHover + "80"};
}
.MythicResizableGridRowHighlight {
  background-color:  ${(props) => props.theme.palette.mode === 'dark' ? props.theme.tableHover + "0D" : props.theme.tableHover + "80"};
} 
.MuiTableRow-hover {
    &:hover,
    &--hovered {
        background-color: ${(props) => props.theme.tableHover + "CC"} !important;
        color: ${(props) => props.theme.palette.text.primary} !important;
    }
}

.MuiSelect-select.MuiSelect-select{
    padding-left: 10px
}
.MuiListItem-root {
    &:hover,
    &--hovered {
        background-color: ${(props) => props.theme.tableHover + "CC"} !important;
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
  background-color: ${(props) => props.theme.topAppBarColor};
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
    border: 1px solid grey;
    padding: 5px;
    border-radius: 5px;
    background: ${(props) => props.theme.palette.graphGroupRGBA} !important;
}
.groupEventNode {
    border: 1px solid grey;
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
    border: 1px solid grey;
    border-radius: 5px;
    box-shadow: 10px 19px 20px rgba(0, 0, 0, 10%);
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
    padding: 3px 2px 6px 3px;
    background: 
        linear-gradient(90deg, ${(props) => props.theme.palette.secondary.main} 50%, transparent 0) repeat-x,
        linear-gradient(90deg, ${(props) => props.theme.palette.secondary.main} 50%, transparent 0) repeat-x,
        linear-gradient(0deg, ${(props) => props.theme.palette.secondary.main} 50%, transparent 0) repeat-y,
        linear-gradient(0deg, ${(props) => props.theme.palette.secondary.main} 50%, transparent 0) repeat-y,
          ${(props) => props.theme.palette.background.default + "CC"} !important;
    background-size: 8px 3px, 8px 3px, 3px 8px, 3px 8px  !important;
    background-position: 0 0, 0 100%, 0 0, 100% 0  !important; // top bottom left right
}
*::-webkit-scrollbar {
  width: 0.4em;
  height: 0.4em;
}
*::-webkit-scrollbar-track {
  -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.00);
}
*::-webkit-scrollbar-thumb {
  background-color: ${(props) => props.theme.palette.secondary.dark};
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
    padding: 0 0.5em;
    box-sizing: border-box;
    justify-content: space-between;
    user-select: none;
    background-color: ${(props) => props.theme.tableHeader} !important;
    &:first-child-of-type {
        border-left: 1px solid grey;
    }
    &:hover {
        background-color: ${(props) => props.theme.tableHover};
        cursor: pointer;
    }
}
.MythicResizableGrid-hoveredRow {
    background-color: ${(props) => props.theme.tableHover + "CC"};
}
.MythicResizableGrid-cell {
    display: flex;
    align-items: center;
    padding: 0 0.5em;
    box-sizing: border-box;
    font-family: monospace;
    border-bottom: 1px solid grey;
    cursor: default !important;
}
.MythicResizableGrid-cellInner {
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.MythicResizableGrid-draggableHandlesContainer {
    position: absolute;
    top: 0;
    overflow-x: hidden;
}
.MythicResizableGrid-draggableHandlesClickArea {
    position: absolute;
    width: 16px;
    cursor: col-resize;
    pointer-events: initial;
}
.MythicResizableGrid-draggableHandlesClickAreaSelected {
    position: absolute;
    cursor: col-resize;
    width: 10px;
    pointer-events: initial;
    background-color: ${(props) => props.theme.palette.info.main};
    opacity: 0.5;
    height: 100%;
}
.MythicResizableGrid-draggableHandlesIndicator {
    position: relative;
    width: 10px;
    color: red;
    height: 100px;
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
    border: 1px solid grey;
    border-radius: 5px;
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
    border: 1px solid grey;
    border-radius: 3px;
    line-height: 30px;
}
.dropdownMenuColored {
    background-color: ${(props) => props.theme.palette.background.paper} !important;
    border: 1px solid grey;
    border-radius: 5px;
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
    background-color: ${(props) => props.theme.selectedCallbackColor + "CC"};
}
.selectedCallbackHierarchy {
    background-color: ${(props) => props.theme.selectedCallbackHierarchyColor + "CC"};
}

.MuiDataGrid-row.Mui-selected {
    background-color: ${(props) => props.theme.selectedCallbackColor} !important;
}
.roundedBottomCorners {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
}
.MuiInputLabel-root {
    color:  grey !important;
}
.MuiOutlinedInput-notchedOutline {
    border-color: grey !important;
}
.MuiInput-underline {
    border-color: grey !important;
}
.MuiSelect-outlined {
    border-color: grey !important;
}
.Mui-focused {
    border-color: grey !important;
}
.MuiInputBase-input {
    border-color: grey !important;
}
.MuiInput-root::after {
    border-color: grey !important;
}
.MuiTableCell-root {
    padding: 0 16px 0 16px;
}
.MuiTabs-root {
    min-height: 30px;
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
    background-color: ${(props) => props.theme.palette.background.default + "80"};
}
.ace_gutter {
    //background: transparent !important;
}
.ace_editor .ace_text-layer {
    color: ${(props) => props.theme.palette.text.primary};
}
.ace_cursor {
  opacity: 0 !important;
}
.rounded-tab { 
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    padding: 0 10px 0 10px;
    border-top: 1px solid grey;
    border-left: 2px solid grey;
    border-right: 1px solid grey;
    border-bottom: 1px solid grey;
    position: relative;
    top: 2px;
}

`
