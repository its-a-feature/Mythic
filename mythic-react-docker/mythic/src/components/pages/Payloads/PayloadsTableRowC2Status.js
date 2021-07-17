import React from 'react';
import Typography from '@material-ui/core/Typography';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import {useTheme} from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';

export function PayloadsTableRowC2Status(props){
    const theme = useTheme();
    return (
        <React.Fragment>
            {
                props.payloadc2profiles.map( (c2) => (
                    <Typography key={c2.c2profile.name + props.uuid}> 
                        {c2.c2profile.is_p2p ?
                            ( c2.c2profile.container_running ? 
                                <Tooltip title="C2 Container running">
                                    <CheckCircleIcon style={{color: theme.palette.success.main}}/>
                                </Tooltip>: 
                                <Tooltip title="C2 Container not running">
                                    <CancelIcon style={{color: theme.palette.error.main}}/>
                                </Tooltip> )
                            :
                        ( c2.c2profile.running ? 
                            <Tooltip title="C2 Internal Server Running">
                                <CheckCircleIcon style={{color: theme.palette.success.main}}/>
                            </Tooltip> : 
                            <Tooltip title="C2 Internal Server Not Running">
                                <CancelIcon style={{color: theme.palette.error.main}}/> 
                            </Tooltip>)
                        } - {c2.c2profile.name}
                    </Typography>
                )) 
            }
                
        </React.Fragment>
        )
}
