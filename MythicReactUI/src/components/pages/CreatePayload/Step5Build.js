import React, {useEffect} from 'react';
import { gql, useMutation} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import {PayloadSubscriptionNotification} from './PayloadSubscriptionNotification';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {snackActions} from '../../utilities/Snackbar';
import {UploadTaskFile} from "../../MythicComponents/MythicFileUpload";
import {getSkewedNow} from "../../utilities/Time";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {ConfigurationSummary, GetGroupedParameters} from "./Step1SelectOS";
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IconButton from '@mui/material/IconButton';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";

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
    const [createPayloadMutation] = useMutation(create_payload, {
        update: (cache, {data}) => {
            setSubscriptionID(data.createPayload.uuid);
            if(data.createPayload.status === "success"){
                snackActions.info("Submitted payload to build pipeline", {autoClose: 1000});
                if(!startSubscription){
                    setStartSubscription(true);
                }
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
        let c2Profiles = [];
        for(let i = 0; i < props.buildOptions[3]?.c2?.length; i++){
            let instanceParam = {};
            let c2params = GetGroupedParameters({
                buildParameters: props.buildOptions[3].c2[i].c2profileparameters,
                os: props.buildOptions[1].os,
                c2_name: props.buildOptions[3].c2[i].name}).reduce( (prev, cur) => {
                return [...prev, ...cur.parameters];
            }, []);
            for(let j = 0; j < c2params.length; j++){
                let param = c2params[j];
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
                "c2_profile": props.buildOptions[3].c2[i].name,
                "c2_profile_parameters": instanceParam,
            })

        }
        const finishedPayload = {
            "selected_os": props.buildOptions[1].os,
            "payload_type": props.buildOptions[1].payload_type,
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
                            3. Command Selection
                            <MythicStyledTooltip title={"Edit Commands"}>
                                <IconButton color={"primary"} onClick={() => props.moveToStep(2)}>
                                    <DriveFileRenameOutlineIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        </Typography>
                        {props.buildOptions[2]?.map(c => (
                            <div key={c} style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                                {c}
                                <IconButton variant="contained" onClick={(e) => e.stopPropagation()}
                                            href={"/docs/agents/" + props.buildOptions[1].payload_type + "/commands/" + c}
                                            style={{marginLeft: "10px", float: "right"}} target="_blank">
                                    <MenuBookIcon/>
                                </IconButton>
                            </div>
                        ))}

                    </div>
                    <div style={{
                        width: "40%",
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
                            4. C2 Configuration
                            <MythicStyledTooltip title={"Edit C2 Parameters"}>
                                <IconButton color={"primary"} onClick={() => props.moveToStep(3)}>
                                    <DriveFileRenameOutlineIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        </Typography>
                        {props.buildOptions[3]?.c2?.map( (c, index) => (
                            <ConfigurationSummary key={c.name + index} buildParameters={c.c2profileparameters}
                                                  os={props.buildOptions[1].os} c2_name={c.name} />
                        ))}
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
/*
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
 */