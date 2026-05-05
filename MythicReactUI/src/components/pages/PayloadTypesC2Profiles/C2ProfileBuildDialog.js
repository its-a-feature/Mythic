import React, {useState} from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import { getDefaultChoices } from '../CreatePayload/Step2SelectPayloadType';
import { getDefaultValueForType } from '../CreatePayload/Step2SelectPayloadType';
import {MythicDialogBody, MythicDialogButton, MythicDialogFooter, MythicDialogSection} from "../../MythicComponents/MythicDialogLayout";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";
import {BuildParameterList} from "./InstalledServiceParameterDetails";

const GET_C2_Details = gql`
query GetPC2Details($payload_name: String!) {
  c2profile(where: {name: {_eq: $payload_name}}) {
    c2profileparameters(where: {deleted: {_eq: false}}, order_by: {name: asc}) {
      default_value
      description
      format_string
      name
      parameter_type
      id
      randomize
      required
      verifier_regex
      choices
    }
  }
}
`;

export function C2ProfileBuildDialog(props) {
    const [buildParams, setBuildParams] = useState([]);
    const { loading, error } = useQuery(GET_C2_Details, {
        variables: {payload_name: props.container_name},
        onCompleted: data => {
            const buildParams = data.c2profile[0].c2profileparameters.map((param) => {
              let choices = getDefaultChoices(param);
              if(choices.length > 0){
                if(param.parameter_type === "Dictionary"){
                  choices = choices.reduce( (prev, cur) => {
                    return {...prev, [cur.name]: cur.default_value};
                  }, {});
                  choices = JSON.stringify(choices, null, 2);
                } else {
                  choices = choices.join(", ")
                }
                
              } else {
                choices = "";
              }
              let default_value = getDefaultValueForType(param);
              if(param.parameter_type === "Array" || param.parameter_type === "ChooseMultiple"){
                default_value = default_value.join(", ")
              } else if(param.parameter_type === "Boolean") {
                  default_value = default_value ? "True" : "False"
              } else if(param.parameter_type === "File") {
                  default_value = "";
              } else if(param.parameter_type === "Dictionary"){
                let defaultChoices = getDefaultChoices(param);
                defaultChoices = defaultChoices.reduce( (prev, cur) => {
                  if(cur.default_show){
                    return {...prev, [cur.name]: cur.default_value};
                  }else{
                    return {...prev};
                  }
                }, {});
                default_value = JSON.stringify(defaultChoices, null, 2);
              }
              return {...param, choices: choices, default_value: default_value}
            });
            setBuildParams(buildParams);
        }
        });
    if (loading) {
     return (
       <>
         <DialogTitle id="form-dialog-title">{props.container_name}'s Build Parameters</DialogTitle>
         <DialogContent dividers={true}>
           <MythicLoadingState title="Loading build parameters" description="Fetching parameter definitions for this C2 profile." minHeight={180} />
         </DialogContent>
       </>
     );
    }
    if (error) {
     console.error(error);
     return (
       <>
         <DialogTitle id="form-dialog-title">{props.container_name}'s Build Parameters</DialogTitle>
         <DialogContent dividers={true}>
           <MythicErrorState title="Unable to load build parameters" description={error.message} minHeight={180} />
         </DialogContent>
       </>
     );
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.container_name}'s Build Parameters</DialogTitle>
        <DialogContent dividers={true}>
          <MythicDialogBody compact>
          <MythicDialogSection
            title="Build Parameters"
            description={`${buildParams.length} parameter${buildParams.length === 1 ? "" : "s"} defined for this C2 profile.`}
          >
            <BuildParameterList parameters={buildParams} />
          </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
