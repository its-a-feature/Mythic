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
export function EventGroupInstances({selectedEventGroup, me, setSelectedInstance, selectedInstanceID}) {
 const [eventgroups, setEventgroups] = React.useState([]);
 const [selectedEventGroups, setSelectedEventGroups] = React.useState([]);
 React.useEffect(() => {
  if(selectedEventGroup.id === 0){
   setSelectedEventGroups(eventgroups);
   return;
  }
  const updatedEventGroups = eventgroups.filter(e => e.eventgroup.id === selectedEventGroup.id);
  setSelectedEventGroups(updatedEventGroups);
 }, [selectedEventGroup.id, eventgroups]);
 useQuery(get_eventgroups, {
  fetchPolicy: "no-cache",
  onCompleted: (data) => {
   setEventgroups((prevState) => {
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
   setEventgroups((prevState) => {
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

 return (
       <EventGroupInstancesTableMaterialReactTable
           setSelectedInstance={setSelectedInstance}
           selectedInstanceID={selectedInstanceID}
           eventgroups={selectedEventGroups} me={me} />
 )
}