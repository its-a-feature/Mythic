import IconButton from '@material-ui/core/IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
import ErrorIcon from '@material-ui/icons/Error';
import {muiTheme} from '../../../themes/Themes';
import React from 'react';
import GetAppIcon from '@material-ui/icons/GetApp';

export function PayloadsTableRowBuildStatus(props){
    
    return (
        <React.Fragment>
            {props.build_phase === "success" ?
                ( <IconButton variant="contained" target="_blank" color="primary" href={window.location.origin + "/direct/download/" + props.filemetum.agent_file_id} download><GetAppIcon style={{color: muiTheme.palette.success.main}} /></IconButton>
                )
                : 
                (props.build_phase === "building" ? 
                (<IconButton variant="contained"><CircularProgress size={20} thickness={4} style={{color: muiTheme.palette.info.main}}/></IconButton>) : 
                (<IconButton variant="contained"><ErrorIcon style={{color: muiTheme.palette.error.main}}  /></IconButton>) 
                )
            }
        </React.Fragment>

        )
}

