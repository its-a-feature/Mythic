import { createMuiTheme } from '@material-ui/core/styles';
export const lightTheme = {
    body: '#FFF',
    text: '#363537',
    textLighter: '#B8B8B8',
    textDarker: '#B8B8B8',
    toggleBorder: '#FFF',
    background: '#363537',
    tableHeader: '#F5F5F5',
    listItemBackground: '#F5F5F5',
    menuItemBackground: "#FBFBFB",
    topAppBar: "",
    taskAccordian: "",
    taskAccordianResponse: "#FAFAFA",
    taskAccordianBottom: "#F5F5F5",
    secondaryTextColor: "",
    tabHeaderBackground: "",
    tabHeaderText: "",
    tableLineColor:"",
    eventMessageBackgroundColor: ""
}
export const darkTheme = {
    body: '#363537',
    text: 'white',
    textLighter: '#989898',
    textDarker: '#989898',
    toggleBorder: '#6B8096',
    background: '#999',
    tableHeader: '#484848',
    listItemBackground: '#363537',
    primaryButtonTextOnly: "#7e75ea",
    secondaryButtonTextOnly: "#ea7575",
    menuItemBackground: "#363537",
    topAppBar: "",
    taskAccordian: "#424242",
    taskAccordianResponse: "#616161",
    taskAccordianBottom: "#424242",
    secondaryTextColor: "#E0E0E0",
    tabHeaderBackground: "#363537",
    tabHeaderText: "white",
    tableLineColor: "grey",
    eventMessageBackgroundColor: "#424242"
}
export const muiTheme = createMuiTheme({
  palette: {
    primary: {
            main: "#1976d2"
        },
    secondary: {
            main: "#dc004e"
        },
    error: {
            main: "#f44336"
        },
    warning: {
            main: "#ff9800"
        },
    info: {
            main: "#2196f3"
        },
    disabled: {
            main: "rgba(0, 0, 0, 0.38)"
        },
    },
});


