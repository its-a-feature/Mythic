import React from 'react';
import {useQuery, gql, useLazyQuery} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import {getDefaultValueForType, getDefaultChoices} from './Step2SelectPayloadType';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Button from '@mui/material/Button';
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {CreatePayloadBuildParametersTable} from "./CreatePayloadBuildParametersTable";
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {ConfigurationSummary} from "./Step1SelectOS";


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
export const getModifiedC2Params = (c2, c2profileparameters, buildOptions, use_supplied_values) => {
    return c2profileparameters.reduce( (prev, param) => {
        const initialValue = getDefaultValueForType(param);
        let configuredParam = {...param,
            error: false,
            value: initialValue,
            trackedValue: initialValue,
            initialValue: initialValue,
            choices: getDefaultChoices(param)}
        if(use_supplied_values){
            configuredParam = {...param}
        }
        if(buildOptions.c2_parameter_deviations === null){
            return [...prev, {...configuredParam}];
        }
        if(buildOptions.c2_parameter_deviations[c2.name] === undefined){
            return [...prev, {...configuredParam}];
        }
        if(buildOptions.c2_parameter_deviations[c2.name][param.name] === undefined){
            return [...prev, {...configuredParam}];
        }
        let c2Config = buildOptions.c2_parameter_deviations[c2.name][param.name];
        if(c2Config.supported === false){
            return [...prev];
        }
        if(c2Config.default_value !== undefined){
            configuredParam.value = c2Config.default_value;
            configuredParam.trackedValue = c2Config.default_value;
            configuredParam.initialValue = c2Config.default_value;
        }
        if(c2Config.dictionary_choices !== undefined){
            configuredParam.choices = c2Config.dictionary_choices.map(c => {return  {...c, value: c.default_value}});
            configuredParam.value = configuredParam.choices;
            configuredParam.trackedValue = configuredParam.choices;
            configuredParam.initialValue = configuredParam.choices;
        }else if(c2Config.choices !== undefined){
            configuredParam.choices = c2Config.choices;
            if(!configuredParam.choices.includes(configuredParam.default_value)){
                if(configuredParam.choices.length > 0){
                    configuredParam.value = configuredParam.choices[0];
                    configuredParam.trackedValue = configuredParam.choices[0];
                    configuredParam.initialValue = configuredParam.choices[0];
                }
            }
        }

        return [...prev, {...configuredParam}];
    }, []);
}
export function Step4C2Profiles(props){
    const me = useReactiveVar(meState);
    const [disabledC2Add, setDisabledC2Add] = React.useState(false);
    const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
    const [selectedC2, setSelectedC2] = React.useState("None");
    const [includedC2Profiles, setIncludedC2Profiles] = React.useState([]);
    const [c2Profiles, setC2Profiles] = React.useState([]);
    useQuery(GET_Payload_Types, {variables:{payloadType: props.buildOptions["payload_type"], operation_id: me?.user?.current_operation_id || 0},
        onCompleted: data => {
            const profiles = data.c2profile.map( (c2) => {
                const parameters = getModifiedC2Params(c2, c2.c2profileparameters, props.buildOptions, false);
                parameters.sort((a,b) => -b.description.localeCompare(a.description));
                return {...c2, c2profileparameters: parameters, "selected_instance": "None"};
            });
            profiles.sort((a, b) => -b.name.localeCompare(a.name))
            //console.log(profiles);
            if(profiles.length > 0){
                setSelectedC2(profiles[0]);
            }
            setC2Profiles(profiles);
            if(props.prevData !== undefined){
                // if we changed payload type, blow away the c2 configs
                if(props.prevData.payload_type === props.buildOptions.payload_type) {
                    const goodPrevData = props.prevData.c2.reduce( (prev, cur) => {
                        // only keep prevData that matches up with the current available c2 profiles for this payload type
                        for(let i = 0; i < profiles.length; i++){
                            if(cur.name === profiles[i].name){
                                cur.c2profileparameters = getModifiedC2Params(cur, cur.c2profileparameters, props.buildOptions, true);
                                return [...prev, {...cur}];
                            }
                        }
                        return [...prev];
                    }, []);
                    setIncludedC2Profiles(goodPrevData);
                }
            }
        },
        fetchPolicy: "no-cache"
    });
    const acceptConfirm = () => {
        props.finished(includedC2Profiles);
    }
    const finished = () => {
        let allValid = true;
        let includedC2 = false;
        includedC2Profiles.forEach( (c2) => {
            includedC2 = true;
            c2.c2profileparameters.forEach( (param) => {
                if(param.error){
                    snackActions.warning(c2.name + "'s parameter " + param.name + " is invalid");
                    allValid = false;
                }
            });
        });
        if(allValid){
            //console.log(includedC2Profiles);
            if(!includedC2 && props.buildOptions["agent_type"] === "agent"){
                // normal agents need to confirm they're not including c2, services can move through
                setOpenConfirmDialog(true);
                return;
            }
            props.finished({
                "c2": includedC2Profiles,
                "payload_type": props.buildOptions.payload_type
            });
        }

    }
    const canceled = () => {
        props.canceled();
    }
    const updateC2Parameter = (index, parameterName, value, error) => {
        const updatedc2 = includedC2Profiles.map( (curC2, indx) => {
            if(indx === index){
                const c2params = curC2.c2profileparameters.map( (param) => {
                    if (param.name === parameterName){
                        return {...param, error, value, trackedValue: value}
                    }
                    return {...param};
                });
                return {...curC2, c2profileparameters: c2params};
            }
            return curC2;
        });
        setIncludedC2Profiles(updatedc2);
    }
    const getInstanceValues = useMythicLazyQuery(getProfileInstanceQuery, {
        fetchPolicy: "no-cache"
    });
    const getIDefaultValues = useMythicLazyQuery(getDefaultsQuery, {
        fetchPolicy: "no-cache"
        });
    const onChangeCreatedInstanceName = (evt, index, c2) => {
        if(evt.target.value !== "None"){
            getInstanceValues({variables: {name: evt.target.value, operation_id: me?.user?.current_operation_id || 0, c2_profile_id: c2.id}})
                .then(({data}) => {
                    let updates = data.c2profileparametersinstance.map( (cur) => {
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
                            inst = {...inst, value: finalArray, choices: choices, trackedValue: finalArray, initialValue: initialValue, default_value: initialValue};
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
                    });
                    updates = getModifiedC2Params(c2, updates, props.buildOptions, true);
                    updates.sort( (a, b) => a.description < b.description ? -1 : 1);
                    const updatedc2 = includedC2Profiles.map( (curc2, indx) => {
                        if(index === indx){
                            return {...curc2, c2profileparameters: updates, selected_instance: evt.target.value};
                        }
                        return {...curc2};
                    });
                    setIncludedC2Profiles([...updatedc2]);
                })
                .catch((data) => {
                    snackActions.error("Failed to fetch instance data: " + data);
                    console.log("error fetching", data);
                });
        } else {
            getIDefaultValues({variables: {c2profile_id: c2.id}})
                .then(({data}) => {
                    let updates = data.c2profile_by_pk.c2profileparameters.map( (param) => {
                        const initialValue = getDefaultValueForType(param);
                        return {...param, error: false,
                            value: initialValue,
                            trackedValue: initialValue,
                            initialValue: initialValue,
                            choices: getDefaultChoices(param)};
                    });
                    updates = getModifiedC2Params(c2, updates, props.buildOptions, false);
                    updates.sort( (a, b) => a.description < b.description ? -1 : 1);
                    const updatedc2 = includedC2Profiles.map( (curc2, indx) => {
                        if(index === indx){
                            return {...curc2, c2profileparameters: updates, selected_instance: 'None'};
                        }
                        return {...curc2};
                    });
                    setIncludedC2Profiles(updatedc2);
                })
                .catch((data) => {
                    snackActions.error("Failed to fetch instance data: " + data);
                    console.log(data);
                });
        }
      }
    const onChangeSelectedC2 = (evt) => {
        setSelectedC2(evt.target.value);
    }
    const addC2 = () => {
        setIncludedC2Profiles([...includedC2Profiles, {...selectedC2}]);
    }
    const removeC2 = (i) => {
        setIncludedC2Profiles(includedC2Profiles.toSpliced(i, 1));
    }
    React.useEffect( () => {
        if(selectedC2 === 'None'){
            setDisabledC2Add(true);
            return;
        }
        if(!props.buildOptions.supports_multiple_c2_in_build && includedC2Profiles.length > 0){
            setDisabledC2Add(true);
            return;
        }
        if(!props.buildOptions.supports_multiple_c2_instances_in_build){
            const c2Names = includedC2Profiles.map(c => c.name);
            if(c2Names.includes(selectedC2.name)){
                setDisabledC2Add(true);
                return;
            }
        }
        setDisabledC2Add(false);
    }, [includedC2Profiles, selectedC2]);
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
                    <div style={{width: "40%", margin: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px", display: "flex"}}>
                        <MythicAgentSVGIcon payload_type={props.buildOptions.payload_type} style={{width: "80px", padding: "5px", objectFit: "unset"}} />
                        <div>
                            <Typography variant={"p"} style={{}}>
                                <b>OS: </b>{props.buildOptions.os}
                            </Typography><br/>
                            <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                                <b>Description: </b>{props.buildOptions.description}
                            </Typography>
                        </div>
                    </div>
                    <div style={{width: "60%",
                        margin: "5px",
                        border: "1px solid grey",
                        borderRadius: "5px", padding: "10px"}}>
                        <Typography variant={"p"} style={{fontWeight: 600}}>
                            1. Select C2 Profiles to Include
                        </Typography>
                        <Select
                            style={{width: "100%", marginBottom: "5px", marginTop: "5px", display: "flex"}}
                            value={selectedC2}
                            onChange={onChangeSelectedC2}
                        >
                            <MenuItem key={"buildparamopt" + "-1"}
                                      value={"None"}>None</MenuItem>
                            {
                                c2Profiles.map((opt, i) => (
                                    <MenuItem key={"buildparamopt" + i} value={opt} style={{display: "flex"}}>
                                        <b>{opt.name}</b> - {opt.description}
                                    </MenuItem>
                                ))
                            }
                        </Select>
                        <Button size="small" color={"primary"} variant={"contained"} style={{marginLeft: "10px", color: "white", marginBottom: "5px"}}
                                onClick={addC2}
                                disabled={disabledC2Add}
                                startIcon={<AddCircleIcon color={"success"} style={{backgroundColor: "white", borderRadius: "10px"}}/>} >
                                Include Profile
                        </Button>
                    </div>
                </div>

                {/* Bottom section - scrollable table area */}
                <div style={{
                    margin: "5px",
                    //border: "1px solid grey",
                    borderRadius: "5px",
                    //padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "hidden"
                }}>
                    {/* Header section - fixed */}
                    <div style={{flexShrink: 0}}>
                        <Typography variant={"p"} style={{fontWeight: 600}}>
                            2. Include and Configure C2 Profiles
                        </Typography>
                    </div>
                    <div style={{
                        flexGrow: 1,
                        overflow: "auto",
                        display: "flex",
                        flexDirection: "row",
                        minHeight: 0 // Important for flex shrinking
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
                                Configuration Summary
                            </Typography>
                            {includedC2Profiles.map( (c, index) => (
                                <ConfigurationSummary key={c.name + index} buildParameters={c.c2profileparameters}
                                                      os={props.buildOptions.os} c2_name={c.name} />
                            ))}
                        </div>
                        <div style={{
                            width: "100%",
                            margin: "5px",
                            border: "1px solid grey",
                            borderRadius: "5px",
                            padding: "0px",
                            display: "flex",
                            flexDirection: "column",
                            flexGrow: 1,
                            minHeight: 0, // Important for flex shrinking
                            overflow: "hidden"
                        }}>
                            <C2ProfileTabs includedC2Profiles={includedC2Profiles} os={props.buildOptions.os}
                                           onCloseTab={removeC2} onChange={updateC2Parameter}
                                           onChangeCreatedInstanceName={onChangeCreatedInstanceName}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {openConfirmDialog &&
                <MythicConfirmDialog open={openConfirmDialog}
                                     title={"No C2 Profiles selected, continue?"}
                                     onClose={() => setOpenConfirmDialog(false)}
                                     acceptText="Accept"
                                     onSubmit={acceptConfirm} />
            }
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
        </div>
    )
    /*
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

     */
}

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}
function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && children}
        </div>
    );
}
const C2ProfileTabs = ({includedC2Profiles, onChange, os, onCloseTab, onChangeCreatedInstanceName}) => {
    const [value, setValue] = React.useState(0);
    const onCloseTabLocal = (e, index) => {
        e.stopPropagation();
        e.preventDefault();
        onCloseTab(index);
        setValue(0);
    }
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    return (
        <>
            <Tabs
                value={value}
                onChange={handleChange}
                indicatorColor='primary'
                textColor='primary'
                variant='fullWidth'
                scrollButtons={true}
                style={{minHeight: "40px", flexShrink: 0 }}
                aria-label='scrollable tabs'>
                {includedC2Profiles.map( (c, index) => (
                    <Tab key={c.name + index} label={
                        <div style={{display: "flex", alignItems: "center"}}>
                                {c.name}
                            <IconButton size='small' onClick={(e) => onCloseTabLocal(e, index)} >
                                <CloseIcon />
                            </IconButton>
                        </div>
                    } {...a11yProps(index)} style={{flexShrink: 0}} />
                ))}
            </Tabs>
            {includedC2Profiles.map( (c, index) => (
                <CustomTabPanel index={index} value={value} key={c.name + index} style={{
                     overflowY: "auto", display: "flex", flexDirection: "column",
                }} >
                    {c.c2profileparametersinstances.length > 0 &&
                        <Select
                            style={{width: "100%", marginBottom: "5px"}}
                            value={c.selected_instance}
                            onChange={evt => onChangeCreatedInstanceName(evt, index, c)}
                        >
                            <MenuItem key={"buildparamopt" + "-1"}
                                      value={"None"}>None</MenuItem>
                            {
                                c.c2profileparametersinstances.map((opt, i) => (
                                    <MenuItem key={"buildparamopt" + i}
                                              value={opt.instance_name}>{opt.instance_name}</MenuItem>
                                ))
                            }
                        </Select>
                    }
                    <CreatePayloadBuildParametersTable instance_name={c.selected_instance} onChange={(n,v,e) => onChange(index, n, v, e)}
                                                       buildParameters={c.c2profileparameters} os={os}
                                                       c2_name={c.name}
                    />
                </CustomTabPanel>
            ))}
        </>
    )
}
