import { createGlobalStyle} from "styled-components"
export const GlobalStyles = createGlobalStyle`
body {
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    font-family: Tahoma, Helvetica, Arial, Roboto, sans-serif;
    margin: 0
}
table, td, .mythicElement, .MuiDrawer-paper, .MuiDialog-paper, .MuiDialogContentText-root, input, .MuiList-root, .MuiFormHelperText-root {
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text} !important;
}
.MuiStepper-root, .MuiStepLabel-label{
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text} !important;
}
.MuiList-root{
    background: ${({ theme }) => theme.listItemBackground};
    color: ${({ theme }) => theme.text} !important;
}
.MuiInputBase-root{
    background: ${({ theme }) => theme.tableHeader};
    color: ${({ theme }) => theme.text} !important;
}
.MuiDialogContent-dividers{
    border-top: 1px solid ${({ theme }) => theme.text};
    border-bottom: 1px solid ${({ theme }) => theme.text};
}
.MuiAccordionSummary-root{
    background: ${({ theme }) => theme.taskAccordian};
    color: ${({ theme }) => theme.text} !important;
}
.MuiAccordionDetails-root{
    background: ${({ theme }) => theme.taskAccordianResponse};
    color: ${({ theme }) => theme.text} !important;
    padding-bottom: 0;
    padding-top: 0;
}
.MuiAccordionActions-root{
    background: ${({ theme }) => theme.taskAccordianBottom};
    color: ${({ theme }) => theme.text} !important;
}
.MuiAccordionSummary-content.Mui-expanded{
    margin: 0px 0px 0px 0px !important;
    min-height: unset;
}
.MuiAccordionSummary-root.Mui-expanded{
    min-height: unset;
}
[class*="makeStyles-secondaryHeading-"]{
    color: ${({ theme }) => theme.secondaryTextColor} !important;
}
[class*="makeStyles-secondaryHeadingExpanded-"]{
    color: ${({ theme }) => theme.secondaryTextColor} !important;
}
.MuiTabs-root{
    background: ${({ theme }) => theme.tabHeaderBackground};
    color: ${({ theme }) => theme.tabHeaderText} !important;
}
// placeholder/helper text for input boxes
.MuiFormLabel-root {
    background: transparent;
    color: ${({ theme }) => theme.text} !important;
}
.MuiFormControl-root{
    border-color: 'white';
}
.MuiTableCell-head {
    background-color: ${({ theme }) => theme.tableHeader};
    color: ${({ theme }) => theme.text} !important;
    font-weight: bold;
}
.MuiSelect-select.MuiSelect-select{
    padding-left: 10px
}
.MuiToolbar-root {
    background-color: ${({ theme }) => theme.topAppBar};
}
.MuiSelect-select:not([multiple]) option, .MuiSelect-select:not([multiple]) optgroup {
    background-color: ${({ theme }) => theme.body};
}
.MuiCard-root {
    background-color: ${({ theme }) => theme.tableHeader};
    color: ${({ theme }) => theme.text} !important;
}
.contextMenu {
  stroke: #00557d;
  fill: ${({ theme }) => theme.listItemBackground};
}

.menuEntry {
  cursor: pointer;
}
.MuiTableCell-root{
    border-bottom: 1px solid ${({ theme }) => theme.tableLineColor};
}
.menuEntry text {
  font-size: 15px;
  fill: ${({ theme }) => theme.text};
  stroke: none;
}
.MuiTypography-colorTextSecondary{
    color: ${({ theme }) => theme.secondaryTextColor};
}
tspan {
  font-size: 15px;
  fill: ${({ theme }) => theme.text};
  stroke: none;
}
.MuiMenuItem-root, .MuiMenu-list, .MuiList-root{
    background: ${({ theme }) => theme.menuItemBackground};
    color: ${({ theme }) => theme.text} !important;
}
.MuiAutocomplete-paper{
    background-color: ${({ theme }) => theme.menuItemBackground};
    color: ${({ theme }) => theme.text} !important;
}
`
