import {useTheme} from '@mui/material/styles';

export const MythicAgentSVGIcon = ({payload_type, style}) => {
    const theme = useTheme();
    return (
        <img src={"/static/" + payload_type + "_" + theme.palette.mode + ".svg"}
             style={{...style}}/>
    )
}