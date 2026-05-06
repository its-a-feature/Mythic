import React from 'react';
import {Button} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";


export const ResponseDisplaySearch = (props) =>{
    const scrollContent = (node, isAppearing) => {
        // only auto-scroll if you issued the task
        document.getElementById(`scrolltotaskbottom${props.task.id}`)?.scrollIntoView({
            //behavior: "smooth",
            block: "end",
            inline: "nearest"
        })
    }
    React.useLayoutEffect( () => {
        scrollContent()
    }, []);
  return (
    <div className="mythic-response-inline-output">
      <pre className="mythic-response-inline-text">
        {props.search?.plaintext || ""}
      </pre>
      
      <MythicStyledTooltip title={props.search?.hoverText || "View on Search Page"} >
        <Button
          className="mythic-table-row-action mythic-table-row-action-hover-info mythic-response-inline-action"
          component="a"
          target="_blank"
          href={window.location.origin + "/new/search/?" + props.search.search}
          startIcon={<SearchIcon />}
        >
            {props.search?.name || "Open search"}
        </Button>
      </MythicStyledTooltip>
    </div>
  );   
}
