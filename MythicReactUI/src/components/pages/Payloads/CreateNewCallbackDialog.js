import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { snackActions } from '../../utilities/Snackbar';

import {gql, useMutation} from '@apollo/client';
import { Table, TableBody, TableContainer, TableRow, TableHead, Paper } from '@mui/material';
import MythicTableCell from '../../MythicComponents/MythicTableCell';
import MythicTextField from '../../MythicComponents/MythicTextField';

const createCallback = gql`
mutation createNewCallback($payloadUuid: String!, $callbackConfig: newCallbackConfig) {
  createCallback(payloadUuid: $payloadUuid, newCallback: $callbackConfig){
    status
    error
  }
}
`;
 
export function CreateNewCallbackDialog(props) {
    const [IP, setIP] = React.useState("");
    const [externalIP, setExternalIP] = React.useState("");
    const [host, setHost] = React.useState("");
    const [user, setUser] = React.useState("");
    const [domain, setDomain] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [sleepInfo, setSleepInfo] = React.useState("");
    const [extraInfo, setExtraInfo] = React.useState("");
    const [processName, setProcessName] = React.useState("");
    const onChangeText = (name, value, error) => {
      switch (name) {
        case "IP...":
          setIP(value);
          break;
        case "External IP...":
          setExternalIP(value);
          break;
        case "Host":
          setHost(value);
          break;
        case "User":
          setUser(value);
          break;
        case "Domain":
          setDomain(value);
          break;
        case "Description":
          setDescription(value);
          break;
        case "Sleep Info":
          setSleepInfo(value);
          break;
        case "Extra Info":
          setExtraInfo(value);
          break;
        case "Process Name":
          setProcessName(value);
          break;
      }
    }
    const [createCallbackMutation] = useMutation(createCallback, {
      onCompleted: data => {
        console.log(data);
        if (data.createCallback.status === "success"){
          snackActions.success("Successfully create new callback");
        } else {
          snackActions.error(data.createCallback.error);
        }
        props.onClose();
      },
      onError: error => {
        console.log(error)
        props.onClose();
      }
    })
    const submit = () => {
      createCallbackMutation({variables: {payloadUuid: props.uuid, callbackConfig: {
        ip: IP,
        externalIp: externalIP,
        user: user,
        host: host,
        domain: domain,
        description: description,
        processName: processName,
        sleepInfo: sleepInfo,
        extraInfo: extraInfo
      }}})
      
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Manually Create Callback for payload {props.filename}</DialogTitle>
        <DialogContent dividers={true}>
          This will generate a new callback based on this payload, but will not trigger a payload execution (there will be no payload running to fetch commands).
          This is useful for webshells that don't reach out to Mythic, but still need a callback in order to issue tasking. This is also useful for development and testing purposes.
          <TableContainer className="mythicElement">
            <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                       <MythicTableCell style={{width: "4rem"}}>Attribute</MythicTableCell>
                        <MythicTableCell >Value</MythicTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow hover>
                    <MythicTableCell>IP</MythicTableCell>
                    <MythicTableCell>
                      <MythicTextField name="IP..." value={IP} onChange={onChangeText}  />
                    </MythicTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicTableCell>External IP</MythicTableCell>
                    <MythicTableCell>
                      <MythicTextField name="External IP..." value={externalIP} onChange={onChangeText}  />
                    </MythicTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicTableCell>User</MythicTableCell>
                    <MythicTableCell>
                      <MythicTextField name="User" value={user} onChange={onChangeText}  />
                    </MythicTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicTableCell>Host</MythicTableCell>
                    <MythicTableCell>
                      <MythicTextField name="Host" value={host} onChange={onChangeText}  />
                    </MythicTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicTableCell>Domain</MythicTableCell>
                    <MythicTableCell>
                      <MythicTextField name="Domain" value={domain} onChange={onChangeText}  />
                    </MythicTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicTableCell>Description</MythicTableCell>
                    <MythicTableCell>
                      <MythicTextField name="Description" value={description} onChange={onChangeText}  />
                    </MythicTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicTableCell>Process Name</MythicTableCell>
                    <MythicTableCell>
                     <MythicTextField name="Process Name" value={processName} onChange={onChangeText}  />
                    </MythicTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicTableCell>Sleep Info</MythicTableCell>
                    <MythicTableCell>
                      <MythicTextField name="Sleep Info" value={sleepInfo} onChange={onChangeText}  />
                    </MythicTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicTableCell>Extra Info</MythicTableCell>
                    <MythicTableCell>
                      <MythicTextField name="Extra Info" value={extraInfo} onChange={onChangeText}  />
                    </MythicTableCell>
                  </TableRow>
                </TableBody>
            </Table>
            </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={submit} variant="contained" color="success">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

