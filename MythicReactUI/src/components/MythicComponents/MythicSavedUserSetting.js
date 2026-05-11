import { useReactiveVar } from '@apollo/client';
import {mePreferences, operatorSettingDefaults} from '../../cache';
import React from 'react';
import {useMutation, gql } from '@apollo/client';
import {snackActions} from "../utilities/Snackbar";

const updatePreferences = gql`
mutation updatePreferences($preferences: jsonb!){
    updateOperatorPreferences(preferences: $preferences){
        status
        error
    }
}
`;
export const GetComputedFontSize = () => {
    const element = document.getElementById('root');
    const fontSizeString = window.getComputedStyle(element).fontSize;
    return parseFloat(fontSizeString);
}
let latestPreferenceSnapshot = null;
const getPreferenceSnapshot = () => {
    return latestPreferenceSnapshot || mePreferences() || {};
};
const areSettingValuesEqual = (first, second) => {
    if(first === second){
        return true;
    }
    if(typeof first !== "object" || typeof second !== "object" || first === null || second === null){
        return false;
    }
    try{
        return JSON.stringify(first) === JSON.stringify(second);
    }catch(error){
        return false;
    }
};
/*
setting_name options:
    taskingDisplayFields
    showMedia
    interactType

    callbacks_table_columns
    callbacks_table_filters
 */
export function useGetMythicSetting({setting_name, default_value}){
    const preferences = useReactiveVar(mePreferences);
    let initialStorageSetting = GetMythicSetting({setting_name, default_value});

    const [setting, setSetting] = React.useState(initialStorageSetting);

    React.useEffect( () => {
        let newSetting = GetMythicSetting({setting_name, default_value});
        setSetting(newSetting);
    }, [preferences?.[setting_name]]);

    return setting;
}
export function GetMythicSetting({setting_name, default_value}){
    const preferences = getPreferenceSnapshot();
    return preferences?.[setting_name] === undefined ? default_value : preferences?.[setting_name];
}
export function useSetMythicSetting() {
    const [updateSetting] = useMutation(updatePreferences, {
        onCompleted: (data) => {
            //console.log(data, mePreferences());
        },
        onError: (error) => {
            snackActions.error("failed to save user setting: " + error.message);
            console.log(error);
        }
    });
    return [
        ({setting_name, value, broadcast=true}) => {
            const currentPreferences = getPreferenceSnapshot();
            if(!areSettingValuesEqual(currentPreferences?.[setting_name], value)){
                const updatedPreferences = {
                    ...currentPreferences,
                    [setting_name]: value,
                };
                latestPreferenceSnapshot = updatedPreferences;
                if(broadcast){
                    mePreferences(updatedPreferences);
                }
                updateSetting({variables: {preferences: updatedPreferences}});
            }
        },
        ({settings, broadcast=true}) => {
            const updatedPreferences = {
                ...getPreferenceSnapshot(),
                ...settings,
            };
            latestPreferenceSnapshot = updatedPreferences;
            if(broadcast){
                mePreferences(updatedPreferences);
            }
            updateSetting({variables: {preferences: updatedPreferences}});
        },
        () => {
            latestPreferenceSnapshot = operatorSettingDefaults;
            mePreferences(operatorSettingDefaults);
            updateSetting({variables: {preferences: operatorSettingDefaults}});
        }
        ]
}
