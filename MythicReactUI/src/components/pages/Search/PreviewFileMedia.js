import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {ResponseDisplayMedia} from "../Callbacks/ResponseDisplayMedia";
import { useQuery, gql } from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";
import {b64DecodeUnicode} from "../../utilities/base64";

const fileDataQuery = gql`
query fileData($agent_file_id: String!){
    filemeta(where: {agent_file_id: {_eq: $agent_file_id}}){
        host
        full_remote_path_text
    }
}
`;

export function PreviewFileMediaDialog({agent_file_id, filename, onClose}) {
    const [fileData, setFileData] = React.useState({});
    useQuery(fileDataQuery, {variables: {agent_file_id: agent_file_id},
        onCompleted: (data) => {
            if(data.filemeta.length === 0) {
                snackActions.error("Failed to find file id to query for information");
                return;
            }
            let tempData = {...data.filemeta[0]};
            tempData["full_remote_path_text"] = b64DecodeUnicode(tempData["full_remote_path_text"]);
            setFileData(tempData);
        },
        onError: (data) => {
            snackActions.error(data.error);
        }
    })
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">
            Previewing <b>{filename}</b>
            {fileData.full_remote_path_text ? (
                <Typography >
                    From <Link style={{wordBreak: "break-all"}}
                               color="textPrimary"
                               underline="always"
                               href={"/direct/download/" +  agent_file_id}>{fileData.full_remote_path_text}</Link>
                </Typography>
            ): (
                <Typography >
                    From <Link style={{wordBreak: "break-all"}}
                               color="textPrimary"
                               underline="always"
                               href={"/direct/download/" +  agent_file_id}>{fileData.filename_text}</Link>
                </Typography>
            )}
            <Typography >
                Host: {fileData.host}
            </Typography>
        </DialogTitle>
        <DialogContent style={{height: "calc(95vh)", margin: 0, padding: 0}}>
          <ResponseDisplayMedia media={{agent_file_id, filename}} expand={true} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

