import { Route, Redirect } from 'react-router-dom';
import React from 'react';
import { useReactiveVar } from '@apollo/client';
import { meState } from '../../cache';


export function LoggedInRoute({component, ...rest}){
    const me = useReactiveVar(meState);
    return (
        <Route {...rest} render={(props) => (
            me.loggedIn && me.user ? (
                //logged in
                React.createElement(component, {...props, me: me})
            ) : (
                //not logged in
                <Redirect to={{ 
                    pathname: '/new/login',
                    state: { from: props.location }
                }} />
            )
        )} />
    )
}
