import React, {useState} from 'react';
import {Button, Typography} from '@mui/material';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useLazyQuery, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import {CreatePayloadC2ProfileParametersTable} from '../CreatePayload/CreatePayloadC2ProfileParametersTable';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import {useTheme} from '@mui/material/styles';
import { snackActions } from '../../utilities/Snackbar';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {getDefaultValueForType, getDefaultChoices} from '../CreatePayload/Step2SelectPayloadType';

const getProfileConfigQuery = gql`
query getProfileParameters($id: Int!, $operation_id: Int!) {
  c2profile_by_pk(id: $id) {
    c2profileparameters(where: {deleted: {_eq: false}}, order_by: {name: asc}){
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
const getProfileInstaceQuery = gql`
query getProfileInstanceQuery($name: String!, $operation_id: Int!) {
  c2profileparametersinstance(where: {instance_name: {_eq: $name}, operation_id: {_eq: $operation_id}}) {
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
    }
    id
    value
  }
}
`;
const deleteInstanceMutation = gql`
mutation deleteSavedInstance($name: String!, $operation_id: Int!){
  delete_c2profileparametersinstance(where: {instance_name: {_eq: $name}, operation_id: {_eq: $operation_id}}){
    affected_rows
  }
}
`;
const createInstanceMutation = gql`
mutation createNewC2Instance($instance_name: String!, $c2_instance: String!, $c2profile_id: Int!){
  create_c2_instance(c2_instance: $c2_instance, instance_name: $instance_name, c2profile_id: $c2profile_id){
    status
    error
  }
}
`;

export function C2ProfileSavedInstancesDialog(props) {
    const theme = useTheme();
    const me = useReactiveVar(meState);
    const [instanceName, setInstanceName] = useState("");
    const [selectedInstance, setSelectedInstance] = useState("");
    const [createdInstances, setCreatedInstances] = useState([]);
    const [baseParameters, setBaseParameters] = useState([]);
    const [currentParameters, setCurrentParameters] = useState([]);
    const { loading } = useQuery(getProfileConfigQuery, {
        variables: {id: props.id, operation_id: me?.user?.current_operation_id || 0},
        onCompleted: data => {
            const parameters = data.c2profile_by_pk.c2profileparameters.map( (param) => {
              const initialValue = getDefaultValueForType(param);
              return {...param, error: false, value: initialValue, 
                  trackedValue: initialValue, 
                  initialValue: initialValue, 
                  choices: getDefaultChoices(param)};
            });
          parameters.sort((a,b) => -b.description.localeCompare(a.description));
          setBaseParameters([...parameters]);
          setCurrentParameters([...parameters]);
          setCreatedInstances(data.c2profile_by_pk.c2profileparametersinstances);
        },
        onError: data => {
          console.log(data);
        },
        fetchPolicy: "network-only"
    });
    const [getInstanceValues] = useLazyQuery(getProfileInstaceQuery, {
      onCompleted: (data) => {
        const updates = data.c2profileparametersinstance.map( (cur) => {
          let inst = {...cur, ...cur.c2profileparameter};
          if(inst.parameter_type === "Array" || inst.parameter_type === "ChooseMultiple"){
            inst["value"] = JSON.parse(inst["value"]);
            inst["trackedValue"] = JSON.parse(inst["value"]);
            inst["choices"] = getDefaultChoices(inst);
            inst["initialValue"] = getDefaultValueForType(inst);
          } else if(inst.parameter_type === "Dictionary"){
            // 
            let defaultValue = getDefaultValueForType(inst);
            let finalDict = JSON.parse(inst["value"]); // this is a dictionary instead of an array, so fix it back
            let finalDictKeys = Object.keys(finalDict);
            let finalArray = [];
            let choices = getDefaultChoices(inst);
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
            return {...inst, value: finalArray, choices: choices, trackedValue: finalArray, default_value:defaultValue, initialValue:defaultValue};
          } else {
            inst["choices"] = getDefaultChoices(inst);
            inst["trackedValue"] = inst["value"];
            inst["initialValue"] = getDefaultValueForType(inst);
          }
          return inst;
        })
        updates.sort( (a, b) => a.description < b.description ? -1 : 1);
        setCurrentParameters(updates);
      },
      onError: (data) => {
        snackActions.error("Failed to fetch instance data: " + data);
        console.log(data);
      },
      fetchPolicy: "no-cache"
    })
    const [deleteInstance] = useMutation(deleteInstanceMutation, {
      onCompleted: (data) => {
        setSelectedInstance("")
        setInstanceName("");
        setCurrentParameters([...baseParameters]);
        const updatedInstances = createdInstances.filter( (cur) => cur.instance_name !== selectedInstance);
        setCreatedInstances(updatedInstances);
        snackActions.success("Sucessfully deleted instance");
      },
      onError: (data) => {
        snackActions.error("Failed to delete instance: " + data);
      }
    });
    const [createInstance] = useMutation(createInstanceMutation, {
      onCompleted: (data) => {
        if(data.create_c2_instance.status === "success"){
          snackActions.success("Successfully created instance");
        }else{
          snackActions.error("Failed to create instance: " + data.create_c2_instance.error);
        }
        props.onClose();
        
      },
      onError: (data) => {
        snackActions.error("Failed to create instance: " + data);
      }
    })
    if (loading) {
     return <LinearProgress />;
    }
    const onConfigSubmit = () => {
      if(instanceName.length === 0){
        snackActions.warning("Must supply an instance name");
        return;
      }
        const config = currentParameters.reduce( (paramPrev, param) => {
          //return {...prev, [cur.name]: cur.value}
          if(param.parameter_type === "Dictionary"){
            const newDict = param.value.reduce( (prev, cur) => {
                if(cur.default_show){
                    return {...prev, [cur.name]: cur.value};
                }
                return {...prev}
            }, {});
            return {...paramPrev, [param.name]: newDict};
          } else {
              return {...paramPrev, [param.name]: param.value};
          }
        }, {});
        createInstance({variables: {operation_id: me?.user?.current_operation_id||0, instance_name: instanceName, c2profile_id: props.id, c2_instance: JSON.stringify(config)}})
    }
    const onChange = (name, value, error) => {
      setInstanceName(value);
    }
    const updateC2Parameter = (c2Name, parameterName, value, error) => {
      const c2params = currentParameters.map( (param) => {
        if (param.name === parameterName){
            return {...param, error, value}
        }
        return param;
      });
      //console.log(c2params);
      setCurrentParameters(c2params);
    }
    const onChangeCreatedInstanceName = (evt) => {
      setSelectedInstance(evt.target.value);
      setInstanceName(evt.target.value);
      if(evt.target.value === ""){
        setCurrentParameters([...baseParameters]);
      }else{
        setCurrentParameters([]);
        getInstanceValues({variables: {name: evt.target.value, operation_id: me.user.current_operation_id}});
      }
    }
    const deleteInstanceButton = () => {
      setCurrentParameters([]);
      deleteInstance({variables: {name: selectedInstance, operation_id: me.user.current_operation_id}})
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Save an Instance of {props.name}'s Parameters</DialogTitle>
        <DialogContent dividers={true}>
          <Typography style={{paddingBottom: "10px"}}>
            Saving an instance of the parameters allows you to select them from a dropdown when creating agents later, saving time and typos.
          </Typography>
            {createdInstances.length > 0 ? (
              <Grid container spacing={2} style={{paddingTop: "10px"}}>
                <Grid item xs={6}>
                  <FormControl style={{width: "100%"}}>
                  <InputLabel >Select an Existing Instance</InputLabel>
                      <Select
                        style={{width: "100%", marginBottom: "10px"}}
                        value={selectedInstance}
                        label="Select an Existing Instance"
                        onChange={onChangeCreatedInstanceName}
                      >
                        <MenuItem value="">New Instance</MenuItem>
                      {
                          createdInstances.map((opt, i) => (
                              <MenuItem key={"buildparamopt" + i} value={opt.instance_name}>{opt.instance_name}</MenuItem>
                          ))
                      }
                      </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  {selectedInstance.length > 0 ? (
                    <Button style={{backgroundColor: theme.palette.error.main, color: "white"}} variant="contained" onClick={deleteInstanceButton}> Delete Instance</Button>
                  ) : (null)}
                </Grid>
            </Grid>
            ) : (null)}
            <MythicTextField name="Instance Name" onChange={onChange} value={instanceName} style={{paddingTop: "10px"}}/>
            <CreatePayloadC2ProfileParametersTable {...props} returnAllDictValues={true} c2profileparameters={currentParameters} onChange={updateC2Parameter} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
          <Button variant="contained" onClick={onConfigSubmit} color="success">
            {selectedInstance.length > 0 ? ("Update") : ("Create")}
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

