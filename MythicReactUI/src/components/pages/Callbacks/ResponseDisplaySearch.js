import React from 'react';
import {  Link } from '@mui/material';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";


export const ResponseDisplaySearch = (props) =>{

  return (
    <>
      <pre style={{display: "inline-block", whiteSpace: "pre-wrap"}}>
        {props.search?.plaintext || ""}
      </pre>
      
      <MythicStyledTooltip title={props.search?.hoverText || "View on Search Page"} >
        <Link component="a" target="_blank" href={window.location.origin + "/new/search/?" + props.search.search}>
            {props.search?.name || ""}
        </Link>
      </MythicStyledTooltip><br/>
    </>
  );   
}