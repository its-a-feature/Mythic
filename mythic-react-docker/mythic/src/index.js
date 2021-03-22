//import './wdyr';
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';
import {BrowserRouter as Router} from 'react-router-dom'
import { ApolloProvider, ApolloClient, InMemoryCache, from, split, HttpLink } from '@apollo/client';
import { WebSocketLink } from "@apollo/client/link/ws";
import { meState, successfulRefresh } from './cache';
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import HTTPPost from './components/utilities/HTTPPost';
import { getMainDefinition } from '@apollo/client/utilities'
import { setContext } from '@apollo/client/link/context';
import {SnackbarUtilsConfigurator, snackActions} from './components/utilities/Snackbar';
import {SnackbarProvider} from 'notistack';

const cache = new InMemoryCache({
    typePolicies: {
        Query: {
            fields: {
                "Subscription.operationeventlog": {
                    merge(existing, incoming){
                        return incoming;
                    }
                }
            }
        }
    }
});
const FailedRefresh = () =>{
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
if (localStorage.getItem("user") !== null){
    meState({
        loggedIn: true,
        access_token: localStorage.getItem("access_token"),
        refresh_token: localStorage.getItem("refresh_token"),
        user: JSON.parse(localStorage.getItem("user"))
    });
}else{
    FailedRefresh();
}
const retryLink = new RetryLink({
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
const httpLink = new HttpLink({
    uri: window.location.origin + "/graphql/",
    options: {
        reconnect: true,   
        connectionParams: {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
       }     
    }
});
const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem('access_token');
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : "",
    }
  }
});
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  console.log("errors?");
  if (graphQLErrors) {
    console.log("[graphQLError]", graphQLErrors);
    for (let err of graphQLErrors) {
      switch (err.extensions.code) {
        case 'forbidden':
            snackActions.error(err.message);
        case 'access-denied':
        case 'start-failed':
          // when AuthenticationError thrown in resolver
            console.log("got start-failed error");
          // modify the operation context with a new token
          const oldHeaders = operation.getContext().headers;
          console.log(oldHeaders);
          if(GetNewToken()){
            operation.setContext({
                headers: {
                  ...oldHeaders,
                 Authorization: "Bearer " + localStorage.getItem("access_token"),
                },
              });
              // retry the request, returning the new observable
              return forward(operation);
          }else{
              //window.location.reload();
          }
          break;
        default:
            console.log(err);
      }
    }
  }
  if (networkError) {
    console.log("[Network error]", networkError);
    switch (networkError.extensions.code) {
        case 'access-denied':
        case 'start-failed':
          // when AuthenticationError thrown in resolver
            console.log("got start-failed error");
          // modify the operation context with a new token
          const oldHeaders = operation.getContext().headers;
          console.log(oldHeaders);
          if(GetNewToken()){
            operation.setContext({
                headers: {
                  ...oldHeaders,
                 Authorization: "Bearer " + localStorage.getItem("access_token"),
                },
              });
              // retry the request, returning the new observable
              return forward(operation);
          }else{
            window.location.reload();
          }
          
        default:
            console.log(networkError);
      }
  }
  
});

const GetNewToken = () =>{
    const response = HTTPPost('/refresh', {"refresh_token": localStorage.getItem("refresh_token")}).then((response) => {
            response.json().then(data => {
                console.log(data)
                if("access_token" in data){
                    successfulRefresh(data);
                    console.log("successfully got new access_token");
                    return true;
                }else{
                    FailedRefresh();
                    return false;
                }
            }).catch(error => {
                console.log("Error trying to get json response in GetNewToken", error.toString());
                FailedRefresh();
                return false;
            });
        }).catch(error => {
            console.log("There was an error in GetNewToken!", error.toString());
            FailedRefresh();
            return false;
        });
}
const websocketAddress =() =>{
    return window.location.protocol === "https:" ? "wss://" + window.location.host + "/graphql/" : "ws://" + window.location.host + "/graphql/";
}

const websocketLink = new WebSocketLink({
     uri: websocketAddress(),
     options: {
       reconnect: true,
       connectionParams: {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
       }
     }
    });
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  websocketLink,
  authLink.concat(httpLink)
)
const apolloClient = new ApolloClient({
   link: from([errorLink, retryLink, splitLink]),
    cache
  });

ReactDOM.render(
  <React.StrictMode>
    <SnackbarProvider anchorOrigin={{ horizontal: 'center', vertical: 'top' }}>
      <SnackbarUtilsConfigurator />
        <ApolloProvider client={apolloClient}>
            <Router>
                <App key="App"/>
            </Router>
        </ApolloProvider>
    </SnackbarProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
