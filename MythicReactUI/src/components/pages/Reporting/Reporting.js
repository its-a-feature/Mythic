import React from 'react';
import {ReportingTable} from './ReportingTable';
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import SummarizeIcon from '@mui/icons-material/Summarize';


export function Reporting() {
  return (
  <MythicPageBody>
    <MythicPageHeader
      icon={<SummarizeIcon fontSize="small" />}
      title={"Mythic Report Generation"}
      subtitle={"Generate operation reports from Mythic data and selected report sections."}
      meta={
        <>
          <MythicPageHeaderChip label="HTML" />
          <MythicPageHeaderChip label="JSON" />
        </>
      }
    />
    <ReportingTable />
  </MythicPageBody>
  );
}
