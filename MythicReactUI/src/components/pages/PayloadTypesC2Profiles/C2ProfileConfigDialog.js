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
    const theme = useTheme();
    const { loading, error } = useQuery(getProfileConfigQuery, {
        variables: {id: props.profile_id, filename: props.filename},
        onCompleted: data => {
            if(data.downloadContainerFile.status === "error"){
                setConfig("Errored trying to read file from container\n" + data.downloadContainerFile.error);
            }else{
                //console.log(data);
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
    const onChange = (value, event) => {
        setConfig(value);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.payload_name}'s Current Configuration</DialogTitle>
        <DialogContent dividers={true}>
            <AceEditor 
              mode="json"
              theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
              onChange={onChange}
              fontSize={14}
              showGutter={true}
              highlightActiveLine={true}
              value={config}
              focus={true}
              width={"100%"}
              setOptions={{
                showLineNumbers: true,
                tabSize: 4
              }}/>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
          <Button variant="contained" onClick={onConfigSubmit} color="warning">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

