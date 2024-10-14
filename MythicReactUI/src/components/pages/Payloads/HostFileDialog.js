import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import MythicTextField from "../../MythicComponents/MythicTextField";
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Input from '@mui/material/Input';
import Switch from '@mui/material/Switch';

const hostFileMutation = gql`
mutation hostFileMutation($c2_id: Int!, $file_uuid: String!, $host_url: String!, $alert_on_download: Boolean, $remove: Boolean) {
  c2HostFile(c2_id: $c2_id, file_uuid: $file_uuid, host_url: $host_url, alert_on_download: $alert_on_download, remove: $remove) {
      status
      error
  }
}
`;
const getC2ProfilesQuery = gql`
query getC2Profiles {
    c2profile(where: {deleted: {_eq: false}, container_running: {_eq: true}, is_p2p: {_eq: false}}){
        id
        name
    }
}
`;

export function HostFileDialog(props) {
    const [message, setMessage] = useState("");
    const [availableC2Profiles, setAvailableC2Profiles] = React.useState([]);
    const [selectedC2Profile, setSelectedC2Profile] = React.useState({id: 0});
    const [alertOnDownload, setAlertOnDownload] = React.useState(false);
    const removing = React.useRef(false);
    const [hostFile] = useMutation(hostFileMutation, {
        onCompleted: (data) => {
            if(data.c2HostFile.status === "success"){
                if (removing.current){
                    snackActions.success("Successfully stop hosting file");
                } else {
                    snackActions.success("Successfully hosted file");
                }

                props.onClose();
            } else {
                snackActions.error(data.c2HostFile.error);
            }
        },
        onError: (error) => {
            snackActions.error(error.message);
            console.log(error.message);
        }
    })
    useQuery(getC2ProfilesQuery, {
        onCompleted: data => {
          setAvailableC2Profiles(data.c2profile);
          if(data.c2profile.length > 0){
              setSelectedC2Profile(data.c2profile[0]);
          }
        },
        fetchPolicy: "network-only"
    });
    const onChangeHostURL = (name, value, error) => {
        setMessage(value);
    }
    const handleChange = (event) => {
        setSelectedC2Profile(event.target.value);
    };
    const onChangeAlert = (event) => {
        setAlertOnDownload(event.target.checked);
    }
    const submit = () => {
        if(message.length === 0){
            snackActions.warning("Must supply a hosting path");
        } else if(message[0] !== "/"){
            snackActions.warning("Hosting URL must start with a /");
        } else if(selectedC2Profile.id === 0){
            snackActions.warning("Must select a running, egress C2 Profile to host");
        } else {
            hostFile({variables: {c2_id: selectedC2Profile.id,
                    file_uuid: props.file_uuid,
                    host_url: message,
                    alert_on_download: alertOnDownload,
                    remove: false
                }});
        }
    }
    const stopHosting = () => {
        removing.current = true;
        hostFile({variables: {c2_id: selectedC2Profile.id,
                file_uuid: props.file_uuid,
                host_url: message,
                alert_on_download: alertOnDownload,
                remove: true
            }});
    }

  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Host File via C2 Profile</DialogTitle>
        <DialogContent dividers={true}>
            <Table size="small" aria-label="details" style={{ "overflowWrap": "break-word"}}>
                <TableBody>
                    <TableRow hover>
                        <MythicTableCell style={{width: "30%"}}>File</MythicTableCell>
                        <MythicTableCell style={{wordBreak: "all"}}>{props.file_name}</MythicTableCell>
                    </TableRow>
                    <TableRow hover>
                        <MythicTableCell>C2 Profile</MythicTableCell>
                        <MythicTableCell>
                            <FormControl style={{width: "100%"}}>
                                <Select
                                    labelId="demo-dialog-select-label"
                                    id="demo-dialog-select"
                                    value={selectedC2Profile}
                                    onChange={handleChange}
                                    input={<Input style={{width: "100%"}}/>}
                                >
                                    {availableC2Profiles.map( (opt) => (
                                        <MenuItem value={opt} key={opt.id}>{opt.name}</MenuItem>
                                    ) )}
                                </Select>
                            </FormControl>
                        </MythicTableCell>
                    </TableRow>
                    <TableRow hover>
                        <MythicTableCell >Hosting URL Path (with /)</MythicTableCell>
                        <MythicTableCell>
                            <MythicTextField value={message} onEnter={submit} onChange={onChangeHostURL} requiredValue={true} >
                            </MythicTextField>
                        </MythicTableCell>
                    </TableRow>
                    <TableRow hover>
                        <MythicTableCell>Send alert when file is downloaded?</MythicTableCell>
                        <MythicTableCell>
                            <Switch color={"success"} onChange={onChangeAlert} checked={alertOnDownload}></Switch>
                        </MythicTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
            <Button variant="contained" onClick={stopHosting} color="error">
                Stop Hosting
            </Button>
          <Button variant="contained" onClick={submit} color={"success"}>
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

