import React from 'react';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import {ReportingTable} from './ReportingTable';
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";
import {MythicPageHeader} from "../../MythicComponents/MythicPageHeader";


export function Reporting() {
  return (
  <MythicPageBody>
    <MythicPageHeader title={"Mythic Report Generation"}>
    </MythicPageHeader>
    <ReportingTable />
  </MythicPageBody>
  );
}
