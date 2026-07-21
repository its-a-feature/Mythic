import { LoggedInRoute } from './utilities/LoggedInRoute';
import React, {createContext} from 'react';
import {Button, Typography} from '@mui/material';
import { useReactiveVar } from '@apollo/client';
import { useDarkMode } from './utilities/useDarkMode';
import { alpha, createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { COLOR_LEVELS, ThemeVariables } from '../themes/GlobalStyles';
import '../themes/GlobalStyles.css';
import CssBaseline from '@mui/material/CssBaseline';
import {FailedRefresh, mePreferences, meState, operatorSettingDefaults} from '../cache';
import { Tooltip } from 'react-tooltip';
import {useLazyQuery, gql } from '@apollo/client';
//background-color: #282c34;
import { Route, Routes } from 'react-router-dom';
import { useInterval } from './utilities/Time';
import { JWTTimeLeft, isJWTValid, restartWebsockets } from '../index';
import { RefreshTokenDialog } from './RefreshTokenDialog';
import { MythicDialog } from './MythicComponents/MythicDialogBase';
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import {snackActions} from "./utilities/Snackbar";
import {TopAppBarVertical} from "./TopAppBarVertical";
import {MythicLoadingState} from "./MythicComponents/MythicStateDisplay";
import { library } from '@fortawesome/fontawesome-svg-core';
import {
    currentOperationSyncGeneration,
    hasMythicConnectionError,
    mythicConnectionState,
    websocketConnectionGeneration,
} from "./utilities/MythicConnection";
import {syncCurrentOperationUser} from "../userState";

const lazyNamed = (importer, exportName) => React.lazy(() =>
    importer().then((module) => ({default: module[exportName]}))
);

const LoginForm = lazyNamed(() => import('./pages/Login/LoginForm'), 'LoginForm');
const InviteForm = lazyNamed(() => import('./pages/Login/InviteForm'), 'InviteForm');
const Settings = lazyNamed(() => import('./pages/Settings/Settings'), 'Settings');
const PayloadTypesC2Profiles = lazyNamed(() => import('./pages/PayloadTypesC2Profiles/PayloadTypesC2Profiles'), 'PayloadTypesC2Profiles');
const CreatePayload = lazyNamed(() => import('./pages/CreatePayload/CreatePayload'), 'CreatePayload');
const CreatePayloadWrapper = lazyNamed(() => import('./pages/CreateWrapper/CreatePayload'), 'CreatePayloadWrapper');
const EventFeed = lazyNamed(() => import('./pages/EventFeed/EventFeed'), 'EventFeed');
const Operations = lazyNamed(() => import('./pages/Operations/Operations'), 'Operations');
const BrowserScripts = lazyNamed(() => import('./pages/BrowserScripts/BrowserScripts'), 'BrowserScripts');
const Payloads = lazyNamed(() => import('./pages/Payloads/Payloads'), 'Payloads');
const ExpandedCallback = lazyNamed(() => import('./pages/ExpandedCallback/ExpandedCallback'), 'ExpandedCallback');
const Home = lazyNamed(() => import('./pages/Home/Home'), 'Home');
const Callbacks = lazyNamed(() => import('./pages/Callbacks/Callbacks'), 'Callbacks');
const Search = lazyNamed(() => import('./pages/Search/Search'), 'Search');
const SingleTaskView = lazyNamed(() => import('./pages/SingleTaskView/SingleTaskView'), 'SingleTaskView');
const Reporting = lazyNamed(() => import('./pages/Reporting/Reporting'), 'Reporting');
const MitreAttack = lazyNamed(() => import('./pages/MITRE_ATTACK/MitreAttack'), 'MitreAttack');
const Tags = lazyNamed(() => import('./pages/Tags/Tags'), 'Tags');
const Eventing = lazyNamed(() => import('./pages/Eventing/Eventing'), 'Eventing');
const Chat = lazyNamed(() => import('./pages/Chat/Chat'), 'Chat');
const Jupyter = lazyNamed(() => import('./pages/Jupyter/Jupyter'), 'Jupyter');
const Hasura = lazyNamed(() => import('./pages/Hasura/Hasura'), 'Hasura');

let fontAwesomeCatalogPromise = null;
const loadFontAwesomeCatalog = () => {
    if(!fontAwesomeCatalogPromise){
        fontAwesomeCatalogPromise = import('@fortawesome/free-solid-svg-icons').then((icons) => {
            const iconList = Object.keys(icons)
                .filter((key) => key !== "fas" && key !== "prefix")
                .map((icon) => icons[icon]);
            library.add(...iconList);
        });
    }
    return fontAwesomeCatalogPromise;
};

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

const currentOperationQuery = gql`
query SyncCurrentOperation($operator_id: Int!) {
    operator_by_pk(id: $operator_id) {
        current_operation_id
        operation {
            name
            complete
            banner_text
            banner_color
        }
    }
}
`;

const normalizeBackgroundImageValue = (value) => {
    if(typeof value !== "string" || value.length === 0){
        return null;
    }
    if(value.startsWith("data:image/")){
        return `url("${value}")`;
    }
    if(value.startsWith("url(\"data:image/") && !value.endsWith("\")")){
        return `${value}")`;
    }
    if(value.startsWith("url(data:image/") && !value.endsWith(")")){
        return `${value})`;
    }
    return value;
}

const getModernThemeAdditions = (themeMode, preferences = operatorSettingDefaults) => {
    const isDark = themeMode === "dark";
    const mode = isDark ? "dark" : "light";
    const safePreferences = preferences || operatorSettingDefaults;
    const [colorLevel1, colorLevel2, colorLevel3] = COLOR_LEVELS[mode];
    const getColor = (key) => {
        return safePreferences?.palette?.[key]?.[mode] || operatorSettingDefaults.palette[key][mode];
    };
    const textPrimary = getColor("text");
    const textSecondary = getColor("textSecondary");
    const borderColor = getColor("borderColor");
    const backgroundDefault = getColor("background");
    const backgroundPaper = getColor("paper");
    const backgroundContrast = safePreferences?.palette?.background?.[isDark ? "light" : "dark"] ||
        operatorSettingDefaults.palette.background[isDark ? "light" : "dark"];
    const surfaceRaised = getColor("surfaceRaised");
    const surfaceMuted = getColor("surfaceMuted");
    const navBackground = getColor("navBarColor");
    const navAccent = getColor("navBarBottomColor");
    const navText = getColor("navBarText");
    const navIcon = getColor("navBarIcons");
    const primary = getColor("primary");
    const info = getColor("info");
    const warning = getColor("warning");
    const error = getColor("error");
    const sectionHeaderAccent = getColor("sectionHeaderAccent");
    const sectionHeaderGradientStart = getColor("sectionHeaderGradientStart");
    const sectionHeaderGradientMiddle = getColor("sectionHeaderGradientMiddle");
    const sectionHeaderGradientEnd = getColor("sectionHeaderGradientEnd");
    const subtleAccentGradientStart = getColor("subtleAccentGradientStart");
    const subtleAccentGradientEnd = getColor("subtleAccentGradientEnd");
    const chartSeriesColors = Array.from({length: 10}, (_, index) => getColor(`chartSeries${index + 1}`));
    const tableHeaderColor = getColor("tableHeader");
    const tableHoverColor = getColor("tableHover");
    const tableRowStripeColor = alpha(tableHoverColor, colorLevel2);
    const tableRowHoverColor = tableHoverColor;
    const hoverColor = tableRowHoverColor;
    const tableSelectedColor = getColor("selectedCallbackColor");
    const tableSelectedHierarchyColor = getColor("selectedCallbackHierarchyColor");
    const tableBorderSoft = alpha(borderColor, isDark ? 0.67 : 0.8);

    return {
        shape: {
            borderRadius: 6,
        },
        pageHeaderText: {
            main: getColor("pageHeaderText"),
        },
        gradients: {
            sectionHeader: `linear-gradient(90deg, ${sectionHeaderGradientStart} 0%, ${sectionHeaderGradientMiddle} 48%, ${sectionHeaderGradientEnd} 100%)`,
            subtleAccent: `linear-gradient(135deg, ${subtleAccentGradientStart} 0%, ${subtleAccentGradientEnd} 62%)`,
            subtleAccentHorizontal: `linear-gradient(90deg, ${subtleAccentGradientStart} 0%, ${subtleAccentGradientEnd} 100%)`,
        },
        navigation: {
            background: `linear-gradient(180deg, ${navBackground}, ${navAccent})`,
            backgroundColor: navBackground,
            border: borderColor,
            hover: alpha(navText, colorLevel1),
            selected: alpha(primary, colorLevel2),
            text: navText,
            icon: navIcon,
            muted: alpha(navText, 0.7),
            accent: navAccent,
        },
        sectionHeader: {
            accent: sectionHeaderAccent,
            gradientStart: sectionHeaderGradientStart,
            gradientMiddle: sectionHeaderGradientMiddle,
            gradientEnd: sectionHeaderGradientEnd,
        },
        chartSeriesColors,
        surfaces: {
            app: backgroundDefault,
            paper: backgroundPaper,
            raised: surfaceRaised,
            muted: surfaceMuted,
            hover: tableRowHoverColor,
            selected: tableSelectedColor,
        },
        chat: {
            message: {
                operatorBackground: getColor("chatMessageOperatorBackground"),
                selfBackground: getColor("chatMessageSelfBackground"),
                systemBackground: getColor("chatMessageSystemBackground"),
                markdownSurface: getColor("chatMarkdownSurfaceBackground"),
                markdownSurfaceStrong: getColor("chatMarkdownSurfaceStrongBackground"),
            },
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
                        backgroundColor: backgroundPaper,
                        backgroundImage: "none",
                        border: `1px solid ${borderColor}`,
                        borderRadius: 6,
                        boxShadow: "none",
                        "& > .MuiBox-root:first-of-type": {
                            margin: 0,
                            minHeight: "2rem",
                            padding: "0 0 0 0.25rem",
                        },
                        "& > .MuiBox-root > *": {
                            margin: 0,
                            minHeight: "2rem",
                            padding: "0 3.75rem 0 0.25rem",
                        },
                    },
                },
            },
            MuiButton: {
                defaultProps: {
                    color: "inherit",
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
                        zIndex: 1,
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
                        padding: "0.625rem 0.875rem",
                        fontSize: "1rem",
                        fontWeight: 650,
                        borderBottom: `1px solid ${borderColor}`,
                    },
                },
            },
            MuiDialogContent: {
                styleOverrides: {
                    root: {
                        padding: "0.75rem 0.875rem",
                    },
                },
            },
            MuiDialogContentText: {
                styleOverrides: {
                    root: {
                        color: textSecondary,
                        fontSize: "0.88rem",
                        lineHeight: 1.45,
                        margin: "0 0 0.625rem",
                    },
                },
            },
            MuiDialogActions: {
                styleOverrides: {
                    root: {
                        alignItems: "center",
                        backgroundColor: surfaceMuted,
                        borderTop: `1px solid ${borderColor}`,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        justifyContent: "flex-end",
                        margin: 0,
                        padding: "0.625rem 0.875rem",
                        "& > :not(style) ~ :not(style)": {
                            marginLeft: 0,
                        },
                        "& .MuiButton-root": {
                            alignItems: "center",
                            backgroundColor: alpha(textPrimary, isDark ? 0.06 : 0.04),
                            border: `1px solid ${tableBorderSoft}`,
                            borderRadius: 6,
                            boxShadow: "none",
                            color: textPrimary,
                            fontSize: "0.78rem",
                            fontWeight: 750,
                            justifyContent: "center",
                            letterSpacing: 0,
                            lineHeight: 1.2,
                            minHeight: 34,
                            minWidth: "min(100%, 7rem)",
                            padding: "0.375rem 0.875rem",
                            textTransform: "none",
                            whiteSpace: "nowrap",
                        },
                        "& .MuiButton-root:hover": {
                            backgroundColor: alpha(textPrimary, isDark ? 0.10 : 0.07),
                            borderColor,
                        },
                        "& .MuiButton-root.MuiButton-colorSuccess, & .MuiButton-root.MuiButton-containedSuccess, & .MuiButton-root.MuiButton-outlinedSuccess": {
                            backgroundColor: primary,
                            borderColor: primary,
                            color: "var(--mythic-color-on-primary)",
                        },
                        "& .MuiButton-root.MuiButton-colorWarning, & .MuiButton-root.MuiButton-containedWarning, & .MuiButton-root.MuiButton-outlinedWarning": {
                            backgroundColor: alpha(warning, colorLevel1),
                            borderColor: alpha(warning, colorLevel3),
                            color: warning,
                        },
                        "& .MuiButton-root.MuiButton-colorError, & .MuiButton-root.MuiButton-containedError, & .MuiButton-root.MuiButton-outlinedError": {
                            backgroundColor: alpha(error, colorLevel1),
                            borderColor: alpha(error, colorLevel3),
                            color: error,
                        },
                        "& .MuiButton-root.MuiButton-colorInfo, & .MuiButton-root.MuiButton-containedInfo, & .MuiButton-root.MuiButton-outlinedInfo": {
                            backgroundColor: alpha(info, colorLevel1),
                            borderColor: alpha(info, colorLevel2),
                            color: info,
                        },
                        "& .MuiButton-root.Mui-disabled": {
                            backgroundColor: alpha(textPrimary, isDark ? 0.035 : 0.025),
                            borderColor: tableBorderSoft,
                            color: getColor("textDisabled"),
                        },
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
                    input: {
                        borderColor,
                    },
                },
            },
            MuiFormLabel: {
                styleOverrides: {
                    root: {
                        background: "transparent",
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
                    flexContainer: {
                        flexWrap: "wrap",
                    },
                    scrollButtons: {
                        width: "unset",
                        "&.Mui-disabled": {
                            opacity: 0.3,
                        },
                    },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        minHeight: 34,
                        minWidth: "unset",
                        maxWidth: "unset",
                        padding: "0.375rem 0.625rem",
                        textTransform: "none",
                        fontSize: "0.82rem",
                        fontWeight: 650,
                        letterSpacing: 0,
                        whiteSpace: "unset",
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
                        backgroundColor: backgroundPaper,
                        backgroundImage: "none",
                        border: `1px solid ${borderColor}`,
                        borderRadius: 6,
                        lineHeight: "1.75rem",
                    },
                },
            },
            MuiListItem: {
                styleOverrides: {
                    root: {
                        "&:hover": {
                            backgroundColor: tableRowHoverColor,
                            color: textPrimary,
                        },
                    },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        backgroundColor: backgroundContrast,
                        borderRadius: 6,
                        boxShadow: isDark ? "0 8px 18px rgba(0,0,0,0.22)" : "0 8px 18px rgba(15,23,42,0.10)",
                        color: isDark ? "#000" : "#fff",
                        fontSize: 13,
                    },
                    arrow: {
                        color: backgroundContrast,
                    },
                },
            },
            MuiAccordion: {
                styleOverrides: {
                    root: {
                        border: 0,
                        boxShadow: "none",
                        "&:before": {
                            display: "none",
                        },
                    },
                },
            },
            MuiAccordionDetails: {
                styleOverrides: {
                    root: {
                        paddingBottom: 0,
                        paddingTop: 0,
                    },
                },
            },
            MuiAccordionSummary: {
                styleOverrides: {
                    root: {
                        "&.Mui-expanded": {
                            minHeight: "unset",
                        },
                    },
                    content: {
                        "&.Mui-expanded": {
                            margin: 0,
                            minHeight: "unset",
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
            MuiSelect: {
                styleOverrides: {
                    select: {
                        paddingLeft: "0.625rem",
                    },
                    outlined: {
                        borderColor,
                    },
                },
            },
            MuiTreeItem: {
                styleOverrides: {
                    label: {
                        ".MuiTreeItem-root.Mui-selected > .MuiTreeItem-content &, .MuiTreeItem-root.Mui-selected:hover > .MuiTreeItem-content &, .MuiTreeItem-root:hover > .MuiTreeItem-content &": {
                            backgroundColor: "transparent",
                        },
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
                        padding: "0.375rem 0.625rem",
                        verticalAlign: "middle",
                        "&:first-of-type": {
                            paddingLeft: "0.75rem",
                        },
                        "&:last-of-type": {
                            paddingRight: "0.75rem",
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
                        paddingLeft: "0.375rem",
                        paddingRight: "0.375rem",
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
                        gap: "0.25rem",
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
                            backgroundColor: alpha(primary, colorLevel1),
                            borderColor: primary,
                            color: textPrimary,
                            "&:hover": {
                                backgroundColor: alpha(primary, colorLevel2),
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
                        gap: "0.375rem",
                        minHeight: 32,
                        padding: "0.375rem 0.625rem",
                        textTransform: "none",
                        "&:hover": {
                            backgroundColor: tableRowHoverColor,
                            color: textPrimary,
                        },
                        "&.Mui-selected": {
                            backgroundColor: alpha(primary, colorLevel1),
                            borderColor: primary,
                            color: textPrimary,
                            "&:hover": {
                                backgroundColor: alpha(primary, colorLevel2),
                            },
                        },
                    },
                    sizeSmall: {
                        minHeight: 30,
                    },
                },
            },
        },
    };
};


export function App(props) {
    const [, setFontAwesomeCatalogReady] = React.useState(false);
    React.useEffect(() => {
        let mounted = true;
        loadFontAwesomeCatalog().then(() => {
            if(mounted){
                setFontAwesomeCatalogReady(true);
            }
        }).catch((error) => console.error("Failed to load Font Awesome icon catalog", error));
        return () => {mounted = false;};
    }, []);
    const me = useReactiveVar(meState);
    const websocketGeneration = useReactiveVar(websocketConnectionGeneration);
    const operationSyncGeneration = useReactiveVar(currentOperationSyncGeneration);
    const [getCurrentOperation] = useLazyQuery(currentOperationQuery, {
        fetchPolicy: "no-cache",
        context: {suppressErrorSnackbar: true},
    });
    React.useEffect(() => {
        let cancelled = false;
        if(!me?.loggedIn || !me?.user?.user_id){
            return () => {cancelled = true;};
        }
        getCurrentOperation({variables: {operator_id: me.user.user_id}}).then(({data}) => {
            if(cancelled){
                return;
            }
            const currentMe = meState();
            if(currentMe.user?.user_id !== me.user.user_id){
                return;
            }
            const synced = syncCurrentOperationUser(
                currentMe.user,
                data?.operator_by_pk,
            );
            if(!synced.changed){
                return;
            }
            meState({...currentMe, user: synced.user});
            localStorage.setItem("user", JSON.stringify(synced.user));
            if(synced.operationIDChanged){
                restartWebsockets();
            }
        }).catch((error) => console.error("Failed to synchronize current operation", error));
        return () => {cancelled = true;};
    }, [getCurrentOperation, me?.loggedIn, me?.user?.user_id, operationSyncGeneration, websocketGeneration]);
    const connectionState = useReactiveVar(mythicConnectionState);
    const preferences = useReactiveVar(mePreferences);
    const [loadingPreference, setLoadingPreferences] = React.useState(true);
    const [themeMode, themeToggler] = useDarkMode();
    const themePalette = preferences?.palette;
    const themeFontFamily = preferences?.fontFamily;
    const theme = React.useMemo(
        () => {
            const preferences = {palette: themePalette, fontFamily: themeFontFamily};
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
                            image: normalizeBackgroundImageValue(themeMode === "dark" ?  preferences?.palette?.backgroundImage?.dark || operatorSettingDefaults.palette.backgroundImage.dark :
                                preferences?.palette?.backgroundImage?.light || operatorSettingDefaults.palette.backgroundImage.light),
                        },
                        text: {
                            primary: themeMode === 'dark' ? preferences?.palette?.text?.dark || operatorSettingDefaults.palette.text.dark :
                                preferences?.palette?.text?.light || operatorSettingDefaults.palette.text.light,
                            secondary: themeMode === 'dark' ? preferences?.palette?.textSecondary?.dark || operatorSettingDefaults.palette.textSecondary.dark :
                                preferences?.palette?.textSecondary?.light || operatorSettingDefaults.palette.textSecondary.light,
                            disabled: themeMode === 'dark' ? preferences?.palette?.textDisabled?.dark || operatorSettingDefaults.palette.textDisabled.dark :
                                preferences?.palette?.textDisabled?.light || operatorSettingDefaults.palette.textDisabled.light,
                            contrast: themeMode === 'dark' ? '#000' : '#fff',
                        },
                        action: {
                            hover: themeMode === 'dark' ? preferences?.palette?.tableHover?.dark || operatorSettingDefaults.palette.tableHover.dark :
                                preferences?.palette?.tableHover?.light || operatorSettingDefaults.palette.tableHover.light,
                            selected: themeMode === 'dark' ? preferences?.palette?.selectedCallbackColor?.dark || operatorSettingDefaults.palette.selectedCallbackColor.dark :
                                preferences?.palette?.selectedCallbackColor?.light || operatorSettingDefaults.palette.selectedCallbackColor.light,
                            focus: alpha(
                                themeMode === 'dark' ? preferences?.palette?.primary?.dark || operatorSettingDefaults.palette.primary.dark :
                                    preferences?.palette?.primary?.light || operatorSettingDefaults.palette.primary.light,
                                COLOR_LEVELS[themeMode][1],
                            ),
                        },
                        divider: themeMode === 'dark' ? preferences?.palette?.borderColor?.dark || operatorSettingDefaults.palette.borderColor.dark :
                            preferences?.palette?.borderColor?.light || operatorSettingDefaults.palette.borderColor.light,
                        graphGroupRGBA: themeMode === 'dark' ? `${preferences?.palette?.graphGroupColor?.dark || operatorSettingDefaults.palette.graphGroupColor.dark}80` :
                            `${preferences?.palette?.graphGroupColor?.light || operatorSettingDefaults.palette.graphGroupColor.light}80`,
                    },
                    folderColor: themeMode === 'dark' ? preferences?.palette?.folderColor?.dark || operatorSettingDefaults.palette.folderColor.dark :
                        preferences?.palette?.folderColor?.light || operatorSettingDefaults.palette.folderColor.light,
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
                        main: themeMode === 'dark' ? preferences?.palette?.pageHeaderText?.dark || operatorSettingDefaults.palette.pageHeaderText.dark :
                            preferences?.palette?.pageHeaderText?.light || operatorSettingDefaults.palette.pageHeaderText.light,
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
                console.log("error creating theme", error);
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
                            image: normalizeBackgroundImageValue(themeMode === "dark" ?  operatorSettingDefaults.palette.backgroundImage.dark :
                                operatorSettingDefaults.palette.backgroundImage.light),
                        },
                        text: {
                            primary: themeMode === 'dark' ? operatorSettingDefaults.palette.text.dark :
                                operatorSettingDefaults.palette.text.light,
                            secondary: themeMode === 'dark' ? operatorSettingDefaults.palette.textSecondary.dark :
                                operatorSettingDefaults.palette.textSecondary.light,
                            disabled: themeMode === 'dark' ? operatorSettingDefaults.palette.textDisabled.dark :
                                operatorSettingDefaults.palette.textDisabled.light,
                            contrast: themeMode === 'dark' ? '#000' : '#fff',
                        },
                        action: {
                            hover: themeMode === 'dark' ? operatorSettingDefaults.palette.tableHover.dark :
                                operatorSettingDefaults.palette.tableHover.light,
                            selected: themeMode === 'dark' ? operatorSettingDefaults.palette.selectedCallbackColor.dark :
                                operatorSettingDefaults.palette.selectedCallbackColor.light,
                            focus: alpha(
                                themeMode === 'dark' ? operatorSettingDefaults.palette.primary.dark : operatorSettingDefaults.palette.primary.light,
                                COLOR_LEVELS[themeMode][1],
                            ),
                        },
                        divider: themeMode === 'dark' ? operatorSettingDefaults.palette.borderColor.dark :
                            operatorSettingDefaults.palette.borderColor.light,
                        graphGroupRGBA: themeMode === 'dark' ? `${operatorSettingDefaults.palette.graphGroupColor.dark}80` :
                            `${operatorSettingDefaults.palette.graphGroupColor.light}80`,
                    },
                    folderColor: themeMode === 'dark' ? operatorSettingDefaults.palette.folderColor.dark :
                        operatorSettingDefaults.palette.folderColor.light,
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
                        main: themeMode === 'dark' ? operatorSettingDefaults.palette.pageHeaderText.dark :
                            operatorSettingDefaults.palette.pageHeaderText.light,
                    },
                    topAppBarColor: themeMode === 'dark' ? operatorSettingDefaults.palette.navBarColor.dark :
                        operatorSettingDefaults.palette.navBarColor.light,
                    topAppBarBottomColor: themeMode === 'dark' ? operatorSettingDefaults.palette.navBarBottomColor.dark :
                        operatorSettingDefaults.palette.navBarBottomColor.light,
                    typography: {
                        fontSize: 12,//operatorSettingDefaults?.fontSize,
                        fontFamily: operatorSettingDefaults?.fontFamily
                    },
                    taskPromptTextColor: themeMode === 'dark' ? operatorSettingDefaults.palette.taskPromptTextColor.dark :
                        operatorSettingDefaults.palette.taskPromptTextColor.light,
                    taskPromptCommandTextColor: themeMode === 'dark' ? operatorSettingDefaults.palette.taskPromptCommandTextColor.dark :
                        operatorSettingDefaults.palette.taskPromptCommandTextColor.light,
                    taskContextColor: themeMode === 'dark' ? operatorSettingDefaults.palette.taskContextColor.dark :
                        operatorSettingDefaults.palette.taskContextColor.light,
                    taskContextImpersonationColor: themeMode === 'dark' ? operatorSettingDefaults.palette.taskContextImpersonationColor.dark :
                         operatorSettingDefaults.palette.taskContextImpersonationColor.light,
                    taskContextExtraColor: themeMode === 'dark' ? operatorSettingDefaults.palette.taskContextExtraColor.dark :
                         operatorSettingDefaults.palette.taskContextExtraColor.light,
                    emptyFolderColor: themeMode === 'dark' ? operatorSettingDefaults.palette.emptyFolderColor.dark :
                        operatorSettingDefaults.palette.emptyFolderColor.light,
                    outputBackgroundColor: themeMode === 'dark' ? operatorSettingDefaults.palette.outputBackgroundColor.dark :
                        operatorSettingDefaults.palette.outputBackgroundColor.light,
                    outputTextColor: themeMode === 'dark' ? operatorSettingDefaults.palette.outputTextColor.dark :
                        operatorSettingDefaults.palette.outputTextColor.light,
                    borderColor: themeMode === 'dark' ? operatorSettingDefaults.palette.borderColor.dark :
                        operatorSettingDefaults.palette.borderColor.light,
                    ...getModernThemeAdditions(themeMode, operatorSettingDefaults),
                })
            }
        },[themeMode, themePalette, themeFontFamily]
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
                    <ThemeVariables theme={theme} />
                    <CssBaseline />
                    <div style={{width: '100%', height: '100%', display: "flex", position: "relative",}}>
                        <MythicLoadingState compact title="Loading Preferences" description="Fetching user preferences." sx={{color: "inherit"}} />
                    </div>
                </ThemeProvider>
            </StyledEngineProvider>
        )
    }
    const background = theme.palette.background.image !== null ? {
        backgroundImage: `linear-gradient(${alpha(theme.palette.background.default, 0.6)}, ${alpha(theme.palette.background.default, 0.6)}), ${theme.palette.background.image}`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%"
    } : {
        backgroundColor: theme.palette.background.default
    };
    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <ThemeVariables theme={theme} />
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
                            <TopAppBarVertical me={me} toggleTheme={themeToggler} themeMode={themeMode} />
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
                            {hasMythicConnectionError(connectionState) &&
                                <div role="alert" style={{
                                    backgroundColor: theme.palette.error.main,
                                    width: "100%",
                                    color: "white",
                                    borderBottom: `1px solid ${theme.borderColor}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexWrap: "wrap",
                                    gap: "0.25rem 0.75rem",
                                    padding: "0.25rem 0.75rem",
                                }}>
                                    <Typography component="span" style={{
                                        textAlign: "center",
                                        fontWeight: "600",
                                        fontSize: theme.typography.pxToRem(12),
                                        lineHeight: "24px",
                                    }}>
                                        {navigator.onLine === false
                                            ? "Your browser is offline. Reconnect to the network, then reload Mythic."
                                            : window.location.protocol === "https:"
                                                ? "Connection to Mythic was lost. Check the server or network. If this deployment uses a self-signed certificate, Chrome may require approval again."
                                                : "Connection to Mythic was lost. Check the server or network, then reload Mythic."}
                                    </Typography>
                                    <Button color="inherit" size="small" variant="outlined"
                                            onClick={() => window.location.reload()}
                                            sx={{fontWeight: 700, minWidth: "auto", py: 0.25}}>
                                        Reload Mythic
                                    </Button>
                                </div>
                            }
                            <div style={{
                                margin: 0,
                                flexGrow: 1,
                                display: "flex",
                                flexDirection: 'column',
                                overflow:"hidden"
                            }}>
                                <React.Suspense fallback={<div style={{height: "100%", width: "100%"}} />}>
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
                                        <Route exact path='/new/chat'
                                               element={<LoggedInRoute me={me}><Chat me={me}/></LoggedInRoute>}/>
                                        <Route exact path='/new/jupyter' element={<LoggedInRoute me={me}><Jupyter/></LoggedInRoute>}/>
                                        <Route exact path='/new/hasura' element={<LoggedInRoute me={me}><Hasura/></LoggedInRoute>}/>
                                    </Routes>
                                </React.Suspense>
                            </div>
                        </div>
                    </div>
                </MeContext.Provider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
