import React from 'react';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {MitreGridColumn} from './MitreGridColumn';
import { Backdrop } from '@mui/material';
import {CircularProgress} from '@mui/material';
import { MythicDisplayTextDialog} from '../../MythicComponents/MythicDisplayTextDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { SelectPayloadTypeDialog } from './SelectPayloadTypeDialog';


export function MitreGrid({entries, onGetCommands, onGetTasks, onGetCommandsFiltered, onGetTasksFiltered, onFilterByTags, showCountGrouping}){
    const theme = useTheme();
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    
    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
            <Paper elevation={5}  style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,
                marginBottom: "5px", marginRight: "5px"}} variant={"elevation"}>
                <Typography variant="h5" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    {"MITRE ATT&CK Mappings"}
                </Typography>
                <PoperDropdown onGetCommands={onGetCommands} 
                    onGetTasks={onGetTasks} 
                    onGetCommandsFiltered={onGetCommandsFiltered} 
                    onGetTasksFiltered={onGetTasksFiltered} 
                    onFilterByTags={onFilterByTags} 
                    setBackdropOpen={setBackdropOpen} 
                    showCountGrouping={showCountGrouping}
                    entries={entries}
                />
            </Paper> 
            
            <div style={{display: "flex", flexGrow: 1, overflow: "auto"}}>
                {backdropOpen && <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                    <CircularProgress color="inherit" />
                </Backdrop>
                }
                <MitreGridDisplay entries={entries} showCountGrouping={showCountGrouping} />
            </div>
        </div>
    )
}

