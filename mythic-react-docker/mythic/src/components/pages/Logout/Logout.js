import React, {useEffect} from 'react';
import {Redirect} from 'react-router-dom';
import { meState, menuOpen } from '../../../cache';

export function Logout(props){
    useEffect(() => {
        meState({loggedIn:false, accessToken: null, refreshToken: null, user: null});
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        menuOpen(false);
    })
    return(
        <Redirect to='/new/login' />
    )
}

