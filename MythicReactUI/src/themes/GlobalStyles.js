import { createGlobalStyle} from "styled-components"
import {alpha} from "@mui/material/styles";
// hex transparencies https://gist.github.com/lopspower/03fb1cc0ac9f32ef38f4
const getSectionHeaderAccent = (props) => props.theme.sectionHeader?.accent || props.theme.palette.primary.main;
const getSectionHeaderGradient = (props) => {
    if(props.theme.gradients?.sectionHeader){
        return props.theme.gradients.sectionHeader;
    }
    const headerTextColor = props.theme.pageHeaderText?.main || props.theme.palette.text.primary;
    return `linear-gradient(90deg, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.28 : 0.18)} 0%, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.08)} 48%, ${alpha(headerTextColor, props.theme.palette.mode === "dark" ? 0.055 : 0.04)} 100%)`;
};
const getSubtleAccentGradient = (props) => props.theme.gradients?.subtleAccent ||
    `linear-gradient(135deg, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.13 : 0.075)} 0%, ${alpha(props.theme.palette.background.paper, 0)} 62%)`;
const getSubtleAccentHorizontalGradient = (props) => props.theme.gradients?.subtleAccentHorizontal ||
    `linear-gradient(90deg, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)} 0%, ${alpha(props.theme.palette.background.paper, 0)} 100%)`;

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
  background: ${(props) => props.theme.sectionHeader?.accent || props.theme.palette.primary.main};
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
.mythic-file-browser-tableTop {
    background-color: ${(props) => alpha(props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.96 : 0.98)};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.45rem 0.55rem 0.4rem;
}
.mythic-file-browser-pathInput.MuiInputBase-root {
    background-color: ${(props) => props.theme.palette.background.paper};
}
.mythic-file-browser-pathInput.MuiInputBase-root.MuiOutlinedInput-adornedStart {
    padding-left: 0.22rem;
}
.mythic-file-browser-pathInput.MuiInputBase-root.MuiOutlinedInput-adornedEnd {
    padding-right: 0.22rem;
}
.mythic-file-browser-pathInput .MuiInputBase-input {
    min-width: 8rem;
    padding-bottom: 10px;
    padding-top: 10px;
}
.mythic-file-browser-toolbarGroup {
    align-items: center;
    background-color: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.045 : 0.035)};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 0.15rem;
    min-height: 32px;
    min-width: 0;
    padding: 0.12rem;
}
.mythic-file-browser-toolbarGroupStart {
    margin-right: 0.45rem;
}
.mythic-file-browser-toolbarGroupEnd {
    margin-left: 0.45rem;
}
.mythic-file-browser-tokenSelect {
    max-width: 12rem;
    min-width: 8.5rem;
    overflow: hidden;
}
.mythic-file-browser-tokenSelect .MuiInputBase-root,
.mythic-file-browser-tokenSelect .MuiSelect-select {
    font-size: 0.78rem;
    min-height: 0;
}
.mythic-file-browser-iconButton.MuiIconButton-root {
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    height: 28px;
    padding: 0;
    transition: background-color 120ms ease, color 120ms ease, opacity 120ms ease;
    width: 28px;
}
.mythic-file-browser-iconButton.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.09 : 0.075)};
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-file-browser-iconButton.MuiIconButton-root.Mui-disabled {
    opacity: 0.42;
}
.mythic-file-browser-iconButton.mythic-file-browser-hoverInfo:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-file-browser-iconButton.mythic-file-browser-hoverSuccess:hover {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-file-browser-iconButton.mythic-file-browser-hoverWarning:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-file-browser-iconButton.mythic-file-browser-hoverError:hover {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-file-browser-iconButton.mythic-file-browser-activeSuccess {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-file-browser-iconButton.mythic-file-browser-activeWarning {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.22 : 0.14)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-file-browser-iconButton.mythic-file-browser-activeError {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-tasking-composer {
    background-color: ${(props) => alpha(props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.96 : 0.98)};
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "0 -10px 28px rgba(0, 0, 0, 0.24)" : "0 -10px 28px rgba(15, 23, 42, 0.06)"};
    flex: 0 0 auto;
    min-width: 0;
    padding: 0.55rem 0.65rem 0.6rem;
    position: relative;
    width: 100%;
}
.mythic-tasking-context-row {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 0.28rem;
    margin-bottom: 0.45rem;
    min-height: 24px;
    min-width: 0;
    padding-bottom: 0.05rem;
}
.mythic-tasking-context-row > span[data-tooltip-id="my-tooltip"] {
    display: inline-flex !important;
    max-width: 100%;
    min-width: 0;
}
.mythic-tasking-context-chip {
    align-items: flex-start;
    border: 1px solid ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.22 : 0.1)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    cursor: pointer;
    display: inline-flex;
    flex: 0 1 auto;
    font-size: 0.72rem;
    font-weight: 750;
    gap: 0.28rem;
    line-height: 1.2;
    max-width: 100%;
    min-height: 22px;
    overflow-wrap: anywhere;
    padding: 0.24rem 0.48rem;
    transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
    white-space: normal;
    word-break: break-word;
}
.mythic-tasking-context-chip:hover,
.mythic-tasking-context-chip:focus-visible {
    box-shadow: inset 0 0 0 1px currentColor;
    outline: none;
    transform: translateY(-1px);
}
.mythic-tasking-context-chip:active {
    transform: translateY(0);
}
.mythic-tasking-context-chip-emphasized {
    box-shadow: inset 0 0 0 1px ${(props) => alpha(props.theme.palette.common.white, props.theme.palette.mode === "dark" ? 0.12 : 0.18)};
}
.mythic-tasking-context-chip-label {
    flex: 0 0 auto;
    font-size: 0.64rem;
    font-weight: 850;
    letter-spacing: 0;
    opacity: 0.78;
}
.mythic-tasking-context-chip-value {
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
}
.mythic-tasking-command-row {
    align-items: flex-end;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
    width: 100%;
}
.mythic-tasking-token-select {
    flex: 0 0 13rem;
    max-width: 40%;
    min-width: 9.5rem;
}
.mythic-tasking-token-select .MuiOutlinedInput-root {
    background-color: ${(props) => props.theme.palette.background.paper};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-height: 37px;
}
.mythic-tasking-token-select .MuiSelect-select {
    font-size: 0.78rem;
    font-weight: 650;
    min-height: 0 !important;
    overflow: hidden;
    padding-bottom: 0.52rem;
    padding-top: 0.52rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-tasking-command-input {
    flex: 1 1 auto;
    min-width: 10rem;
}
.mythic-tasking-command-input .MuiOutlinedInput-root {
    align-items: flex-end;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.035) : alpha(props.theme.palette.common.black, 0.018)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    padding: 0.1rem 0.24rem 0.1rem 0;
}
.mythic-tasking-command-input .MuiOutlinedInput-root:hover {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.05) : alpha(props.theme.palette.common.black, 0.026)};
}
.mythic-tasking-command-input .MuiInputBase-input {
    font-family: ${(props) => props.theme.typography.fontFamily};
    font-size: 0.86rem;
    line-height: 1.45;
    padding-bottom: 0.48rem;
    padding-top: 0.48rem;
}
.mythic-tasking-command-prefix {
    align-items: center;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    flex: 0 0 auto;
    height: 30px;
    justify-content: center;
    margin-left: 0.35rem;
    margin-right: 0.35rem;
    margin-top: 0.12rem;
    opacity: 0.86;
}
.mythic-tasking-action-row {
    align-items: center;
    align-self: flex-end;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 0.18rem;
    margin-bottom: 0.12rem;
    padding-left: 0.28rem;
}
.mythic-tasking-action-button.MuiIconButton-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    height: 28px;
    padding: 0;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 28px;
}
.mythic-tasking-action-button-neutral.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-tasking-action-button-warning.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.52 : 0.36)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-tasking-action-button-success.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-tasking-payload-chip {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: inline-flex;
    flex: 0 0 auto;
    height: 28px;
    justify-content: center;
    width: 28px;
}
.mythic-tasking-parameter-preview {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.035) : alpha(props.theme.palette.common.black, 0.018)};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: grid;
    gap: 0.55rem;
    grid-template-columns: minmax(7.5rem, auto) minmax(0, 1fr);
    margin-top: 0.45rem;
    min-height: 42px;
    min-width: 0;
    padding: 0.45rem 0.55rem;
}
.mythic-tasking-parameter-preview-empty-state {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.025) : alpha(props.theme.palette.common.black, 0.014)};
}
.mythic-tasking-parameter-preview-heading {
    align-items: center;
    display: flex;
    gap: 0.35rem;
    min-width: 0;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-tasking-parameter-preview-heading svg {
    color: ${(props) => props.theme.palette.text.disabled};
    font-size: 1rem;
}
.mythic-tasking-parameter-preview-more {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 750;
    min-height: 22px;
    padding: 0.12rem 0.4rem;
}
.mythic-tasking-parameter-preview-chip-row {
    align-items: center;
    display: flex;
    flex-wrap: nowrap;
    gap: 0.28rem;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 0.02rem;
}
.mythic-tasking-parameter-preview-empty {
    align-items: center;
    color: ${(props) => props.theme.palette.text.disabled};
    display: flex;
    font-size: 0.74rem;
    font-weight: 650;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-tasking-parameter-preview-empty svg {
    color: ${(props) => props.theme.palette.text.disabled};
    font-size: 1rem;
}
.mythic-tasking-parameter-preview-empty span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-tasking-parameter-preview-chip.MuiChip-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 750;
    height: 22px;
    max-width: min(16rem, 100%);
}
.mythic-tasking-parameter-preview-chip.MuiChip-clickable:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.36 : 0.24)};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-tasking-parameter-preview-chip-required.MuiChip-root {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.14 : 0.08)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.36 : 0.24)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-tasking-parameter-preview-chip-required.MuiChip-clickable:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-tasking-parameter-preview-chip-active.MuiChip-root {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.14 : 0.08)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-tasking-parameter-preview-chip .MuiChip-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-tasking-parameter-preview-chip-label {
    align-items: center;
    display: inline-flex;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-tasking-parameter-preview-chip-status {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.16 : 0.1)};
    border-radius: 999px;
    color: inherit;
    flex: 0 0 auto;
    font-size: 0.58rem;
    font-weight: 850;
    line-height: 1;
    padding: 0.14rem 0.28rem;
}
.mythic-tasking-parameter-preview-chip-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-tasking-parameter-preview-chip-type {
    color: inherit;
    flex: 0 0 auto;
    font-size: 0.62rem;
    font-weight: 650;
    opacity: 0.66;
}
.mythic-tasking-reverse-search {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.045) : alpha(props.theme.palette.common.black, 0.024)};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    gap: 0.45rem;
    margin-bottom: 0.45rem;
    min-width: 0;
    padding: 0.28rem;
}
.mythic-tasking-reverse-search-label {
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 800;
    padding-left: 0.3rem;
}
.mythic-tasking-reverse-search-input .MuiOutlinedInput-root {
    background-color: ${(props) => props.theme.palette.background.paper};
}
.mythic-tasking-filter-dialog {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-tasking-filter-dialog-title.MuiDialogTitle-root {
    background-image: ${getSectionHeaderGradient} !important;
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    cursor: move;
    padding: 1rem 1.15rem !important;
    position: relative;
}
.mythic-tasking-filter-dialog-title.MuiDialogTitle-root::before {
    background-color: ${getSectionHeaderAccent};
    bottom: 0;
    box-shadow: 0 0 0 1px ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.2)};
    content: "";
    left: 0;
    position: absolute;
    top: 0;
    width: 6px;
}
.mythic-tasking-filter-title-row {
    align-items: center;
    display: flex;
    gap: 0.8rem;
    min-width: 0;
    min-height: 42px;
    padding-left: 0.55rem;
}
.mythic-tasking-filter-title-icon {
    align-items: center;
    background-color: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.12)};
    border: 1px solid ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.24)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: inline-flex;
    flex: 0 0 auto;
    height: 32px;
    justify-content: center;
    width: 32px;
}
.mythic-tasking-filter-title-main {
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.15;
}
.mythic-tasking-filter-title-subtitle {
    color: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.78)};
    font-size: 0.76rem;
    font-weight: 600;
    line-height: 1.25;
    margin-top: 0.15rem;
}
.mythic-tasking-filter-dialog-actions.MuiDialogActions-root {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper} !important;
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    gap: 0.65rem !important;
    padding: 0.85rem 1rem !important;
}
.mythic-tasking-filter-dialog-actions.MuiDialogActions-root .MuiButton-root {
    min-height: 36px;
    min-width: 8.25rem;
    padding-left: 1rem;
    padding-right: 1rem;
}
.mythic-tasking-filter-dialog-actions.MuiDialogActions-root .MuiButton-root:first-of-type {
    margin-right: auto;
}
.mythic-tasking-filter-dialog-content.MuiDialogContent-root {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    max-height: min(72vh, 48rem);
    min-width: min(46rem, calc(100vw - 3rem));
    overflow: auto;
    padding: 1rem !important;
}
.mythic-tasking-filter-summary {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-height: 28px;
}
.mythic-tasking-filter-summary-chip.MuiChip-root {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border: 1px solid ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.primary.main};
    font-size: 0.72rem;
    font-weight: 750;
}
.mythic-tasking-filter-summary-chip .MuiChip-icon {
    color: inherit;
    font-size: 1rem;
}
.mythic-tasking-filter-summary-chip-muted.MuiChip-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-tasking-filter-switch-stack {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-tasking-filter-select .MuiOutlinedInput-root {
    background-color: ${(props) => props.theme.palette.background.paper};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-height: 38px;
}
.mythic-tasking-filter-select .MuiSelect-select {
    align-items: center;
    display: flex;
    min-height: 0 !important;
    padding-bottom: 0.42rem;
    padding-top: 0.42rem;
}
.mythic-tasking-filter-select-empty {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    font-weight: 650;
}
.mythic-tasking-filter-select-chips {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-tasking-filter-selected-chip.MuiChip-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.045)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.72rem;
    font-weight: 700;
}
.mythic-tasking-filter-command-grid {
    align-items: start;
    display: grid;
    gap: 0.6rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    min-width: 0;
    width: 100%;
}
.mythic-tasking-filter-choice-divider {
    align-self: center;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 750;
    padding-top: 1.55rem;
    text-align: center;
}
.mythic-tasking-filter-clear-button.MuiButton-root {
    align-self: flex-start;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.025)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: none;
    color: ${(props) => props.theme.palette.text.secondary} !important;
    font-size: 0.72rem;
    font-weight: 750;
    margin-top: 0.4rem;
    min-height: 28px;
    text-transform: none;
}
.mythic-tasking-filter-clear-button.MuiButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)} !important;
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)} !important;
    color: ${(props) => props.theme.palette.warning.main} !important;
}
@media screen and (max-width: 760px) {
    .mythic-tasking-filter-dialog-content.MuiDialogContent-root {
        min-width: 0;
    }
    .mythic-tasking-filter-command-grid {
        grid-template-columns: 1fr;
    }
    .mythic-tasking-filter-choice-divider {
        padding-top: 0;
    }
    .mythic-tasking-filter-dialog-actions.MuiDialogActions-root .MuiButton-root,
    .mythic-tasking-filter-dialog-actions.MuiDialogActions-root .MuiButton-root:first-of-type {
        flex: 1 1 100%;
        margin-right: 0;
    }
}
@media screen and (max-width: 760px) {
    .mythic-tasking-command-row {
        align-items: stretch;
        flex-direction: column;
    }
    .mythic-tasking-token-select {
        flex: 0 0 auto;
        max-width: 100%;
        width: 100% !important;
    }
    .mythic-tasking-parameter-preview {
        grid-template-columns: 1fr;
    }
}
.mythic-task-parameters-title.MuiDialogTitle-root {
    background-image: ${getSectionHeaderGradient} !important;
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    cursor: move;
    padding: 1rem 1.15rem !important;
    position: relative;
}
.mythic-task-parameters-title.MuiDialogTitle-root::before {
    background-color: ${getSectionHeaderAccent};
    bottom: 0;
    box-shadow: 0 0 0 1px ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.2)};
    content: "";
    left: 0;
    position: absolute;
    top: 0;
    width: 6px;
}
.mythic-task-parameters-title-row {
    align-items: center;
    display: flex;
    gap: 0.8rem;
    min-height: 42px;
    min-width: 0;
    padding-left: 0.55rem;
}
.mythic-task-parameters-title-icon {
    align-items: center;
    background-color: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.12)};
    border: 1px solid ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.24)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: inline-flex;
    flex: 0 0 auto;
    height: 32px;
    justify-content: center;
    width: 32px;
}
.mythic-task-parameters-title-copy {
    flex: 1 1 auto;
    min-width: 12rem;
}
.mythic-task-parameters-title-main {
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.15;
    overflow-wrap: anywhere;
}
.mythic-task-parameters-title-subtitle {
    color: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.78)};
    font-size: 0.76rem;
    font-weight: 600;
    line-height: 1.25;
    margin-top: 0.15rem;
}
.mythic-task-parameters-title-meta {
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: flex-end;
    min-width: 0;
}
.mythic-task-parameters-title-chip.MuiChip-root {
    background-color: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.12)};
    border: 1px solid ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.24)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    font-size: 0.72rem;
    font-weight: 750;
}
.mythic-task-parameters-title-chip .MuiChip-icon {
    color: inherit;
    font-size: 1rem;
}
.mythic-task-parameters-title-chip-warning.MuiChip-root {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.22 : 0.14)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.52 : 0.36)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-task-parameters-content.MuiDialogContent-root {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    max-height: min(76vh, 52rem);
    min-width: min(58rem, calc(100vw - 3rem));
    overflow: auto;
    padding: 1rem !important;
    position: relative;
}
.mythic-task-parameters-backdrop.MuiBackdrop-root {
    position: absolute;
    z-index: 2;
}
.mythic-task-parameters-overview,
.mythic-task-parameters-group-card,
.mythic-task-parameter-card {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
}
.mythic-task-parameters-overview {
    padding: 0.75rem;
}
.mythic-task-parameters-section-label {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-task-parameters-section-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-task-parameters-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-family: ${(props) => props.theme.typography.fontFamily};
    font-size: 0.82rem;
    line-height: 1.45;
    margin: 0.35rem 0 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-task-parameters-group-card {
    align-items: center;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 20rem);
    padding: 0.75rem;
}
.mythic-task-parameters-group-select {
    width: 100%;
}
.mythic-task-parameters-list {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    margin-top: 0.75rem;
    min-width: 0;
}
.mythic-task-parameter-card {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: minmax(14rem, 0.38fr) minmax(0, 0.62fr);
    padding: 0.8rem;
}
.mythic-task-parameter-card-required {
    border-left: 4px solid ${(props) => props.theme.palette.warning.main};
}
.mythic-task-parameter-copy {
    min-width: 0;
}
.mythic-task-parameter-heading {
    align-items: flex-start;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-task-parameter-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.88rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-task-parameter-chip-row {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: flex-end;
}
.mythic-task-parameter-chip.MuiChip-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.032)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.68rem;
    font-weight: 750;
    height: 22px;
}
.mythic-task-parameter-chip-required.MuiChip-root {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.5 : 0.34)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-task-parameter-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.76rem;
    line-height: 1.4;
    margin-top: 0.35rem;
    overflow-wrap: anywhere;
}
.mythic-task-parameter-description-muted {
    color: ${(props) => props.theme.palette.text.disabled};
    font-style: italic;
}
.mythic-task-parameter-name {
    color: ${(props) => props.theme.palette.text.disabled};
    font-family: ${(props) => props.theme.typography.fontFamilyMono || "monospace"};
    font-size: 0.7rem;
    line-height: 1.35;
    margin-top: 0.4rem;
    overflow-wrap: anywhere;
}
.mythic-task-parameter-control {
    min-width: 0;
    position: relative;
}
.mythic-task-parameter-control-shell {
    min-width: 0;
    position: relative;
}
.mythic-task-parameter-control-backdrop.MuiBackdrop-root {
    background-color: ${(props) => alpha(props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.72 : 0.82)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    position: absolute;
    z-index: 2;
}
.mythic-task-parameter-control .MuiFormControl-root,
.mythic-task-parameter-control .MuiTextField-root {
    width: 100%;
}
.mythic-task-parameter-control .MuiInputBase-root {
    min-height: 38px;
}
.mythic-task-parameter-control .MuiInput-root {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    padding-left: 0.45rem;
    padding-right: 0.45rem;
}
.mythic-task-parameter-control .MuiInput-root::before,
.mythic-task-parameter-control .MuiInput-root::after {
    display: none;
}
.mythic-task-parameter-control .mythicElement {
    background-color: transparent;
    border: 0;
    box-shadow: none;
}
.mythic-task-parameter-select-row {
    align-items: center;
    display: grid;
    gap: 0.45rem;
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: 0;
}
.mythic-task-parameter-select-control {
    min-width: 0;
    width: 100%;
}
.mythic-task-parameter-select-value,
.mythic-task-parameter-select-placeholder {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-task-parameter-select-placeholder {
    color: ${(props) => props.theme.palette.text.disabled};
}
.mythic-task-parameter-selected-values {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-task-parameter-selected-chip.MuiChip-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.68rem;
    height: 22px;
    max-width: 100%;
}
.mythic-task-parameter-selected-chip .MuiChip-label {
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-task-parameter-menu-text {
    display: inline-block;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-task-parameter-empty-inline {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)"};
    border: 1px dashed ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    font-size: 0.74rem;
    font-weight: 650;
    min-height: 38px;
    padding: 0.45rem 0.65rem;
}
.mythic-task-parameter-refresh.MuiIconButton-root {
    align-self: center;
}
.mythic-task-choice-custom {
    align-items: center;
    display: grid;
    gap: 0.55rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
    min-width: 0;
}
.mythic-task-choice-custom-select,
.mythic-task-choice-custom-input {
    min-width: 0;
}
.mythic-task-choice-custom-divider {
    align-items: center;
    color: ${(props) => props.theme.palette.text.disabled};
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 800;
    justify-content: center;
}
.mythic-task-choice-custom-divider span {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: 999px;
    padding: 0.16rem 0.4rem;
}
.mythic-task-parameter-boolean-row {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: inline-flex;
    gap: 0.45rem;
    padding: 0.25rem 0.55rem 0.25rem 0.35rem;
}
.mythic-task-parameter-boolean-chip.MuiChip-root {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border: 1px solid ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.warning.main};
    font-size: 0.68rem;
    font-weight: 750;
    height: 22px;
}
.mythic-task-parameter-boolean-chip-enabled.MuiChip-root {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-task-parameter-field-row {
    align-items: center;
    display: grid;
    gap: 0.65rem;
    grid-template-columns: minmax(8.5rem, 0.28fr) minmax(0, 0.72fr);
    min-width: 0;
}
.mythic-task-parameter-field-label {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 750;
    line-height: 1.3;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-task-parameter-field-control {
    min-width: 0;
}
.mythic-task-parameter-field-actions {
    align-items: center;
    display: flex;
    gap: 0.4rem;
    justify-content: flex-end;
}
.mythic-task-parameter-switch-row {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    gap: 0.6rem;
    justify-content: space-between;
    padding: 0.45rem 0.65rem;
}
.mythic-task-array-editor,
.mythic-task-agent-connect-editor {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-width: 0;
}
.mythic-task-array-list,
.mythic-task-agent-connect-panel,
.mythic-task-agent-connect-parameter-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-task-array-entry,
.mythic-task-typed-array-entry {
    align-items: center;
    display: grid;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-task-array-entry {
    grid-template-columns: auto minmax(0, 1fr);
}
.mythic-task-typed-array-entry {
    grid-template-columns: auto minmax(8rem, 0.3fr) minmax(0, 0.7fr);
}
.mythic-task-array-delete.MuiIconButton-root {
    align-self: center;
}
.mythic-task-array-entry-control,
.mythic-task-typed-array-value,
.mythic-task-typed-array-choice {
    min-width: 0;
}
.mythic-task-parameter-add-button.MuiButton-root {
    align-self: flex-start;
}
.mythic-task-agent-connect-panel,
.mythic-task-agent-connect-parameters {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    padding: 0.65rem;
}
.mythic-task-agent-connect-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
}
.mythic-task-agent-connect-parameters-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.3;
    margin-bottom: 0.55rem;
}
.mythic-task-agent-connect-parameter {
    align-items: start;
    display: grid;
    gap: 0.65rem;
    grid-template-columns: minmax(8rem, 0.32fr) minmax(0, 0.68fr);
    min-width: 0;
}
.mythic-task-agent-connect-parameter-name {
    color: ${(props) => props.theme.palette.text.secondary};
    font-family: ${(props) => props.theme.typography.fontFamilyMono || "monospace"};
    font-size: 0.72rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.mythic-task-agent-connect-parameter-value {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    font-family: ${(props) => props.theme.typography.fontFamilyMono || "monospace"};
    font-size: 0.72rem;
    line-height: 1.4;
    margin: 0;
    max-height: 14rem;
    min-width: 0;
    overflow: auto;
    padding: 0.5rem;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-task-credential-editor {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-task-credential-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
}
.mythic-task-credential-menu-item {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    min-width: 0;
}
.mythic-task-credential-menu-comment {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    line-height: 1.3;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-task-file-dropzone {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)"};
    border: 1px dashed ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    cursor: pointer;
    padding: 1rem;
    text-align: center;
    transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}
.mythic-task-file-dropzone:hover,
.mythic-task-file-dropzone-dragging {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.06)};
    border-color: ${(props) => props.theme.palette.primary.main};
    box-shadow: inset 0 0 0 1px ${(props) => alpha(props.theme.palette.primary.main, 0.28)};
}
.mythic-task-file-dropzone-content {
    align-items: center;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-task-file-dropzone-icon {
    color: ${(props) => props.theme.palette.primary.main};
}
.mythic-task-parameters-actions.MuiDialogActions-root {
    padding: 0.85rem 1rem !important;
}
@media screen and (max-width: 900px) {
    .mythic-task-parameters-title-row,
    .mythic-task-parameters-group-card,
    .mythic-task-parameter-card {
        grid-template-columns: 1fr;
    }
    .mythic-task-parameters-title-row {
        align-items: flex-start;
        flex-wrap: wrap;
    }
    .mythic-task-parameters-title-meta {
        justify-content: flex-start;
        width: 100%;
    }
    .mythic-task-parameters-content.MuiDialogContent-root {
        min-width: 0;
    }
    .mythic-task-parameter-field-row,
    .mythic-task-typed-array-entry,
    .mythic-task-agent-connect-parameter {
        grid-template-columns: 1fr;
    }
    .mythic-task-choice-custom {
        grid-template-columns: 1fr;
    }
    .mythic-task-choice-custom-divider {
        justify-content: flex-start;
    }
    .mythic-task-array-entry {
        align-items: flex-start;
    }
}
.mythic-file-browser-iconButtonCompound.MuiIconButton-root {
    gap: 0;
    padding: 0 0.15rem;
    width: auto;
}
.mythic-file-browser-iconButtonCompound .MuiSvgIcon-root + .MuiSvgIcon-root {
    font-size: 1rem;
    margin-left: -0.15rem;
}
.mythic-file-browser-labelButton.MuiIconButton-root {
    height: 20px;
    margin: 0 0.1rem;
    width: 20px;
}
.mythic-file-browser-labelButton .MuiSvgIcon-root {
    font-size: 0.9rem;
}
.MythicResizableGrid-root {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.border || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "none" : "0 8px 18px rgba(15, 23, 42, 0.035)"};
    flex: 1 1 auto;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
    width: 100%;
}
.MythicResizableGrid-grid {
    background-color: ${(props) => props.theme.palette.background.paper};
    outline: none;
}
.MythicResizableGrid-headerCellRow {
    background-color: ${(props) => props.theme.tableHeader};
    box-shadow: inset 0 -1px 0 ${(props) => props.theme.table?.border || props.theme.borderColor};
    display: flex;
    flex-direction: row;
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
}
.MythicResizableGrid-headerCell {
    align-items: center;
    background-color: ${(props) => props.theme.tableHeader} !important;
    border-bottom: 1px solid ${(props) => props.theme.table?.border || props.theme.borderColor};
    border-right: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    box-sizing: border-box;
    color: ${(props) => props.theme.palette.text.primary};
    cursor: pointer;
    display: flex;
    font-size: 0.76rem;
    font-weight: 700;
    justify-content: space-between;
    letter-spacing: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0 0.45rem 0 0.65rem;
    position: relative;
    transition: background-color 120ms ease, color 120ms ease;
    user-select: none;
    &:first-child-of-type {
        border-left: 0;
    }
    &:hover {
        background-color: ${(props) => props.theme.table?.headerHover || props.theme.tableHover};
    }
}
.MythicResizableGrid-headerCellNoSort {
    cursor: default;
}
.MythicResizableGrid-headerContent {
    align-items: center;
    display: flex;
    gap: 0.4rem;
    justify-content: space-between;
    min-width: 0;
    width: 100%;
}
.MythicResizableGrid-headerCell .MythicResizableGrid-cellInner {
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.2;
}
.MythicResizableGrid-headerLabel {
    color: ${(props) => props.theme.palette.text.primary};
    display: block;
    letter-spacing: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
}
.MythicResizableGrid-headerActions {
    align-items: center;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 0.25rem;
    min-width: 0;
}
.MythicResizableGrid-headerIndicator {
    align-items: center;
    appearance: none;
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.28 : 0.22)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "0 0 0 1px rgba(255,255,255,0.04)" : "0 1px 2px rgba(15, 23, 42, 0.08)"};
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.95rem;
    font-family: inherit;
    height: 18px;
    justify-content: center;
    line-height: 1;
    margin: 0;
    padding: 0;
    width: 18px;
}
.MythicResizableGrid-headerFilterIcon {
    background-color: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    border-color: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.72 : 0.5)};
    color: ${(props) => props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main};
    cursor: pointer;
}
.MythicResizableGrid-headerFilterIcon:hover {
    background-color: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.34 : 0.22)};
    border-color: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.86 : 0.68)};
}
.MythicResizableGrid-headerSortIcon {
    background-color: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.primary.light : props.theme.palette.primary.dark || props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    border-color: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.primary.light : props.theme.palette.primary.dark || props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.72 : 0.5)};
    color: ${(props) => props.theme.palette.mode === "dark" ? props.theme.palette.primary.light : props.theme.palette.primary.dark || props.theme.palette.primary.main};
}
.MythicResizableGrid-headerResizeHandle {
    bottom: 0;
    cursor: col-resize;
    position: absolute;
    right: 0;
    top: 0;
    touch-action: none;
    user-select: none;
    width: 9px;
    z-index: 2;
}
.MythicResizableGrid-headerResizeHandle::before {
    content: "";
    position: absolute;
    bottom: 18%;
    right: 4px;
    top: 18%;
    width: 2px;
    border-radius: 999px;
    background-color: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.5 : 0.38)};
    opacity: 0.72;
    pointer-events: none;
    transition: opacity 120ms ease, background-color 120ms ease;
}
.MythicResizableGrid-headerResizeHandle::after {
    content: "";
    inset: 0 -2px;
    position: absolute;
}
.MythicResizableGrid-headerCell:hover .MythicResizableGrid-headerResizeHandle::before {
    opacity: 1;
}
.MythicResizableGrid-headerResizeHandle:hover,
.MythicResizableGrid-headerResizeHandleActive {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
}
.MythicResizableGrid-headerResizeHandle:hover::before,
.MythicResizableGrid-headerResizeHandleActive::before {
    background-color: ${(props) => props.theme.palette.info.main};
    opacity: 1;
}
.MythicResizableGrid-resizeGuide {
    background-color: ${(props) => props.theme.palette.info.main};
    box-shadow: 0 0 0 1px ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.32 : 0.22)},
        0 0 10px ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.45 : 0.28)};
    pointer-events: none;
    position: absolute;
    top: 0;
    transform: translateX(-1px);
    width: 2px;
    z-index: 12;
}
.MythicResizableGrid-cell {
    align-items: center;
    background-image: none;
    background-color: ${(props) => props.theme.palette.background.paper};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-right: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    box-sizing: border-box;
    color: ${(props) => props.theme.palette.text.primary};
    cursor: default !important;
    display: flex;
    font-family: ${(props) => props.theme.typography.fontFamily};
    font-size: 0.86rem;
    font-variant-numeric: tabular-nums;
    min-width: 0;
    padding: 0 0.65rem;
    position: relative;
    transition: background-color 120ms ease, background-image 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease;
}
.MythicResizableGrid-cell.MythicResizableGridRowHighlight {
    background-color: ${(props) => props.theme.table?.rowStripe || props.theme.tableHover + "66"};
}
.MythicResizableGrid-cell.MythicResizableGrid-hoveredRow {
    background-image: linear-gradient(0deg,
        ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.11 : 0.07)},
        ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.11 : 0.07)}) !important;
    border-bottom-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.3 : 0.2)};
}
.MythicResizableGrid-cell.MythicResizableGrid-contextRow {
    background-image: linear-gradient(0deg,
        ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)},
        ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)}) !important;
    border-bottom-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    box-shadow: inset 0 1px 0 ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
}
.MythicResizableGrid-cell.selectedCallback {
    background-image: linear-gradient(0deg,
        ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)},
        ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)}) !important;
    border-bottom-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)};
    box-shadow: inset 0 1px 0 ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)},
        inset 0 -1px 0 ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)};
}
.MythicResizableGrid-cell.selectedCallbackHierarchy {
    background-image: linear-gradient(0deg,
        ${(props) => alpha(props.theme.palette.secondary.main, props.theme.palette.mode === "dark" ? 0.22 : 0.13)},
        ${(props) => alpha(props.theme.palette.secondary.main, props.theme.palette.mode === "dark" ? 0.22 : 0.13)}) !important;
    border-bottom-color: ${(props) => alpha(props.theme.palette.secondary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)};
    box-shadow: inset 0 1px 0 ${(props) => alpha(props.theme.palette.secondary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)},
        inset 0 -1px 0 ${(props) => alpha(props.theme.palette.secondary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)};
}
.MythicResizableGrid-cell.MythicResizableGrid-rowInteractive {
    cursor: pointer !important;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell::before {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.72 : 0.58)};
    border-radius: 999px;
    bottom: 5px;
    content: "";
    left: 3px;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    top: 5px;
    transition: background-color 120ms ease, opacity 120ms ease, width 120ms ease;
    width: 3px;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.MythicResizableGrid-hoveredRow::before {
    opacity: 0.72;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.MythicResizableGrid-contextRow::before {
    background-color: ${(props) => props.theme.palette.info.main};
    opacity: 1;
    width: 4px;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.selectedCallback::before {
    background-color: ${(props) => props.theme.palette.primary.main};
    opacity: 1;
    width: 4px;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.selectedCallbackHierarchy::before {
    background-color: ${(props) => props.theme.palette.secondary.main};
    opacity: 1;
    width: 4px;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowLastCell {
    border-right-color: ${(props) => props.theme.table?.border || props.theme.borderColor};
}
.MythicResizableGrid-cellInner {
    align-items: center;
    display: flex;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
}
.mythic-grid-filter-dialog {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-grid-filter-dialog-title {
    background-color: ${(props) => props.theme.pageHeader?.main || props.theme.surfaces?.muted || props.theme.palette.background.default};
    background-image: ${getSectionHeaderGradient};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    font-size: 0.98rem !important;
    font-weight: 850 !important;
    line-height: 1.2 !important;
    padding: 0.85rem 1rem !important;
}
.mythic-grid-filter-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    min-width: min(38rem, calc(100vw - 3rem));
    padding: 1rem !important;
}
.mythic-grid-filter-dialog-copy {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.35;
}
.mythic-grid-filter-dialog-mode-row {
    align-items: center;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
}
.mythic-grid-filter-dialog-label {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.8rem;
    font-weight: 800;
}
.mythic-grid-filter-dialog-fields {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}
.mythic-grid-filter-dialog-actions {
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.7rem 1rem !important;
}
@media (max-width: 720px) {
    .mythic-grid-filter-dialog-content {
        min-width: 0;
    }
    .mythic-grid-filter-dialog-fields {
        grid-template-columns: 1fr;
    }
}
.mythic-callback-interactCell {
    align-items: center;
    display: inline-flex;
    gap: 0.18rem;
    height: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-callback-interactCell > span[data-tooltip-id="my-tooltip"] {
    align-items: center;
    display: inline-flex !important;
    flex: 0 0 auto;
    height: 22px;
    line-height: 1;
}
.mythic-callback-cellInline {
    align-items: center;
    display: inline-flex;
    gap: 0.28rem;
    height: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-callback-cellInlineCenter {
    justify-content: center;
}
.mythic-callback-cellInline > span[data-tooltip-id="my-tooltip"] {
    align-items: center;
    display: inline-flex !important;
    flex: 0 0 auto;
    height: 22px;
    line-height: 1;
}
.mythic-callback-cellText {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-callback-action-menu-header.MuiMenuItem-root,
.mythic-callback-action-menu-header.MuiMenuItem-root.Mui-disabled {
    cursor: default;
    opacity: 1;
    padding: 0.55rem 0.8rem 0.45rem;
}
.mythic-callback-action-menu-label {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
    min-width: 0;
}
.mythic-callback-action-menu-label-primary {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.2;
}
.mythic-callback-action-menu-label-secondary {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-callback-action-menu-section.MuiMenuItem-root,
.mythic-callback-action-menu-section.MuiMenuItem-root.Mui-disabled {
    border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    cursor: default;
    margin-top: 0.25rem;
    min-height: 26px;
    opacity: 1;
    padding: 0.45rem 0.8rem 0.18rem;
}
.mythic-callback-action-menu-section:first-of-type {
    border-top: 0;
}
.mythic-callback-action-menu-section-label {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0.02em;
    line-height: 1.2;
}
.mythic-callback-action-menu-item.MuiMenuItem-root {
    align-items: center;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.78rem;
    font-weight: 650;
    gap: 0;
    margin: 0.08rem 0.35rem;
    min-height: 34px;
    padding: 0.35rem 0.5rem;
}
.mythic-callback-action-menu-item.MuiMenuItem-root:hover,
.mythic-callback-action-menu-item.MuiMenuItem-root[data-open="true"] {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.16 : 0.08)};
}
.mythic-callback-action-menu-nested-label {
    align-items: center;
    display: inline-flex;
    gap: 0;
    min-width: 0;
}
.mythic-callback-action-menu-icon {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.82rem;
    height: 22px;
    justify-content: center;
    line-height: 1;
    margin-right: 0.7rem;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 22px;
}
.mythic-callback-action-menu-icon svg {
    display: block;
    font-size: 0.92rem;
}
.mythic-callback-action-menu-icon-primary {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.34 : 0.22)};
    color: ${(props) => props.theme.palette.primary.main};
}
.mythic-callback-action-menu-icon-warning {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.34 : 0.22)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-callback-action-menu-icon-error {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.34 : 0.22)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-callback-action-menu-item.MuiMenuItem-root:hover .mythic-callback-action-menu-icon-neutral,
.mythic-callback-action-menu-item.MuiMenuItem-root[data-open="true"] .mythic-callback-action-menu-icon-neutral {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.16 : 0.09)};
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.44 : 0.3)};
    color: ${(props) => props.theme.palette.primary.main};
}
.mythic-callback-iconButton.MuiIconButton-root {
    border: 1px solid transparent;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 auto;
    height: 22px;
    padding: 0;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 22px;
}
.mythic-callback-iconButton.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.16 : 0.09)};
    color: ${(props) => props.theme.palette.primary.main};
}
.mythic-callback-cellIconButton.MuiIconButton-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
}
.mythic-callback-cellIconButton.MuiIconButton-root svg {
    display: block;
    font-size: 0.92rem;
}
.mythic-callback-cellIconButtonNeutral.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.16 : 0.09)};
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    color: ${(props) => props.theme.palette.primary.main};
}
.mythic-callback-cellIconButtonSuccess.MuiIconButton-root {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.32 : 0.2)};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-callback-cellIconButtonSuccess.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-callback-cellIconButtonInfo.MuiIconButton-root {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.32 : 0.2)};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-callback-cellIconButtonInfo.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-callback-cellIconButtonWarning.MuiIconButton-root {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.32 : 0.2)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-callback-cellIconButtonWarning.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-callback-cellIconButtonHoverInfo.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-callback-cellIconButtonHoverWarning.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-callback-cellIconButtonError.MuiIconButton-root {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.32 : 0.2)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-callback-cellIconButtonError.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-callback-interactButtonHighIntegrity.MuiIconButton-root {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-callback-interactButtonHighIntegrity.MuiIconButton-root:hover,
.mythic-callback-menuButtonHighIntegrity.MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-callback-menuButton.MuiIconButton-root {
    margin-left: -0.12rem;
}
.mythic-callback-menuButtonHighIntegrity.MuiIconButton-root {
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-callback-displayId {
    align-items: center;
    color: inherit;
    display: inline-flex;
    flex: 0 0 auto;
    font-weight: 700;
    height: 22px;
    line-height: 22px;
    max-width: 3.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-callback-statusBadge {
    align-items: center;
    appearance: none;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-sizing: border-box;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.82rem;
    font-family: inherit;
    height: 20px;
    justify-content: center;
    line-height: 1;
    margin-left: 0.08rem;
    padding: 0;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 22px;
}
.mythic-callback-statusBadgeButton {
    cursor: pointer;
}
.mythic-callback-statusBadgeButton:focus-visible {
    outline: 2px solid ${(props) => alpha(props.theme.palette.primary.main, 0.55)};
    outline-offset: 2px;
}
.mythic-callback-statusBadgeAlert:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.22 : 0.13)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-callback-statusBadgeProxy:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-callback-statusBadgeLock:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.22 : 0.13)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-callback-statusBadgeDead:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.22 : 0.13)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-callback-statusBadge svg {
    display: block;
    font-size: inherit;
}
.mythic-callback-tagsCell {
    align-items: center;
    display: flex;
    gap: 0.35rem;
    height: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-callback-tagsCell .MuiIconButton-root {
    align-items: center !important;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary} !important;
    display: inline-flex !important;
    flex: 0 0 auto;
    float: none !important;
    height: 22px;
    justify-content: center !important;
    padding: 0 !important;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 22px;
}
.mythic-callback-tagsCell .MuiIconButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.16 : 0.09)} !important;
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.44 : 0.3)};
    color: ${(props) => props.theme.palette.primary.main} !important;
}
.mythic-callback-tagsCell .MuiIconButton-root svg {
    font-size: 0.92rem;
}
.mythic-callback-tagsList {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    gap: 0.2rem;
    min-width: 0;
    overflow: hidden;
}
.mythic-callback-tagsCell .MuiChip-root {
    border: 1px solid ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.2 : 0.08)};
    flex: 0 0 auto;
    float: none !important;
    height: 18px !important;
    max-width: 5.5rem;
}
.mythic-callback-tagsCell .MuiChip-label {
    font-size: 0.68rem;
    font-weight: 800;
    padding-left: 0.35rem;
    padding-right: 0.35rem;
    text-overflow: ellipsis;
}
.mythic-callback-tagsEmpty {
    color: ${(props) => props.theme.palette.text.disabled};
    font-size: 0.72rem;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-c2-path-title.MuiDialogTitle-root {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.85rem 1rem;
}
.mythic-c2-path-title-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-c2-path-title-copy {
    min-width: min(100%, 18rem);
}
.mythic-c2-path-title-text.MuiTypography-root {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-c2-path-title-subtitle.MuiTypography-root {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.18rem;
}
.mythic-c2-path-summary {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}
.mythic-c2-path-summary-chip {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.7rem;
    font-weight: 800;
    line-height: 1;
    padding: 0.32rem 0.45rem;
    white-space: nowrap;
}
.mythic-c2-path-content.MuiDialogContent-root {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: min(72vh, 820px);
    min-height: 28rem;
    padding: 0.85rem;
}
.mythic-c2-path-toolbar {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.7rem;
}
.mythic-c2-path-toolbar-copy {
    min-width: min(100%, 14rem);
}
.mythic-c2-path-toolbar-title.MuiTypography-root {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.2;
}
.mythic-c2-path-toolbar-description.MuiTypography-root {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-c2-path-controls {
    align-items: center;
    display: flex;
    flex: 1 1 24rem;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: flex-end;
    min-width: min(100%, 18rem);
}
.mythic-c2-path-control.MuiFormControl-root {
    min-width: 11rem;
}
.mythic-c2-path-control-wide.MuiFormControl-root {
    min-width: min(100%, 20rem);
}
.mythic-c2-path-canvas {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-c2-path-canvas .react-flow__controls {
    box-shadow: none;
}
.mythic-c2-path-canvas .react-flow__controls-button {
    background-color: ${(props) => props.theme.palette.background.paper};
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-c2-path-canvas .react-flow__controls-button:hover {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.16 : 0.08)};
    color: ${(props) => props.theme.palette.primary.main};
}
.mythic-callback-trigger-summary {
    align-items: flex-start;
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    gap: 0.75rem;
    min-width: 0;
    padding: 0.75rem;
}
.mythic-callback-trigger-summary-icon {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: inline-flex;
    flex: 0 0 auto;
    height: 34px;
    justify-content: center;
    width: 34px;
}
.mythic-callback-trigger-summary-icon-active {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.16 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.42 : 0.3)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-callback-trigger-summary-copy {
    min-width: 0;
}
.mythic-callback-trigger-summary-title.MuiTypography-root {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-callback-trigger-summary-description.MuiTypography-root {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    line-height: 1.4;
    margin-top: 0.2rem;
}
.mythic-callback-trigger-rule-list {
    display: grid;
    gap: 0.45rem;
}
.mythic-callback-trigger-rule {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    line-height: 1.4;
    padding: 0.55rem 0.65rem;
}
.mythic-callback-trigger-rule strong {
    color: ${(props) => props.theme.palette.text.primary};
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
.mythic-interactive-terminal-frame {
    border: 1px solid ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.26 : 0.18)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-interactive-terminal-toolbar {
    align-items: stretch;
    background-color: ${(props) => alpha(props.theme.outputBackgroundColor || props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.86 : 0.72)};
    border-bottom: 1px solid ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.2 : 0.16)};
    color: ${(props) => props.theme.outputTextColor};
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 0.3rem;
    min-height: 2.35rem;
    min-width: 0;
    padding: 0.3rem 0.45rem;
}
.mythic-interactive-terminal-toolbar-row {
    align-items: center;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
    width: 100%;
}
.mythic-interactive-terminal-config-chip {
    align-items: center;
    background-color: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.1 : 0.07)};
    border: 1px solid ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.24 : 0.2)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 800;
    gap: 0.3rem;
    line-height: 1;
    min-height: 1.65rem;
    padding: 0.28rem 0.48rem;
}
.mythic-interactive-terminal-config-chip:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.48 : 0.34)};
}
.mythic-interactive-terminal-toolbar-spacer {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-interactive-terminal-toggle-group {
    align-items: center;
    background-color: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.08 : 0.05)};
    border: 1px solid ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.2 : 0.16)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: inline-flex;
    flex: 0 0 auto;
    overflow: hidden;
}
.mythic-interactive-terminal-toggle-button {
    align-items: center;
    background-color: transparent;
    border: 0;
    border-right: 1px solid ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.18 : 0.14)};
    color: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, 0.72)};
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    height: 1.8rem;
    justify-content: center;
    padding: 0;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 1.8rem;
}
.mythic-interactive-terminal-toggle-button:last-child {
    border-right: 0;
}
.mythic-interactive-terminal-toggle-button:hover {
    background-color: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.12 : 0.08)};
    color: ${(props) => props.theme.outputTextColor || props.theme.palette.text.primary};
}
.mythic-interactive-terminal-toggle-button.is-off {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.13)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-interactive-terminal-toggle-button.is-off:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.28 : 0.2)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-interactive-terminal-shell {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    position: relative;
    width: 100%;
}
.mythic-interactive-terminal-empty-hint {
    color: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, 0.58)};
    font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.8rem;
    left: 0.75rem;
    pointer-events: none;
    position: absolute;
    top: 0.65rem;
}
.mythic-interactive-terminal-pending-chip {
    border: 1px solid ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.24 : 0.2)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.outputTextColor};
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    padding: 0.22rem 0.36rem;
}
.mythic-interactive-terminal-pending {
    align-items: center;
    color: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, 0.7)};
    display: flex;
    flex: 0 1 auto;
    gap: 0.3rem;
    margin-left: 0.15rem;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
}
.mythic-interactive-terminal-pending > span:first-child {
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
}
.mythic-interactive-terminal-pending-chip {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.38 : 0.28)};
    max-width: 9rem;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-interactive-terminal-raw-warning {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.16 : 0.1)};
    border: 1px solid ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.34 : 0.24)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, 0.82)};
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.35;
    padding: 0.35rem 0.5rem;
}
@media (max-width: 760px) {
    .mythic-interactive-terminal-toolbar-row {
        flex-wrap: wrap;
    }
    .mythic-interactive-terminal-config-chip {
        flex: 1 1 auto;
        justify-content: center;
    }
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
.MuiTableContainer-root.mythic-fixed-row-table-wrap {
    display: block !important;
}
.MuiTableContainer-root.mythic-fixed-row-table-wrap > .MuiTable-root {
    height: auto !important;
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
.mythic-table-toolbar-search {
    align-items: stretch;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.028)" : "rgba(0,0,0,0.012)"};
    gap: 0.55rem;
    padding: 0.55rem;
}
.mythic-table-toolbar-group {
    align-content: center;
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: 0.4rem;
    max-width: 100%;
    min-width: min(100%, 9rem);
}
.mythic-table-toolbar-search .mythic-table-toolbar-group {
    gap: 0.35rem;
}
.mythic-table-toolbar-group-label {
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 100%;
    font-size: 0.66rem;
    font-weight: 800;
    line-height: 1;
    padding-left: 0.1rem;
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
.mythic-table-toolbar-search .mythic-toolbar-select,
.mythic-table-toolbar-search .MythicTextField-root .MuiInputBase-root {
    background-color: ${(props) => props.theme.palette.background.paper};
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
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    color: ${(props) => props.theme.palette.text.secondary} !important;
    gap: 0.35rem;
    min-height: 32px;
    text-transform: none;
    white-space: nowrap;
}
.mythic-toolbar-toggle.Mui-selected {
    background-color: ${(props) => props.theme.palette.primary.main + "18"} !important;
    border-color: ${(props) => props.theme.palette.primary.main + "55"} !important;
    color: ${(props) => props.theme.palette.primary.main} !important;
}
.mythic-toolbar-toggle:hover,
.mythic-toolbar-toggle.Mui-selected:hover {
    background-color: ${(props) => props.theme.palette.primary.main + "22"} !important;
    border-color: ${(props) => props.theme.palette.primary.main + "77"} !important;
    color: ${(props) => props.theme.palette.primary.main} !important;
}
.mythic-toolbar-icon-button {
    color: ${(props) => props.theme.palette.text.secondary} !important;
    margin-right: 2px;
}
.mythic-toolbar-icon-button:hover {
    background-color: ${(props) => props.theme.palette.primary.main + "16"} !important;
    color: ${(props) => props.theme.palette.primary.main} !important;
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
.mythic-ui-settings-title-row {
    align-items: flex-start;
}
.mythic-ui-settings-title-copy {
    display: flex;
    flex: 1 1 22rem;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}
.mythic-ui-settings-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 1.05rem;
    font-weight: 750;
    line-height: 1.25;
}
.mythic-ui-settings-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    line-height: 1.35;
}
.mythic-ui-settings-title-actions {
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
    min-width: 0;
}
.mythic-ui-settings-title-button.MuiButton-root {
    min-height: 31px;
    min-width: auto;
    padding: 0.35rem 0.65rem;
}
.mythic-ui-settings-title-button-info.MuiButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)} !important;
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-ui-settings-title-button-success.MuiButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)} !important;
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)} !important;
    color: ${(props) => props.theme.palette.success.main} !important;
}
.mythic-tasking-visibility-panel {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(15,23,42,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.8rem;
}
.mythic-tasking-visibility-summary-panel {
    display: grid;
    grid-template-columns: minmax(12rem, 0.85fr) minmax(12rem, 1.15fr);
}
.mythic-tasking-visibility-header {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-tasking-visibility-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.92rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-tasking-visibility-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    line-height: 1.35;
}
.mythic-tasking-visibility-count {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.16 : 0.1)};
    border: 1px solid ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.34 : 0.24)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.info.main};
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    padding: 0.35rem 0.5rem;
    white-space: nowrap;
}
.mythic-tasking-visibility-summary-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
    min-width: 0;
}
.mythic-tasking-visibility-manage-button.MuiButton-root {
    min-height: 30px;
    padding: 0.3rem 0.65rem;
}
.mythic-tasking-visibility-chip-row {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 0.35rem;
    grid-column: 1 / -1;
    min-width: 0;
}
.mythic-tasking-visibility-chip {
    align-items: center;
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.14 : 0.08)};
    border: 1px solid ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.38 : 0.24)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    display: inline-flex;
    font-size: 0.76rem;
    font-weight: 750;
    gap: 0.35rem;
    line-height: 1.2;
    min-height: 28px;
    min-width: 0;
    padding: 0.22rem 0.52rem 0.22rem 0.3rem;
}
.mythic-tasking-visibility-chip-index {
    align-items: center;
    background-color: ${(props) => props.theme.palette.info.main};
    border-radius: ${(props) => Math.max(4, props.theme.shape.borderRadius - 1)}px;
    color: ${(props) => props.theme.palette.info.contrastText};
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 850;
    height: 19px;
    justify-content: center;
    min-width: 19px;
    padding: 0 0.24rem;
}
.mythic-tasking-visibility-empty {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    font-style: italic;
}
.mythic-tasking-visibility-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
}
.mythic-tasking-visibility-option.MuiButton-root {
    align-items: flex-start;
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: none;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    justify-content: flex-start;
    min-height: 4.2rem;
    padding: 0.65rem 0.75rem;
    text-align: left;
    text-transform: none;
}
.mythic-tasking-visibility-option.MuiButton-root:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.13 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.46 : 0.28)};
}
.mythic-tasking-visibility-option.MuiButton-root.selected {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.62 : 0.42)};
    color: ${(props) => props.theme.palette.text.primary};
    box-shadow: inset 3px 0 0 ${(props) => props.theme.palette.info.main};
}
.mythic-tasking-visibility-option-title {
    color: inherit;
    font-size: 0.8rem;
    font-weight: 800;
    line-height: 1.2;
}
.mythic-tasking-visibility-option-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.25;
}
.mythic-tasking-metadata-row .mythic-reorder-row-main {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.12rem;
}
.mythic-reorder-row-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
@media (max-width: 760px) {
    .mythic-tasking-visibility-summary-panel {
        grid-template-columns: 1fr;
    }
    .mythic-tasking-visibility-summary-actions {
        justify-content: flex-start;
    }
}
.mythic-dialog-title-select {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 11rem;
}
.mythic-detail-section-header {
    align-items: center;
    background-color: ${(props) => props.theme.pageHeader.main};
    background-image: ${getSectionHeaderGradient};
    border: 1px solid ${(props) => alpha(getSectionHeaderAccent(props), props.theme.palette.mode === "dark" ? 0.55 : 0.38)};
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
    background-color: ${getSectionHeaderAccent};
    bottom: 0;
    box-shadow: 0 0 0 1px ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.2)};
    content: "";
    left: 0;
    position: absolute;
    top: 0;
    width: 6px;
}
.mythic-section-header {
    background-image: ${getSectionHeaderGradient} !important;
    border-color: ${(props) => alpha(getSectionHeaderAccent(props), props.theme.palette.mode === "dark" ? 0.55 : 0.38)} !important;
    box-shadow: inset 0 1px 0 ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.22)}, 0 2px 6px ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.28 : 0.12)} !important;
    overflow: hidden !important;
    padding-left: 1rem !important;
    position: relative !important;
}
.mythic-section-header::before {
    background-color: ${getSectionHeaderAccent};
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
.mythic-raw-select-dialog-content.MuiDialogContent-root {
    background-color: ${(props) => props.theme.palette.background.paper};
    padding: 0;
}
.mythic-raw-select-list {
    gap: 0.45rem;
    max-height: min(55vh, 28rem);
    overflow-y: auto;
    padding: 0.6rem;
}
.mythic-raw-select-row {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.muted || alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.045 : 0.035)};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    cursor: pointer;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-height: 42px;
    min-width: 0;
    padding: 0.45rem 0.55rem 0.45rem 0.75rem;
    transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    width: 100%;
}
.mythic-raw-select-row:hover {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.13 : 0.075)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.44 : 0.32)};
}
.mythic-raw-select-row:focus-visible {
    border-color: ${(props) => props.theme.palette.info.main};
    box-shadow: 0 0 0 2px ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.28 : 0.18)};
    outline: none;
}
.mythic-raw-select-value.MuiTypography-root {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.86rem;
    font-variant-numeric: tabular-nums;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-raw-select-action.MuiButton-root {
    flex: 0 0 auto;
    min-height: 28px;
    min-width: 5rem;
    padding: 0.25rem 0.65rem;
}
.mythic-raw-select-empty {
    align-items: center;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    justify-content: center;
    min-height: 8rem;
    padding: 1rem;
    text-align: center;
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
.mythic-form-field-control .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-form-field-control .MuiTextField-root:has(> .MuiInputLabel-root),
.mythic-form .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-form .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
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
.mythic-tag-editor-frame {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-tag-editor-frame .ace_editor {
    background-color: ${(props) => props.theme.palette.background.paper} !important;
}
.mythic-tag-data-split {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    min-width: 0;
    width: 100%;
}
.mythic-tag-data-preview-frame {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    max-height: 30rem;
    min-height: 10rem;
    min-width: 0;
    overflow: auto;
    padding: 0.55rem;
}
.mythic-tag-data-preview-frame-full {
    max-height: min(48vh, 34rem);
}
.mythic-tag-readonly-value {
    align-items: center;
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    display: flex;
    font-size: 0.84rem;
    line-height: 1.35;
    min-height: 34px;
    min-width: 0;
    overflow-wrap: anywhere;
    padding: 0.45rem 0.6rem;
    width: 100%;
}
.mythic-tag-data-preview-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
}
.mythic-tag-data-preview-row {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(7rem, 0.35fr) minmax(0, 1fr);
    min-width: 0;
    padding: 0.45rem 0.55rem;
}
.mythic-tag-data-preview-key {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.76rem;
    font-weight: 800;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-tag-data-preview-value {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.82rem;
    line-height: 1.35;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-tag-data-preview-value pre {
    margin: 0;
    white-space: pre-wrap;
}
.mythic-tag-data-preview-empty {
    align-items: center;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    font-size: 0.82rem;
    justify-content: center;
    min-height: 9rem;
    text-align: center;
}
@media (max-width: 900px) {
    .mythic-tag-data-split {
        grid-template-columns: 1fr;
    }
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
.mythic-api-token-scope-count {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.06) : alpha(props.theme.palette.common.black, 0.035)} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
    font-size: 0.72rem;
    font-weight: 750;
}
.mythic-api-token-scope-search {
    margin-bottom: 0.65rem !important;
}
.mythic-api-token-scope-search .MuiInputBase-root {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
}
.mythic-api-token-scope-library {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.014)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    max-height: 48vh;
    min-height: 14rem;
    overflow: auto;
    padding: 0.65rem;
}
.mythic-api-token-scope-state {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    justify-content: center;
    min-height: 7rem;
    padding: 1rem;
    text-align: center;
}
.mythic-api-token-scope-state-error {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.14 : 0.08)};
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.5 : 0.32)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-api-token-resource-card {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-width: 0;
    padding: 0.75rem;
}
.mythic-api-token-resource-header {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-api-token-resource-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.2;
    text-transform: capitalize;
}
.mythic-api-token-resource-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.15rem;
}
.mythic-api-token-resource-wildcard {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.03)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.76rem;
    font-weight: 750;
    gap: 0.25rem;
    min-height: 32px;
    padding: 0.1rem 0.55rem 0.1rem 0.2rem;
}
.mythic-api-token-resource-wildcard-selected {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.2 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.38)};
    color: ${(props) => props.theme.palette.primary.main};
}
.mythic-api-token-resource-wildcard-disabled {
    cursor: default;
    opacity: 0.68;
}
.mythic-api-token-resource-wildcard .MuiCheckbox-root {
    padding: 0.1rem;
}
.mythic-api-token-scope-grid {
    display: grid;
    gap: 0.55rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    min-width: 0;
}
.mythic-api-token-scope-card {
    align-items: flex-start;
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    cursor: pointer;
    display: flex;
    gap: 0.35rem;
    min-width: 0;
    padding: 0.55rem 0.65rem 0.6rem 0.35rem;
    transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}
