import React, {useState} from 'react';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import {useTheme} from '@mui/material/styles';
import {MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";

const getParametersQuery = gql`
query getParametersQuery ($task_id: Int!) {
  task_by_pk(id: $task_id) {
    stdout
    stderr
    id
  }
}
`;

export function TaskViewStdoutStderrDialog(props) {
    const [comment, setComment] = useState("");
    const theme = useTheme();
    const { loading, error } = useQuery(getParametersQuery, {
        variables: {task_id: props.task_id},
        onCompleted: data => {
            setComment("[STDOUT]:\n" + data.task_by_pk.stdout + "\n\[STDERR]:\n" + data.task_by_pk.stderr);
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
        <MythicModifyStringDialog title={`View Task Stdout/Stderr`}
                                  onClose={props.onClose}
                                  maxRows={40}
                                  wrap={true}
                                  value={comment} />
  </React.Fragment>
  );
}

