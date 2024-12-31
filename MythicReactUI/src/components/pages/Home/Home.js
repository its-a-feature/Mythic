import React from 'react';
import {CallbacksCard} from "./CallbacksCard";


export function Home({me}) {
  return (
  <div style={{width: "100%", height: "100%", maxHeight: "100%",}}>
    <CallbacksCard me={me} />
  </div>
  );
}
