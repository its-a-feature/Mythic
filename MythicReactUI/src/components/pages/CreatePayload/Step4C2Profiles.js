import React from 'react';
import {useQuery, gql, useLazyQuery} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import {CreatePayloadC2ProfileParametersTable} from './CreatePayloadC2ProfileParametersTable';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import {getDefaultValueForType, getDefaultChoices} from './Step2SelectPayloadType';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";


const GET_Payload_Types = gql`
query getPayloadTypesC2ProfilesQuery($payloadType: String!, $operation_id: Int!) {
  c2profile(where: {payloadtypec2profiles: {payloadtype: {name: {_eq: $payloadType}}}, deleted: {_eq: false}}) {
    name
    is_p2p
    description
    id
    c2profileparameters(where: {deleted: {_eq: false}}) {
      default_value
      description
      format_string
      id
      name
      parameter_type
      randomize
      required
      verifier_regex
      choices
    }
    c2profileparametersinstances(where: {instance_name: {_is_null: false}, operation_id: {_eq: $operation_id}}, distinct_on: instance_name, order_by: {instance_name: asc}){
        instance_name
        id
    }
  }
}
 `;
const getProfileInstanceQuery = gql`
query getProfileInstanceQuery($name: String!, $operation_id: Int!, $c2_profile_id: Int!) {
  c2profileparametersinstance(where: {instance_name: {_eq: $name}, operation_id: {_eq: $operation_id}, c2_profile_id: {_eq: $c2_profile_id}}) {
    c2profileparameter {
      default_value
      description
      format_string
      id
      name
      parameter_type
      randomize
      required
      verifier_regex
      choices
      c2profile {
          name
      }
    }
    id
    value
  }
}
`;
const getDefaultsQuery = gql`
query getDefaultC2ProfileParameters($c2profile_id: Int!) {
    c2profile_by_pk(id: $c2profile_id) {
      id
      name
      c2profileparameters(where: {deleted: {_eq: false}}) {
        default_value
        description
        format_string
        id
        name
        parameter_type
        randomize
        required
        verifier_regex
        choices
      }
    }
  }
`;

