import React, { useEffect } from 'react';
import {Button} from '@mui/material';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MythicTextField from '../../MythicComponents/MythicTextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import {snackActions} from '../../utilities/Snackbar';
import {useMutation, gql, useSubscription} from '@apollo/client';
import { meState } from '../../../cache';
import { useReactiveVar } from '@apollo/client';
import {MythicSnackDownload} from '../../MythicComponents/MythicSnackDownload';

const generateReportMutation = gql`
mutation generateReportMutation($outputFormat: String!, $includeMITREPerTask: Boolean!, $includeMITREOverall: Boolean!, $excludedUsers: String!, $excludedHosts: String!, $excludedIDs: String!, $includeOutput: Boolean!){
    generateReport(outputFormat: $outputFormat, includeMITREPerTask: $includeMITREPerTask, includeMITREOverall: $includeMITREOverall, excludedUsers: $excludedUsers, excludedHosts: $excludedHosts, excludedIDs: $excludedIDs, includeOutput: $includeOutput){
        status
        error
    }
}
`;
const generatedReportSubscription = gql`
subscription generatedReportEventSubscription($fromNow: timestamp!, $operation_id: Int!){
    operationeventlog(limit: 1, where: {deleted: {_eq: false}, timestamp: {_gte: $fromNow}, operation_id: {_eq: $operation_id}, source: {_eq: "generated_report"}}, order_by: {id: desc}) {
        operator {
            username
        }
        message
        level
      }
}
`;
export function ReportingTable(props){
    const theme = useTheme();
    const me = useReactiveVar(meState);
    const fromNow = React.useRef( (new Date()).toISOString() );
    const [selectedOutputFormat, setSelectedOutputFormat] = React.useState("html");
    const outputOptions = ["html", "json"];
    const [includeMITREPerTask, setIncludeMITREPerTask] = React.useState(false);
    const [includeMITREOverview, setIncludeMITREOverview] = React.useState(false);
    const [includeOutput, setIncludeOutput] = React.useState(false);
    const [excludedCallbackHost, setExcludedCallbackHost] = React.useState("");
    const [excludedCallbackUser, setExcludedCallbackUser] = React.useState("");
    const [excludedCallbackID, setExcludedCallbackID] = React.useState("");
    const [generateReport] = useMutation(generateReportMutation, {
        onCompleted: (data) => {
            if(data.generateReport.status === "success"){
                snackActions.info("Generating report...");
                snackActions.info("Final reports are always available via the 'Uploads' tab within 'Search'");
            }else{
                snackActions.error(data.generateReport.error);
            }
        },
        onError: (data) => {
            snackActions.error(data);
        }
    });
    const { data } = useSubscription(generatedReportSubscription, {
        variables: {fromNow: fromNow.current, operation_id: me?.user?.current_operation_id || 0}, 
        fetchPolicy: "no-cache",
        onError: (errorData) => {
            snackActions.warning("Failed to get notifications for generated payloads");
        }
    });
    const setOutputFormat = (evt) => {
        setSelectedOutputFormat(evt.target.value);
        if(evt.target.value !== "json"){
            setIncludeOutput(false);
        }
    }
    const changeExcludedCallbackUser = (name, value, error) => {
        setExcludedCallbackUser(value);
    }
    const changeExcludedCallbackHost = (name, value, error) => {
        setExcludedCallbackHost(value);
    }
    const changeExcludedCallbackID = (name, value, error) => {
        setExcludedCallbackID(value);
    }
    const onGenerateReport = () => {
        generateReport({variables: {
            outputFormat: selectedOutputFormat,
            includeMITREOverall: includeMITREOverview,
            includeMITREPerTask,
            includeOutput,
            excludedUsers: excludedCallbackUser,
            excludedHosts: excludedCallbackHost,
            excludedIDs: excludedCallbackID
        }})
    }
    useEffect( () => {
        if(data?.operationeventlog?.length > 0){
            const dataUUID = data.operationeventlog[0].message.split(":").pop().trim();
            snackActions.success("", {persist: true, content: key => <MythicSnackDownload id={key} title="Download Generated Report" downloadLink={window.location.origin + "/api/v1.4/files/download/" + dataUUID} />});
        }
    }, [data])
    return (
        <React.Fragment>

        <TableContainer component={Paper} className="mythicElement">   
            <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "25rem"}}>Report Option</TableCell>
                        <TableCell >Selected Values</TableCell> 
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow hover>
                        <TableCell>Output Format</TableCell>
                        <TableCell>
                            <Select
                              autoFocus
                              style={{width: "100%", marginBottom: "10px"}}
                              value={selectedOutputFormat}
                              onChange={setOutputFormat}
                            >
                            {
                                outputOptions.map((opt, i) => (
                                    <MenuItem key={"outputformat" + i} value={opt}>{opt}</MenuItem>
                                ))
                            }
                            </Select>
                        </TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Include MITRE ATT&CK Coverage Per Task</TableCell>
                        <TableCell>
                            <Switch
                                checked={includeMITREPerTask}
                                onChange={evt => setIncludeMITREPerTask(!includeMITREPerTask)}
                                inputProps={{ 'aria-label': 'primary checkbox' }}
                                name="active"
                            />
                        </TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Include MITRE ATT&CK Coverage Overview</TableCell>
                        <TableCell>
                            <Switch
                                checked={includeMITREOverview}
                                onChange={evt => setIncludeMITREOverview(!includeMITREOverview)}
                                inputProps={{ 'aria-label': 'primary checkbox' }}
                                name="active"
                            />
                        </TableCell>
                    </TableRow>
                    {
                        selectedOutputFormat === "json" && 
                        <TableRow hover>
                            <TableCell>Include Command Output</TableCell>
                            <TableCell>
                                <Switch
                                    checked={includeOutput}
                                    onChange={evt => setIncludeOutput(!includeOutput)}
                                    inputProps={{ 'aria-label': 'primary checkbox' }}
                                    name="active"
                                />
                            </TableCell>
                        </TableRow>
                    }
                    <TableRow hover>
                        <TableCell>Exclude Callbacks With Matching Values</TableCell>
                        <TableCell>
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell style={{width: "10rem"}}>Exclude Users</TableCell>
                                            <TableCell>
                                                <MythicTextField onChange={changeExcludedCallbackUser} value={excludedCallbackUser} name={"Excluded Usernames"}/>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Exclude Hosts</TableCell>
                                            <TableCell>
                                                <MythicTextField onChange={changeExcludedCallbackHost} value={excludedCallbackHost} name={"Excluded Hostnames"}/>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Exclude IDs</TableCell>
                                            <TableCell>
                                                <MythicTextField onChange={changeExcludedCallbackID} value={excludedCallbackID} name={"Excluded Callback IDs"}/>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                    
                                </Table>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
        <Button variant="contained" style={{marginTop: "10px", backgroundColor: theme.palette.success.main, color: "white"}} onClick={onGenerateReport}>Generate</Button>
    </React.Fragment>
    )
}
