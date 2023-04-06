import React from 'react';
import makeStyles from '@mui/styles/makeStyles';
import { Tooltip } from '@mui/material';

const useStyles = makeStyles((theme) => ({
    tooltip: {
      backgroundColor: theme.palette.background.contrast,
      color: theme.palette.text.contrast,
      boxShadow: theme.shadows[1],
      fontSize: 13,
    },
    arrow: {
      color: theme.palette.background.contrast,
    }
  }));

export function MythicStyledTooltip(props){
    const { children, title, style, ...other} = props;
    const classes = useStyles();
    return (
        <Tooltip title={title} arrow classes={{tooltip: classes.tooltip, arrow: classes.arrow}} {...other}>
            {<span style={{...style, display: "inline-block"}}>{children}</span>}
        </Tooltip>
    );
}
