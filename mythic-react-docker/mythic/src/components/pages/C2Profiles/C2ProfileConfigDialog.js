import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';

const getProfileConfigQuery = gql`
query getProfileConfigOutput($id: Int!, $filename: String!) {
  downloadContainerFile(id: $id, filename: $filename) {
    status
    error
    filename
    data
  }
}
`;

export function C2ProfileConfigDialog(props) {
    const [config, setConfig] = useState("");
    const { loading, error } = useQuery(getProfileConfigQuery, {
        variables: {id: props.profile_id, filename: "config.json"},
        onCompleted: data => {
            if(data.downloadContainerFile.status === "error"){
                setConfig("Errored trying to read file from container\n" + data.downloadContainerFile.error);
            }else{
                setConfig(atob(data.downloadContainerFile.data));
            }
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
    const onConfigSubmit = () => {
        props.onConfigSubmit(btoa(config));
        props.onClose();
    }
    const onChange = (name, value, error) => {
        setConfig(value);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.payload_name}'s Current Configuration</DialogTitle>
        <DialogContent dividers={true}>
            <MythicTextField multiline={true} onChange={onChange} value={config} />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} color="primary">
            Close
          </Button>
          <Button onClick={onConfigSubmit} color="secondary">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

