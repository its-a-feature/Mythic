import React, {useState} from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import MythicTextField from "../../MythicComponents/MythicTextField";
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogGrid,
    MythicDialogSection,
    MythicFormField,
    MythicFormSwitchRow
} from "../../MythicComponents/MythicDialogLayout";

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
    c2profile(where: {deleted: {_eq: false}, container_running: {_eq: true}, is_p2p: {_eq: false}}, order_by: {name: asc}){
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
                snackActions.info("Submitted host request...");
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
        const selected = availableC2Profiles.find((profile) => profile.id === event.target.value);
        setSelectedC2Profile(selected || {id: 0});
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
          <MythicDialogBody>
            <MythicDialogSection title="File">
                <Box className="mythic-dialog-preview" sx={{backgroundColor: "background.paper"}}>
                    <Typography sx={{wordBreak: "break-all"}}>
                        {props.file_name}
                    </Typography>
                </Box>
            </MythicDialogSection>
            <MythicDialogSection title="Hosting">
                <MythicDialogGrid>
                    <MythicFormField label="C2 Profile" description="Select a running egress profile to serve this file." required>
                        <FormControl fullWidth size="small">
                            <InputLabel id="host-file-c2-profile-label">C2 Profile</InputLabel>
                            <Select
                                labelId="host-file-c2-profile-label"
                                id="host-file-c2-profile"
                                value={selectedC2Profile.id || ""}
                                label="C2 Profile"
                                onChange={handleChange}
                            >
                                {availableC2Profiles.map( (opt) => (
                                    <MenuItem value={opt.id} key={opt.id}>{opt.name}</MenuItem>
                                ) )}
                            </Select>
                        </FormControl>
                    </MythicFormField>
                    <MythicFormField label="Hosting URL Path" description="Path must start with /" required>
                        <MythicTextField
                            value={message}
                            onEnter={submit}
                            onChange={onChangeHostURL}
                            requiredValue={true}
                            name="Hosting URL Path"
                            showLabel={false}
                            marginTop="0px"
                            marginBottom="0px"
                        />
                    </MythicFormField>
                </MythicDialogGrid>
            </MythicDialogSection>
            <MythicDialogSection title="Download Alerts">
                <MythicFormSwitchRow
                    label="Download Alert"
                    description="Send an alert when the hosted file is downloaded."
                    control={<Switch color={"success"} onChange={onChangeAlert} checked={alertOnDownload} />}
                />
            </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
            <MythicDialogButton intent="destructive" onClick={stopHosting}>
                Stop Hosting
            </MythicDialogButton>
          <MythicDialogButton intent="primary" onClick={submit}>
            Submit
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
