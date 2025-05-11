import React from 'react';
import Typography from '@mui/material/Typography';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import PermScanWifiIcon from '@mui/icons-material/PermScanWifi';

export function PayloadsTableRowC2Status(props){
    return (
        <React.Fragment>
            {
                props.payloadc2profiles.map( (c2) => (
                    <Typography key={c2.c2profile.name + props.uuid} style={{display: "flex"}}>
                        {c2.c2profile.is_p2p ?
                            ( c2.c2profile.container_running ? 
                                <MythicStyledTooltip title="C2 Container online">
                                    <CheckCircleOutlineIcon color="success"/>
                                </MythicStyledTooltip>: 
                                <MythicStyledTooltip title="C2 Container offline">
                                    <CancelIcon color="error"/>
                                </MythicStyledTooltip> )
                            :
                        ( c2.c2profile.running ? 
                            <MythicStyledTooltip title="C2 Internal Server Running">
                                <CheckCircleOutlineIcon color="success"/>
                            </MythicStyledTooltip> : 
                            (c2.c2profile.container_running ? (
                                <MythicStyledTooltip title="C2 Internal Server Not Running, but Container Online">
                                    <PermScanWifiIcon color="warning"/> 
                                </MythicStyledTooltip>
                            ) : (
                                <MythicStyledTooltip title="C2 Container offline">
                                    <CancelIcon color="error"/> 
                                </MythicStyledTooltip>
                            ))
                            )
                        } - {c2.c2profile.name}
                    </Typography>
                )) 
            }
                
        </React.Fragment>
        )
}
