import React, {useEffect} from 'react';
import { gql, useMutation, useQuery} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import {PayloadSubscriptionNotification} from '../CreatePayload/PayloadSubscriptionNotification';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {snackActions} from '../../utilities/Snackbar';
import {UploadTaskFile} from "../../MythicComponents/MythicFileUpload";
import {getSkewedNow} from "../../utilities/Time";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {ConfigurationSummary, GetGroupedParameters} from "../CreatePayload/Step1SelectOS";
import IconButton from '@mui/material/IconButton';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import {exportPayloadConfigQuery} from "../Payloads/PayloadsTableRow";
import AceEditor from 'react-ace';
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-searchbox";
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


export function Step5Build(props){
    const theme = useTheme();
    const [fromNow, setFromNow] = React.useState( (getSkewedNow().toISOString()));
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
    const [payloadConfig, setPayloadConfig] = React.useState("");
    useQuery(exportPayloadConfigQuery, {
        variables: {uuid: props.buildOptions[2]},
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            //console.log(data)
            if(data.exportPayloadConfig.status === "success"){
                setPayloadConfig(data.exportPayloadConfig.config);
            }else{
                snackActions.error("Failed to get configuration: " + data.exportPayloadConfig.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to get configuration: " + data.message)
        }
    })
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
        let params = GetGroupedParameters({
            buildParameters: props.buildOptions[1]["parameters"],
            os: props.buildOptions[1].os,
            c2_name: undefined}).reduce( (prev, cur) => {
            return [...prev, ...cur.parameters];
        }, []);
        for(let i = 0; i < params.length; i++){
            let param = params[i];
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
        const finishedPayload = {
            "selected_os": props.buildOptions[1].os,
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
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column"
        }}>
            {/* Content area that can grow */}
            <div style={{
                flexGrow: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 0 // Important for flex shrinking
            }}>
                {/* Top section - fixed height */}
                <div style={{
                    display: "flex",
                    flexShrink: 0 // Don't shrink this section
                }}>
                    <div style={{width: "100%", margin: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px", display: "flex"}}>
                        <MythicAgentSVGIcon payload_type={props.buildOptions[1].payload_type} style={{width: "80px", padding: "5px", objectFit: "unset"}} />
                        <div>
                            <Typography variant={"p"} style={{}}>
                                <b>OS: </b>{props.buildOptions[1].os}
                                <MythicStyledTooltip title={"Edit OS / Payload Type"}>
                                    <IconButton color={"primary"} onClick={() => props.moveToStep(0)}>
                                        <DriveFileRenameOutlineIcon />
                                    </IconButton>
                                </MythicStyledTooltip>
                            </Typography><br/>
                            <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                                <b>Description: </b>{props.buildOptions[1].description}
                            </Typography>
                        </div>
                    </div>
                    <div style={{width: "100%", margin: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px"}}>
                        <Typography variant={"p"} style={{fontWeight: 600}}>
                            1. Provide Payload Name and Description
                        </Typography>
                        <div style={{width: "100%", display: "flex", alignItems: "flex-start", marginBottom: "10px", flexDirection: "column"}}>
                            <MythicTextField onEnter={finished} autoFocus={true} required={false} placeholder={"Filename"}
                                             value={filename} multiline={false} onChange={onChangeFilename} display="inline-block"/>
                            <MythicTextField onEnter={finished} required={false} placeholder={"description"} value={description}
                                             multiline={false} onChange={onChangeDescription} display="inline-block"/>
                        </div>
                    </div>
                </div>

                {/* Bottom section - scrollable table area */}
                <div style={{
                    margin: "5px",
                    // border: "1px solid grey",
                    borderRadius: "5px",
                    //padding: "10px 5px 5px 10px",
                    display: "flex",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "hidden"
                }}>
                    <div style={{
                        width: "30%",
                        margin: "5px",
                        border: "1px solid grey",
                        borderRadius: "5px",
                        padding: "5px",
                        display: "flex",
                        flexDirection: "column",
                        flexGrow: 1,
                        minHeight: 0, // Important for flex shrinking
                        overflow: "auto"
                    }}>
                        <Typography textAlign="center" variant={"h7"} style={{fontWeight: 600, width: "100%"}}>
                            2. Build Parameter Configuration
                            <MythicStyledTooltip title={"Edit Build Parameters"}>
                                <IconButton color={"primary"} onClick={() => props.moveToStep(1)}>
                                    <DriveFileRenameOutlineIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        </Typography>
                        <ConfigurationSummary buildParameters={props.buildOptions[1].parameters} os={props.buildOptions[1].os} />
                    </div>
                    <div style={{
                        width: "70%",
                        margin: "5px",
                        border: "1px solid grey",
                        borderRadius: "5px",
                        padding: "5px",
                        display: "flex",
                        flexDirection: "column",
                        flexGrow: 1,
                        minHeight: 0, // Important for flex shrinking
                        overflow: "auto"
                    }}>
                        <Typography textAlign="center" variant={"h7"} style={{fontWeight: 600, width: "100%"}}>
                            3. Embedded Payload Configuration
                            <MythicStyledTooltip title={"Edit Selected Payload"}>
                                <IconButton color={"primary"} onClick={() => props.moveToStep(2)}>
                                    <DriveFileRenameOutlineIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        </Typography>
                        <div style={{height: "100%", }}>
                            <AceEditor
                                mode="json"
                                theme={theme.palette.mode === 'dark' ? 'monokai' : 'github'}
                                width="100%"
                                height={"100%"}
                                showPrintMargin={false}
                                wrapEnabled={true}
                                readOnly={true}
                                minLines={10}
                                value={payloadConfig}
                                setOptions={{
                                    useWorker: false
                                }}
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Navigation buttons - always at bottom */}
            <div style={{flexShrink: 0}}>
                <CreatePayloadNavigationButtons
                    first={props.first}
                    last={props.last}
                    canceled={canceled}
                    finished={finished}
                />
                <br/><br/>
            </div>
            {startSubscription &&
                <PayloadSubscriptionNotification me={props.me} subscriptionID={subscriptionID} fromNow={fromNow}/>}
        </div>
    );
} 
