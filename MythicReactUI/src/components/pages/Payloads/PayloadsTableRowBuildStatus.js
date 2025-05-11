import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import React from 'react';
import GetAppIcon from '@mui/icons-material/GetApp';
import ErrorIcon from '@mui/icons-material/Error';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {PayloadBuildMessageDialog} from './PayloadBuildMessageDialog';

export function PayloadsTableRowBuildStatus(props){
    const [openBuildMessage, setOpenBuildMessageDialog] = React.useState(false);
    const onErrorClick = () => {
        setOpenBuildMessageDialog(true);
    }
    if(props.deleted){
        return null;
    }
    return (
        <React.Fragment>
            {props.build_phase === "success" ?
                ( <MythicStyledTooltip title="Download payload">
                    <a href={"/direct/download/" + props.filemetum.agent_file_id} >
                        <GetAppIcon color="success" style={{marginRight: "10px"}} />
                    </a>
                  </MythicStyledTooltip>
                    
                )
                : 
                (props.build_phase === "building" ? 
                (<MythicStyledTooltip title="Payload still building">
                    <CircularProgress size={20} thickness={4} color="info" style={{marginRight: "10px"}}/>
                </MythicStyledTooltip>) : 
                (<>
                    <MythicStyledTooltip title="Failed to build!" tooltipStyle={{}}>
                        <ErrorIcon color="error" onClick={onErrorClick} style={{cursor: "pointer", marginRight: "10px"}} />
                    </MythicStyledTooltip>
                    {openBuildMessage &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openBuildMessage} 
                        onClose={()=>{setOpenBuildMessageDialog(false);}} 
                        innerDialog={<PayloadBuildMessageDialog payload_id={props.id} viewError={true} onClose={()=>{setOpenBuildMessageDialog(false);}} />}
                    />}
                </>
                ) 
                )
            }
        </React.Fragment>
    );
}

