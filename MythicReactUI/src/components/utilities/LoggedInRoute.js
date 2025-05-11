import { Navigate, useLocation } from 'react-router-dom';
import React from 'react';


export function LoggedInRoute({children, me}){
    const location = useLocation();
    return (me?.loggedIn && me?.user ? //logged in
    children : //not logged in
    (<Navigate to={'/new/login?redirect=' + location.pathname} />));
}
