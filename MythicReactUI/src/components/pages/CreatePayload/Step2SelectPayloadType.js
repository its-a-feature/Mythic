import React, {  } from 'react';
import {useQuery, gql} from '@apollo/client';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import {CreatePayloadBuildParametersTable} from './CreatePayloadBuildParametersTable';
import Typography from '@mui/material/Typography';
import * as RandExp from 'randexp';
import MenuItem from '@mui/material/MenuItem';

export const getSavedToType = (parameter) => {
    let temp = {...parameter};
    temp.default_value = parameter.trackedValue;
    if(parameter.parameter_type === 'Date'){
        return temp.default_value;
    } else if(parameter.parameter_type === 'File'){
        return {name: temp.trackedValue, legacy: true}
    }
    return getDefaultValueForType(temp);
}
export const getDefaultValueForType = (parameter) => {
    // all default values will be strings, so convert them
    if(parameter.randomize && parameter.format_string !== ""){
        return new RandExp(parameter.format_string).gen();
    }
    switch (parameter.parameter_type) {
        case "String":
            return parameter.default_value;
        case "Number":
            // automatic casting to number for multiplication
            return parameter.default_value * 1;
        case "ChooseOne":
            return parameter.default_value;
        case "ChooseOneCustom":
            return parameter.default_value;
        case "ChooseMultiple":
            // default_value will be a json string of an array
            return JSON.parse(parameter.default_value);
        case "Array":
            return JSON.parse(parameter.default_value);
        case "TypedArray":
            return JSON.parse(parameter.default_value);
        case "Boolean":
            return parameter.default_value === "true";
        case "Dictionary":
            // this will be an array of configuration
            if(typeof parameter.choices === "string"){
                let dictChoices = JSON.parse(parameter.choices);
                return dictChoices.map( (c) => {
                    return {...c, value: c.default_value}
                })
            }else{
                return parameter.choices.map( c => {
                    return {...c, value: c.default_value}
                });
            }
        case "FileMultiple":
            return [];
        case "File":
            return {name: parameter.default_value};
        case "Date":
            // date default_value is a string of a number representing the day offset
            var tmpDate = new Date();
            tmpDate.setDate(tmpDate.getDate() + parseInt(parameter.default_value * 1));
            return tmpDate.toISOString().slice(0,10); 
        default:
            break;
    }
}
export const getDefaultChoices = (parameter) => {
    if(typeof parameter.choices === "string"){
        return JSON.parse(parameter.choices);
    } else {
        return parameter.choices;
    }
}

