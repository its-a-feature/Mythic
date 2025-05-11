import React from 'react';
import {CallbacksCard} from "./CallbacksCard";


export function Home({me}) {
  return (
  <div style={{width: "100%", height: "100%", display: "flex"}}>
    <CallbacksCard me={me} />
  </div>
  );
}
