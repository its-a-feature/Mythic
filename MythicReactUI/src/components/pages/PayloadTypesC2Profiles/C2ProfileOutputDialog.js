import React from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {MythicDialogButton, MythicDialogFooter, MythicDialogSection} from "../../MythicComponents/MythicDialogLayout";

const getProfileOutputQuery = gql`
query getProfileOutput($id: Int!) {
  getProfileOutput(id: $id) {
    status
    error
    output
  }
}
`;

export function C2ProfileOutputDialog(props) {
    const [outputData, setOutputData] = React.useState("Waiting 3s for data...");
    useQuery(getProfileOutputQuery, {
        variables: {id: props.profile_id},
        onCompleted: data => {
            //console.log("got data from debug output", data.getProfileOutput);
            if(data.getProfileOutput.status === "success"){
                if(data.getProfileOutput.output.length === 0){
                    setOutputData("No data from server");
                } else {
                    setOutputData(data.getProfileOutput.output);
                }

            } else {
                setOutputData(data.getProfileOutput.error);
            }

        },
        onError: data => {
            snackActions.error(data.message);
            console.log(data);
        },
        fetchPolicy: "no-cache"
    });
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.container_name}'s Current Stdout/Stderr</DialogTitle>
        <DialogContent dividers={true} style={{padding: 0}}>
        <MythicDialogSection description="This is the current Stdout/Stderr for the profile. This goes away once you close this dialog.">
        <div style={{height: "calc(80vh)", overflowY: "auto", paddingTop: "0.5rem"}}>
            <ResponseDisplayPlaintext
                initial_mode={"json"}
                render_colors={false}
                wrap_text={false}
                plaintext={outputData}
                expand={true}/>
        </div>
        </MythicDialogSection>
        </DialogContent>
        <MythicDialogFooter>
            <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
