import { makeVar } from '@apollo/client';
import {useQuery, gql } from '@apollo/client';
import React from 'react';
import { snackActions } from './components/utilities/Snackbar';

export const meState = makeVar({loggedIn:false, user: null, access_token: null, refresh_token: null});
export const menuOpen = makeVar(false);

const meHookQuery = gql`
query meHookQuery{
    meHook{
        status
        error
        current_operation_id
        current_operation
    }
}
`;
export const MeHook = () => {
    const {data} = useQuery(meHookQuery, {fetchPolicy: "no-cache"});
    React.useEffect( () => {
        console.log("MeHook mounted")
    }, [])
    if(data) {
        console.log(data);
        if(data.meHook.status === "success"){
            try{
                if(data.meHook.current_operation_id !== meState().user.current_operation_id || data.meHook.current_operation !== meState().user.current_operation){
                    console.log("updating meState");
                    meState({...meState(), user: {...meState().user, current_operation_id: data.meHook.current_operation_id, current_operation: data.meHook.current_operation}});
                    localStorage.setItem("user", JSON.stringify(meState().user));

                } else {
                    //console.log("no difference, not updating meState")
                }
                
            }catch(error){
                console.log("error trying to parse meHook and meState data", error);
            }
            
        } else {
            snackActions.error("Failed to get current operator information: " + data.meHook.error)
        }
    } else {
    }
    return meState();
}

export const successfulLogin = (data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    meState({
        loggedIn: true,
        ...data
    });
}
export const successfulRefresh = (data) => {
    localStorage.setItem("access_token", data.access_token);
    meState({
        loggedIn: true,
        access_token: localStorage.getItem("access_token"),
        ...meState()
    });
}
export const FailedRefresh = () =>{
    console.log("failed refresh");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    meState({
        loggedIn: false,
        access_token: null,
        refresh_token: null,
        user: null
    });
}