export function Step4C2Profiles(props){
    const me = useReactiveVar(meState);
    const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
    const [c2Profiles, setC2Profiles] = React.useState([]);
    const { loading, error } = useQuery(GET_Payload_Types, {variables:{payloadType: props.buildOptions["payload_type"], operation_id: me?.user?.current_operation_id || 0},
        onCompleted: data => {
            const profiles = data.c2profile.map( (c2) => {
                if(props.prevData !== undefined){
                    //console.log(props.prevData);
                    for(let p = 0; p < props.prevData.length; p++){
                        if(props.prevData[p]["name"] === c2.name){
                            // we selected this c2 profile before and clicked back, so re-fill it out
                            const parameters = props.prevData[p]["c2profileparameters"].map( (param) => {
                                return {...param, error: false, 
                                    value: param["value"], 
                                    trackedValue: param["value"], 
                                    initialValue: getDefaultValueForType(param),
                                    choices: getDefaultChoices(param)
                                }
                            })
                            
                            parameters.sort((a,b) => -b.description.localeCompare(a.description));
                            return {...c2, "selected": props.prevData[p]["selected"], c2profileparameters: parameters, "selected_instance": props.prevData[p]["selected_instance"]};
                        }
                    }
                }
                const parameters = c2.c2profileparameters.map( (param) => {
                    const initialValue = getDefaultValueForType(param);
                    return {...param, error: false, value: initialValue, 
                        trackedValue: initialValue, 
                        initialValue: initialValue, 
                        choices: getDefaultChoices(param)};
                    
                });
                parameters.sort((a,b) => -b.description.localeCompare(a.description));
                return {...c2, "selected": false, c2profileparameters: parameters, "selected_instance": "None"};
            });
            profiles.sort((a, b) => -b.name.localeCompare(a.name))
            //console.log(profiles);
            setC2Profiles(profiles);
        },
        fetchPolicy: "no-cache"
    });
    const acceptConfirm = () => {
        props.finished(c2Profiles);
    }
    const finished = () => {
        let allValid = true;
        let includedC2 = false;
        c2Profiles.forEach( (c2) => {
            if(c2.selected){
                includedC2 = true;
                c2.c2profileparameters.forEach( (param) => {
                    if(param.error){
                        snackActions.warning(c2.name + "'s parameter " + param.name + " is invalid");
                        allValid = false;
                    }
                });
            }
        });
        if(allValid){
            //console.log(c2Profiles);
            if(!includedC2 && props.buildOptions["agent_type"] === "agent"){
                // normal agents need to confirm they're not including c2, services can move through
                setOpenConfirmDialog(true);
                return;
            }
            props.finished(c2Profiles);
        }

    }
    const canceled = () => {
        props.canceled();
    }
    const toggleC2Selection = (evt, c2, selected) => {
        const updatedc2 = c2Profiles.map( (curc2) => {
            if(c2.name === curc2.name){
                return {...curc2, selected: selected}
            }
            return curc2;
        });
        setC2Profiles(updatedc2);
    }
    const updateC2Parameter = (c2Name, parameterName, value, error) => {
        const updatedc2 = c2Profiles.map( (curC2) => {
            if(curC2.name === c2Name){
                const c2params = curC2.c2profileparameters.map( (param) => {
                    if (param.name === parameterName){
                        return {...param, error, value}
                    }
                    return {...param};
                });
                return {...curC2, c2profileparameters: c2params};
            }
            return curC2;
        });
        setC2Profiles(updatedc2);
    }
    const [getInstanceValues] = useLazyQuery(getProfileInstanceQuery, {
        onCompleted: (data) => {
          const updates = data.c2profileparametersinstance.map( (cur) => {
            let inst = {...cur, ...cur.c2profileparameter};
            if(inst.parameter_type === "Array" || inst.parameter_type === "ChooseMultiple" || inst.parameter_type === "TypedArray" || inst.parameter_type === "FileMultiple"){
                try{
                    inst["value"] = JSON.parse(inst["value"]);
                }catch(error){
                    inst["value"] = inst["value"];
                }
                try{
                    inst["trackedValue"] = JSON.parse(inst["value"]);
                }catch(error){
                    inst["trackedValue"] = inst["value"];
                }
                inst["initialValue"] = getDefaultValueForType(inst);
                inst["choices"] = getDefaultChoices(inst);
              } else if(inst.parameter_type === "Dictionary"){
                // 
                let choices = getDefaultChoices(inst);
                let finalDict = JSON.parse(inst["value"]); // this is a dictionary instead of an array, so fix it back
                let finalDictKeys = Object.keys(finalDict);
                let finalArray = [];
                for(let i = 0; i < finalDictKeys.length; i++){
                    let newDict = {
                        name: finalDictKeys[i],
                        value: finalDict[finalDictKeys[i]],
                        default_show: true
                      };
                    for(let j = 0; j < choices.length; j++){
                        if(choices[j].name === finalDictKeys[i]){
                            newDict["default_value"] = choices[j]["default_value"]
                        }
                    }
                  finalArray.push(newDict);
                }
                
                choices = choices.map(c => {return {...c, default_show: false}});
                let initialValue = getDefaultValueForType(inst);
                return {...inst, value: finalArray, choices: choices, trackedValue: finalArray, initialValue: initialValue, default_value: initialValue};
              } else if(inst.parameter_type === "File") {
                inst["choices"] = getDefaultChoices(inst);
                inst["trackedValue"] = {name: inst["value"], legacy: true};
                inst["initialValue"] = getDefaultValueForType(inst);
            } else {
                inst["choices"] = getDefaultChoices(inst);
                inst["trackedValue"] = inst["value"];
                inst["initialValue"] = getDefaultValueForType(inst);
              }
            return inst;
          })
          updates.sort( (a, b) => a.description < b.description ? -1 : 1);
          const updatedc2 = c2Profiles.map( (curc2) => {
            if(updates[0].c2profile.name === curc2.name){
                return {...curc2, c2profileparameters: updates};
            }
            return curc2;
        });
        setC2Profiles(updatedc2);
        },
        onError: (data) => {
          snackActions.error("Failed to fetch instance data: " + data);
          console.log(data);
        },
        fetchPolicy: "no-cache"
    });
    const [getIDefaultValues] = useLazyQuery(getDefaultsQuery, {
        onCompleted: (data) => {
            const updates = data.c2profile_by_pk.c2profileparameters.map( (param) => {
            const initialValue = getDefaultValueForType(param);
            return {...param, error: false, value: initialValue,
                trackedValue: initialValue,
                initialValue: initialValue,
                choices: getDefaultChoices(param)};
            })
            updates.sort( (a, b) => a.description < b.description ? -1 : 1);
            const updatedc2 = c2Profiles.map( (curc2) => {
            if(data.c2profile_by_pk.name === curc2.name){
                return {...curc2, c2profileparameters: updates};
            }
            return curc2;
        });
        setC2Profiles(updatedc2);
        },
        onError: (data) => {
            snackActions.error("Failed to fetch instance data: " + data);
            console.log(data);
        },
        fetchPolicy: "no-cache"
        });
    const onChangeCreatedInstanceName = (evt, c2) => {
        c2.selected_instance = evt.target.value;
        //setSelectedInstance(evt.target.value);
        const updatedc2 = c2Profiles.map( (curc2) => {
            if(c2.name === curc2.name){
                curc2.selected = true;
                curc2.c2profileparameters = [];
            }
            return curc2;
        });
        setC2Profiles(updatedc2);
        if(evt.target.value !== "None"){
            getInstanceValues({variables: {name: evt.target.value, operation_id: me?.user?.current_operation_id || 0, c2_profile_id: c2.id}});
        } else {
            getIDefaultValues({variables: {c2profile_id: c2.id}});
        }
      }
    if (loading) {
        return <div><CircularProgress /></div>;
    }
    if (error) {
        console.error(error);
        return <div>Error! {error.message}</div>;
    }
    return (
        <div style={{paddingTop: "20px", display: "flex", flexDirection: "column", height: "100%", width: "100%"}}>
            <div style={{flexGrow: 1, width: "100%", overflowY: "scroll"}}>
                <Table stickyHeader={true} size="small" style={{"maxWidth": "100%",}}>
                    <TableHead>
                        <TableRow>
                            <MythicStyledTableCell style={{width: "4rem"}}>Include?</MythicStyledTableCell>
                            <MythicStyledTableCell>C2 Name</MythicStyledTableCell>
                            <MythicStyledTableCell>Pre-created Instances</MythicStyledTableCell>
                            <MythicStyledTableCell>Description</MythicStyledTableCell>
                        </TableRow>
                    </TableHead>

                    {
                        c2Profiles.map((c2) => (
                            <TableBody key={"step4c2tablerow" + c2.id}>
                                <TableRow hover>
                                    <MythicStyledTableCell>

                                        <Switch
                                            checked={c2.selected}
                                            onChange={evt => toggleC2Selection(evt, c2, !c2.selected)}
                                            inputProps={{'aria-label': 'primary checkbox'}}
                                            name="active"
                                        />

                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        {c2.name}
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        {c2.c2profileparametersinstances.length > 0 ? (
                                            <Select
                                                style={{width: "100%", marginBottom: "5px", marginTop: "5px"}}
                                                value={c2.selected_instance}
                                                //label="Select an Existing Instance"
                                                onChange={evt => onChangeCreatedInstanceName(evt, c2)}
                                            >
                                                <MenuItem key={"buildparamopt" + "-1"}
                                                          value={"None"}>None</MenuItem>
                                                {
                                                    c2.c2profileparametersinstances.map((opt, i) => (
                                                        <MenuItem key={"buildparamopt" + i}
                                                                  value={opt.instance_name}>{opt.instance_name}</MenuItem>
                                                    ))
                                                }
                                            </Select>
                                        ) : null}
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <Typography variant="body1" align="left" id="selectc2profiles"
                                                    component="div" key={"step4desc" + c2.id}
                                                    style={{"marginLeft": "10px"}}>
                                            {c2.description}
                                        </Typography>
                                    </MythicStyledTableCell>
                                </TableRow>
                                {c2.selected &&
                                    <TableRow>
                                        <TableCell colSpan={4} style={{padding: "0px 0px 0px 0px !important", margin: "0px !important"}}>
                                            <CreatePayloadC2ProfileParametersTable key={"step4table" + c2.id}
                                                                               returnAllDictValues={false} {...c2}
                                                                               onChange={updateC2Parameter}/>
                                        </TableCell>
                                    </TableRow>

                                }
                            </TableBody>
                        ))
                    }
                </Table>
            </div>

            {openConfirmDialog &&
                <MythicConfirmDialog open={openConfirmDialog}
                                     title={"No C2 Profiles selected, continue?"}
                                     onClose={() => setOpenConfirmDialog(false)}
                                     acceptText="Accept"
                                     onSubmit={acceptConfirm} />
            }

            <br/>
            <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={canceled} finished={finished} />
            <br/><br/>
        </div>
    );
} 
