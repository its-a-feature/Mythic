import { LoginForm } from './pages/Login/LoginForm';
import { Settings } from './pages/Settings/Settings';
import { PayloadTypesC2Profiles } from './pages/PayloadTypesC2Profiles/PayloadTypesC2Profiles';
import { CreatePayload } from './pages/CreatePayload/CreatePayload';
import { CreatePayloadWrapper } from './pages/CreateWrapper/CreatePayload';
import { EventFeed } from './pages/EventFeed/EventFeed';
import { Operations } from './pages/Operations/Operations';
import { BrowserScripts } from './pages/BrowserScripts/BrowserScripts';
import { Payloads } from './pages/Payloads/Payloads';
import { ExpandedCallback } from './pages/ExpandedCallback/ExpandedCallback';
import { Home } from './pages/Home/Home';
import { LoggedInRoute } from './utilities/LoggedInRoute';
import { Callbacks } from './pages/Callbacks/Callbacks';
import { Search } from './pages/Search/Search';
import React, {createContext} from 'react';
import { Typography } from '@mui/material';
import { useReactiveVar } from '@apollo/client';
import { useDarkMode } from './utilities/useDarkMode';
import { SingleTaskView } from './pages/SingleTaskView/SingleTaskView';
import { createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { GlobalStyles } from '../themes/GlobalStyles';
import CssBaseline from '@mui/material/CssBaseline';
import {FailedRefresh, mePreferences, meState, operatorSettingDefaults} from '../cache';
import { Reporting } from './pages/Reporting/Reporting';
import { MitreAttack } from './pages/MITRE_ATTACK/MitreAttack';
import {Tags} from './pages/Tags/Tags';
import { Tooltip } from 'react-tooltip';
import {useLazyQuery, gql } from '@apollo/client';
//background-color: #282c34;
import { Route, Routes } from 'react-router-dom';
import { useInterval } from './utilities/Time';
import { JWTTimeLeft, isJWTValid } from '../index';
import { RefreshTokenDialog } from './RefreshTokenDialog';
import { MythicDialog } from './MythicComponents/MythicDialog';
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import {Eventing} from "./pages/Eventing/Eventing";
import {InviteForm} from "./pages/Login/InviteForm";
import {snackActions} from "./utilities/Snackbar";
import {TopAppBarVertical} from "./TopAppBarVertical";
import { library } from '@fortawesome/fontawesome-svg-core';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import {Jupyter} from "./pages/Jupyter/Jupyter";
import {Hasura} from "./pages/Hasura/Hasura";

// add all fas icons
const iconList = Object
    .keys(Icons)
    .filter(key => key !== "fas" && key !== "prefix" )
    .map(icon => Icons[icon])

library.add(...iconList)

export const MeContext = createContext({});
export const userSettingsQuery = gql`
query getUserSettings {
    getOperatorPreferences {
        status
        error
        preferences
    }
}
`;

const getModernThemeAdditions = (themeMode, preferences = operatorSettingDefaults) => {
    const isDark = themeMode === "dark";
    const mode = isDark ? "dark" : "light";
    const safePreferences = preferences || operatorSettingDefaults;
    const getColor = (key) => {
        return safePreferences?.palette?.[key]?.[mode] || operatorSettingDefaults.palette[key][mode];
    };
    const withAlpha = (color, alphaHex) => {
        if(typeof color === "string" && color.startsWith("#") && color.length === 7){
            return `${color}${alphaHex}`;
        }
        return color;
    };
    const textPrimary = getColor("text");
    const textSecondary = isDark ? "#9ca3af" : "#475569";
    const borderColor = getColor("borderColor");
    const backgroundDefault = getColor("background");
    const backgroundPaper = getColor("paper");
    const navBackground = getColor("navBarColor");
    const navAccent = getColor("navBarBottomColor");
    const navText = getColor("navBarText");
    const navIcon = getColor("navBarIcons");
    const primary = getColor("primary");
    const tableHeaderColor = getColor("tableHeader");
    const tableHoverColor = getColor("tableHover");
    const tableRowStripeColor = withAlpha(tableHoverColor, isDark ? "55" : "66");
    const tableRowHoverColor = withAlpha(tableHoverColor, "CC");
    const hoverColor = tableRowHoverColor;
    const tableSelectedColor = withAlpha(getColor("selectedCallbackColor"), "CC");
    const tableSelectedHierarchyColor = withAlpha(getColor("selectedCallbackHierarchyColor"), "CC");
    const tableBorderSoft = withAlpha(borderColor, isDark ? "AA" : "CC");

    return {
        shape: {
            borderRadius: 6,
        },
        pageHeaderText: {
            main: textPrimary,
        },
        navigation: {
            background: `linear-gradient(180deg, ${navBackground}, ${navAccent})`,
            backgroundColor: navBackground,
            border: borderColor,
            hover: withAlpha(getColor("tableHover"), "66"),
            selected: withAlpha(getColor("selectedCallbackColor"), "99"),
            text: navText,
            icon: navIcon,
            muted: withAlpha(navText, "B3"),
            accent: navAccent,
        },
        surfaces: {
            app: backgroundDefault,
            paper: backgroundPaper,
            raised: isDark ? "#1b222c" : "#ffffff",
            muted: isDark ? withAlpha(backgroundDefault, "DD") : withAlpha(backgroundDefault, "EE"),
            hover: tableRowHoverColor,
            selected: tableSelectedColor,
        },
        table: {
            header: tableHeaderColor,
            headerHover: tableRowHoverColor,
            rowStripe: tableRowStripeColor,
            rowHover: tableRowHoverColor,
            selected: tableSelectedColor,
            selectedHierarchy: tableSelectedHierarchyColor,
            border: borderColor,
            borderSoft: tableBorderSoft,
        },
        typography: {
            fontSize: safePreferences?.fontSize || operatorSettingDefaults.fontSize,
            fontFamily: safePreferences?.fontFamily || operatorSettingDefaults.fontFamily,
            h5: {
                fontWeight: 650,
                letterSpacing: 0,
            },
            h6: {
                fontWeight: 650,
                letterSpacing: 0,
            },
            subtitle1: {
                fontWeight: 650,
            },
            button: {
                textTransform: "none",
                fontWeight: 650,
                letterSpacing: 0,
            },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundColor: backgroundDefault,
                        color: textPrimary,
                        WebkitFontSmoothing: "antialiased",
                        MozOsxFontSmoothing: "grayscale",
                    },
                },
            },
            MuiPaper: {
                defaultProps: {
                    elevation: 0,
                },
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                        boxShadow: "none",
                    },
                },
            },
            MuiButton: {
                defaultProps: {
                    disableElevation: true,
                    size: "small",
                },
                styleOverrides: {
                    root: {
                        minHeight: 30,
                        borderRadius: 6,
                        textTransform: "none",
                        fontWeight: 650,
                    },
                    contained: {
                        boxShadow: "none",
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                        padding: 5,
                        color: textSecondary,
                        "&:hover": {
                            backgroundColor: hoverColor,
                            color: textPrimary,
                        },
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                        boxShadow: "none",
                        borderBottom: `1px solid ${borderColor}`,
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 8,
                        border: `1px solid ${borderColor}`,
                        backgroundImage: "none",
                        boxShadow: isDark ? "0 24px 80px rgba(0, 0, 0, 0.45)" : "0 24px 80px rgba(15, 23, 42, 0.14)",
                    },
                },
            },
            MuiDialogTitle: {
                styleOverrides: {
                    root: {
                        padding: "10px 14px",
                        fontSize: "1rem",
                        fontWeight: 650,
                        borderBottom: `1px solid ${borderColor}`,
                    },
                },
            },
            MuiDialogContent: {
                styleOverrides: {
                    root: {
                        padding: "12px 14px",
                    },
                },
            },
            MuiDialogContentText: {
                styleOverrides: {
                    root: {
                        color: textSecondary,
                        fontSize: "0.88rem",
                        lineHeight: 1.45,
                        margin: "0 0 10px",
                    },
                },
            },
            MuiDialogActions: {
                styleOverrides: {
                    root: {
                        gap: 8,
                        padding: "10px 14px",
                        borderTop: `1px solid ${borderColor}`,
                    },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                        backgroundColor: backgroundPaper,
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: textSecondary,
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: primary,
                            borderWidth: 1,
                        },
                    },
                    notchedOutline: {
                        borderColor,
                    },
                },
            },
            MuiInput: {
                styleOverrides: {
                    root: {
                        "&:before": {
                            borderBottomColor: borderColor,
                        },
                        "&:after": {
                            borderBottomColor: primary,
                        },
                    },
                },
            },
            MuiInputBase: {
                styleOverrides: {
                    root: {
                        fontSize: "0.92rem",
                    },
                },
            },
            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        color: textSecondary,
                        "&.Mui-focused": {
                            color: primary,
                        },
                    },
                },
            },
            MuiFormControlLabel: {
                styleOverrides: {
                    root: {
                        marginLeft: 0,
                        marginRight: 0,
                    },
                    label: {
                        color: textPrimary,
                        fontSize: "0.86rem",
                    },
                },
            },
            MuiFormHelperText: {
                styleOverrides: {
                    root: {
                        color: textSecondary,
                        fontSize: "0.74rem",
                        lineHeight: 1.35,
                        marginLeft: 0,
                    },
                },
            },
            MuiTabs: {
                styleOverrides: {
                    root: {
                        minHeight: 34,
                    },
                    indicator: {
                        height: 2,
                        borderRadius: 2,
                    },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        minHeight: 34,
                        padding: "6px 10px",
                        textTransform: "none",
                        fontSize: "0.82rem",
                        fontWeight: 650,
                        letterSpacing: 0,
                    },
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        border: `1px solid ${borderColor}`,
                        borderRadius: 8,
                        boxShadow: isDark ? "0 18px 48px rgba(0, 0, 0, 0.40)" : "0 18px 48px rgba(15, 23, 42, 0.12)",
                    },
                },
            },
            MuiList: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                    },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        borderRadius: 6,
                        fontSize: 12,
                    },
                },
            },
            MuiAccordion: {
                styleOverrides: {
                    root: {
                        boxShadow: "none",
                        "&:before": {
                            display: "none",
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 5,
                        fontWeight: 650,
                    },
                },
            },
            MuiTableContainer: {
                styleOverrides: {
                    root: {
                        backgroundColor: backgroundPaper,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 6,
                        minHeight: 0,
                        overflow: "auto",
                    },
                },
            },
            MuiTable: {
                styleOverrides: {
                    root: {
                        backgroundColor: backgroundPaper,
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        width: "100%",
                    },
                },
            },
            MuiTableHead: {
                styleOverrides: {
                    root: {
                        "& .MuiTableRow-root": {
                            backgroundColor: tableHeaderColor,
                        },
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        borderBottom: `1px solid ${tableBorderSoft}`,
                        color: textPrimary,
                        fontVariantNumeric: "tabular-nums",
                        fontSize: "0.86rem",
                        lineHeight: 1.35,
                        padding: "6px 10px",
                        verticalAlign: "middle",
                        "&:first-of-type": {
                            paddingLeft: 12,
                        },
                        "&:last-of-type": {
                            paddingRight: 12,
                        },
                    },
                    head: {
                        backgroundColor: tableHeaderColor,
                        borderBottom: `1px solid ${borderColor}`,
                        borderTop: 0,
                        color: textPrimary,
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        letterSpacing: 0,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                    },
                    paddingCheckbox: {
                        paddingLeft: 6,
                        paddingRight: 6,
                        width: 36,
                    },
                    stickyHeader: {
                        backgroundColor: tableHeaderColor,
                        zIndex: 3,
                    },
                },
            },
            MuiTableRow: {
                styleOverrides: {
                    root: {
                        backgroundColor: backgroundPaper,
                        ".MuiTableBody-root &:nth-of-type(even):not(.Mui-selected):not(.selectedCallback):not(.selectedCallbackHierarchy)": {
                            backgroundColor: tableRowStripeColor,
                        },
                        "&:last-child .MuiTableCell-root": {
                            borderBottom: 0,
                        },
                        "&.Mui-selected": {
                            backgroundColor: tableSelectedColor,
                            "&:hover": {
                                backgroundColor: tableSelectedColor,
                            },
                        },
                        "&.MuiTableRow-hover:hover": {
                            backgroundColor: tableRowHoverColor,
                        },
                    },
                },
            },
            MuiTablePagination: {
                styleOverrides: {
                    root: {
                        color: textSecondary,
                    },
                    selectLabel: {
                        color: textSecondary,
                        fontSize: "0.78rem",
                    },
                    displayedRows: {
                        color: textSecondary,
                        fontSize: "0.78rem",
                    },
                    toolbar: {
                        minHeight: 34,
                    },
                },
            },
            MuiTableSortLabel: {
                styleOverrides: {
                    root: {
                        color: textSecondary,
                        "&.Mui-active": {
                            color: textPrimary,
                        },
                        "&:hover": {
                            color: textPrimary,
                        },
                    },
                    icon: {
                        color: `${textSecondary} !important`,
                    },
                },
            },
            MuiPagination: {
                styleOverrides: {
                    root: {
                        display: "flex",
                    },
                    ul: {
                        gap: 4,
                    },
                },
            },
            MuiPaginationItem: {
                styleOverrides: {
                    root: {
                        minWidth: 28,
                        height: 28,
                        borderRadius: 6,
                        color: textSecondary,
                        fontSize: "0.78rem",
                        fontWeight: 650,
                        "&.Mui-selected": {
                            backgroundColor: withAlpha(primary, isDark ? "44" : "1F"),
                            borderColor: primary,
                            color: textPrimary,
                            "&:hover": {
                                backgroundColor: withAlpha(primary, isDark ? "55" : "2B"),
                            },
                        },
                        "&:hover": {
                            backgroundColor: tableRowHoverColor,
                            color: textPrimary,
                        },
                    },
                    outlined: {
                        borderColor: tableBorderSoft,
                    },
                    icon: {
                        fontSize: "1rem",
                    },
                },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        borderColor: tableBorderSoft,
                        borderRadius: 6,
                        color: textSecondary,
                        fontSize: "0.78rem",
                        fontWeight: 650,
                        gap: 6,
                        minHeight: 32,
                        padding: "5px 9px",
                        textTransform: "none",
                        "&:hover": {
                            backgroundColor: tableRowHoverColor,
                            color: textPrimary,
                        },
                        "&.Mui-selected": {
                            backgroundColor: withAlpha(primary, isDark ? "44" : "1F"),
                            borderColor: primary,
                            color: textPrimary,
                            "&:hover": {
                                backgroundColor: withAlpha(primary, isDark ? "55" : "2B"),
                            },
                        },
                    },
                    sizeSmall: {
                        minHeight: 30,
                    },
                },
            },
            MuiDataGrid: {
                styleOverrides: {
                    root: {
                        backgroundColor: backgroundPaper,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 6,
                        color: textPrimary,
                        fontSize: "0.86rem",
                        "--DataGrid-rowBorderColor": tableBorderSoft,
                        "--DataGrid-containerBackground": tableHeaderColor,
                        overflow: "hidden",
                        "& .MuiDataGrid-main": {
                            backgroundColor: backgroundPaper,
                        },
                        "& .MuiDataGrid-virtualScroller": {
                            backgroundColor: backgroundPaper,
                        },
                        "& .MuiDataGrid-columnHeaders": {
                            backgroundColor: tableHeaderColor,
                            borderBottom: `1px solid ${borderColor}`,
                        },
                        "& .MuiDataGrid-columnHeader": {
                            backgroundColor: tableHeaderColor,
                            color: textPrimary,
                            fontWeight: 700,
                        },
                        "& .MuiDataGrid-columnHeaderTitle": {
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            letterSpacing: 0,
                            textTransform: "uppercase",
                        },
                        "& .MuiDataGrid-columnSeparator": {
                            color: tableBorderSoft,
                        },
                        "& .MuiDataGrid-cell": {
                            borderBottom: `1px solid ${tableBorderSoft}`,
                            outline: "none",
                            fontVariantNumeric: "tabular-nums",
                        },
                        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
                            outline: "none",
                        },
                        "& .MuiDataGrid-row:nth-of-type(even):not(.Mui-selected)": {
                            backgroundColor: tableRowStripeColor,
                        },
                        "& .MuiDataGrid-row:hover": {
                            backgroundColor: tableRowHoverColor,
                        },
                        "& .MuiDataGrid-row.Mui-selected": {
                            backgroundColor: tableSelectedColor,
                            "&:hover": {
                                backgroundColor: tableSelectedColor,
                            },
                        },
                        "& .MuiDataGrid-footerContainer": {
                            borderTop: `1px solid ${borderColor}`,
                            minHeight: 34,
                            color: textSecondary,
                        },
                        "& .MuiDataGrid-toolbarContainer": {
                            borderBottom: `1px solid ${tableBorderSoft}`,
                            minHeight: 34,
                        },
                        "& .MuiDataGrid-overlay": {
                            backgroundColor: backgroundPaper,
                            color: textSecondary,
                        },
                        "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                            color: textSecondary,
                            fontSize: "0.78rem",
                        },
                        "& .MuiSvgIcon-root, & .MuiIconButton-root": {
                            color: textSecondary,
                        },
                        "& .MuiCheckbox-root": {
                            color: textSecondary,
                            "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                                color: primary,
                            },
                        },
                    },
                },
            },
        },
    };
};


