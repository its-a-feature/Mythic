import React from 'react';
import {CallbacksCard} from "./CallbacksCard";
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";


export function Home({me}) {
  return (
  <MythicPageBody>
    <CallbacksCard me={me} />
  </MythicPageBody>
  );
}
