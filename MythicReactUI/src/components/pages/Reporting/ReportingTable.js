import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import {alpha, useTheme} from '@mui/material/styles';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CodeIcon from '@mui/icons-material/Code';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TerminalIcon from '@mui/icons-material/Terminal';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {
    MythicTableToolbar,
    MythicTableToolbarGroup,
    MythicToolbarButton,
    MythicToolbarMenuItem,
    MythicToolbarSelect
} from "../../MythicComponents/MythicTableToolbar";
import {snackActions} from '../../utilities/Snackbar';
import {useMutation, gql, useSubscription} from '@apollo/client';
import {MythicSnackDownload} from '../../MythicComponents/MythicSnackDownload';
import {getSkewedNow} from "../../utilities/Time";

const generateReportMutation = gql`
mutation generateReportMutation($outputFormat: String!, $includeMITREPerTask: Boolean!, $includeMITREOverall: Boolean!, $excludedUsers: String!, $excludedHosts: String!, $excludedIDs: String!, $includeOutput: Boolean!){
    generateReport(outputFormat: $outputFormat, includeMITREPerTask: $includeMITREPerTask, includeMITREOverall: $includeMITREOverall, excludedUsers: $excludedUsers, excludedHosts: $excludedHosts, excludedIDs: $excludedIDs, includeOutput: $includeOutput){
        status
        error
    }
}
`;
const generatedReportSubscription = gql`
subscription generatedReportEventSubscription($fromNow: timestamp!){
    operationeventlog_stream(batch_size: 1, where: {source: {_eq: "generated_report"}}, cursor: {initial_value: {timestamp: $fromNow}}) {
        message
    }
}
`;

const outputOptions = ["html", "json"];

const reportPanelSx = (theme) => ({
    backgroundColor: theme.surfaces?.raised || theme.palette.background.paper,
    border: `1px solid ${theme.table?.borderSoft || theme.borderColor}`,
    borderRadius: `${theme.shape.borderRadius}px`,
    boxShadow: theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "0 1px 2px rgba(15,23,42,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 0.75,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    p: 0.75,
});

const panelHeaderSx = (theme) => ({
    alignItems: {xs: "stretch", md: "center"},
    backgroundImage: theme.gradients?.sectionHeader,
    border: `1px solid ${theme.table?.borderSoft || theme.borderColor}`,
    borderRadius: `${theme.shape.borderRadius}px`,
    display: "flex",
    flexWrap: "wrap",
    gap: 0.75,
    justifyContent: "space-between",
    minWidth: 0,
    p: "0.65rem 0.75rem",
});

const optionGridSx = {
    display: "grid",
    gap: 0.75,
    gridTemplateColumns: {xs: "1fr", lg: "minmax(0, 1.05fr) minmax(20rem, 0.95fr)"},
    minWidth: 0,
};

const sectionSx = (theme) => ({
    backgroundColor: theme.palette.mode === "dark" ? alpha(theme.palette.common.white, 0.025) : alpha(theme.palette.common.black, 0.012),
    border: `1px solid ${theme.table?.borderSoft || theme.borderColor}`,
    borderRadius: `${theme.shape.borderRadius}px`,
    display: "flex",
    flexDirection: "column",
    gap: 0.55,
    minWidth: 0,
    p: 0.75,
});

const optionRowSx = (theme, disabled) => ({
    alignItems: "center",
    backgroundColor: disabled ? alpha(theme.palette.text.disabled, 0.04) : (theme.palette.mode === "dark" ? alpha(theme.palette.common.white, 0.035) : alpha(theme.palette.common.black, 0.018)),
    border: `1px solid ${disabled ? alpha(theme.palette.text.disabled, 0.12) : (theme.table?.borderSoft || theme.borderColor)}`,
    borderRadius: `${theme.shape.borderRadius}px`,
    display: "grid",
    gap: 0.75,
    gridTemplateColumns: "2rem minmax(0, 1fr) auto",
    minWidth: 0,
    opacity: disabled ? 0.72 : 1,
    p: "0.55rem 0.65rem",
});

