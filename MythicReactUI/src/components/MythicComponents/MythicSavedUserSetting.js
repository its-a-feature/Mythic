import { useReactiveVar } from '@apollo/client';
import { meState } from '../../cache';
import React from 'react';

/*
setting_name options:
    hideUsernames
    showIP
    showHostname
    showCallbackGroups
    showMedia

    callbacks_table_columns
    callbacks_table_filters
 */
export function useMythicSetting({setting_name, default_value, output="boolean"}){
    const me = useReactiveVar(meState);
    // get the initial value we have stored
    const localStorageSetting = localStorage.getItem(`${me?.user?.user_id || 0}-${setting_name}`);
    let initialStorageSetting = localStorageSetting === null ? default_value : localStorageSetting;
    switch(output){
        case "boolean":
            initialStorageSetting = (initialStorageSetting.toLowerCase() === "true");
            break;
        case "number":
            initialStorageSetting = Number(initialStorageSetting);
            break;
        case "json-array":
            try{

                initialStorageSetting = JSON.parse(initialStorageSetting);
            }catch(error){
                console.log(initialStorageSetting);
            }
            break;
        case "json":
            try{
                initialStorageSetting = JSON.parse(initialStorageSetting);
            }catch(error){
                console.log(initialStorageSetting);
            }
            break;
        default:
            console.log("unknown output type", output);
    }
    const [setting, setSetting] = React.useState(initialStorageSetting);
    React.useEffect( () => {
        // update the initial value if the user changes
        const localStorageSetting = localStorage.getItem(`${me?.user?.user_id || 0}-${setting_name}`);
        let initialStorageSetting = localStorageSetting === null ? default_value : localStorageSetting;
        switch(output){
            case "boolean":
                initialStorageSetting = (initialStorageSetting.toLowerCase() === "true");
                break;
            case "number":
                initialStorageSetting = Number(initialStorageSetting);
                break;
            case "json-array":
                try{
                    initialStorageSetting = JSON.parse(initialStorageSetting);
                }catch(error){
                    initialStorageSetting = [];
                }
                break;
            case "json":
                try{
                    initialStorageSetting = JSON.parse(initialStorageSetting);
                }catch(error){
                    initialStorageSetting = {};
                }
                break;
            default:
                console.log("unknown output type", output);
        }
        setSetting(initialStorageSetting);
    }, [me]);
    return setting;
}
export function SetMythicSetting({setting_name, value, output = "boolean"}) {
    let newSetting = value;
    switch(output){
        case "json-array":
                newSetting = JSON.stringify(value);
            break;
        case "json":
            newSetting = JSON.stringify(value);
            break;
        case "boolean":
            if(typeof value === "boolean"){
                newSetting = value ? "true" : "false";
            } else {
                newSetting = value.toLowerCase() === "true" ? "true" : "false";
            }
            break;
        default:
    }
    const meID = meState()?.user?.user_id || 0;
    localStorage.setItem(`${meID}-${setting_name}`, newSetting)
}