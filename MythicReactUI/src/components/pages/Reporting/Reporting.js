import React from 'react';
import {ReportingTable} from './ReportingTable';
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";
import {MythicPageHeader} from "../../MythicComponents/MythicPageHeader";


export function Reporting() {
  return (
  <MythicPageBody>
    <MythicPageHeader
      title={"Mythic Report Generation"}
      subtitle={"Generate operation reports from Mythic data and selected report sections."}
    />
    <ReportingTable />
  </MythicPageBody>
  );
}
