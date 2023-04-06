import React, {useState} from 'react';
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
import {useTheme} from '@mui/material/styles';

const getParametersQuery = gql`
query getParametersQuery ($task_id: Int!) {
  task_by_pk(id: $task_id) {
    display_params
    original_params
    params
    tasking_location
    parameter_group_name
    command_name
    id
    command {
      cmd
      id
    }
  }
}
`;

export function TaskViewParametersDialog(props) {
    const [comment, setComment] = useState("");
    const theme = useTheme();
    const { loading, error } = useQuery(getParametersQuery, {
        variables: {task_id: props.task_id},
        onCompleted: data => {
            let workingComment = "Original Parameters:\n" + data.task_by_pk.original_params;
            workingComment += "\n\nAgent Parameters:\n" + data.task_by_pk.params;
            workingComment += "\n\nDisplay Parameters:\n" + data.task_by_pk.display_params;
            workingComment += "\n\nTasking Location:\n" + data.task_by_pk.tasking_location;
            workingComment += "\n\nParameter Group:\n" + data.task_by_pk.parameter_group_name;
            if(data.task_by_pk.command){
              if(data.task_by_pk.command.cmd !== data.task_by_pk.command_name){
                workingComment += "\n\nOriginal Command: " + data.task_by_pk.command.cmd;
                workingComment += "\nIssued Command: " + data.task_by_pk.command_name;
              }
            }
            setComment(workingComment);
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">View Task Parameters</DialogTitle>
        <DialogContent dividers={true}>
        <AceEditor 
              mode="json"
              theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
              fontSize={14}
              showGutter={true}
              highlightActiveLine={true}
              value={comment}
              focus={true}
              width={"100%"}
              setOptions={{
                showLineNumbers: true,
                tabSize: 4
              }}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

