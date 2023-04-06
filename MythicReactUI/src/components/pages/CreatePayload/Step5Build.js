import React, {useEffect} from 'react';
import { gql, useMutation} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import {PayloadSubscriptionNotification} from './PayloadSubscriptionNotification';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {snackActions} from '../../utilities/Snackbar';

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
                snackActions.info("Submitted payload to build pipeline");
                setSubscriptionID(data.createPayload.uuid);
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
    const finished = () => {
        const buildParameters = props.buildOptions[1]["parameters"].map( (param) => {
            if(param.parameter_type === "Dictionary"){
                const newDict = param.value.reduce( (prev, cur) => {
                    if(cur.default_show){
                        return {...prev, [cur.name]: cur.value};
                    }
                    return {...prev}
                }, {});
                return {name: param.name, value: newDict};
            } else {
                return {name: param.name, value: param.value};
            }
        });
        const c2Profiles = props.buildOptions[3].reduce( (prev, c2) => {
            if(c2.selected){
                const parameters = c2.c2profileparameters.reduce( (prev, param) => {
                    if(param.parameter_type === "Dictionary"){
                        const newDict = param.value.reduce( (prev, cur) => {
                            if(cur.default_show){
                                return {...prev, [cur.name]: cur.value};
                            }
                            return {...prev}
                            
                        }, {});
                        return {...prev, [param.name]: newDict};
                    }
                    return {...prev, [param.name]: param.value}
                }, {});
                return [...prev, {"c2_profile": c2.name, "c2_profile_parameters": parameters}];
            }
            return prev;
        }, []);
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
        snackActions.info("Submitted Creation to Mythic...");
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
