import React, {useEffect} from 'react';
import { gql, useMutation} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import {PayloadSubscriptionNotification} from './PayloadSubscriptionNotification';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {snackActions} from '../../utilities/Snackbar';
import {UploadTaskFile} from "../../MythicComponents/MythicFileUpload";
import {getSkewedNow} from "../../utilities/Time";

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
    const [fromNow, setFromNow] = React.useState( (getSkewedNow().toISOString()));
    const [filename, setFilename] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startSubscription, setStartSubscription] = React.useState(false);
    const [subscriptionID, setSubscriptionID] = React.useState("");
    const [showExtraOptions, setShowExtraOptions] = React.useState(false);
    const [createPayloadMutation] = useMutation(create_payload, {
        update: (cache, {data}) => {
            setSubscriptionID(data.createPayload.uuid);
            if(data.createPayload.status === "success"){
                snackActions.info("Submitted payload to build pipeline", {autoClose: 1000});
                if(!startSubscription){
                    setStartSubscription(true);
                }
                setShowExtraOptions(true);
            }else{
                snackActions.error(data.createPayload.error);
            }
        },
        onError: () => {
            snackActions.error("Failed to create Payload. Do you have an active operation set?")
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
                if (typeof param.value === "string") {
                    buildParameters.push({name: param.name, value: param.value});
                } else {
                    const newUUID = await UploadTaskFile(param.value, "Uploaded as build parameter for " + filename);
                    if (newUUID) {
                        if (newUUID !== "Missing file in form") {
                            buildParameters.push({name: param.name, value: newUUID});
                        }
                    } else {
                        snackActions.error("Failed to upload files")
                        return;
                    }
                }
            }else if(param.parameter_type === "FileMultiple"){
                let fileMultipleValues = [];
                for(let j = 0; j < param.value.length; j++){
                    if (typeof param.value[j] === "string") {
                        fileMultipleValues.push(param.value[j]);
                    } else {
                        const newUUID = await UploadTaskFile(param.value[j], "Uploaded as build parameter for " + filename);
                        if (newUUID) {
                            if (newUUID !== "Missing file in form") {
                                fileMultipleValues.push(newUUID);
                            }
                        } else {
                            snackActions.error("Failed to upload files")
                            return;
                        }
                    }
                }
                buildParameters.push({name: param.name, value: fileMultipleValues});
            } else {
                buildParameters.push({name: param.name, value: param.value});
            }
        }
        let c2Profiles = [];
        for(let i = 0; i < props.buildOptions[3].length; i++){
            if(props.buildOptions[3][i].selected){
                let instanceParam = {};
                for(let j = 0; j < props.buildOptions[3][i].c2profileparameters.length; j++){
                    let param = props.buildOptions[3][i].c2profileparameters[j];
                    if(param.parameter_type === "Dictionary"){
                        const newDict = param.value.reduce( (prev, cur) => {
                            if(cur.default_show){
                                return {...prev, [cur.name]: cur.value};
                            }
                            return {...prev}
                        }, {});
                        instanceParam = {...instanceParam, [param.name]: newDict};
                    } else if (param.parameter_type === "File") {
                        if (typeof param.value === "string") {
                            instanceParam = {...instanceParam, [param.name]: param.value};
                        } else {
                            const newUUID = await UploadTaskFile(param.value, "Uploaded as c2 parameter for " + filename);
                            if (newUUID) {
                                if (newUUID !== "Missing file in form") {
                                    instanceParam = {...instanceParam, [param.name]: newUUID};
                                } else {
                                    snackActions.error("Failed to upload files, missing file")
                                }
                            } else {
                                snackActions.error("Failed to upload files")
                                return;
                            }
                        }
                    }else if(param.parameter_type === "FileMultiple"){
                        let fileMultipleValues = [];
                        for(let j = 0; j < param.value.length; j++){
                            if (typeof param.value[j] === "string") {
                                fileMultipleValues.push(param.value[j]);
                            } else {
                                const newUUID = await UploadTaskFile(param.value[j], "Uploaded as c2 parameter for " + filename);
                                if (newUUID) {
                                    if (newUUID !== "Missing file in form") {
                                        fileMultipleValues.push(newUUID);
                                    } else {
                                        snackActions.error("Failed to upload files, missing file")
                                    }
                                } else {
                                    snackActions.error("Failed to upload files")
                                    return;
                                }
                            }
                        }
                        instanceParam = {...instanceParam, [param.name]: fileMultipleValues};
                    } else {
                        instanceParam = {...instanceParam, [param.name]: param.value};
                        //return {...prev, [param.name]: param.value}
                    }
                }
                c2Profiles.push({
                    "c2_profile": props.buildOptions[3][i].name,
                    "c2_profile_parameters": instanceParam,
                })
            }
        }
        const finishedPayload = {
            "selected_os": props.buildOptions[0],
            "payload_type": props.buildOptions[1]["payload_type"],
            "filename": filename,
            "description": description,
            "commands": props.buildOptions[2],
            "build_parameters": buildParameters,
            "c2_profiles": c2Profiles
            };
        //console.log("finishedPayload", finishedPayload)
        snackActions.info("Submitted Creation to Mythic...", {autoClose: 1000});
        createPayloadMutation({variables: {payload: JSON.stringify(finishedPayload)}}).catch( (e) => {console.log(e)} );
    }
    const canceled = () => {
        props.canceled();
    }

    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%", width: "100%"}}>
            <Typography variant="h3" align="left" id="selectc2profiles" component="div"
                        style={{"marginLeft": "10px"}}>
                Payload Review
            </Typography>
            <br/>
            <div style={{display: "flex", flexDirection: "column", flexGrow: 1}}>
                <MythicTextField onEnter={finished} autoFocus={true} required={false} placeholder={"Filename"}
                                 value={filename} multiline={false} onChange={onChangeFilename} display="inline-block"/>
                <MythicTextField onEnter={finished} required={false} placeholder={"description"} value={description}
                                 multiline={false} onChange={onChangeDescription} display="inline-block"/>
            </div>
            <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={canceled}
                                            finished={finished} startOver={props.startOver} showExtraOptions={showExtraOptions}/>
            <br/><br/>
            {startSubscription &&
                <PayloadSubscriptionNotification me={props.me} subscriptionID={subscriptionID} fromNow={fromNow}/>}

        </div>
    );
} 
