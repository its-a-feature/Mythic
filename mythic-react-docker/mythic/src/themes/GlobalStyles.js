import { createGlobalStyle} from "styled-components"
export const GlobalStyles = createGlobalStyle`
body {
    margin: 0
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
[class^="BaseTable"] {
    background-color: transparent !important;
    border-top: 0;
    border-bottom: 1px solid ${(props) => props.theme.tableBorder};
}
.BaseTable__row {
    &:hover,
    &--hovered {
        background-color: ${(props) => props.theme.tableHover} !important;
        
    }
}
.menuEntry {
  cursor: pointer;
}

tspan {
  font-size: 15px;
  stroke: none;
}
`
