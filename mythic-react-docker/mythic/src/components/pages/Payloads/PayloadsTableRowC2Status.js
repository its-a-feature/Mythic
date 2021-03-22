import React from 'react';
import Typography from '@material-ui/core/Typography';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import {muiTheme} from '../../../themes/Themes';

export function PayloadsTableRowC2Status(props){
    return (
        <React.Fragment>
            {
                props.payloadc2profiles.map( (c2) => (
                    <Typography key={c2.c2profile.name + props.uuid}> 
                        {c2.c2profile.is_p2p ?
                        ( c2.c2profile.container_running ? <CheckCircleIcon style={{color: muiTheme.palette.success.main}}/> : <CancelIcon style={{color: muiTheme.palette.error.main}}/> )
                        :
                        ( c2.c2profile.running ? <CheckCircleIcon style={{color: muiTheme.palette.success.main}}/> : <CancelIcon style={{color: muiTheme.palette.error.main}}/> )
                        } - {c2.c2profile.name}
                    </Typography>
                )) 
            }
                
        </React.Fragment>
        )
}