.mythic-api-token-scope-card:hover {
    background-color: ${(props) => props.theme.surfaces?.hover || props.theme.palette.action.hover};
    border-color: ${(props) => props.theme.table?.border || props.theme.borderColor};
}
.mythic-api-token-scope-card-selected {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.16 : 0.08)};
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.38)};
}
.mythic-api-token-scope-card-inherited {
    cursor: default;
}
.mythic-api-token-scope-card-disabled {
    cursor: default;
    opacity: 0.68;
}
.mythic-api-token-scope-card .MuiCheckbox-root {
    padding: 0.1rem;
}
.mythic-api-token-scope-card-full {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.4 : 0.26)};
}
.mythic-api-token-scope-card-copy {
    min-width: 0;
    width: 100%;
}
.mythic-api-token-scope-card-title-row {
    align-items: flex-start;
    display: flex;
    gap: 0.45rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-api-token-scope-card-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-api-token-scope-name {
    color: ${(props) => props.theme.palette.text.secondary};
    font-family: ${(props) => props.theme.typography.fontFamilyMono || "monospace"};
    font-size: 0.7rem;
    line-height: 1.35;
    margin-top: 0.18rem;
    overflow-wrap: anywhere;
}
.mythic-api-token-scope-card-description,
.mythic-api-token-scope-includes {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.25rem;
    overflow-wrap: anywhere;
}
.mythic-api-token-scope-includes {
    color: ${(props) => props.theme.palette.info.main};
    font-weight: 700;
}
.mythic-api-token-access-chip {
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    flex: 0 0 auto;
    font-size: 0.66rem !important;
    font-weight: 800 !important;
    height: 20px !important;
    text-transform: capitalize;
}
.mythic-api-token-access-chip-read {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)} !important;
    border: 1px solid ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.54 : 0.34)} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-api-token-access-chip-write,
