import React, {useEffect} from 'react';
import { gql, useMutation} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import {PayloadSubscriptionNotification} from '../CreatePayload/PayloadSubscriptionNotification';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {snackActions} from '../../utilities/Snackbar';
import {UploadTaskFile} from "../../MythicComponents/MythicFileUpload";

 const create_payload = gql`
 mutation createPayloadMutation($payload: String!) {
  createPayload(payloadDefinition: $payload) {
    error
    status
    uuid
  }
}
 `;


export function Step5Build(props){
    const [fromNow, setFromNow] = React.useState( (new Date().toISOString()));
    const [filename, setFilename] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startSubscription, setStartSubscription] = React.useState(false);
    const [subscriptionID, setSubscriptionID] = React.useState("");
    const [createPayloadMutation] = useMutation(create_payload, {
        update: (cache, {data}) => {
            if(data.createPayload.status === "success"){
                setSubscriptionID(data.createPayload.uuid);
                if(!startSubscription){
                    setStartSubscription(true);
                }
                snackActions.info("Submitted payload to build pipeline", {autoClose: 1000});
            }else{
                snackActions.error(data.createPayload.error);
            }
        }
    });
    useEffect( () => {
        if(props.buildOptions[1]["file_extension"] !== ""){
            setFilename(props.buildOptions[1]["payload_type"] + "." + props.buildOptions[1]["file_extension"]);
        }else{
            setFilename(props.buildOptions[1]["payload_type"] );
        }
        
    }, [props.buildOptions]);
    const onChangeFilename = (name, value, error) => {
        setFilename(value);
    }
    const onChangeDescription = (name, value, error) => {
        setDescription(value);
    }
    const finished = async () => {
        let buildParameters = [];
        for(let i = 0; i < props.buildOptions[1]["parameters"].length; i++){
            let param = props.buildOptions[1]["parameters"][i];
            if (param.parameter_type === "Dictionary") {
                const newDict = param.value.reduce((prev, cur) => {
                    if (cur.default_show) {
                        return {...prev, [cur.name]: cur.value};
                    }
                    return {...prev}
                }, {});
                buildParameters.push({name: param.name, value: newDict});
            } else if (param.parameter_type === "File") {
                const newUUID = await UploadTaskFile(param.value, "Uploaded as build parameter for " + filename);
                if (newUUID) {
                    buildParameters.push({name: param.name, value: newUUID});
                } else {
                    snackActions.error("Failed to upload files")
                    return;
                }
            } else {
                buildParameters.push({name: param.name, value: param.value});
            }
        }
        const finishedPayload = {
            "selected_os": props.buildOptions[0],
            "payload_type": props.buildOptions[1]["payload_type"],
            "filename": filename,
            "description": description,
            "commands": [],
            "build_parameters": buildParameters,
            "c2_profiles": [],
            "wrapper": true,
            "wrapped_payload": props.buildOptions[2]
            };
        createPayloadMutation({variables: {payload: JSON.stringify(finishedPayload)}}).catch( (e) => {console.log(e)} );
    }
    const canceled = () => {
        props.canceled();
    }

    return (
        <div >
            <Typography variant="h3" align="left" id="selectc2profiles" component="div" 
                style={{"marginLeft": "10px"}}>
                  Payload Review
            </Typography>
            <br/>
            <MythicTextField onEnter={finished} autoFocus={true} required={false} placeholder={"Filename"} value={filename} multiline={false} onChange={onChangeFilename} display="inline-block"/>
            <MythicTextField onEnter={finished} required={false} placeholder={"description"} value={description} multiline={false} onChange={onChangeDescription} display="inline-block"/>
            <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={canceled} finished={finished} startOver={props.startOver} />
            <br/><br/>
            {startSubscription && <PayloadSubscriptionNotification me={props.me} subscriptionID={subscriptionID} fromNow={fromNow}/>}
        </div>
    );
} 
