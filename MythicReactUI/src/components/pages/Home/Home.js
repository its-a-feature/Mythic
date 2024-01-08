import React from 'react';
import {AgentC2Overview} from './AgentC2Overview';
import {CallbacksCard} from "./CallbacksCard";


export function Home() {
  return (
  <div style={{width: "100%", height: "100%", maxHeight: "100%",}}>
    <CallbacksCard />
    <AgentC2Overview />
  </div>
  );
}
