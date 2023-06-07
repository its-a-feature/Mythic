//import './wdyr';
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';
import {BrowserRouter as Router} from 'react-router-dom'
import { ApolloProvider, ApolloClient, InMemoryCache, from, split, HttpLink } from '@apollo/client';
import { WebSocketLink } from "@apollo/client/link/ws";
import { successfulRefresh, FailedRefresh} from './cache';
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { SubscriptionClient } from 'subscriptions-transport-ws'
import { getMainDefinition } from '@apollo/client/utilities'
import { setContext } from '@apollo/client/link/context';
import {snackActions} from './components/utilities/Snackbar';
import MessageTypes from 'subscriptions-transport-ws/dist/message-types';
import jwt_decode from 'jwt-decode';
import {meState} from './cache';

export const mythicVersion = "3.0.1-rc19";
export const mythicUIVersion = "0.1.15-rc14";

let fetchingNewToken = false;

let cache = new InMemoryCache({
    typePolicies: {
        Query: {
            fields: {
                operationeventlog: {
                    
                },
                callback: {
                  
                }
            }
        }
    }
});

let retryLink = new RetryLink({
  delay: {
    initial: 20,
    max: 300,
    jitter: true
  },
  attempts: {
    max: 2,
    retryIf: (error, _operation) => !!error
  }
});
let httpLink = new HttpLink({
    uri: window.location.origin + "/graphql/",
    options: {
        reconnect: true,   
        connectionParams: {
          headers: {
            Authorization: () => `Bearer ${localStorage.getItem('access_token')}`
          }
       }     
    }
});
export const isJWTValid = () => {
  let access_token = localStorage.getItem("access_token");
  //console.log("in isJWTValid", "access_token", access_token);
  if(access_token){
    const decoded_token = jwt_decode(access_token);
    if(Date.now() > decoded_token.exp * 1000){
      //console.log("exp is expired: ", decoded_token.exp * 1000, Date.now())
      return false;
    }else{
      return true;
    }
  }else{
    return false;
  }
}
export const JWTTimeLeft = () => {
  let access_token = localStorage.getItem("access_token");
  //console.log("in isJWTValid", "access_token", access_token);
  if(access_token){
    const decoded_token = jwt_decode(access_token);
    return (decoded_token.exp * 1000) - Date.now();
  }else{
    return 0;
  }
}
const authLink = setContext( async (_, {headers}) => {
  // get the authentication token from local storage if it exists
  // return the headers to the context so httpLink can read them
  while(fetchingNewToken){
    // we need to wait until we're no longer fetching a token
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
    let access_token = localStorage.getItem('access_token');
    if(access_token){
      const decoded_token = jwt_decode(access_token);
      //console.log(decoded_token);
      // JWT lifetime is 4 hours. If there's 2hrs or less left of the JWT, update it
      let diff = (decoded_token.exp * 1000) - Date.now();
      let twoHours = 7200000; // 2 hours in miliseconds, this is half the JWT lifetime
      // we want to make sure we try to get a new access_token while the current one is still active or it'll fail
      if(diff < twoHours || !isJWTValid()){
        console.log("token is at its half life or less, try to get a new token");
        const updated = await GetNewToken();
        //console.log("updated?", updated);
        if(updated){
          return{
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            }
          }
        }else{
          console.log("update failed!");
          FailedRefresh();
        }
      }else{
        //console.log("No update needed, access_token still valid");
      }
    }else{
      console.log("no access token");
      FailedRefresh();
    }
    //console.log("should be called after updating if needed");
    return {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      }
    }
});
const errorLink = onError(({ graphQLErrors, networkError }) => {
  console.log("errors?");
  try{
    if (graphQLErrors) {
      console.log("[graphQLError]", graphQLErrors);
      for (let err of graphQLErrors) {
        switch (err.extensions.code) {
          case 'forbidden':
              snackActions.error(err.message);
              break;
          case 'access-denied':
            //fallsthrough
          case 'start-failed':
            // when AuthenticationError thrown in resolver
              console.log("got start-failed error in graphql");
            // modify the operation context with a new token
            /*
            return promiseToObservable(
              GetNewToken())
              .flatMap(() => {
              // retry the request, returning the new observable
              operation.setContext({
                headers: {
                 Authorization: "Bearer " + localStorage.getItem("access_token"),
                },
              });
              // retry the request, returning the new observable
              console.log("forwarding operation in promise thingy", localStorage.getItem("access_token"))
              return forward(operation);
              });
              */
             console.log("would have asked for new token, but auth link will handle it");
          case 'validation-failed':
            console.log(err);
            return;
          default:
              console.log(err);
              snackActions.error(err.message);
        }
      }
    }
    if (networkError) {
      console.log("[Network error]", networkError);
      
      if(networkError.extensions === undefined){
        snackActions.error("Failed to connect to Mythic, please refresh");
        FailedRefresh();
        restartWebsockets();
        window.location = "/new/login";
        return;
      }
      switch (networkError.extensions.code) {
          case 'access-denied':
            snackActions.warning("Access Denied");
            break;
          case 'start-failed':
            // when AuthenticationError thrown in resolver
              console.log("got start-failed error in network");
              FailedRefresh();
              restartWebsockets();
              window.location = "/new/login";
              break;
          default:
              console.log(networkError);
        }
        
    }
  }catch(error){
    snackActions.error("Failed to connect to Mythic, please refresh");
    console.log(error);
    restartWebsockets();
    window.location = "/new/login";
    return;
  }
});

