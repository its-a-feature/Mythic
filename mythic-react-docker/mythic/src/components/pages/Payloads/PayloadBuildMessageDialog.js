import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';

const getDescriptionQuery = gql`
query getDescriptionQuery ($payload_id: Int!) {
  payload_by_pk(id: $payload_id) {
    build_message
    id
  }
}
`;

export function PayloadBuildMessageDialog(props) {
    const [description, setDescription] = useState("");
    const { loading, error } = useQuery(getDescriptionQuery, {
        variables: {payload_id: props.payload_id},
        onCompleted: data => {
            setDescription(data.payload_by_pk.build_message)
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Payload Build Message</DialogTitle>
        <DialogContent dividers={true}>
            <MythicTextField multiline={true} onChange={()=>{}} value={description} />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

