import React from 'react';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import PermScanWifiIcon from '@mui/icons-material/PermScanWifi';
import {MythicStatusChip} from '../../MythicComponents/MythicStatusChip';

const getC2Status = (c2) => {
    if(c2.c2profile.is_p2p){
        return c2.c2profile.container_running ? {
            label: c2.c2profile.name,
            status: "success",
            icon: <CheckCircleOutlineIcon />,
            tooltip: "C2 Container online",
        } : {
            label: c2.c2profile.name,
            status: "error",
            icon: <CancelIcon />,
            tooltip: "C2 Container offline",
        };
    }
    if(c2.c2profile.running){
        return {
            label: c2.c2profile.name,
            status: "success",
            icon: <CheckCircleOutlineIcon />,
            tooltip: "C2 Internal Server Running",
        };
    }
    if(c2.c2profile.container_running){
        return {
            label: c2.c2profile.name,
            status: "warning",
            icon: <PermScanWifiIcon />,
            tooltip: "C2 Internal Server Not Running, but Container Online",
        };
    }
    return {
        label: c2.c2profile.name,
        status: "error",
        icon: <CancelIcon />,
        tooltip: "C2 Container offline",
    };
};

export function PayloadsTableRowC2Status(props){
    return (
        <div className="mythic-status-stack">
            {
                props.payloadc2profiles.map( (c2, i) => {
                    const c2Status = getC2Status(c2);
                    return (
                        <MythicStyledTooltip title={c2Status.tooltip} key={c2.c2profile.name + props.uuid + i}>
                            <MythicStatusChip
                                label={c2Status.label}
                                status={c2Status.status}
                                icon={c2Status.icon}
                                sx={{maxWidth: "11rem"}}
                            />
                        </MythicStyledTooltip>
                    );
                })
            }
                
        </div>
        )
}
