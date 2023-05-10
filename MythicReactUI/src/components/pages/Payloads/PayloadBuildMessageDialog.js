import React, {useState, useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import "ace-builds/src-noconflict/ext-searchbox";
import {useTheme} from '@mui/material/styles';

const getDescriptionQuery = gql`
query getDescriptionQuery ($payload_id: Int!) {
  payload_by_pk(id: $payload_id) {
    build_message
    build_stderr
    build_stdout
    id
  }
}
`;

export function PayloadBuildMessageDialog(props) {
    const [payloadData, setPayloadData] = useState({});
    const [viewError, setViewError] = useState(false);
    const theme = useTheme();
    const { loading, error } = useQuery(getDescriptionQuery, {
        variables: {payload_id: props.payload_id},
        onCompleted: data => {
            setViewError(props.viewError);
            let output = "Message:\n" + data.payload_by_pk.build_message;
            output += "\nSTDOUT:\n" + data.payload_by_pk.build_stdout;
            setPayloadData({"message": output,
                            "error": "STDERR:\n" + data.payload_by_pk.build_stderr});
            
        },
        fetchPolicy: "network-only"
    });
    useEffect( () => {
        setViewError(props.viewError);
    }, [props.viewError]);
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Payload Build Messages</DialogTitle>
        <DialogContent dividers={true}>
          <AceEditor 
              mode="text"
              theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
              fontSize={14}
              showGutter={true}
              height={"100px"}
              highlightActiveLine={true}
              value={viewError ? payloadData["error"] : payloadData["message"]}
              width={"100%"}
              minLines={2}
              maxLines={50}
              setOptions={{
                showLineNumbers: true,
                tabSize: 4,
                useWorker: false
              }}/>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

