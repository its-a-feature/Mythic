import React, {useState, useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";

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
    const [payloadData, setPayloadData] = useState({"error": "", "message": ""});
    const [viewError, setViewError] = useState(false);
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
     return <MythicLoadingState compact title="Loading build output" description="Fetching payload build messages." minHeight={160} />;
    }
    if (error) {
     console.error(error);
     return <MythicErrorState compact title="Unable to load build output" description={error.message} minHeight={160} />;
    }
    
  return (
      <React.Fragment>
          <DialogTitle id="form-dialog-title">Payload Build Messages</DialogTitle>
          <div style={{height: "calc(80vh)", overflowY: "auto"}}>
              <ResponseDisplayPlaintext
                  initial_mode={"html"}
                  render_colors={false}
                  wrap_text={true}
                  plaintext={viewError ? payloadData["error"] : payloadData["message"]}
                  expand={true}
              />
          </div>
          <DialogActions>
              <Button variant="contained" onClick={props.onClose} color="primary">
                  Close
              </Button>
          </DialogActions>
      </React.Fragment>
  );
}
