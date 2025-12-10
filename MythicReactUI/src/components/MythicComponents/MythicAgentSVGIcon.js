import {useTheme} from '@mui/material/styles';
import {MythicStyledTooltip} from "./MythicStyledTooltip";
import WifiIcon from '@mui/icons-material/Wifi';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

export const MythicAgentSVGIcon = ({payload_type, style, is_p2p}) => {
    const theme = useTheme();
    if(payload_type === ""){
        return;
    }
    return (
        <MythicStyledTooltip title={payload_type} >
            <img src={"/static/" + payload_type + "_" + theme.palette.mode + ".svg"}
                 style={{...style}}  />
            {is_p2p === false &&
                <WifiIcon style={{width: "20px", height: "20px", marginLeft: "-20px", marginBottom: "5px",
                borderRadius: "10px", border: "1px solid",
                backgroundColor: theme.palette.primary.main}}/>
            }
            {is_p2p === true &&
                <FontAwesomeIcon icon={faLink} style={{width: "20px", height: "20px", marginLeft: "-20px", marginBottom: "5px",
                    borderRadius: "10px", border: "1px solid",
                    backgroundColor: theme.palette.primary.main}} />
            }
        </MythicStyledTooltip>

    )
}
export const MythicAgentSVGIconNoTooltip = ({payload_type, is_p2p, className, style}) => {
    const theme = useTheme();
    if(payload_type === ""){
        return;
    }
    const extraStyles = style ? style : {};
    return (
        <div style={{display: "inline-block", left: "50%"}} className={className}>
            <img src={"/static/" + payload_type + "_" + theme.palette.mode + ".svg"} style={{height: "20px", margin: 'auto', ...extraStyles}}/>
            {is_p2p === false &&
                <WifiIcon style={{width: "10px", height: "10px", marginLeft: "-5px", marginBottom: "0px",
                    borderRadius: "10px", border: "1px solid",
                    backgroundColor: theme.palette.primary.main, color: "white" }} />
            }
            {is_p2p === true &&
                <FontAwesomeIcon icon={faLink} style={{width: "10px", height: "10px", marginLeft: "-5px", marginBottom: "0px",
                    borderRadius: "10px",  border: "1px solid",
                    backgroundColor: theme.palette.primary.main, color: "white"}} />
            }
        </div>


    )
}