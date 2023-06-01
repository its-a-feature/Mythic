import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import PublicIcon from '@mui/icons-material/Public';
import { IconButton } from '@mui/material';
import { useMutation, gql } from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import SyncAltIcon from '@mui/icons-material/SyncAlt';

const testWebhookMutation = gql`
mutation testWebhookWorks($service_type: String!){
    consumingServicesTestWebhook(service_type: $service_type){
        status
        error
    }
}
`;
const testLogMutation = gql`
mutation testWebhookWorks($service_type: String!){
    consumingServicesTestLog(service_type: $service_type){
        status
        error
    }
}
`;

export function ConsumingServicesTable({servicesList}){
    const theme = useTheme();
    const [testWebhook] = useMutation(testWebhookMutation, {
        onCompleted: data => {
            if(data.consumingServicesTestWebhook.status === "success"){
                snackActions.success("Successfully sent test message to service");
            } else {
                console.log(data.consumingServicesTestWebhook.error)
                snackActions.error("No webhook listening")
            }
            
        },
        onError: error => {

        }
    });
    const issueTestWebook = (service_type) => {
        testWebhook({variables: {service_type: service_type}});
    }
    const [testLog] = useMutation(testLogMutation, {
        onCompleted: data => {
            if(data.consumingServicesTestLog.status === "success"){
                snackActions.success("Successfully sent test message to service");
            } else {
                snackActions.error(data.consumingServicesTestLog.error)
            }
            
        },
        onError: error => {

        }
    });
    const issueTestLog = (service_type) => {
        testLog({variables: {service_type: service_type}});
    }
    return (
        <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px", marginTop: "10px", marginRight: "5px"}} variant={"elevation"}>
            <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Services Listening for Notifications
            </Typography>
        </Paper>
        <div style={{display: "flex"}}>
            <TableContainer component={Paper} className="mythicElement" >   
                <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(50vw)", "overflow": "scroll"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell >Logging Category</TableCell>
                            <TableCell >Test Log Data</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow hover >
                            <TableCell>New Callback Log</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestLog("new_callback")}}> <SyncAltIcon  /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover >
                            <TableCell>New Credential Log</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestLog("new_credential")}}> <SyncAltIcon  /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover >
                            <TableCell>New File Log</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestLog("new_file")}}> <SyncAltIcon  /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover>
                            <TableCell>New Artifact Log</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestLog("new_artifact")}}> <SyncAltIcon  /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover>
                            <TableCell>New Task Log</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestLog("new_task")}}> <SyncAltIcon  /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover >
                            <TableCell>New Payload Log</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestLog("new_payload")}} > <SyncAltIcon /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover >
                            <TableCell>New Keylog Log</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestLog("new_keylog")}}> <SyncAltIcon  /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover >
                            <TableCell>New Response Log</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestLog("new_response")}}> <SyncAltIcon  /></IconButton>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            <TableContainer component={Paper} className="mythicElement" >
                <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(50vw)", "overflow": "scroll"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell >Webhook Category</TableCell>
                            <TableCell >Test Webhook</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow hover >
                            <TableCell>New Feedback Webhook</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestWebook("new_feedback")}}><PublicIcon /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover >
                            <TableCell>New Callback Webhook</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestWebook("new_callback")}}><PublicIcon /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover>
                            <TableCell>New Startup Webhook</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestWebook("new_startup")}}><PublicIcon /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover >
                            <TableCell>New Alert Webhook</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestWebook("new_alert")}}><PublicIcon /></IconButton>
                            </TableCell>
                        </TableRow>
                        <TableRow hover >
                            <TableCell>New Custom Webhook</TableCell>
                            <TableCell>
                                <IconButton onClick={()=>{issueTestWebook("new_custom")}}><PublicIcon /></IconButton>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    </React.Fragment>
    )
}

