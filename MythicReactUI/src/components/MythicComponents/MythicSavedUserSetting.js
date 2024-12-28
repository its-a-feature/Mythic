import { useReactiveVar } from '@apollo/client';
import { mePreferences } from '../../cache';
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
/*
setting_name options:
    hideUsernames
    showIP
    showHostname
    showCallbackGroups
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
    const preferences = mePreferences();
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
        ({setting_name, value}) => {
            if(mePreferences()?.[setting_name] !== value){
                const updatedPreferences = {
                    ...mePreferences(),
                    [setting_name]: value,
                };
                mePreferences(updatedPreferences);
                updateSetting({variables: {preferences: updatedPreferences}});
            }
        },
        ({settings}) => {
            const updatedPreferences = {
                ...mePreferences(),
                ...settings
            };
            mePreferences(updatedPreferences);
            updateSetting({variables: {preferences: updatedPreferences}});
        }
        ]
}