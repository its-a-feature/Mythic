import React from 'react';
import {useTheme} from '@mui/material/styles';
import {DrawBrowserScriptElementsFlowWithProvider} from "./C2PathDialog";
import GroupsIcon from '@mui/icons-material/Groups';
import ComputerIcon from '@mui/icons-material/Computer';
import PersonIcon from '@mui/icons-material/Person';
import LanIcon from '@mui/icons-material/Lan';
import LanguageIcon from '@mui/icons-material/Language';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import Inventory2TwoToneIcon from '@mui/icons-material/Inventory2TwoTone';
import {MythicDialog, MythicViewJSONAsTableDialog} from "../../MythicComponents/MythicDialog";
import HelpTwoToneIcon from '@mui/icons-material/HelpTwoTone';

const getIcons = (node) => {
    if(node.img === undefined){return null}
    const style = {...node?.style, fontSize: 40, margin: "auto"};
    if(node.img.startsWith("http")){
        return <img alt={node.img} src={node.img} className={"circleImageNode"} />
    }
    switch(node.img){
        case "group":
            return <GroupsIcon sx={style} />
        case "computer":
            return <ComputerIcon sx={style} />
        case "user":
            return <PersonIcon sx={style} />
        case "lan":
            return <LanIcon sx={style} />
        case "language":
            return <LanguageIcon sx={style} />
        case "list":
            return <FormatListBulletedIcon sx={style} />
        case "container":
            return <Inventory2TwoToneIcon sx={style} />
        case "help":
            return <HelpTwoToneIcon sx={style} />
        default:
            return null
    }
}
export const ResponseDisplayGraph = ({graph, task, expand}) =>{
    const theme = useTheme();
    const [viewAllDataDialog, setViewAllDataDialogOpen] = React.useState(false);
    const dictionaryData = React.useRef(null);
    const scrollContent = (node, isAppearing) => {
        // only auto-scroll if you issued the task
        document.getElementById(`scrolltotaskbottom${task.id}`)?.scrollIntoView({
            //behavior: "smooth",
            block: "end",
            inline: "nearest"
        })
    }
    React.useLayoutEffect( () => {
        scrollContent()
    }, []);
    const finalGraphNodes = graph?.nodes?.map( n => {
        return {...n, img: getIcons(n)}
    })
    const contextMenu = React.useMemo(() => {return [
        {
            title: 'View All Data',
            onClick: function(node) {
                console.log(node)
                dictionaryData.current = node.data;
                setViewAllDataDialogOpen(true);
            }
        },
    ]}, []);
  return (
    <div style={{height: expand ? "100%" : "600px", width: "100%", position: "relative"}}>
        {viewAllDataDialog &&
            <MythicDialog fullWidth={true} maxWidth="lg" open={viewAllDataDialog}
                          onClose={()=>{setViewAllDataDialogOpen(false);}}
                          innerDialog={<MythicViewJSONAsTableDialog title={"Viewing all data for node"}
                                                                    leftColumn={"Properties"}
                                                                    rightColumn={"Values"}
                                                                    value={dictionaryData.current}
                                                                    onClose={()=>{setViewAllDataDialogOpen(false);}} />}
            />
        }
        <DrawBrowserScriptElementsFlowWithProvider theme={theme} edges={graph.edges} providedNodes={finalGraphNodes}
                                       view_config={{group_by: graph?.group_by || "", rankDir: "LR",}}
                                       contextMenu={contextMenu}
        />
    </div>
  );   
}