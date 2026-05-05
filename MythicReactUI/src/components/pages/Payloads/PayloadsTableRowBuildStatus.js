import React from 'react';
import GetAppIcon from '@mui/icons-material/GetApp';
import ErrorIcon from '@mui/icons-material/Error';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {PayloadBuildMessageDialog} from './PayloadBuildMessageDialog';
import {MythicStatusChip} from '../../MythicComponents/MythicStatusChip';

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
                    <MythicStatusChip
                        component="a"
                        href={"/direct/download/" + props.filemetum.agent_file_id}
                        clickable
                        label="Ready"
                        status="success"
                        icon={<GetAppIcon />}
                    />
                  </MythicStyledTooltip>
                    
                )
                : 
                (props.build_phase === "building" ? 
                (<MythicStyledTooltip title="Payload still building">
                    <MythicStatusChip label="Building" status="building" />
                </MythicStyledTooltip>) : 
                (<>
                    <MythicStyledTooltip title="Failed to build!" tooltipStyle={{}}>
                        <MythicStatusChip
                            clickable
                            label="Failed"
                            status="error"
                            icon={<ErrorIcon />}
                            onClick={onErrorClick}
                        />
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
