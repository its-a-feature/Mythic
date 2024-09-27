import React from 'react';
import { Tooltip } from '@mui/material';
import {useTheme} from '@mui/material/styles';

export function MythicStyledTooltip(props){
    const { children, title, style, maxWidth, placement, enterDelay, ...other} = props;
    const theme = useTheme();
    return (
        <Tooltip title={title} arrow followCursor enterDelay={enterDelay ? enterDelay : 750}
                 placement={placement ? placement : "bottom"}
                 componentsProps={{
            tooltip: {
                sx: {
                    backgroundColor: theme.palette.background.contrast,
                    color: theme.palette.text.contrast,
                    boxShadow: theme.shadows[1],
                    fontSize: 13,
                    '& .MuiTooltip-arrow': {
                        color: theme.palette.background.contrast
                    },
                    maxWidth: maxWidth ? maxWidth : "300px",
                    zIndex: 100000
                }
            }
        }} style={{zIndex:100000}} {...other}>
            {<span style={{display: "inline-block", ...style}}>{children}</span>}
        </Tooltip>
    );
}