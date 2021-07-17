import React from 'react';
import {useQuery, gql} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import CircularProgress from '@material-ui/core/CircularProgress';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import {CreatePayloadC2ProfileParametersTable} from './CreatePayloadC2ProfileParametersTable';
import Typography from '@material-ui/core/Typography';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import * as RandExp from 'randexp';


const GET_Payload_Types = gql`
query getPayloadTypesC2ProfilesQuery($payloadType: String!) {
  c2profile(where: {payloadtypec2profiles: {payloadtype: {ptype: {_eq: $payloadType}}}, deleted: {_eq: false}}) {
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
    }
  }
}
 `;

export function Step4C2Profiles(props){
    const [c2Profiles, setC2Profiles] = React.useState([]);
    const { loading, error } = useQuery(GET_Payload_Types, {variables:{payloadType: props.buildOptions["payload_type"]},
        onCompleted: data => {
            const profiles = data.c2profile.map( (c2) => {
                const parameters = c2.c2profileparameters.map( (param) => {
                    if(param.format_string !== ""){
                        const random = new RandExp(param.format_string).gen();
                        return {...param, default_value: random, value: random}
                    }else if(param.default_value !== ""){
                        if(param.parameter_type === "ChooseOne"){
                            return {...param, value: param.default_value.split("\n")[0]}
                        }else if(param.parameter_type === "Dictionary"){
                            let tmp = JSON.parse(param.default_value);
                            let initial = tmp.reduce( (prev, op) => {
                                // find all the options that have a default_show of true
                                if(op.default_show){
                                    return [...prev, {value: op.default_value, key: op.name === "*" ? "": op.name} ];
                                }else{
                                    return [...prev];
                                }
                            }, [] );
                            return {...param, value: initial}
                        }else{
                            return {...param, value: param.default_value}
                        }
                    }
                    return {...param, error: param.required}
                });
                parameters.sort((a,b) => -b.description.localeCompare(a.description));
                return {...c2, "selected": false, c2profileparameters: parameters};
            });
            profiles.sort((a, b) => -b.name.localeCompare(a.name))
            setC2Profiles(profiles);
        }
    });

    if (loading) {
     return <div><CircularProgress /></div>;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const finished = () => {
        let allValid = true;
        console.log(c2Profiles);
        c2Profiles.forEach( (c2) => {
            if(c2.selected){
                c2.c2profileparameters.forEach( (param) => {
                    if(param.error){
                        snackActions.warning(c2.name + "'s parameter " + param.name + " is invalid");
                        allValid = false;
                    }
                });
            }
        });
        if(allValid){
            props.finished(c2Profiles);
        }
    }
    const canceled = () => {
        props.canceled();
    }
    const toggleC2Selection = (evt, c2) => {
        const updatedc2 = c2Profiles.map( (curc2) => {
            if(c2.name === curc2.name){
                return {...curc2, selected: !curc2.selected}
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
                    return param;
                });
                return {...curC2, c2profileparameters: c2params};
            }
            return curC2;
        });
        setC2Profiles(updatedc2);
    }
    return (
        <div >
            <Typography variant="h3" align="left" id="selectc2profiles" component="div" 
                style={{"marginLeft": "10px"}}>
                  Select C2 Profiles
            </Typography>
            {
                c2Profiles.map( (c2) => (
                <React.Fragment key={"step4c2switch" + c2.id}>
                    <FormControlLabel
                      value="top"
                      control={
                      <Switch
                        checked={c2.selected}
                        onChange={evt => toggleC2Selection(evt, c2)}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="active"
                      />}
                      label={c2.name}
                      labelPlacement="top"
                      style={{display: "inline"}}
                    />
                    <Typography variant="body1" align="left" id="selectc2profiles" component="div" key={"step4desc" + c2.id}
                        style={{"marginLeft": "10px"}}>
                          {c2.description}
                    </Typography>
                    { c2.selected ? ( 
                        <CreatePayloadC2ProfileParametersTable key={"step4table" + c2.id} {...c2} onChange={updateC2Parameter} />
                        ):(null)
                    }
                </React.Fragment>
                ))
            }
<br/>
            <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={canceled} finished={finished} />
            <br/><br/>
        </div>
    );
} 