export const GetNewToken = async () =>{
  fetchingNewToken = true;
  const requestOptions = {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({"refresh_token": localStorage.getItem("refresh_token"),
        "access_token": localStorage.getItem("access_token")})
  };
  const response = await fetch('/refresh', requestOptions);
  const json = response.json().then(data => {
          //console.log(data)
          if("access_token" in data){
              successfulRefresh(data);
              console.log("successfully got new access_token");
              fetchingNewToken = false;
              return true;
          }else{
              console.log("calling FailedRefresh from GetNewToken call");
              FailedRefresh();
              fetchingNewToken = false;
              return false;
          }
      }).catch(error => {
          console.log("Error trying to get json response in GetNewToken", error);
          console.log(response);
          FailedRefresh();
          fetchingNewToken = false;
          return false;
      });
  return json;
}
const websocketAddress = () =>{
    return window.location.protocol === "https:" ? "wss://" + window.location.host + "/graphql/" : "ws://" + window.location.host + "/graphql/";
}
const websocketClient = new SubscriptionClient(websocketAddress(), {
  reconnect: true,
  reconnectionAttempts: 10,
  connectionParams: () => {
    return {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`
      }
    }
  }
})
const wsLink = new WebSocketLink(websocketClient);
/*
const websocketLink = new WebSocketLink({
     uri: websocketAddress(),
     options: {
       reconnect: true,
       lazy: true,
       connectionParams: async () => ({
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
       })
     }
    });
  */
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  httpLink
)
export const apolloClient = new ApolloClient({
   link: from([authLink, errorLink, retryLink, authLink.concat(splitLink)]),
    cache
  });
export function restartWebsockets () {
    // Copy current operations
    const operations = Object.assign({}, websocketClient.operations)
  
    // Close connection
    websocketClient.close(true)
  
    // Open a new one
    websocketClient.connect()
  
    // Push all current operations to the new connection
    Object.keys(operations).forEach(id => {
      websocketClient.sendMessage(
        id,
        MessageTypes.GQL_START,
        operations[id].options
      )
    })
  }
  // if the user refreshes the page, we lose all react tracking, so try to reload from localstorage first
if(localStorage.getItem("access_token") !== null){
  if(isJWTValid(localStorage.getItem("access_token"))){
      if(localStorage.getItem("user") !== null){
          meState({
              loggedIn: true,
              access_token: localStorage.getItem("access_token"),
              refresh_token: localStorage.getItem("refresh_token"),
              user: JSON.parse(localStorage.getItem("user"))
          })
      }
  }else{
      //leave meState as a blank value to force new login
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
  }
}
ReactDOM.render(
  <React.StrictMode>
        <ApolloProvider client={apolloClient}>
            <Router>
                <App key="App"/>
            </Router>
        </ApolloProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
