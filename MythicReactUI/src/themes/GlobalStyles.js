import { createGlobalStyle} from "styled-components"
export const GlobalStyles = createGlobalStyle`
body {
    margin: 0
}
html, body, #root {
    height: 100%;
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

    font-weight: bold;
}
.MuiSelect-select.MuiSelect-select{
    padding-left: 10px
}
.ReactVirtualized__Table__row {
    &:hover,
    &--hovered {
        background-color: ${(props) => props.theme.tableHover} !important;
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

.ReactVirtualized__Table__headerTruncatedText {

  }
.ReactVirtualized__Table__headerColumn {

    padding: 0;
  }
.MuiTab-root {
    max-width: unset;
}
.MuiSpeedDialAction-staticTooltipLabel {
    white-space: nowrap;
    max-width: none;
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
`