.mythic-api-token-access-chip-create,
.mythic-api-token-access-chip-update {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)} !important;
    border: 1px solid ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.54 : 0.34)} !important;
    color: ${(props) => props.theme.palette.success.main} !important;
}
.mythic-api-token-access-chip-delete,
.mythic-api-token-access-chip-admin {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)} !important;
    border: 1px solid ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.54 : 0.34)} !important;
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-api-token-access-chip-unknown {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.secondary} !important;
}
.mythic-api-token-copy-warning {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.16 : 0.08)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.45 : 0.3)};
    color: ${(props) => props.theme.palette.text.primary};
}
.mythic-api-token-value-field .MuiInputBase-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(0,0,0,0.26)" : "rgba(15,23,42,0.045)"};
    font-family: ${(props) => props.theme.typography.fontFamilyMono || "monospace"};
    font-size: 0.78rem;
    line-height: 1.45;
}
.mythic-browser-script-dialog-content {
    display: flex;
    flex-direction: column;
    height: min(74vh, calc(100vh - 9rem));
    min-height: min(38rem, calc(100vh - 9rem));
    overflow: hidden;
}
.mythic-browser-script-dialog-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
}
.mythic-browser-script-dialog-body > .mythic-browser-script-target-panel {
    flex: 0 0 auto;
}
.mythic-browser-script-target-panel {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "none" : "0 8px 18px rgba(15, 23, 42, 0.04)"};
    overflow: hidden;
}
.mythic-browser-script-target-summary {
    align-items: center;
    display: flex;
    gap: 0.65rem;
    justify-content: space-between;
    min-height: 42px;
    padding: 0.42rem 0.5rem 0.42rem 0.7rem;
}
.mythic-browser-script-target-panel-open .mythic-browser-script-target-summary {
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
}
.mythic-browser-script-target-copy {
    align-items: center;
    display: flex;
    gap: 0.65rem;
    min-width: 0;
}
.mythic-browser-script-target-label {
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 auto;
    font-size: 0.74rem;
    font-weight: 800;
    line-height: 1;
}
.mythic-browser-script-target-chips {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-browser-script-target-chips .MuiChip-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.06) : alpha(props.theme.palette.common.black, 0.035)};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.72rem;
    font-weight: 750;
    max-width: 18rem;
}
.mythic-browser-script-target-chips .MuiChip-label {
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-browser-script-target-toggle {
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    color: ${(props) => props.theme.palette.text.secondary} !important;
}
.mythic-browser-script-target-toggle:hover {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.22 : 0.1)} !important;
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.45 : 0.32)} !important;
    color: ${(props) => props.theme.palette.primary.main} !important;
}
.mythic-browser-script-target-details {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.65rem;
}
.mythic-browser-script-workbench {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    width: 100%;
}
.mythic-browser-script-top-split {
    display: flex;
    min-height: 0;
    min-width: 0;
    width: 100%;
}
.mythic-browser-script-workbench > .gutter.gutter-vertical,
.mythic-browser-script-top-split > .gutter.gutter-horizontal {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.1) : alpha(props.theme.palette.common.black, 0.08)};
    border-radius: 999px;
    flex: 0 0 auto;
}
.mythic-browser-script-workbench > .gutter.gutter-vertical:hover,
.mythic-browser-script-top-split > .gutter.gutter-horizontal:hover {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.5 : 0.32)};
}
.mythic-browser-script-pane {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-browser-script-editor-pane {
    height: 100%;
}
.mythic-browser-script-console-pane {
    height: 100%;
}
.mythic-browser-script-preview-pane {
    height: 100%;
}
.mythic-browser-script-pane-header {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.primary};
    display: flex;
    flex: 0 0 auto;
    font-size: 0.78rem;
    font-weight: 800;
    justify-content: space-between;
    letter-spacing: 0;
    min-height: 34px;
    padding: 0.4rem 0.65rem;
}
.mythic-browser-script-pane-header span:last-child {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.68rem;
    font-weight: 750;
}
.mythic-browser-script-editor-frame {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}
.mythic-browser-script-editor-frame .ace_editor {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.black, 0.18) : alpha(props.theme.palette.common.white, 0.62)};
    font-family: ${(props) => props.theme.typography.fontFamilyMono || "monospace"} !important;
}
.mythic-browser-script-preview-controls {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.012)"};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    flex: 0 0 auto;
    padding: 0.65rem;
}
.mythic-browser-script-preview-frame {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    padding: 0.55rem;
}
.mythic-browser-script-response {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    max-width: 100%;
    min-width: 0;
    overflow-x: hidden;
    width: 100%;
}
.mythic-browser-script-response > * {
    max-width: 100%;
    min-width: 0;
}
.mythic-browser-script-response-expanded {
    flex: 1 1 auto;
    min-height: 0;
}
.mythic-browser-script-response-expanded > *:only-child {
    min-height: 0;
}
.mythic-response-media {
    display: flex;
    flex-direction: column;
    min-width: 0;
    width: 100%;
}
.mythic-response-media-metadata {
    flex: 0 0 auto !important;
    max-height: none !important;
    min-height: fit-content !important;
    overflow-x: auto !important;
    overflow-y: visible !important;
}
.mythic-response-media-tabs {
    flex: 0 0 auto;
}
.mythic-response-media-panel {
    min-width: 0;
}
.mythic-response-media-panel[hidden] {
    display: none !important;
}
.mythic-response-inline-output {
    align-items: center;
    color: ${(props) => props.theme.palette.text.primary};
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    min-height: 34px;
    min-width: 0;
    width: 100%;
}
.mythic-response-inline-text {
    color: ${(props) => props.theme.palette.text.primary};
    display: inline-block;
    flex: 0 1 auto;
    margin: 0;
    max-width: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-response-inline-action {
    flex: 0 0 auto;
}
.mythic-response-tabs {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    max-width: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-response-tabs-bar {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    flex: 0 0 auto;
    min-width: 0;
    overflow: hidden;
    padding: 0.35rem;
}
.mythic-response-tabs-list {
    max-height: 34px;
    min-height: 34px;
}
.mythic-response-tabs-list .MuiTabs-flexContainer {
    flex-wrap: nowrap;
    gap: 0.35rem;
}
.mythic-response-tabs-list .MuiTabs-scroller {
    overflow-x: auto !important;
    overflow-y: hidden !important;
}
.mythic-response-tabs-list .MuiTabs-scrollButtons {
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 30px;
    min-height: 30px;
    width: 30px;
}
.mythic-response-tab {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.045) : alpha(props.theme.palette.common.black, 0.028)} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    color: ${(props) => props.theme.palette.text.secondary} !important;
    flex: 0 0 auto;
    font-size: 0.76rem;
    font-weight: 750;
    line-height: 1.2;
    max-width: min(16rem, 55vw);
    min-height: 30px;
    min-width: 0;
    overflow: hidden;
    padding: 0.35rem 0.7rem;
    text-transform: none;
}
.mythic-response-tab:hover {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.18 : 0.08)} !important;
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)} !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
}
.mythic-response-tab.Mui-selected {
    background-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.24 : 0.12)} !important;
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.62 : 0.42)} !important;
    color: ${(props) => props.theme.palette.primary.main} !important;
}
.mythic-response-tab-label {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-response-tabs-panel {
    flex: 1 1 auto;
    flex-direction: column;
    max-width: 100%;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    padding: 0.5rem;
    width: 100%;
}
.mythic-response-table {
    display: flex;
    flex-direction: column;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-response-table-grid {
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-response-table-cell {
    align-items: center;
    display: inline-flex;
    gap: 0.3rem;
    max-width: 100%;
    min-width: 0;
    vertical-align: middle;
    white-space: nowrap;
}
.mythic-response-table-action-cell {
    gap: 0.45rem;
}
.mythic-response-table-cell pre {
    line-height: 1.2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-response-table-cell .MuiIconButton-root {
    flex: 0 0 auto;
}
.mythic-browser-scripts-table {
    max-width: 100%;
    min-width: 60rem;
    table-layout: fixed;
    width: 100%;
}
.mythic-browser-script-spacer-cell {
    min-width: 0;
    padding-left: 0 !important;
    padding-right: 0 !important;
    width: auto;
}
.mythic-browser-script-script-cell {
    align-items: center;
    display: flex;
    gap: 0.6rem;
    min-width: 0;
}
.mythic-browser-script-payload-icon {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.055) : alpha(props.theme.palette.common.black, 0.028)};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: inline-flex;
    flex: 0 0 auto;
    height: 40px;
    justify-content: center;
    width: 40px;
}
.mythic-browser-script-script-copy {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    min-width: 0;
}
.mythic-browser-script-command-name {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.86rem;
    font-weight: 750;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-browser-script-payload-name {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    font-weight: 650;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-browser-script-active-cell {
    align-items: center;
    display: flex;
    gap: 0.4rem;
    min-width: 0;
}
.mythic-browser-script-actions {
    justify-content: center;
}
@media screen and (max-width: 1050px) {
    .mythic-browser-script-dialog-content {
        height: calc(100vh - 8rem);
    }
    .mythic-browser-script-dialog-body {
        overflow: auto;
    }
    .mythic-browser-script-workbench {
        flex: 0 0 auto;
        min-height: 42rem;
    }
    .mythic-browser-script-top-split {
        min-width: 44rem;
    }
}
.mythic-single-task-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
    min-width: 0;
    overflow: visible;
    width: 100%;
}
.mythic-single-task-card-row {
    align-items: flex-start;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    width: 100%;
}
.mythic-single-task-card-row-removing {
    grid-template-columns: minmax(0, 1fr) auto;
}
.mythic-single-task-display {
    min-width: 0;
    width: 100%;
}
.mythic-single-task-remove-control {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.error.main, 0.14) : alpha(props.theme.palette.error.main, 0.08)};
    border: 1px solid ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.45 : 0.28)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.error.main};
    cursor: pointer;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 750;
    gap: 0.1rem;
    justify-content: center;
    margin-top: 4px;
    min-height: 52px;
    min-width: 4.25rem;
    padding: 0.35rem 0.45rem;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.mythic-single-task-remove-control:hover,
