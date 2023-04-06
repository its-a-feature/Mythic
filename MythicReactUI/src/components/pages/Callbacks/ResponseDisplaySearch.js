import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import makeStyles from '@mui/styles/makeStyles';
import {  Link } from '@mui/material';

const useStyles = makeStyles((theme) => ({
  tooltip: {
    backgroundColor: theme.palette.background.contrast,
    color: theme.palette.text.contrast,
    boxShadow: theme.shadows[1],
    fontSize: 13
  },
  arrow: {
    color: theme.palette.background.contrast,
  }
}));

export const ResponseDisplaySearch = (props) =>{
  const classes = useStyles();
  return (
    <React.Fragment>
      <pre style={{display: "inline-block", whiteSpace: "pre-wrap"}}>
        {props.search?.plaintext || ""}
      </pre>
      
      <Tooltip title={props.search?.hoverText || "View on Search Page"}  arrow classes={{tooltip: classes.tooltip, arrow: classes.arrow}}>
        <Link component="a" target="_blank" href={window.location.origin + "/new/search/?" + props.search.search}>
            {props.search?.name || ""}
        </Link>
      </Tooltip><br/>
    </React.Fragment>
  )   
}