export function App(props) {
    const me = useReactiveVar(meState);
    const preferences = useReactiveVar(mePreferences);
    const [loadingPreference, setLoadingPreferences] = React.useState(true);
    const [themeMode, themeToggler] = useDarkMode();
    const theme = React.useMemo(
        () => {
            try{
                return createTheme({
                    transitions: {
                        // So we have `transition: none;` everywhere
                        create: () => 'none',
                    },
                    palette: {
                        contrastThreshold: 4.5,
                        //tonalOffset: 0.5,
                        primary: {
                            main: themeMode === "dark" ? preferences?.palette?.primary?.dark || operatorSettingDefaults.palette.primary.dark :
                                preferences?.palette?.primary?.light || operatorSettingDefaults.palette.primary.light,
                        },
                        error: {
                            main: themeMode === "dark" ? preferences?.palette?.error?.dark || operatorSettingDefaults.palette.error.dark :
                                preferences?.palette?.error?.light || operatorSettingDefaults.palette.error.light,
                        },
                        success: {
                            main: themeMode === 'dark' ? preferences?.palette?.success?.dark || operatorSettingDefaults.palette.success.dark :
                                preferences?.palette?.success?.light || operatorSettingDefaults.palette.success.light,
                        },
                        secondary: {
                            main: themeMode === 'dark' ? preferences?.palette?.secondary?.dark || operatorSettingDefaults.palette.secondary.dark :
                                preferences?.palette?.secondary?.light || operatorSettingDefaults.palette.secondary.light,
                        },
                        info: {
                            main: themeMode === 'dark' ? preferences?.palette?.info?.dark || operatorSettingDefaults.palette.info.dark :
                                preferences?.palette?.info?.light || operatorSettingDefaults.palette.info.light,
                        },
                        warning: {
                            main: themeMode === 'dark' ? preferences?.palette?.warning?.dark || operatorSettingDefaults.palette.warning.dark :
                                preferences?.palette?.warning?.light || operatorSettingDefaults.palette.warning.light,
                        },
                        mode: themeMode,
                        background: {
                            contrast: themeMode === 'dark' ? preferences?.palette?.background?.light || operatorSettingDefaults.palette.background.light :
                                preferences?.palette?.background?.dark || operatorSettingDefaults.palette.background.dark,
                            default: themeMode === "dark" ? preferences?.palette?.background?.dark || operatorSettingDefaults.palette.background.dark :
                                preferences?.palette?.background?.light || operatorSettingDefaults.palette.background.light,
                            paper: themeMode === "dark" ?  preferences?.palette?.paper?.dark || operatorSettingDefaults.palette.paper.dark :
                                preferences?.palette?.paper?.light || operatorSettingDefaults.palette.paper.light,
                            image: themeMode === "dark" ?  preferences?.palette?.backgroundImage?.dark || operatorSettingDefaults.palette.backgroundImage.dark :
                                preferences?.palette?.backgroundImage?.light || operatorSettingDefaults.palette.backgroundImage.light,
                        },
                        text: {
                            primary: themeMode === 'dark' ? preferences?.palette?.text?.dark || operatorSettingDefaults.palette.text.dark :
                                preferences?.palette?.text?.light || operatorSettingDefaults.palette.text.light,
                            secondary: themeMode === 'dark' ? '#9ca3af' : '#475569',
                            disabled: themeMode === 'dark' ? '#6b7280' : '#94a3b8',
                            contrast: themeMode === 'dark' ? '#000' : '#fff',
                        },
                        action: {
                            hover: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)',
                            selected: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.11)' : 'rgba(37, 99, 235, 0.10)',
                            focus: themeMode === 'dark' ? 'rgba(138, 180, 248, 0.20)' : 'rgba(37, 99, 235, 0.18)',
                        },
                        divider: themeMode === 'dark' ? preferences?.palette?.borderColor?.dark || operatorSettingDefaults.palette.borderColor.dark :
                            preferences?.palette?.borderColor?.light || operatorSettingDefaults.palette.borderColor.light,
                        graphGroupRGBA: themeMode === 'dark' ? 'rgba(57, 76, 93, 0.5)' : 'rgba(211, 215, 232, 0.5)',
                        speedDialAction: themeMode === 'dark' ? '#495054' : '#ffffff',
                    },
                    folderColor: '#f1d592',
                    tableHeader: themeMode === 'dark' ? preferences?.palette?.tableHeader?.dark || operatorSettingDefaults.palette.tableHeader.dark :
                        preferences?.palette?.tableHeader?.light || operatorSettingDefaults.palette.tableHeader.light,
                    selectedCallbackColor: themeMode === 'dark' ? preferences?.palette?.selectedCallbackColor?.dark || operatorSettingDefaults.palette.selectedCallbackColor.dark :
                        preferences?.palette?.selectedCallbackColor?.light || operatorSettingDefaults.palette.selectedCallbackColor.light,
                    selectedCallbackHierarchyColor:  themeMode === 'dark' ? preferences?.palette?.selectedCallbackHierarchyColor?.dark || operatorSettingDefaults.palette.selectedCallbackHierarchyColor.dark :
                        preferences?.palette?.selectedCallbackHierarchyColor?.light || operatorSettingDefaults.palette.selectedCallbackHierarchyColor.light,
                    tableHover: themeMode === 'dark' ? preferences?.palette?.tableHover?.dark || operatorSettingDefaults.palette.tableHover.dark :
                        preferences?.palette?.tableHover?.light || operatorSettingDefaults.palette.tableHover.light,
                    navBarTextIconColor: themeMode === 'dark' ? preferences?.palette?.navBarIcons?.dark || operatorSettingDefaults.palette.navBarIcons.dark :
                        preferences?.palette?.navBarIcons?.light || operatorSettingDefaults.palette.navBarIcons.light,
                    navBarTextColor: themeMode === 'dark' ? preferences?.palette?.navBarText?.dark || operatorSettingDefaults.palette.navBarText.dark :
                        preferences?.palette?.navBarText?.light || operatorSettingDefaults.palette.navBarText.light,
                    pageHeader: {
                        main: themeMode === 'dark' ? preferences?.palette?.pageHeader?.dark || operatorSettingDefaults.palette.pageHeader.dark :
                            preferences?.palette?.pageHeader?.light || operatorSettingDefaults.palette.pageHeader.light,
                    },
                    pageHeaderText: {
                        main: themeMode === 'dark' ? preferences?.palette?.text?.dark || operatorSettingDefaults.palette.text.dark :
                            preferences?.palette?.text?.light || operatorSettingDefaults.palette.text.light,
                    },
                    topAppBarColor: themeMode === 'dark' ? (preferences?.palette?.navBarColor?.dark || operatorSettingDefaults.palette.navBarColor.dark) :
                        (preferences?.palette?.navBarColor?.light || operatorSettingDefaults.palette.navBarColor.light),
                    topAppBarBottomColor: themeMode === 'dark' ? preferences?.palette?.navBarBottomColor?.dark || operatorSettingDefaults.palette.navBarBottomColor.dark :
                        preferences?.palette?.navBarBottomColor?.light || operatorSettingDefaults.palette.navBarBottomColor.light,
                    typography: {
                        fontSize: 12, //preferences?.fontSize,
                        fontFamily: preferences?.fontFamily
                    },
                    taskPromptTextColor: themeMode === 'dark' ? preferences?.palette?.taskPromptTextColor?.dark || operatorSettingDefaults.palette.taskPromptTextColor.dark :
                        preferences?.palette?.taskPromptTextColor?.light || operatorSettingDefaults.palette.taskPromptTextColor.light,
                    taskPromptCommandTextColor: themeMode === 'dark' ? preferences?.palette?.taskPromptCommandTextColor?.dark || operatorSettingDefaults.palette.taskPromptCommandTextColor.dark :
                        preferences?.palette?.taskPromptCommandTextColor?.light || operatorSettingDefaults.palette.taskPromptCommandTextColor.light,
                    taskContextColor: themeMode === 'dark' ? preferences?.palette?.taskContextColor?.dark || operatorSettingDefaults.palette.taskContextColor.dark :
                        preferences?.palette?.taskContextColor?.light || operatorSettingDefaults.palette.taskContextColor.light,
                    taskContextImpersonationColor: themeMode === 'dark' ? preferences?.palette?.taskContextImpersonationColor?.dark || operatorSettingDefaults.palette.taskContextImpersonationColor.dark :
                        preferences?.palette?.taskContextImpersonationColor?.light || operatorSettingDefaults.palette.taskContextImpersonationColor.light,
                    taskContextExtraColor: themeMode === 'dark' ? preferences?.palette?.taskContextExtraColor?.dark || operatorSettingDefaults.palette.taskContextExtraColor.dark :
                        preferences?.palette?.taskContextExtraColor?.light || operatorSettingDefaults.palette.taskContextExtraColor.light,
                    emptyFolderColor: themeMode === 'dark' ? preferences?.palette?.emptyFolderColor?.dark || operatorSettingDefaults.palette.emptyFolderColor.dark :
                        preferences?.palette?.emptyFolderColor?.light || operatorSettingDefaults.palette.emptyFolderColor.light,
                    outputBackgroundColor: themeMode === 'dark' ? preferences?.palette?.outputBackgroundColor?.dark || operatorSettingDefaults.palette.outputBackgroundColor.dark :
                        preferences?.palette?.outputBackgroundColor?.light || operatorSettingDefaults.palette.outputBackgroundColor.light,
                    outputTextColor: themeMode === 'dark' ? preferences?.palette?.outputTextColor?.dark || operatorSettingDefaults.palette.outputTextColor.dark :
                        preferences?.palette?.outputTextColor?.light || operatorSettingDefaults.palette.outputTextColor.light,
                    borderColor: themeMode === 'dark' ? preferences?.palette?.borderColor?.dark || operatorSettingDefaults.palette.borderColor.dark :
                        preferences?.palette?.borderColor?.light || operatorSettingDefaults.palette.borderColor.light,
                    ...getModernThemeAdditions(themeMode, preferences),
                })
            }catch(error){
                console.log(error);
                snackActions.error(error.message);
                return createTheme({
                    transitions: {
                        // So we have `transition: none;` everywhere
                        create: () => 'none',
                    },
                    palette: {
                        contrastThreshold: 4.5,
                        //tonalOffset: 0.5,
                        primary: {
                            main: themeMode === "dark" ? operatorSettingDefaults.palette.primary.dark :
                                operatorSettingDefaults.palette.primary.light,
                        },
                        error: {
                            main: themeMode === "dark" ? operatorSettingDefaults.palette.error.dark :
                                operatorSettingDefaults.palette.error.light,
                        },
                        success: {
                            main: themeMode === 'dark' ? operatorSettingDefaults.palette.success.dark :
                                operatorSettingDefaults.palette.success.light,
                        },
                        secondary: {
                            main: themeMode === 'dark' ? operatorSettingDefaults.palette.secondary.dark :
                                operatorSettingDefaults.palette.secondary.light,
                        },
                        info: {
                            main: themeMode === 'dark' ? operatorSettingDefaults.palette.info.dark :
                                operatorSettingDefaults.palette.info.light,
                        },
                        warning: {
                            main: themeMode === 'dark' ? operatorSettingDefaults.palette.warning.dark :
                                operatorSettingDefaults.palette.warning.light,
                        },
                        mode: themeMode,
                        background: {
                            contrast: themeMode === 'dark' ?operatorSettingDefaults.palette.background.light :
                                operatorSettingDefaults.palette.background.dark,
                            default: themeMode === "dark" ? operatorSettingDefaults.palette.background.dark :
                                operatorSettingDefaults.palette.background.light,
                            paper: themeMode === "dark" ?  operatorSettingDefaults.palette.paper.dark :
                                operatorSettingDefaults.palette.paper.light,
                            image: themeMode === "dark" ?  operatorSettingDefaults.palette.backgroundImage.dark :
                                operatorSettingDefaults.palette.backgroundImage.light,
                        },
                        text: {
                            primary: themeMode === 'dark' ? operatorSettingDefaults.palette.text.dark :
                                operatorSettingDefaults.palette.text.light,
                            secondary: themeMode === 'dark' ? '#9ca3af' : '#475569',
                            disabled: themeMode === 'dark' ? '#6b7280' : '#94a3b8',
                            contrast: themeMode === 'dark' ? '#000' : '#fff',
                        },
                        action: {
                            hover: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)',
                            selected: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.11)' : 'rgba(37, 99, 235, 0.10)',
                            focus: themeMode === 'dark' ? 'rgba(138, 180, 248, 0.20)' : 'rgba(37, 99, 235, 0.18)',
                        },
                        divider: themeMode === 'dark' ? operatorSettingDefaults.palette.borderColor.dark :
                            operatorSettingDefaults.palette.borderColor.light,
                        graphGroupRGBA: themeMode === 'dark' ? 'rgba(57, 76, 93, 0.5)' : 'rgba(211, 215, 232, 0.5)',
                        speedDialAction: themeMode === 'dark' ? '#495054' : '#ffffff',
                    },
                    folderColor: '#f1d592',
                    tableHeader: themeMode === 'dark' ? operatorSettingDefaults.palette.tableHeader.dark :
                        operatorSettingDefaults.palette.tableHeader.light,
                    selectedCallbackColor: themeMode === 'dark' ? operatorSettingDefaults.palette.selectedCallbackColor.dark :
                        operatorSettingDefaults.palette.selectedCallbackColor.light,
                    selectedCallbackHierarchyColor:  themeMode === 'dark' ? operatorSettingDefaults.palette.selectedCallbackHierarchyColor.dark :
                        operatorSettingDefaults.palette.selectedCallbackHierarchyColor.light,
                    tableHover: themeMode === 'dark' ? operatorSettingDefaults.palette.tableHover.dark :
                        operatorSettingDefaults.palette.tableHover.light,
                    navBarTextIconColor: themeMode === 'dark' ? operatorSettingDefaults.palette.navBarIcons.dark :
                        operatorSettingDefaults.palette.navBarIcons.light,
                    navBarTextColor: themeMode === 'dark' ? operatorSettingDefaults.palette.navBarText.dark :
                        operatorSettingDefaults.palette.navBarText.light,
                    pageHeader: {
                        main: themeMode === 'dark' ? operatorSettingDefaults.palette.pageHeader.dark :
                            operatorSettingDefaults.palette.pageHeader.light,
                    },
                    pageHeaderText: {
                        main: themeMode === 'dark' ? operatorSettingDefaults.palette.text.dark :
                            operatorSettingDefaults.palette.text.light,
                    },
                    topAppBarColor: themeMode === 'dark' ? operatorSettingDefaults.palette.navBarColor.dark :
                        operatorSettingDefaults.palette.navBarColor.light,
                    topAppBarBottomColor: themeMode === 'dark' ? operatorSettingDefaults.palette.navBarBottomColor.dark :
                        operatorSettingDefaults.palette.navBarBottomColor.light,
                    emptyFolderColor: themeMode === 'dark' ? operatorSettingDefaults.palette.emptyFolderColor.dark :
                        operatorSettingDefaults.palette.emptyFolderColor.light,
                    outputBackgroundColor: themeMode === 'dark' ? operatorSettingDefaults.palette.outputBackgroundColor.dark :
                        operatorSettingDefaults.palette.outputBackgroundColor.light,
                    outputTextColor: themeMode === 'dark' ? operatorSettingDefaults.palette.outputTextColor.dark :
                        operatorSettingDefaults.palette.outputTextColor.light,
                    borderColor: themeMode === 'dark' ? operatorSettingDefaults.palette.borderColor.dark :
                        operatorSettingDefaults.palette.borderColor.light,
                    typography: {
                        fontSize: 12,//operatorSettingDefaults?.fontSize,
                        fontFamily: operatorSettingDefaults?.fontFamily
                    },
                    ...getModernThemeAdditions(themeMode, operatorSettingDefaults),
                })
            }
        },[themeMode, preferences]
    );
    const mountedRef = React.useRef(true);
    const [openRefreshDialog, setOpenRefreshDialog] = React.useState(false);
    const [getUserPreferences] = useLazyQuery(userSettingsQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            //console.log("got preferences", data.getOperatorPreferences.preferences)
            if(data.getOperatorPreferences.status === "success"){
                if(data.getOperatorPreferences.preferences !== null){
                    mePreferences({...preferences, ...data.getOperatorPreferences.preferences});
                }
            } else {
                snackActions.error(`Failed to get user preferences:\n${data.getOperatorPreferences.error}`);
            }
            setLoadingPreferences(false);
        },
        onError: (error) => {
            console.log(error);
            snackActions.error(error.message);
            setLoadingPreferences(false);
        }
    })
    useInterval( () => {
        // interval should run every 10 minutes (600000 milliseconds) to check JWT status
        let millisecondsLeft = JWTTimeLeft();
        // if we have 30min left of our token, prompt the user to extend. 30 min is 1,800,000 milliseconds
        //console.log("jwt time left: ", millisecondsLeft)
        if(millisecondsLeft <= 1800000 && !openRefreshDialog && me.loggedIn){
            if(isJWTValid()){
                setOpenRefreshDialog(true);
            }else{
                FailedRefresh();
            }
        }
    }, 600000, mountedRef, mountedRef);
    React.useEffect( () => {
        if(me.loggedIn){
            setLoadingPreferences(true);
            getUserPreferences();
        } else {
            setLoadingPreferences(false);
        }
    }, [me.loggedIn])
    if(loadingPreference){
        // make sure we've loaded preferences before loading actual app content
        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={theme}>
                    <GlobalStyles theme={theme} />
                    <CssBaseline />
                </ThemeProvider>
            </StyledEngineProvider>
        )
    }
    const background = theme.palette.background.image !== null ? {
        backgroundImage: "linear-gradient(" + theme.palette.background.default + "99" + "," + theme.palette.background.default + "99" + ")," + theme.palette.background.image ,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%"
    } : {
        backgroundColor: theme.palette.background.default
    };
    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <GlobalStyles theme={theme} />
                <CssBaseline />
                <MeContext.Provider value={me}>
                    <Tooltip id={"my-tooltip"} style={{zIndex: 100000, wordBreak: "break-word", maxWidth: "80%", whiteSpace: "pre-wrap"}}/>
                    <ToastContainer limit={2} autoClose={3000}
                                    theme={themeMode}
                                    hideProgressBar={true}
                                    newestOnTop={true}
                                    stacked={false}
                                    style={{maxWidth: "100%", minWidth: "40%", display: "flex", flexWrap: "wrap",
                                    wordBreak: "break-all", flexDirection: "column", justifyContent: "center",}}
                                    pauseOnFocusLoss={false}
                    />
                    <div style={{ maxHeight: '100%', height: '100%', display: 'flex', flexDirection: 'row', maxWidth: "100%", width:"100%",
                        ...background}}>
                        {openRefreshDialog &&
                            <MythicDialog fullWidth={true} maxWidth="sm" open={openRefreshDialog}
                                          onClose={()=>{setOpenRefreshDialog(false);}}
                                          innerDialog={<RefreshTokenDialog
                                              onClose={()=>{setOpenRefreshDialog(false);}} />}
                            />
                        }
                        {me.loggedIn && me.user !== undefined && me.user !== null &&
                            <TopAppBarVertical me={me} toggleTheme={themeToggler} />
                        }
                        <div style={{
                            maxHeight: '100%',
                            flexGrow: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: "hidden",
                        }}>
                            <div style={{height: me.loggedIn ? "2px" : 0, width: "100%",  background: me.loggedIn ? `linear-gradient(90deg, ${theme.topAppBarColor}, ${theme.topAppBarBottomColor})` : ""}}/>
                            {me.loggedIn && me?.user?.current_operation_banner_text !== "" &&
                                <Typography style={{
                                    backgroundColor: me?.user?.current_operation_banner_color,
                                    width: "100%",
                                    textAlign: "center",
                                    fontWeight: "600",
                                    color: "white",
                                    borderBottom: `1px solid ${theme.borderColor}`,
                                    fontSize: theme.typography.pxToRem(12),
                                    lineHeight: "24px",
                                }}>
                                    {me?.user?.current_operation_banner_text}
                                </Typography>
                            }
                            {me.loggedIn && me?.badConnection
                                &&
                                <Typography style={{
                                    backgroundColor: theme.palette.error.main,
                                    width: "100%",
                                    textAlign: "center",
                                    fontWeight: "600",
                                    color: "white",
                                    borderBottom: `1px solid ${theme.borderColor}`,
                                    fontSize: theme.typography.pxToRem(12),
                                    lineHeight: "24px",
                                }}>
                                    {"Can't connect to Mythic. Please check connection and refresh"}
                                </Typography>
                            }
                            <div style={{
                                margin: '0px 0px 0px 0px',
                                flexGrow: 1,
                                display: "flex",
                                flexDirection: 'column',
                                overflow:"hidden"
                            }}>
                                <Routes>
                                    <Route path='/new/login' element={<LoginForm me={me}/>}/>
                                    <Route path='/new/invite' element={<InviteForm me={me}/>}/>
                                    <Route path='/' element={<LoggedInRoute me={me}><Home me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new'
                                           element={<LoggedInRoute me={me}><Home me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/settings'
                                           element={<LoggedInRoute me={me}><Settings me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/payloadtypes'
                                           element={<LoggedInRoute me={me}><PayloadTypesC2Profiles
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/eventfeed'
                                           element={<LoggedInRoute me={me}><EventFeed me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/createpayload'
                                           element={<LoggedInRoute me={me}><CreatePayload me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/createwrapper'
                                           element={<LoggedInRoute me={me}><CreatePayloadWrapper
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/payloads'
                                           element={<LoggedInRoute me={me}><Payloads me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/c2profiles'
                                           element={<LoggedInRoute me={me}><PayloadTypesC2Profiles
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/services/'
                                           element={<LoggedInRoute me={me}><PayloadTypesC2Profiles
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/callbacks'
                                           element={<LoggedInRoute me={me}><Callbacks me={me}/></LoggedInRoute>}/>
                                    <Route path='/new/search'
                                           element={<LoggedInRoute me={me}><Search history={props.history}
                                                                                   me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/browserscripts'
                                           element={<LoggedInRoute me={me}><BrowserScripts me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/task/:taskId'
                                           element={<LoggedInRoute me={me}><SingleTaskView me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/tasks/by_range'
                                           element={<LoggedInRoute me={me}><SingleTaskView me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/operations'
                                           element={<LoggedInRoute me={me}><Operations me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/callbacks/:callbackDisplayId'
                                           element={<LoggedInRoute me={me}><ExpandedCallback
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/reporting'
                                           element={<LoggedInRoute me={me}><Reporting me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/mitre'
                                           element={<LoggedInRoute me={me}><MitreAttack me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/tagtypes'
                                           element={<LoggedInRoute me={me}><Tags me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/eventing'
                                           element={<LoggedInRoute me={me}><Eventing me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/jupyter' element={<LoggedInRoute me={me}><Jupyter/></LoggedInRoute>}/>
                                    <Route exact path='/new/hasura' element={<LoggedInRoute me={me}><Hasura/></LoggedInRoute>}/>
                                </Routes>
                            </div>
                        </div>
                    </div>
                </MeContext.Provider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
