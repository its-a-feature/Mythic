import React, {} from 'react';
import { gql, useSubscription, useQuery } from '@apollo/client';
import {EventGroupInstancesTableMaterialReactTable} from "./EventGroupInstancesTable";

const get_eventgroups = gql`
query GetEventGroupInstances {
  eventgroupinstance(limit: 100, order_by: {id: desc}) {
    id
    created_at
    end_timestamp
    trigger
    operator {
     username
    }
    status
    updated_at
    eventgroup {
     name
     description
     deleted
     active
     id
    }
  }
}
 `;
const sub_eventgroups = gql`
subscription GetEventGroupInstances {
  eventgroupinstance_stream(cursor: {initial_value: {updated_at: "1970-01-01"}, ordering: ASC}, batch_size: 100, where: {eventgroup: {}}) {
    id
    created_at
    end_timestamp
    trigger
    operator {
     username
    }
    status
    updated_at
    eventgroup {
     name
     description
     deleted
     active
     id
    }
  }
}
 `;
export function EventGroupInstances({selectedEventGroup, me, setSelectedInstance, selectedInstanceID, foundQueryInstanceRef}) {
 const [eventgroupInstances, setEventgroupInstances] = React.useState([]);
 const [selectedEventGroups, setSelectedEventGroups] = React.useState([]);
 const foundQueryEvent = React.useRef(false);
 React.useEffect(() => {
  if(selectedEventGroup.id === 0){
   setSelectedEventGroups(eventgroupInstances);
   return;
  }
  const updatedEventGroups = eventgroupInstances.filter(e => e.eventgroup.id === selectedEventGroup.id);
  setSelectedEventGroups(updatedEventGroups);
 }, [selectedEventGroup.id, eventgroupInstances]);
 useQuery(get_eventgroups, {
  fetchPolicy: "no-cache",
  onCompleted: (data) => {
   setEventgroupInstances((prevState) => {
    const newEvents = data.eventgroupinstance.reduce( (prev, cur) => {
     let indx = prev.findIndex( ({id}) => id === cur.id);
     if(indx > -1){
      let updatingPrev = [...prev];
      updatingPrev[indx] = cur;
      return [...updatingPrev];
     }
     return [...prev, cur];
    }, [...prevState]);
    newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
    return newEvents;
   });
  },
  onError: (data) => {
   console.log(data);
  }
 })
 useSubscription(sub_eventgroups, {
  fetchPolicy: "no-cache",
  onData: ({data}) => {
   setEventgroupInstances((prevState) => {
    const newEvents = data.data.eventgroupinstance_stream.reduce( (prev, cur) => {
     let indx = prev.findIndex( ({id}) => id === cur.id);
     if(indx > -1){
      let updatingPrev = [...prev];
      updatingPrev[indx] = cur;
      return [...updatingPrev];
     }
     return [...prev, cur];
    }, [...prevState]);
    newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
    return newEvents;
   });
  }
 });
 React.useEffect( () => {
    if( !foundQueryEvent.current ){
        let queryParams = new URLSearchParams(window.location.search);
        const eventgroup = queryParams.has("eventgroupinstance") ? queryParams.get("eventgroupinstance") : "0";
        if(eventgroup !== "0"){
            let matchedGroup = eventgroupInstances.find( e => `${e.id}` === eventgroup);
            if(matchedGroup){
                setSelectedInstance(matchedGroup);
                foundQueryEvent.current = true;
                foundQueryInstanceRef.current = matchedGroup.eventgroup.id;
            }
        } else {
           foundQueryEvent.current = true;
           foundQueryInstanceRef.current = 0;
        }
    }
 }, [eventgroupInstances]);
 return (
       <EventGroupInstancesTableMaterialReactTable
           setSelectedInstance={setSelectedInstance}
           selectedInstanceID={selectedInstanceID}
           eventgroups={selectedEventGroups} me={me} />
 )
}