.mythic-single-task-remove-control-selected {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.72 : 0.48)};
}
.mythic-single-task-remove-control .MuiCheckbox-root {
    padding: 0;
}
.mythic-single-task-callback-link {
    color: inherit !important;
    font-weight: 800;
    overflow-wrap: anywhere;
}
.mythic-single-task-metadata {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 0.3rem;
    min-width: 0;
    width: 100%;
}
.mythic-single-task-metadata-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
    width: 100%;
}
.mythic-single-task-table-wrap {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    overflow: auto;
}
.mythic-single-task-table {
    min-width: 48rem;
    table-layout: fixed;
}
.mythic-single-task-files-table {
    min-width: 68rem;
}
.mythic-single-task-mitre-table {
    min-width: 32rem;
}
.mythic-single-task-cell-break {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-single-task-table-link {
    color: inherit !important;
    font-weight: 700;
    text-decoration: underline !important;
}
.mythic-single-task-hash-list {
    display: flex;
    flex-direction: column;
    font-family: ${(props) => props.theme.typography.fontFamilyMono || "monospace"};
    font-size: 0.74rem;
    gap: 0.2rem;
    overflow-wrap: anywhere;
}
.mythic-single-task-credential-cell {
    align-items: flex-start;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-single-task-credential-text {
    max-width: 42rem;
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
}
.mythic-single-task-empty-card {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    min-width: 0;
    width: 100%;
}
.mythic-single-task-dialog-control {
    margin-top: 0.45rem !important;
}
.mythic-single-task-dialog-grid {
    align-items: flex-start;
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    margin-top: 0.65rem;
    min-width: 0;
}
@media screen and (max-width: 760px) {
    .mythic-single-task-card-row-removing {
        grid-template-columns: minmax(0, 1fr);
    }
    .mythic-single-task-remove-control {
        align-items: center;
        flex-direction: row;
        justify-content: flex-start;
        margin-top: 0;
        min-height: 38px;
        width: 100%;
    }
}
.mythic-create-flow-shell {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
}
.mythic-create-flow-content {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
    overflow: hidden;
}
.mythic-create-flow-footer {
    flex: 0 0 auto;
}
.mythic-create-selection-grid {
    display: grid;
    flex: 0 0 auto;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
    min-width: 0;
}
.mythic-create-builder-split {
    display: grid;
    flex: 1 1 auto;
    gap: 0.75rem;
    grid-template-columns: minmax(15rem, 0.34fr) minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
}
.mythic-create-builder-split-three {
    grid-template-columns: minmax(14rem, 0.3fr) minmax(14rem, 0.3fr) minmax(0, 0.4fr);
}
.mythic-create-section {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0.75rem;
}
.mythic-create-section-fill {
    flex: 1 1 auto;
}
.mythic-create-section-plain {
    background-color: transparent;
    border: 0;
    padding: 0;
}
.mythic-create-section-scroll {
    overflow: auto;
}
.mythic-create-section-header {
    align-items: flex-start;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-create-section-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.88rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-create-section-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.76rem;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-create-section-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.4rem;
}
.mythic-create-section .MuiFormControl-root,
.mythic-create-section .MuiTextField-root {
    margin: 0 !important;
}
.mythic-create-section .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-create-section .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
}
.mythic-create-select {
    width: 100%;
}
.mythic-create-agent-summary {
    align-items: flex-start;
    display: flex;
    gap: 0.75rem;
    min-width: 0;
}
.mythic-create-subsection {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-height: 0;
    min-width: 0;
    padding: 0.65rem;
}
.mythic-create-subsection-fill {
    flex: 1 1 auto;
    overflow: hidden;
}
.mythic-create-subsection-scroll {
    flex: 1 1 auto;
    overflow: auto;
}
.mythic-create-agent-icon {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex: 0 0 4.75rem;
    height: 4.75rem;
    justify-content: center;
    padding: 0.35rem;
}
.mythic-create-agent-icon svg,
.mythic-create-agent-icon img {
    max-height: 100%;
    max-width: 100%;
}
.mythic-create-meta-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-create-meta-label {
    color: ${(props) => props.theme.palette.text.secondary};
    display: block;
    font-size: 0.72rem;
    font-weight: 750;
    line-height: 1.2;
}
.mythic-create-meta-value {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.82rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.mythic-create-parameter-scroll {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
    overflow: auto;
    width: 100%;
}
.mythic-create-parameter-group {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-create-parameter-group-header {
    background-image: ${getSectionHeaderGradient};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    font-size: 0.82rem;
    font-weight: 800;
    padding: 0.45rem 0.65rem;
}
.mythic-create-summary-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-create-summary-group-header {
    background-image: ${getSectionHeaderGradient};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.25;
    padding: 0.45rem 0.65rem;
}
.mythic-create-summary-row {
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding: 0.45rem 0.1rem 0.5rem;
}
.mythic-create-summary-row:last-child {
    border-bottom: 0;
}
.mythic-create-summary-name {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-create-summary-value {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.76rem;
    line-height: 1.35;
    margin-top: 0.18rem;
    overflow-wrap: anywhere;
    padding-left: 0.65rem;
    white-space: pre-wrap;
}
.mythic-create-parameter-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-create-parameter-card {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-left: 4px solid transparent;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(13rem, 0.32fr) minmax(0, 1fr);
    min-width: 0;
    padding: 0.7rem 0.75rem;
}
.mythic-create-parameter-card-modified {
    border-left-color: ${(props) => props.theme.palette.warning.main};
}
.mythic-create-parameter-copy {
    min-width: 0;
}
.mythic-create-parameter-title-row {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-create-parameter-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
}
.mythic-create-parameter-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.75rem;
    line-height: 1.38;
    margin-top: 0.24rem;
}
.mythic-create-parameter-chips {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.35rem;
}
.mythic-create-parameter-chip {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.035)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    padding: 0.22rem 0.38rem;
}
.mythic-create-parameter-chip-required {
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.5 : 0.35)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-create-parameter-chip-modified {
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.56 : 0.4)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-create-parameter-control {
    min-width: 0;
    position: relative;
}
.mythic-create-parameter-control .MuiFormControl-root,
.mythic-create-parameter-control .MuiTextField-root,
.mythic-create-parameter-control .MythicTextField-root {
    margin: 0 !important;
    width: 100%;
}
.mythic-create-parameter-control .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-create-parameter-control .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
}
.mythic-create-inline-control {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    min-width: 0;
    position: relative;
    width: 100%;
}
.mythic-create-inline-control > .MuiFormControl-root {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-create-choice-divider {
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 auto;
    font-size: 0.7rem;
    font-weight: 800;
}
.mythic-create-array-table.MuiTableContainer-root {
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
}
.mythic-create-array-table .MuiTableCell-root {
    padding: 0.35rem 0.45rem !important;
}
.mythic-create-dictionary-row {
    align-items: center;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: 2rem minmax(8rem, 0.28fr) minmax(0, 1fr);
    margin-bottom: 0.45rem;
    min-width: 0;
}
.mythic-create-dictionary-add {
    align-items: center;
    display: flex;
    gap: 0.5rem;
}
@media (max-width: 900px) {
    .mythic-create-builder-split,
    .mythic-create-builder-split-three,
    .mythic-create-parameter-card {
        grid-template-columns: 1fr;
    }
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
    display: grid;
    flex: 0 0 auto;
    gap: 0.75rem;
    grid-auto-flow: dense;
    grid-template-columns: var(--mythic-dashboard-row-template, repeat(auto-fit, minmax(min(100%, 19rem), 1fr)));
    min-width: 0;
    padding: 0 0.75rem;
    width: 100%;
}
.mythic-dashboard-row-editing {
    align-items: start;
}
.mythic-dashboard-card {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "0 1px 2px rgba(15,23,42,0.06)"} !important;
    display: flex;
    flex: 1 1 18rem;
    flex-direction: column;
    grid-column: span 1;
    height: var(--mythic-dashboard-card-height, 18rem);
    max-height: var(--mythic-dashboard-card-height, 18rem);
    min-height: var(--mythic-dashboard-card-height, 18rem);
    min-width: 0;
    overflow: hidden;
    position: relative;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    width: 100%;
}
.mythic-dashboard-card:hover {
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.34 : 0.24)};
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? `inset 0 1px 0 ${alpha(props.theme.palette.common.white, 0.055)}, 0 8px 18px ${alpha(props.theme.palette.common.black, 0.18)}` : `0 8px 18px ${alpha(props.theme.palette.common.black, 0.08)}`} !important;
}
.mythic-dashboard-card-wide {
    grid-column: span 2;
}
.mythic-dashboard-card-table {
    grid-column: span 2;
    max-width: min(100%, 58rem);
}
.mythic-dashboard-row > .mythic-dashboard-card-table:only-child {
    max-width: min(100%, 64rem);
}
.mythic-dashboard-card-metric {
    grid-column: span 1;
}
.mythic-dashboard-card-header {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.default};
    background-image: ${getSectionHeaderGradient};
    border-bottom: 1px solid ${(props) => alpha(getSectionHeaderAccent(props), props.theme.palette.mode === "dark" ? 0.34 : 0.2)};
    display: flex;
    flex: 0 0 auto;
    gap: 0.65rem;
    justify-content: space-between;
    min-height: 42px;
    min-width: 0;
    overflow: hidden;
    padding: 0.55rem 0.65rem 0.55rem 0.85rem;
    position: relative;
}
.mythic-dashboard-card-header::before {
    background-color: ${getSectionHeaderAccent};
    bottom: 0;
    content: "";
    left: 0;
    position: absolute;
    top: 0;
    width: 4px;
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
.mythic-dashboard-icon-button-hover-info:hover {
    background-color: ${(props) => props.theme.palette.info.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.info.main + "88"} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-dashboard-icon-button.Mui-disabled {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"} !important;
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.disabled} !important;
}
.mythic-dashboard-perspective-toggle {
    flex: 0 1 auto;
    min-width: 0;
}
.mythic-dashboard-perspective-toggle .MuiToggleButton-root {
    min-width: 5.6rem !important;
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
.mythic-dashboard-table-action-hover-danger:hover {
    background-color: ${(props) => props.theme.palette.error.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.error.main + "88"} !important;
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-dashboard-table-action.Mui-disabled {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"} !important;
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.disabled} !important;
}
.mythic-dashboard-chart-body {
    gap: 0.35rem;
    padding: 0.5rem 0.55rem 0.55rem;
}
.mythic-dashboard-chart-canvas {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.028) : alpha(props.theme.palette.common.black, 0.014)};
    background-image: ${getSubtleAccentGradient};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-dashboard-chart-canvas-pie {
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
}
.mythic-dashboard-chart-canvas-line {
    align-items: stretch;
    justify-content: center;
    padding: 0.2rem 0.3rem 0;
}
.mythic-dashboard-chart-canvas-empty {
    align-items: stretch;
    justify-content: stretch;
    padding: 0.75rem;
}
.mythic-dashboard-chart-canvas .MuiChartsLegend-root {
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-dashboard-chart-canvas .MuiChartsAxis-line,
.mythic-dashboard-chart-canvas .MuiChartsAxis-tick {
    stroke: ${(props) => props.theme.table?.border || props.theme.borderColor};
}
.mythic-dashboard-chart-canvas .MuiChartsAxis-tickLabel,
.mythic-dashboard-chart-canvas .MuiChartsAxis-label {
    fill: ${(props) => props.theme.palette.text.secondary} !important;
}
.mythic-dashboard-chart-slider-row {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.03) : alpha(props.theme.palette.common.black, 0.018)};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex: 0 0 auto;
    justify-content: center;
    min-height: 2rem;
    padding: 0.15rem 0.8rem;
}
.mythic-dashboard-table-body {
    padding: 0;
}
.mythic-dashboard-empty-container {
    display: flex;
    overflow: hidden;
}
.mythic-dashboard-table-container {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.018) : alpha(props.theme.palette.common.black, 0.01)};
    flex: 1 1 auto;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    scrollbar-gutter: stable;
    width: 100%;
}
.mythic-dashboard-table {
    max-width: 100%;
    min-width: 100%;
    overflow: auto;
    width: 100%;
}
.mythic-dashboard-summary-table {
    table-layout: fixed;
}
.mythic-dashboard-card-table .MuiTableCell-root {
    vertical-align: middle;
}
.mythic-dashboard-summary-table .MuiTableCell-root {
    font-size: 0.75rem;
    height: 2.15rem;
    line-height: 1.25;
    overflow: hidden;
    padding-bottom: 0.35rem !important;
    padding-top: 0.35rem !important;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-dashboard-summary-table .MuiTableRow-hover:hover .MuiTableCell-root {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.035) : alpha(props.theme.palette.common.black, 0.025)};
}
.mythic-dashboard-table-cell-primary {
    min-width: 0;
}
.mythic-dashboard-table-cell-tight,
.mythic-dashboard-table-cell-count,
.mythic-dashboard-table-cell-actions {
    text-align: right;
    white-space: nowrap !important;
    width: 1%;
}
.mythic-dashboard-table-cell-count {
    color: ${(props) => props.theme.palette.text.primary};
    font-weight: 850;
}
.mythic-dashboard-table-cell-actions {
    min-width: 6.25rem;
}
.mythic-dashboard-table-cell-wrap {
    overflow: visible !important;
    overflow-wrap: anywhere;
    white-space: normal !important;
}
.mythic-dashboard-table-cell-account {
    align-items: flex-start;
    display: flex !important;
    flex-direction: row;
    gap: 0.45rem;
}
.mythic-dashboard-table-cell-wrap .MuiTypography-root,
.mythic-dashboard-table-comment {
    overflow-wrap: anywhere;
    white-space: normal !important;
}
.mythic-dashboard-table-identity,
.mythic-dashboard-table-file-row,
.mythic-dashboard-table-actions-inline {
    align-items: center;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-dashboard-table-actions-inline {
    justify-content: flex-end;
}
.mythic-dashboard-table-file-row {
    max-width: 100%;
}
.mythic-dashboard-table-stack {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    min-width: 0;
}
.mythic-dashboard-table-primary-text,
.mythic-dashboard-table-link,
.mythic-dashboard-summary-table .MuiTypography-root {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-dashboard-table-primary-text,
.mythic-dashboard-table-link {
    display: inline-block;
    max-width: 100%;
}
.mythic-dashboard-table-secondary {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.7rem !important;
    font-weight: 650;
    line-height: 1.2 !important;
}
.mythic-dashboard-table-cell-wrap .MuiTypography-root,
.mythic-dashboard-table-cell-wrap .mythic-dashboard-table-primary-text,
.mythic-dashboard-table-cell-wrap .mythic-dashboard-table-secondary {
    overflow: visible;
    text-overflow: clip;
    white-space: normal !important;
}
.mythic-dashboard-table-icon-action {
    color: ${(props) => props.theme.palette.text.secondary};
    cursor: pointer;
    display: inline-block;
    flex: 0 0 auto;
    height: 1.1rem;
    width: 1.1rem;
}
.mythic-dashboard-table-icon-action:hover,
.mythic-dashboard-table-icon-action-info:hover {
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-dashboard-tasking-table {
    table-layout: fixed;
}
.mythic-dashboard-tasking-cell {
    max-width: 0;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-dashboard-tasking-list {
    display: flex;
    flex-direction: column;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-dashboard-tasking-list .TaskDisplay-root,
.mythic-dashboard-tasking-list .TaskDisplayAccordion-root,
.mythic-dashboard-tasking-list .TaskDisplayAccordion-content,
.mythic-dashboard-tasking-list .TaskDisplayAccordionDetails-root {
    max-width: 100%;
    min-width: 0;
}
.mythic-dashboard-tasking-list .MuiAccordion-root,
.mythic-dashboard-tasking-list .MuiGrid-root,
.mythic-dashboard-tasking-list .mythic-response-table,
.mythic-dashboard-tasking-list .mythic-response-table-grid {
    max-width: 100%;
    min-width: 0;
    width: 100%;
}
.mythic-dashboard-tasking-list .MuiCollapse-root,
.mythic-dashboard-tasking-list .MuiCollapse-wrapper,
.mythic-dashboard-tasking-list .MuiCollapse-wrapperInner {
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
}
.mythic-dashboard-card-table .MuiButton-root {
    white-space: nowrap;
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
.mythic-dashboard-kpi-body {
    padding: 0.55rem 0.65rem 0.65rem;
}
.mythic-dashboard-widget-settings-popover {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.border || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.primary};
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    max-width: 17rem;
    min-width: 14rem;
    padding: 0.8rem;
}
.mythic-dashboard-widget-settings-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.82rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-dashboard-widget-settings-copy {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1.35;
}
.mythic-dashboard-callback-kpi,
.mythic-dashboard-service-kpi {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.035) : alpha(props.theme.palette.common.black, 0.018)};
    background-image: ${getSubtleAccentGradient};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    flex: 1 1 auto;
    gap: 0.75rem;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0.8rem;
}
.mythic-dashboard-callback-kpi {
    cursor: pointer;
    flex-direction: column;
    justify-content: space-between;
}
.mythic-dashboard-callback-kpi:hover,
.mythic-dashboard-callback-kpi:focus-visible {
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    outline: none;
}
.mythic-dashboard-service-kpi {
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
}
.mythic-dashboard-kpi-main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    justify-content: center;
    min-height: 0;
    min-width: 0;
}
.mythic-dashboard-kpi-status-row {
    align-items: center;
    display: flex;
    gap: 0.45rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-dashboard-kpi-chip {
    align-items: center;
    border: 1px solid transparent;
    border-radius: 999px;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.66rem;
    font-weight: 850;
    line-height: 1;
    max-width: 100%;
    overflow: hidden;
    padding: 0.25rem 0.45rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-dashboard-kpi-chip-info {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.22 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    color: ${(props) => props.theme.palette.info.main};
}
.mythic-dashboard-kpi-chip-success {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.22 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-dashboard-kpi-chip-warning {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-dashboard-kpi-chip-danger {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.22 : 0.12)};
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-dashboard-kpi-chip-neutral {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.06) : alpha(props.theme.palette.common.black, 0.035)};
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-dashboard-kpi-percent {
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 auto;
    font-size: 0.74rem;
    font-weight: 850;
    line-height: 1;
}
.mythic-dashboard-kpi-value-row {
    align-items: baseline;
    display: flex;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-dashboard-kpi-value {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 3.35rem;
    font-weight: 880;
    letter-spacing: 0;
    line-height: 0.98;
}
.mythic-dashboard-kpi-total {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 1.25rem;
    font-weight: 760;
    line-height: 1;
}
.mythic-dashboard-kpi-label {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    font-weight: 750;
    letter-spacing: 0;
    line-height: 1.25;
    margin-top: 0.25rem;
}
.mythic-dashboard-kpi-secondary-panel {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.045) : alpha(props.theme.palette.common.black, 0.025)};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.55rem 0.65rem;
}
.mythic-dashboard-kpi-secondary-value {
    color: ${(props) => props.theme.palette.text.primary};
    flex: 0 0 auto;
    font-size: 1.65rem;
    font-weight: 880;
    line-height: 1;
}
.mythic-dashboard-kpi-secondary-label {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-dashboard-kpi-gauge {
    align-items: center;
    display: flex;
    flex: 0 0 7rem;
    justify-content: center;
    min-width: 7rem;
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
    margin: 0;
    width: min(100%, 32rem);
}
.mythic-dashboard-slider .MuiSlider-rail {
    opacity: 0.28;
}
.mythic-dashboard-slider .MuiSlider-thumb {
    height: 12px;
    width: 12px;
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
.mythic-dashboard-edit-toolbar {
    align-items: center;
    background-color: ${(props) => props.theme.pageHeader?.main || props.theme.surfaces?.muted || props.theme.palette.background.paper} !important;
    background-image: ${getSectionHeaderGradient} !important;
    border: 1px solid ${(props) => alpha(getSectionHeaderAccent(props), props.theme.palette.mode === "dark" ? 0.55 : 0.38)};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: inset 0 1px 0 ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.22)}, 0 2px 6px ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.24 : 0.1)};
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    grid-column: 1 / -1;
    justify-content: space-between;
    min-width: 0;
    overflow: hidden;
    padding: 0.52rem 0.65rem 0.52rem 1rem;
    position: relative;
}
.mythic-dashboard-edit-toolbar::before {
    background-color: ${getSectionHeaderAccent};
    bottom: 0;
    box-shadow: 0 0 0 1px ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.2)};
    content: "";
    left: 0;
    position: absolute;
    top: 0;
    width: 6px;
}
.mythic-dashboard-edit-toolbar-title {
    color: inherit;
    font-size: 0.78rem;
    font-weight: 850;
    letter-spacing: 0;
    line-height: 1.2;
    white-space: nowrap;
}
.mythic-dashboard-edit-toolbar-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
    min-width: 0;
}
.mythic-dashboard-edit-toolbar .MuiButton-root.mythic-dashboard-table-action {
    background-color: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.1)} !important;
    border-color: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.24)} !important;
    color: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary} !important;
}
.mythic-dashboard-edit-toolbar .MuiButton-root.mythic-dashboard-table-action:hover {
    background-color: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.16)} !important;
    border-color: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.42)} !important;
}
.mythic-dashboard-edit-toolbar .MuiButton-root.mythic-table-row-action-hover-info:hover {
    background-color: ${(props) => props.theme.palette.info.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.info.main + "88"} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-dashboard-edit-toolbar .MuiButton-root.mythic-dashboard-table-action-hover-danger:hover {
    background-color: ${(props) => props.theme.palette.error.main + "2b"} !important;
    border-color: ${(props) => props.theme.palette.error.main + "88"} !important;
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-dashboard-widget-dialog {
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.default};
    min-height: 28rem;
}
.mythic-dashboard-widget-dialog-header {
    align-items: center;
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    background-image: ${getSectionHeaderGradient};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    min-width: 0;
    padding: 0.7rem 0.8rem;
}
.mythic-dashboard-widget-dialog-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.9rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-dashboard-widget-dialog-subtitle {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.74rem;
    font-weight: 650;
    line-height: 1.25;
    margin-top: 0.18rem;
}
.mythic-dashboard-widget-grid {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    min-width: 0;
}
.mythic-dashboard-widget-option {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "0 1px 2px rgba(15,23,42,0.05)"};
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 6.4rem;
    min-width: 0;
    padding: 0.7rem;
    transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}
