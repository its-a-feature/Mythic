import React from 'react';
import {gql, useMutation, useQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {exportPayloadConfigQuery} from "./PayloadsTableRow";
import {MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";
import AceEditor from 'react-ace';
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-searchbox";
import Button from '@mui/material/Button';
import {useTheme} from '@mui/material/styles';

const create_payload = gql`
 mutation createPayloadMutation($payload: String!) {
  createPayload(payloadDefinition: $payload) {
    error
    status
    uuid
  }
}
 `;

export function EditPayloadConfigDialog(props) {
    const [payloadConfig, setPayloadConfig] = React.useState("");
    useQuery(exportPayloadConfigQuery, {
        variables: {uuid: props.uuid},
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            //console.log(data)
            if(data.exportPayloadConfig.status === "success"){
                setPayloadConfig(data.exportPayloadConfig.config);
            }else{
                snackActions.error("Failed to export configuration: " + data.exportPayloadConfig.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to export configuration: " + data.message)
        }
    })
    const [createPayloadMutation] = useMutation(create_payload, {
        update: (cache, {data}) => {
            if(data.createPayload.status === "success"){
                snackActions.info("Submitted payload to build pipeline");
            }else{
                snackActions.error(data.createPayload.error);
            }
        }
    });
    const onCommitSubmit = (updatedConfig) => {
      createPayloadMutation({variables: {payload: updatedConfig}}).catch( (e) => {console.log(e)} );
      props.onClose();
    }
  return (
    <React.Fragment>
        <MythicModifyStringDialog title={"Create New Payload With Modified Config"}
                                  value={payloadConfig}
                                  dontCloseOnSubmit={true}
                                  onSubmit={onCommitSubmit}
                                  onSubmitText={"Create"}
                                  onClose={props.onClose}
                                  maxRows={60}
                                  />
    </React.Fragment>
  );
}

export function ViewPayloadConfigJSON(props) {
    const theme = useTheme();
    const [payloadConfig, setPayloadConfig] = React.useState("");
    useQuery(exportPayloadConfigQuery, {
        variables: {uuid: props.uuid},
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            //console.log(data)
            if(data.exportPayloadConfig.status === "success"){
                setPayloadConfig(data.exportPayloadConfig.config);
            }else{
                snackActions.error("Failed to export configuration: " + data.exportPayloadConfig.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to export configuration: " + data.message)
        }
    })
    const [createPayloadMutation] = useMutation(create_payload, {
        update: (cache, {data}) => {
            if(data.createPayload.status === "success"){
                snackActions.info("Submitted payload to build pipeline");
            }else{
                snackActions.error(data.createPayload.error);
            }
        }
    });
    const onCommitSubmit = () => {
        createPayloadMutation({variables: {payload: payloadConfig}}).catch( (e) => {console.log(e)} );
    }
    const onChange = (value) => {
        setPayloadConfig(value);
    }
    React.useEffect( () => {
        try{
            setPayloadConfig(JSON.stringify(JSON.parse(props.value), null, 2));
        }catch(error){
            setPayloadConfig(props.value);
        }

    }, [props.value]);
    return (
        <React.Fragment>
            <div style={{display: "flex", }}>
                <AceEditor
                    mode="json"
                    theme={theme.palette.mode === 'dark' ? 'monokai' : 'github'}
                    width="100%"
                    height={"100%"}
                    showPrintMargin={false}
                    wrapEnabled={true}
                    minLines={10}
                    maxLines={50}
                    value={payloadConfig}
                    focus={true}
                    onChange={onChange}
                    setOptions={{
                        useWorker: false
                    }}
                />
            </div>
            <Button onClick={onCommitSubmit} variant="contained" color="success">
                {"Create New Payload"}
            </Button>
        </React.Fragment>
    );
}

