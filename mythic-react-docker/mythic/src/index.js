//import './wdyr';
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';
import {BrowserRouter as Router} from 'react-router-dom'
import { ApolloProvider, ApolloClient, InMemoryCache, from, split, HttpLink, Observable } from '@apollo/client';
import { WebSocketLink } from "@apollo/client/link/ws";
import { successfulRefresh, FailedRefresh } from './cache';
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { SubscriptionClient } from 'subscriptions-transport-ws'
import { getMainDefinition } from '@apollo/client/utilities'
import { setContext } from '@apollo/client/link/context';
import {snackActions} from './components/utilities/Snackbar';
import MessageTypes from 'subscriptions-transport-ws/dist/message-types'

const cache = new InMemoryCache({
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
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    }
  }
});
const promiseToObservable = (promise) =>
    new Observable((subscriber) => {
      promise.then(
        value => {
          console.log(subscriber);
          if (subscriber.closed) return;
          subscriber.next(value);
          subscriber.complete();
        },
        err => subscriber.error(err)
      );
    });
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
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
            break;
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
        return;
      }
      switch (networkError.extensions.code) {
          case 'access-denied':
            snackActions.warning("Access Denied");
            break;
          case 'start-failed':
            // when AuthenticationError thrown in resolver
              console.log("got start-failed error in network");
              restartWebsockets();
              window.location = "/new/login"
          default:
              console.log(networkError);
        }
    }
  }catch(error){
    snackActions.error("Failed to connect to Mythic, please refresh");
    console.log(error);
    return;
  }
});

const GetNewToken = async () =>{
  const requestOptions = {
            method: "POST",
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({"refresh_token": localStorage.getItem("refresh_token"),
            "access_token": localStorage.getItem("access_Token")})
        };
        return fetch('/refresh', requestOptions).then((response) => {
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
                console.log(response);
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
const websocketClient = new SubscriptionClient(websocketAddress(), {
  reconnect: true,
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