function PoperDropdown({onGetCommands, onGetTasks, onGetCommandsFiltered, onGetTasksFiltered, onFilterByTags, setBackdropOpen, entries, showCountGrouping}){
    const dropdownAnchorRef = React.useRef(null);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [openLicense, setOpenLicense] = React.useState(false);
    const [openFilterTasks, setOpenFilterTasks] = React.useState(false);
    const [openFilterCommands, setOpenFilterCommands] = React.useState(false);
    const dropDownOptions = [
        {
            name: "Fetch All Commands Mapped to MITRE",
            click: () => {
                setBackdropOpen(true);
                setDropdownOpen(false);
                onGetCommands();
            }
        },
        {
            name: "Fetch All Issued Tasks Mapped to MITRE",
            click: () => {
                setBackdropOpen(true);
                setDropdownOpen(false);
                onGetTasks();
            }
        },
        {
            name: "Fetch Command Mappings by Payload Type",
            click: () => {
                setDropdownOpen(false);
                setOpenFilterCommands(true);
            }
        },
        {
            name: "Fetch Task Mappings by Payload Type",
            click: () => {
                setDropdownOpen(false);
                setOpenFilterTasks(true);
                
            }
        },
        {
            name: "Fetch Task Mappings by Task Tag",
            click: () => {
                setDropdownOpen(false);
                onFilterByTags();
            }
        },
        {
            name: "Export Highlighted to ATT&CK Navigator",
            click: () => {
                setDropdownOpen(false);
                exportAttackNavigator();
            }
        },
        {
            name: "View MITRE License",
            click: () => {
                setOpenLicense(true);
                setDropdownOpen(false);
            }
        }
    ]
    const mitreLicense = `The MITRE Corporation (MITRE) hereby grants you a non-exclusive, royalty-free license to use ATT&CK® for research, development, and commercial purposes. Any copy you make for such purposes is authorized provided that you reproduce MITRE's copyright designation and this license in any such copy.
    
© 2021 The MITRE Corporation. This work is reproduced and distributed with the permission of The MITRE Corporation.`
    const handleMenuItemClick = (event, index) => {
        dropDownOptions[index].click(event);
    }
    React.useEffect( () => {
        setBackdropOpen(false);
    }, [entries]);
    const exportAttackNavigator = () => {
        let baseNavigator = {
            "name": "layer",
            "versions": {
                "attack": "10",
                "navigator": "4.5.5",
                "layer": "4.3"
            },
            "domain": "enterprise-attack",
            "description": "",
            "filters": {
                "platforms": [
                    "Linux",
                    "macOS",
                    "Windows",
                    "Azure AD",
                    "Office 365",
                    "SaaS",
                    "IaaS",
                    "Google Workspace",
                    "PRE",
                    "Network",
                    "Containers"
                ]
            },
            "sorting": 0,
            "layout": {
                "layout": "side",
                "aggregateFunction": "average",
                "showID": false,
                "showName": true,
                "showAggregateScores": false,
                "countUnscored": false
            },
            "hideDisabled": false,
            "techniques": [
               
            ],
            "gradient": {
                "colors": [
                    "#ff6666ff",
                    "#ffe766ff",
                    "#8ec843ff"
                ],
                "minValue": 0,
                "maxValue": 100
            },
            "legendItems": [],
            "metadata": [],
            "links": [],
            "showTacticRowBackground": false,
            "tacticRowBackground": "#dddddd",
            "selectTechniquesAcrossTactics": true,
            "selectSubtechniquesWithParent": false
        };
        for(const key in entries){
            for(let i = 0; i < entries[key].rows.length; i++){
              switch(showCountGrouping){
                  case "":
                        break;
                  case "command":
                    if(entries[key].rows[i].commands.length > 0){
                        baseNavigator.techniques.push(
                            {
                                "techniqueID": entries[key].rows[i].t_num,
                                "tactic": key.replaceAll(" ", "-").toLowerCase(),
                                "color": "#bc3b24",
                                "enabled": true,
                                "comment": "",
                                "metadata": [],
                                "links": [],
                                "showSubtechniques": true
                            }
                        )
                    }
                    break;
                  case "task":
                    if(entries[key].rows[i].tasks.length > 0){
                        baseNavigator.techniques.push(
                            {
                                "techniqueID": entries[key].rows[i].t_num,
                                "tactic": key.replaceAll(" ", "-").toLowerCase(),
                                "color": "#bc3b24",
                                "enabled": true,
                                "comment": "",
                                "metadata": [],
                                "links": [],
                                "showSubtechniques": true
                            }
                        )
                    }
                    break;
              }
            }
        }
        const dataBlob = new Blob([JSON.stringify(baseNavigator, null, 2)], {type: 'application/octet-stream'});
        const ele = document.getElementById("download_config");
        if(ele !== null){
        ele.href = URL.createObjectURL(dataBlob);
        ele.download = "attack_navigator.json";
        ele.click();
        }else{
        const element = document.createElement("a");
        element.id = "download_config";
        element.href = URL.createObjectURL(dataBlob);
        element.download = "attack_navigator.json";
        document.body.appendChild(element);
        element.click();
        }
    }
    const onSubmitGetTasksFiltered = (payload_type) => {
        setBackdropOpen(true);
        
        onGetTasksFiltered(payload_type);
    }
    const onSubmitGetCommandsFiltered = (payload_type) => {
        setBackdropOpen(true);
        
        onGetCommandsFiltered(payload_type);
    }
    return (
        <React.Fragment>
            <ButtonGroup variant="text" ref={dropdownAnchorRef} aria-label="split button" style={{marginRight: "10px", float: "right", color: "white"}} >
                <Button size="small" style={{color: "white"}} aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                    aria-expanded={dropdownOpen ? 'true' : undefined}
                    aria-haspopup="menu"
                    onClick={() => setDropdownOpen(!dropdownOpen)}>
                        Actions <ArrowDropDownIcon />
                </Button>
            </ButtonGroup>
            <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 10}}>
            {({ TransitionProps, placement }) => (
                <Grow
                {...TransitionProps}
                style={{
                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                }}
                >
                <Paper className={"dropdownMenuColored"}>
                    <ClickAwayListener onClickAway={() => setDropdownOpen(false)}>
                    <MenuList id="split-button-menu">
                        {dropDownOptions.map((option, index) => (
                        <MenuItem
                            key={option.name}
                            onClick={(event) => handleMenuItemClick(event, index)}
                        >
                            {option.name}
                        </MenuItem>
                        ))}
                    </MenuList>
                    </ClickAwayListener>
                </Paper>
                </Grow>
            )}
            </Popper>
            { openLicense &&
                <MythicDisplayTextDialog 
                    onClose={()=>{setOpenLicense(false);}} 
                    title={"MITRE ATT&CK Usage License"} 
                    maxWidth={"md"} 
                    fullWidth={true} 
                    value={mitreLicense} 
                    open={openLicense}
                />
            }
            {openFilterTasks &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openFilterTasks}
                    onClose={()=>{setOpenFilterTasks(false);}} 
                    innerDialog={<SelectPayloadTypeDialog onClose={()=>{setOpenFilterTasks(false);}} onSubmit={onSubmitGetTasksFiltered} />}
                />
            }
            {openFilterCommands &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openFilterCommands}
                    onClose={()=>{setOpenFilterCommands(false);}} 
                    innerDialog={<SelectPayloadTypeDialog onClose={()=>{setOpenFilterCommands(false);}} onSubmit={onSubmitGetCommandsFiltered} />}
                />
            } 
        </React.Fragment>
        
    )
}

export function MitreGridDisplay({entries, showCountGrouping}){
    const tactics = [
        "Reconnaissance", "Resource Development", "Initial Access", "Execution", "Persistence", "Privilege Escalation", "Defense Evasion",
        "Credential Access", "Discovery", "Lateral Movement", "Collection", "Command And Control", "Exfiltration", "Impact"
    ]
    return (
        tactics.map( t => (
            <MitreGridColumn key={t} column={entries[t]} showCountGrouping={showCountGrouping} />
        ))
    )
}