.mythic-dashboard-widget-option:hover,
.mythic-dashboard-widget-option:focus-visible {
    background-color: ${(props) => props.theme.palette.primary.main + "10"};
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.5 : 0.34)};
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? `inset 0 1px 0 ${alpha(props.theme.palette.common.white, 0.055)}, 0 8px 18px ${alpha(props.theme.palette.common.black, 0.18)}` : `0 8px 18px ${alpha(props.theme.palette.common.black, 0.08)}`};
    outline: none;
}
.mythic-dashboard-widget-option-selected {
    background-image: ${getSubtleAccentGradient};
    border-color: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.68 : 0.48)};
}
.mythic-dashboard-widget-option-top {
    align-items: flex-start;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-dashboard-widget-option-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.84rem;
    font-weight: 820;
    line-height: 1.2;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-dashboard-widget-option-summary {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.mythic-dashboard-widget-category {
    align-items: center;
    background-color: ${(props) => props.theme.palette.primary.main + "18"};
    border: 1px solid ${(props) => props.theme.palette.primary.main + "45"};
    border-radius: 999px;
    color: ${(props) => props.theme.palette.primary.main};
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.64rem;
    font-weight: 850;
    line-height: 1;
    padding: 0.24rem 0.42rem;
    white-space: nowrap;
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
@media (max-width: 900px) {
    .mythic-dashboard-row {
        grid-template-columns: 1fr;
    }
    .mythic-dashboard-card,
    .mythic-dashboard-card-wide,
    .mythic-dashboard-card-table {
        grid-column: span 1;
        max-width: 100%;
    }
    .mythic-dashboard-perspective-toggle {
        width: 100%;
    }
    .mythic-dashboard-perspective-toggle .MuiToggleButton-root {
        flex: 1 1 0;
        min-width: 0 !important;
    }
    .mythic-dashboard-edit-toolbar {
        align-items: stretch;
        flex-direction: column;
    }
    .mythic-dashboard-edit-toolbar-actions {
        justify-content: flex-start;
    }
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
.mythic-dialog-body .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-dialog-body .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
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
.mythic-state-toggle-cell {
    align-items: center;
    display: flex;
    gap: 0.4rem;
    min-width: 0;
}
.mythic-state-chip {
    align-items: center;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: 999px;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    min-height: 24px;
    padding: 0.25rem 0.55rem;
    white-space: nowrap;
}
.mythic-state-chip-compact {
    font-size: 0.66rem;
    min-height: 1.25rem;
    padding: 0 0.35rem;
}
.mythic-state-chip-active,
.mythic-state-chip-enabled {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    color: ${(props) => props.theme.palette.success.main};
}
.mythic-state-chip-inactive,
.mythic-state-chip-disabled,
.mythic-state-chip-warning {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    color: ${(props) => props.theme.palette.warning.main};
}
.mythic-state-chip-neutral {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.045) : alpha(props.theme.palette.common.black, 0.028)};
    border-color: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-state-chip-error {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    color: ${(props) => props.theme.palette.error.main};
}
.mythic-state-chip-info {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    color: ${(props) => props.theme.palette.info.main};
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
.mythic-eventing-wizard .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-eventing-wizard .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
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
.mythic-eventing-trigger-parameter-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-eventing-trigger-parameter-list .mythic-create-parameter-card {
    grid-template-columns: minmax(14rem, 0.36fr) minmax(0, 1fr);
}
.mythic-eventing-choice-row {
    align-items: flex-start;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}
.mythic-eventing-choice-row > .MuiFormControl-root,
.mythic-eventing-choice-row > .mythic-eventing-choice-custom {
    margin-top: 0.45rem;
}
.mythic-eventing-choice-row > .MuiFormControl-root .MuiTextField-root,
.mythic-eventing-choice-row > .mythic-eventing-choice-custom .MuiFormControl-root,
.mythic-eventing-choice-row > .mythic-eventing-choice-custom .MuiTextField-root {
    margin-top: 0 !important;
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
    gap: 0.2rem;
    line-height: 1.2;
    min-height: 1.45rem;
    padding: 0 0.18rem 0 0.45rem;
}
.mythic-eventing-file-chip-name {
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-file-chip-remove.MuiIconButton-root {
    color: ${(props) => props.theme.palette.text.secondary} !important;
    height: 1.15rem;
    padding: 0;
    width: 1.15rem;
}
.mythic-eventing-file-chip-remove.MuiIconButton-root:hover {
    background-color: ${(props) => props.theme.palette.error.main + "18"} !important;
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-eventing-file-chip-remove svg {
    font-size: 0.82rem;
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
    background-color: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.default};
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
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: 0 1px 2px ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.18 : 0.06)};
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-step-config-section-header {
    background-image: ${getSectionHeaderGradient};
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
.mythic-eventing-step-field-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-eventing-step-section-stack {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.026)" : "rgba(0,0,0,0.018)"};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
    padding: 0.5rem;
    width: 100%;
}
.mythic-eventing-step-list-item-editable {
    display: block;
}
.mythic-eventing-step-list-item > .MuiIconButton-root {
    flex: 0 0 auto;
    margin-top: 0.45rem;
}
.mythic-eventing-step-list-content {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-eventing-step-input-grid {
    align-items: center;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: 2rem minmax(9rem, 0.75fr) minmax(10rem, 0.8fr) minmax(14rem, 1.45fr);
    min-width: 0;
}
.mythic-eventing-step-output-grid {
    align-items: center;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: 2rem minmax(9rem, 0.75fr) minmax(14rem, 1.5fr);
    min-width: 0;
}
.mythic-eventing-step-list-item-editable .mythic-eventing-step-row-action {
    align-self: center;
    justify-self: center;
    margin-top: 0.45rem !important;
}
.mythic-eventing-step-input-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text),
.mythic-eventing-step-output-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) {
    margin-top: 0.45rem;
}
.mythic-eventing-step-input-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) .MuiFormControl-root,
.mythic-eventing-step-input-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) .MuiTextField-root,
.mythic-eventing-step-output-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) .MuiFormControl-root,
.mythic-eventing-step-output-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) .MuiTextField-root {
    margin-top: 0 !important;
}
.mythic-eventing-step-list-item-editable .mythic-eventing-choice-row {
    align-items: center;
}
.mythic-eventing-step-list-item-editable .mythic-eventing-choice-separator {
    align-self: center;
}
.mythic-eventing-step-helper-text {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.68rem;
    font-weight: 600;
    grid-column: 2 / -1;
    line-height: 1.35;
    margin-top: -0.05rem;
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
.mythic-eventing-step-help-text {
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
.mythic-eventing-action-data-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-eventing-action-data-card {
    background-color: ${(props) => props.theme.palette.background.paper};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-left: 4px solid transparent;
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(13rem, 0.34fr) minmax(0, 1fr);
    min-width: 0;
    padding: 0.7rem 0.75rem;
}
.mythic-eventing-action-data-copy {
    min-width: 0;
}
.mythic-eventing-action-data-title-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}
.mythic-eventing-action-data-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.78rem;
    font-weight: 850 !important;
    line-height: 1.25;
}
.mythic-eventing-action-data-chip {
    background-color: ${(props) => props.theme.palette.warning.main + "16"};
    border: 1px solid ${(props) => props.theme.palette.warning.main + "45"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.warning.main};
    display: inline-flex;
    align-items: center;
    font-size: 0.64rem;
    font-weight: 850;
    line-height: 1;
    min-height: 1.2rem;
    padding: 0 0.35rem;
}
.mythic-eventing-action-data-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.28rem;
}
.mythic-eventing-action-data-control {
    min-width: 0;
}
.mythic-eventing-action-data-control .MuiFormControl-root,
.mythic-eventing-action-data-control .MuiTextField-root {
    width: 100%;
}
.mythic-eventing-task-create-command-row {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-eventing-task-create-command-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-start;
}
.mythic-eventing-task-helper-summary {
    background-color: ${(props) => props.theme.palette.info.main + "10"};
    border: 1px solid ${(props) => props.theme.palette.info.main + "2f"};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.76rem;
    font-weight: 650;
    line-height: 1.4;
    margin-bottom: 0.65rem;
    padding: 0.55rem 0.65rem;
}
.mythic-eventing-task-helper-filter {
    margin-bottom: 0.65rem;
}
.mythic-eventing-task-helper-table {
    height: min(50vh, 34rem);
    min-height: 18rem;
    overflow-y: auto;
}
.mythic-eventing-task-helper-preview {
    color: ${(props) => props.theme.palette.text.secondary};
    display: -webkit-box;
    font-size: 0.74rem;
    line-height: 1.35;
    max-height: 2.1rem;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}
