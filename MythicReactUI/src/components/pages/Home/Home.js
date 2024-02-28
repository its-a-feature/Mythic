import React from 'react';
import {AgentC2Overview} from './AgentC2Overview';
import {CallbacksCard} from "./CallbacksCard";


export function Home({me}) {
  return (
  <div style={{width: "100%", height: "100%", maxHeight: "100%",}}>
    <CallbacksCard me={me} />
    <AgentC2Overview />
  </div>
  );
}
