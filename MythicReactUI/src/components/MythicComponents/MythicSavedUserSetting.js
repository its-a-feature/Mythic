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
            default:
                console.log("unknown output type", output);
        }

        setSetting(initialStorageSetting);
    }, [me]);
    return setting;
}