.mythic-eventing-action-array-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-eventing-action-array-row {
    align-items: center;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: 2rem minmax(0, 1fr);
    min-width: 0;
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
	        grid-template-columns: 2rem minmax(0, 1fr);
	    }
	    .mythic-eventing-step-input-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) {
	        grid-column: 2;
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
	    .mythic-eventing-step-field-grid {
	        grid-template-columns: 1fr;
	    }
	    .mythic-eventing-step-output-grid {
	        grid-template-columns: 2rem minmax(0, 1fr);
	    }
	    .mythic-eventing-step-output-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) {
	        grid-column: 2;
	    }
	    .mythic-eventing-action-data-card,
	    .mythic-eventing-trigger-parameter-list .mythic-create-parameter-card {
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
    container-type: inline-size;
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
.mythic-eventing-workflow-overview {
    background-color: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    background-image: ${getSubtleAccentHorizontalGradient};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    box-shadow: ${(props) => props.theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.055)" : "inset 0 1px 0 rgba(255,255,255,0.78)"};
    color: ${(props) => props.theme.palette.text.primary};
    container-type: inline-size;
    display: grid;
    flex: 0 0 auto;
    gap: 0.75rem;
    grid-template-columns: minmax(9.5rem, 0.55fr) minmax(13rem, 0.82fr) minmax(0, 2.2fr);
    min-width: 0;
    overflow: hidden;
    padding: 0.72rem 0.78rem;
    width: 100%;
}
.mythic-eventing-workflow-overview-header {
    align-items: flex-start;
    border-bottom: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    display: flex;
    gap: 0.75rem;
    grid-column: 1 / -1;
    justify-content: space-between;
    min-width: 0;
    padding-bottom: 0.7rem;
}
.mythic-eventing-workflow-overview-title-block {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.28rem;
    min-width: 0;
}
.mythic-eventing-workflow-overview-title-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-eventing-workflow-overview-title {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.18;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-eventing-workflow-overview-description {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.35;
    max-width: 64rem;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-eventing-workflow-overview-header-actions {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
    max-width: 100%;
    min-width: min(100%, 13.5rem);
}
.mythic-eventing-workflow-overview-header-actions .MuiButton-root.mythic-table-row-action {
    flex: 0 1 auto;
    min-width: 6.5rem;
    max-width: 100%;
    white-space: normal;
}
.mythic-eventing-workflow-overview-section {
    display: flex;
    flex-direction: column;
    gap: 0.62rem;
    min-width: 0;
}
.mythic-eventing-workflow-overview-section + .mythic-eventing-workflow-overview-section {
    border-left: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    padding-left: 0.75rem;
}
.mythic-eventing-workflow-overview-primary {
    display: flex;
    flex-direction: column;
    gap: 0.62rem;
}
.mythic-eventing-workflow-overview-field,
.mythic-eventing-workflow-action-group {
    display: flex;
    flex-direction: column;
    gap: 0.34rem;
    min-width: 0;
}
.mythic-eventing-workflow-overview-label {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.15;
}
.mythic-eventing-workflow-overview-value {
    color: ${(props) => props.theme.palette.text.primary};
    font-size: 0.86rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-eventing-workflow-overview-subvalue {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.76rem;
    font-weight: 650;
    line-height: 1.3;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-eventing-workflow-overview-icon-line {
    align-items: center;
    display: inline-flex;
    gap: 0.35rem;
}
.mythic-eventing-workflow-overview-icon-line svg {
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 auto;
    font-size: 0.95rem;
}
.mythic-eventing-workflow-chip-row,
.mythic-eventing-workflow-button-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-eventing-workflow-keyword-chip {
    align-items: center;
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.055) : alpha(props.theme.palette.common.black, 0.035)};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: 999px;
    color: ${(props) => props.theme.palette.text.primary};
    display: inline-flex;
    font-size: 0.7rem;
    font-weight: 760;
    line-height: 1.1;
    max-width: 16rem;
    min-height: 1.35rem;
    overflow: hidden;
    padding: 0.18rem 0.46rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-workflow-keyword-more {
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-eventing-workflow-overview-actions {
    gap: 0.7rem;
}
.mythic-eventing-workflow-button-row .MuiButton-root.mythic-table-row-action {
    flex: 0 1 auto;
    gap: 0.25rem;
    justify-content: flex-start;
    line-height: 1.2;
    max-width: 100%;
    min-width: auto;
    padding-left: 0.55rem;
    padding-right: 0.65rem;
    text-align: left;
    white-space: normal;
}
.mythic-eventing-workflow-button-row .MuiButton-startIcon {
    margin-left: 0;
    margin-right: 0.28rem;
}
.MuiButton-root.mythic-eventing-workflow-approval-button {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.055) : alpha(props.theme.palette.common.black, 0.035)} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    box-shadow: none !important;
    font-size: 0.72rem;
    font-weight: 800;
    min-height: 1.5rem;
    padding: 0.15rem 0.55rem;
    text-transform: none;
}
.MuiButton-root.mythic-eventing-workflow-approval-button .MuiButton-startIcon {
    margin-left: 0;
    margin-right: 0.28rem;
}
.MuiButton-root.mythic-eventing-workflow-approval-approved {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)} !important;
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)} !important;
    color: ${(props) => props.theme.palette.success.main} !important;
}
.MuiButton-root.mythic-eventing-workflow-approval-approved:hover {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.26 : 0.16)} !important;
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.66 : 0.48)} !important;
}
.MuiButton-root.mythic-eventing-workflow-approval-needs-approval {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)} !important;
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.5 : 0.34)} !important;
    color: ${(props) => props.theme.palette.warning.main} !important;
}
.MuiButton-root.mythic-eventing-workflow-approval-needs-approval:hover {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.28 : 0.18)} !important;
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.68 : 0.5)} !important;
}
@container (max-width: 58rem) {
    .mythic-eventing-workflow-overview {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .mythic-eventing-workflow-overview-header {
        align-items: stretch;
        flex-direction: column;
        grid-column: 1 / -1;
    }
    .mythic-eventing-workflow-overview-header-actions {
        justify-content: flex-start;
    }
    .mythic-eventing-workflow-overview-section + .mythic-eventing-workflow-overview-section {
        border-left: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
        border-top: 0;
        padding-left: 0.75rem;
        padding-top: 0;
    }
    .mythic-eventing-workflow-overview-actions {
        border-left: 0 !important;
        border-top: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
        grid-column: 1 / -1;
        padding-left: 0 !important;
        padding-top: 0.65rem !important;
    }
}
.mythic-eventing-instances-grid {
    display: flex;
    flex: 1 1 auto;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
    width: 100%;
}
.mythic-eventing-instance-cell {
    align-items: center;
    display: flex;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-instance-id-cell {
    gap: 0.28rem;
    justify-content: space-between;
}
.mythic-eventing-instance-id {
    color: ${(props) => props.theme.palette.text.primary};
    font-weight: 850;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.MuiIconButton-root.mythic-eventing-instance-id-menu-button {
    flex: 0 0 auto;
}
.mythic-eventing-instance-status-cell .mythic-eventing-status-chip {
    max-width: 100%;
}
.mythic-eventing-instance-status-cell .mythic-eventing-status-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-instances-time-cell {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-eventing-instances-time-line {
    align-items: center;
    display: flex;
    gap: 0.38rem;
    line-height: 1.25;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-instances-time-line svg {
    color: ${(props) => props.theme.palette.text.secondary};
    flex: 0 0 auto;
    font-size: 0.92rem;
}
.mythic-eventing-instances-time-secondary {
    color: ${(props) => props.theme.palette.text.secondary};
    font-size: 0.78rem;
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
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
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
    background-color: ${(props) => props.theme.palette.info.main + "16"};
    border-color: ${(props) => props.theme.palette.info.main + "45"};
    color: ${(props) => props.theme.palette.info.main};
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
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
    margin: 0;
    max-height: 18rem;
    min-height: 3.4rem;
    overflow: auto;
    padding: 0;
}
.mythic-eventing-code-block .ace_editor {
    background-color: transparent !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
}
.mythic-eventing-code-block .ace_gutter {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"} !important;
    border-right: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    color: ${(props) => props.theme.palette.text.secondary} !important;
}
.mythic-eventing-code-block .ace_scroller {
    background-color: transparent !important;
}
.mythic-eventing-code-block-empty {
    align-items: center;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    font-family: ${(props) => props.theme.typography.fontFamily};
    font-size: 0.74rem;
    font-weight: 700;
    padding: 0.62rem;
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
.mythic-installed-service-identity {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-installed-service-name {
    color: ${(props) => props.theme.palette.text.primary};
    font-weight: 850;
    line-height: 1.25;
    overflow-wrap: anywhere;
}
.mythic-service-status-summary {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.32rem;
    margin-top: 0.28rem;
    min-width: 0;
}
.mythic-installed-service-identity .mythic-service-status-summary {
    margin-top: 0;
}
.mythic-service-status-primary {
    align-items: center;
    color: ${(props) => props.theme.palette.text.primary};
    display: flex;
    font-size: 0.84rem;
    font-weight: 800;
    gap: 0.38rem;
    line-height: 1.25;
    min-width: 0;
}
.mythic-service-status-primary-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-service-status-dot,
.mythic-service-status-mini-dot {
    border-radius: 999px;
    flex: 0 0 auto;
}
.mythic-service-status-dot {
    height: 0.55rem;
    width: 0.55rem;
}
.mythic-service-status-mini-dot {
    height: 0.38rem;
    width: 0.38rem;
}
.mythic-service-status-summary-success .mythic-service-status-dot {
    background-color: ${(props) => props.theme.palette.success.main};
    box-shadow: 0 0 0 3px ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.14 : 0.1)};
}
.mythic-service-status-summary-warning .mythic-service-status-dot {
    background-color: ${(props) => props.theme.palette.warning.main};
    box-shadow: 0 0 0 3px ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.16 : 0.12)};
}
.mythic-service-status-summary-error .mythic-service-status-dot {
    background-color: ${(props) => props.theme.palette.error.main};
    box-shadow: 0 0 0 3px ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.16 : 0.1)};
}
.mythic-service-status-details {
    align-items: center;
    color: ${(props) => props.theme.palette.text.secondary};
    display: flex;
    flex-wrap: wrap;
    font-size: 0.73rem;
    font-weight: 650;
    gap: 0.35rem 0.55rem;
    line-height: 1.3;
    min-width: 0;
}
.mythic-service-status-detail {
    align-items: center;
    display: inline-flex;
    gap: 0.22rem;
    min-width: 0;
}
.mythic-service-status-detail-label {
    color: ${(props) => props.theme.palette.text.secondary};
}
.mythic-service-status-detail-value {
    color: ${(props) => props.theme.palette.text.primary};
    font-weight: 750;
}
.mythic-service-status-detail-neutral .mythic-service-status-mini-dot {
    background-color: ${(props) => alpha(props.theme.palette.text.secondary, 0.55)};
}
.mythic-service-status-detail-success .mythic-service-status-mini-dot {
    background-color: ${(props) => props.theme.palette.success.main};
}
.mythic-service-status-detail-warning .mythic-service-status-mini-dot {
    background-color: ${(props) => props.theme.palette.warning.main};
}
.mythic-service-status-detail-error .mythic-service-status-mini-dot {
    background-color: ${(props) => props.theme.palette.error.main};
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
.MuiIconButton-root.mythic-response-action-button {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.045) : alpha(props.theme.palette.common.black, 0.028)} !important;
    border: 1px solid ${(props) => props.theme.table?.borderSoft || props.theme.borderColor} !important;
    border-radius: ${(props) => props.theme.shape.borderRadius}px !important;
    box-shadow: none !important;
    color: ${(props) => props.theme.palette.text.secondary} !important;
    height: 30px;
    padding: 0;
    transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
    width: 30px;
}
.MuiIconButton-root.mythic-response-action-button .MuiSvgIcon-root,
.MuiIconButton-root.mythic-response-action-button .svg-inline--fa {
    color: inherit !important;
}
.MuiIconButton-root.mythic-response-action-button:hover {
    background-color: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.085) : alpha(props.theme.palette.common.black, 0.052)} !important;
    border-color: ${(props) => props.theme.table?.border || props.theme.borderColor} !important;
    color: ${(props) => props.theme.palette.text.primary} !important;
}
.mythic-response-action-menu {
    padding: 0.25rem !important;
}
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-menu-item {
    border-radius: ${(props) => props.theme.shape.borderRadius}px;
    color: ${(props) => props.theme.palette.text.secondary};
    min-height: 34px;
}
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-menu-item .MuiListItemIcon-root {
    color: inherit;
    min-width: 2rem;
}
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-menu-item .MuiSvgIcon-root,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-menu-item .svg-inline--fa {
    color: inherit !important;
}
.MuiIconButton-root.mythic-response-action-button.mythic-response-action-hover-info:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-info:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-info.Mui-focusVisible {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)} !important;
    border-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.MuiIconButton-root.mythic-response-action-button.mythic-response-action-hover-success:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-success:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-success.Mui-focusVisible {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)} !important;
    border-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)} !important;
    color: ${(props) => props.theme.palette.success.main} !important;
}
.MuiIconButton-root.mythic-response-action-button.mythic-response-action-hover-warning:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-warning:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-warning.Mui-focusVisible {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)} !important;
    border-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)} !important;
    color: ${(props) => props.theme.palette.warning.main} !important;
}
.MuiIconButton-root.mythic-response-action-button.mythic-response-action-hover-danger:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-danger:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-danger.Mui-focusVisible {
    background-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)} !important;
    border-color: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.56 : 0.38)} !important;
    color: ${(props) => props.theme.palette.error.main} !important;
}
.mythic-menu-item-hover-info .MuiSvgIcon-root,
.mythic-menu-item-hover-success .MuiSvgIcon-root,
.mythic-menu-item-hover-warning .MuiSvgIcon-root,
.mythic-menu-item-hover-danger .MuiSvgIcon-root {
    color: inherit !important;
}
.mythic-menu-item-hover-info:hover,
.mythic-menu-item-hover-info.Mui-focusVisible {
    background-color: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)} !important;
    color: ${(props) => props.theme.palette.info.main} !important;
}
.mythic-menu-item-hover-success:hover,
.mythic-menu-item-hover-success.Mui-focusVisible {
    background-color: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)} !important;
    color: ${(props) => props.theme.palette.success.main} !important;
}
.mythic-menu-item-hover-warning:hover,
.mythic-menu-item-hover-warning.Mui-focusVisible {
    background-color: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)} !important;
    color: ${(props) => props.theme.palette.warning.main} !important;
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
.mythic-search-tabs-bar.MuiPaper-root {
    background-image: ${getSectionHeaderGradient};
}
.mythic-search-tabs.MuiTabs-root {
    min-height: 42px;
}
.mythic-search-tabs .MuiTabs-flexContainer {
    flex-wrap: nowrap;
}
.mythic-search-tabs .MuiTab-root {
    min-height: 42px;
    padding: 0.45rem 0.7rem;
}
.mythic-search-tab-label {
    align-items: center;
    display: inline-flex;
    gap: 0.42rem;
    white-space: nowrap;
}
.mythic-search-tab-label .MuiSvgIcon-root,
.mythic-search-tab-label .svg-inline--fa {
    color: inherit;
    font-size: 1rem;
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