const iconSx = (theme, tone = "info") => {
    const color = theme.palette[tone]?.main || theme.palette.info.main;
    return {
        alignItems: "center",
        backgroundColor: alpha(color, theme.palette.mode === "dark" ? 0.18 : 0.1),
        border: `1px solid ${alpha(color, theme.palette.mode === "dark" ? 0.42 : 0.28)}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        color,
        display: "inline-flex",
        height: 30,
        justifyContent: "center",
        width: 30,
    };
};

const ReportOptionRow = ({checked, description, disabled = false, icon, onChange, title, tone}) => {
    const theme = useTheme();
    return (
        <Box sx={optionRowSx(theme, disabled)}>
            <Box sx={iconSx(theme, tone)}>
                {icon}
            </Box>
            <Box sx={{minWidth: 0}}>
                <Typography component="div" sx={{color: disabled ? "text.secondary" : "text.primary", fontSize: "0.82rem", fontWeight: 800, lineHeight: 1.25}}>
                    {title}
                </Typography>
                <Typography component="div" sx={{color: "text.secondary", fontSize: "0.72rem", fontWeight: 600, lineHeight: 1.35, mt: 0.2}}>
                    {description}
                </Typography>
            </Box>
            <Switch
                checked={checked}
                disabled={disabled}
                inputProps={{'aria-label': title}}
                onChange={onChange}
                size="small"
            />
        </Box>
    );
};

export function ReportingTable(){
    const theme = useTheme();
    const fromNow = React.useRef((getSkewedNow()).toISOString());
    const [selectedOutputFormat, setSelectedOutputFormat] = React.useState("html");
    const [includeMITREPerTask, setIncludeMITREPerTask] = React.useState(false);
    const [includeMITREOverview, setIncludeMITREOverview] = React.useState(false);
    const [includeOutput, setIncludeOutput] = React.useState(false);
    const [excludedCallbackHost, setExcludedCallbackHost] = React.useState("");
    const [excludedCallbackUser, setExcludedCallbackUser] = React.useState("");
    const [excludedCallbackID, setExcludedCallbackID] = React.useState("");
    const [generateReport, {loading: generating}] = useMutation(generateReportMutation, {
        onCompleted: (data) => {
            if(data.generateReport.status === "success"){
                snackActions.info("Generating report...");
                snackActions.info("Final reports are always available via the 'Uploads' tab within 'Search'");
            }else{
                snackActions.error(data.generateReport.error);
            }
        },
        onError: (data) => {
            snackActions.error(data.message || data);
        }
    });
    useSubscription(generatedReportSubscription, {
        variables: {fromNow: fromNow.current},
        fetchPolicy: "no-cache",
        onError: () => {
            snackActions.warning("Failed to get notifications for generated reports");
        },
        onSubscriptionData: ({subscriptionData}) => {
            if(subscriptionData?.data?.operationeventlog_stream?.length > 0){
                const dataUUID = subscriptionData.data.operationeventlog_stream[0].message.split(":").pop().trim();
                snackActions.success(<MythicSnackDownload title="Download Generated Report" file_id={dataUUID} />, {toastId: dataUUID, autoClose: false, closeOnClick: false});
            }
        }
    });
    const setOutputFormat = (evt) => {
        setSelectedOutputFormat(evt.target.value);
        if(evt.target.value !== "json"){
            setIncludeOutput(false);
        }
    };
    const onGenerateReport = () => {
        generateReport({variables: {
            outputFormat: selectedOutputFormat,
            includeMITREOverall: includeMITREOverview,
            includeMITREPerTask,
            includeOutput,
            excludedUsers: excludedCallbackUser,
            excludedHosts: excludedCallbackHost,
            excludedIDs: excludedCallbackID
        }});
    };
    const enabledSectionCount = [includeMITREPerTask, includeMITREOverview, includeOutput].filter(Boolean).length;
    const hasExclusions = Boolean(excludedCallbackHost || excludedCallbackUser || excludedCallbackID);

    return (
        <Paper elevation={0} sx={reportPanelSx(theme)}>
            <Box sx={panelHeaderSx(theme)}>
                <Box sx={{minWidth: 0}}>
                    <Typography component="h2" sx={{color: "text.primary", fontSize: "0.92rem", fontWeight: 850, lineHeight: 1.2}}>
                        Generation Settings
                    </Typography>
                    <Typography component="div" sx={{color: "text.secondary", fontSize: "0.74rem", fontWeight: 650, lineHeight: 1.35, mt: 0.2}}>
                        Report sections, output format, and callback exclusions.
                    </Typography>
                </Box>
            </Box>

            <MythicTableToolbar>
                <MythicTableToolbarGroup label="Output format" style={{minWidth: "11rem"}}>
                    <MythicToolbarSelect
                        value={selectedOutputFormat}
                        onChange={setOutputFormat}
                    >
                        {outputOptions.map((opt) => (
                            <MythicToolbarMenuItem key={opt} value={opt}>{opt.toUpperCase()}</MythicToolbarMenuItem>
                        ))}
                    </MythicToolbarSelect>
                </MythicTableToolbarGroup>
                <MythicTableToolbarGroup label="Actions">
                    <MythicToolbarButton
                        className="mythic-action-tone-hover mythic-tone-success"
                        disabled={generating}
                        onClick={onGenerateReport}
                        startIcon={<PlayCircleOutlineIcon fontSize="small" />}
                        variant="outlined"
                    >
                        {generating ? "Generating..." : "Start Generating"}
                    </MythicToolbarButton>
                </MythicTableToolbarGroup>
            </MythicTableToolbar>

            <Box sx={optionGridSx}>
                <Box sx={sectionSx(theme)}>
                    <Typography component="h3" sx={{color: "text.primary", fontSize: "0.8rem", fontWeight: 850, lineHeight: 1.2}}>
                        Report Sections
                    </Typography>
                    <ReportOptionRow
                        checked={includeMITREPerTask}
                        description="Include ATT&CK coverage alongside each task."
                        icon={<FactCheckOutlinedIcon fontSize="small" />}
                        onChange={() => setIncludeMITREPerTask(!includeMITREPerTask)}
                        title="MITRE ATT&CK Per Task"
                        tone="info"
                    />
                    <ReportOptionRow
                        checked={includeMITREOverview}
                        description="Include an operation-level ATT&CK coverage summary."
                        icon={<ShieldOutlinedIcon fontSize="small" />}
                        onChange={() => setIncludeMITREOverview(!includeMITREOverview)}
                        title="MITRE ATT&CK Overview"
                        tone="info"
                    />
                    <ReportOptionRow
                        checked={includeOutput}
                        description="Include command output in JSON reports."
                        disabled={selectedOutputFormat !== "json"}
                        icon={<TerminalIcon fontSize="small" />}
                        onChange={() => setIncludeOutput(!includeOutput)}
                        title="Command Output"
                        tone="warning"
                    />
                </Box>

                <Box sx={sectionSx(theme)}>
                    <Typography component="h3" sx={{color: "text.primary", fontSize: "0.8rem", fontWeight: 850, lineHeight: 1.2}}>
                        Callback Exclusions
                    </Typography>
                    <Box sx={{display: "grid", gap: 0.55, gridTemplateColumns: "1fr", minWidth: 0}}>
                        <Box sx={{alignItems: "center", display: "grid", gap: 0.65, gridTemplateColumns: {xs: "1fr", sm: "2rem minmax(0, 1fr)"}, minWidth: 0}}>
                            <Box sx={iconSx(theme, "info")}><PersonSearchIcon fontSize="small" /></Box>
                            <MythicTextField
                                marginBottom="0px"
                                marginTop="0px"
                                name={"Excluded Usernames"}
                                onChange={(name, value) => setExcludedCallbackUser(value)}
                                value={excludedCallbackUser}
                            />
                        </Box>
                        <Box sx={{alignItems: "center", display: "grid", gap: 0.65, gridTemplateColumns: {xs: "1fr", sm: "2rem minmax(0, 1fr)"}, minWidth: 0}}>
                            <Box sx={iconSx(theme, "info")}><ManageSearchIcon fontSize="small" /></Box>
                            <MythicTextField
                                marginBottom="0px"
                                marginTop="0px"
                                name={"Excluded Hostnames"}
                                onChange={(name, value) => setExcludedCallbackHost(value)}
                                value={excludedCallbackHost}
                            />
                        </Box>
                        <Box sx={{alignItems: "center", display: "grid", gap: 0.65, gridTemplateColumns: {xs: "1fr", sm: "2rem minmax(0, 1fr)"}, minWidth: 0}}>
                            <Box sx={iconSx(theme, "info")}><CodeIcon fontSize="small" /></Box>
                            <MythicTextField
                                marginBottom="0px"
                                marginTop="0px"
                                name={"Excluded Callback IDs"}
                                onChange={(name, value) => setExcludedCallbackID(value)}
                                value={excludedCallbackID}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
}
