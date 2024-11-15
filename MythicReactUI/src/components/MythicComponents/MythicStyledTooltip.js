import React from 'react';
import {useTheme} from '@mui/material/styles';

export function MythicStyledTooltip({ children, title, enterDelay, tooltipStyle}){
    const theme = useTheme();
    return (
        <span style={{display: "inline-block", ...tooltipStyle}}
              data-tooltip-id={"my-tooltip"}
              data-tooltip-content={title}
              data-tooltip-variant={theme.palette.mode === 'dark' ? 'light' : 'dark'}
              data-tooltip-delay-show={enterDelay ? enterDelay : 750}
        >
            {children}
        </span>

)
}