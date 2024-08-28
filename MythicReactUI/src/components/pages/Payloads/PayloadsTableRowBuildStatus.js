import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import React from 'react';
import GetAppIcon from '@mui/icons-material/GetApp';
import { snackActions } from '../../utilities/Snackbar';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {PayloadBuildMessageDialog} from './PayloadBuildMessageDialog';

export function PayloadsTableRowBuildStatus(props){
    const [openBuildMessage, setOpenBuildMessageDialog] = React.useState(false);
    const onErrorClick = () => {
        snackActions.warning("Payload failed to build, cannot download");
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
                        <GetAppIcon color="success" style={{marginLeft: "12px"}} />
                    </a>
                  </MythicStyledTooltip>
                    
                )
                : 
                (props.build_phase === "building" ? 
                (<MythicStyledTooltip title="Payload still building">
                    <IconButton variant="contained" size="large"><CircularProgress size={20} thickness={4} color="info"/></IconButton>
                </MythicStyledTooltip>) : 
                (<>
                    <IconButton
                        variant="contained"
                        onClick={onErrorClick}
                        disableFocusRipple={true}
                        disableRipple={true}
                        size="large">
                        <ReportProblemIcon color="error" />
                    </IconButton>
                    {openBuildMessage ? (
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openBuildMessage} 
                        onClose={()=>{setOpenBuildMessageDialog(false);}} 
                        innerDialog={<PayloadBuildMessageDialog payload_id={props.id} viewError={true} onClose={()=>{setOpenBuildMessageDialog(false);}} />}
                    />
                ): null }
                </>
                ) 
                )
            }
        </React.Fragment>
    );
}

