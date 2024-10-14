import {useTheme} from '@mui/material/styles';
import {MythicStyledTooltip} from "./MythicStyledTooltip";

export const MythicAgentSVGIcon = ({payload_type, style}) => {
    const theme = useTheme();
    return (
        <MythicStyledTooltip title={payload_type}>
            <img src={"/static/" + payload_type + "_" + theme.palette.mode + ".svg"}
                 style={{...style}}/>
        </MythicStyledTooltip>

    )
}