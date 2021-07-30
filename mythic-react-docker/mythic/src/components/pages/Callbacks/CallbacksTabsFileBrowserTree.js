import React, {} from 'react';
import {snackActions} from '../../utilities/Snackbar';
import { makeStyles, fade } from '@material-ui/core/styles';
import FolderIcon from '@material-ui/icons/Folder';
import FolderOpenIcon from '@material-ui/icons/FolderOpen';
import ComputerIcon from '@material-ui/icons/Computer';
import Paper from '@material-ui/core/Paper';
import DescriptionIcon from '@material-ui/icons/Description';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import {useTheme} from '@material-ui/core/styles';
import {FixedSizeTree} from 'react-vtree';
import Autosizer from 'react-virtualized-auto-sizer';
import Tooltip from '@material-ui/core/Tooltip';
import Badge from '@material-ui/core/Badge';
import { Typography } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
    root: {
      width: '99%',
      marginTop: "3px",
      marginBottom: "2px",
      marginLeft: "3px",
      marginRight: "0px",
      height: "auto",
    },
    heading: {
      fontSize: theme.typography.pxToRem(15),
      whiteSpace: "pre-line"
    },
    secondaryHeading: {
      fontSize: theme.typography.pxToRem(15),
      //color: theme.palette.text.secondary,
      overflow: "hidden", 
      display: "block", 
      textOverflow: "ellipsis", 
      maxWidth: "calc(90vw)", 
      whiteSpace: "nowrap"
    },
    taskAndTimeDisplay: {
      fontSize: theme.typography.pxToRem(12),
      color: theme.palette.text.secondary,
      overflow: "hidden", 
      display: "block", 
      textOverflow: "ellipsis", 
      maxWidth: "calc(90vw)", 
      whiteSpace: "nowrap"
    },
    secondaryHeadingExpanded: {
      fontSize: theme.typography.pxToRem(15),
      //color: theme.palette.text.secondary,
      display: "block", 
      overflow: "auto",
      maxWidth: "calc(90vw)", 
      whiteSpace: "break-word"
    },
    icon: {
      verticalAlign: 'middle',
      height: 20,
      width: 20,
    },
    details: {
      alignItems: 'center',
    },
    column: {
      padding: "0 5px 0 0",
      display: "inline-block",
      margin: 0,
      height: "auto"
    },
    paper: {
        width: '100%',
        marginBottom: theme.spacing(2),
      },
      table: {
        minWidth: 750,
      },
      visuallyHidden: {
        border: 0,
        clip: 'rect(0 0 0 0)',
        height: 1,
        margin: -1,
        overflow: 'hidden',
        padding: 0,
        position: 'absolute',
        top: 20,
        width: 1,
      },
  }));

const getNodeData = (node, nestingLevel, fetchFolderData, setTableData, theme) => ({
    data: {
        id: node.id.toString(), // mandatory
        isLeaf: node.filebrowserobjs === undefined || Object.keys(node.filebrowserobjs).length === 0,
        isOpenByDefault: true, //mandatory
        name: node.name_text,
        nestingLevel,
        fetchFolderData,
        setTableData,
        theme,
        ...node
    },
    nestingLevel,
    node
});
export const CallbacksTabsFileBrowserTree = ({treeRoot, fetchFolderData, setTableData, theme}) => {
    function* treeWalker() {
        console.log("in treeWalker");
        for(let i = 0; i < treeRoot.length; i++){
            yield getNodeData(treeRoot[i], 0, fetchFolderData, setTableData, theme);
        }
        while(true){
            const parent = yield;
            /*
            for(let i = 0; i < parent.node.filebrowserobjs.length; i++){
                if(parent.node.filebrowserobjs[i].is_file){
                    continue;
                }
                yield getNodeData(parent.node.filebrowserobjs[i], parent.nestingLevel + 1, fetchFolderData, setTableData, theme);
            }
            */
           for( const[key, value] of Object.entries(parent.node.filebrowserobjs)){
                if(value.is_file){continue}
                yield getNodeData(value, parent.nestingLevel + 1, fetchFolderData, setTableData, theme);
           }
        }
    }
    return (
        treeRoot.length === 0 ? (null) : (
            <Autosizer>
                {({height, width}) => (
                    <FixedSizeTree
                        treeWalker={treeWalker}
                        height={height }
                        width={width - 10}
                        itemSize={30}
                        overscanCount={20}
                        async
                        placeholder={<div>Loading....</div>}
                    >
                        {FileBrowserNode}
                    </FixedSizeTree>
                )}
            </Autosizer>
        )
    )
}
const FileBrowserNode = ({data, isOpen, style, setOpen}) => {
    
    return (
        <div style={{...style, 
                    width: "calc(100vw)", display: "inline-flex", overflow:"auto"}}>
            {[...Array(data.nestingLevel)].map((o, i) => (
                <div key={"folder" + data.id + "lines" + i} style={{borderLeft: `1px dashed ${fade(data.theme.palette.text.primary, 0.4)}`, marginLeft: 15, paddingRight: 15, height: "100%", display: "inline-block"}}></div>
            ))}
            <FileBrowserRow filebrowserobj={data} isOpen={isOpen} setOpen={setOpen}/>
        </div>
    )
    
}
const FileBrowserRow = (props) => {
    const classes = useStyles();
    const theme = useTheme();
    const fetchItems = () => {
        if(props.filebrowserobj.is_file){return}
        snackActions.info("fetching elements...", {persist: true});
        props.filebrowserobj.fetchFolderData(props.filebrowserobj.id);
        if(!props.isOpen){
            props.filebrowserobj.fetchFolderData(props.filebrowserobj.id);
        }
        //props.setOpen(!props.isOpen);
        //props.toggleSelection(props.filebrowserobj.id, !isOpen);
    }
    const setTableData = () => {
        props.filebrowserobj.setTableData(props.filebrowserobj);
    }
    const clickIcon = (evt) => {
        evt.stopPropagation();
        fetchItems();
        if(props.isOpen){
            props.setOpen(!props.isOpen);
        }else{
            fetchItems();
            props.setOpen(!props.isOpen);
        }
    }
    return (
        <Paper className={classes.root} elevation={5} style={{backgroundColor: theme.body, color: theme.text, alignItems: "center", display: "flex"}} onClick={setTableData}>
            {
                props.filebrowserobj.parent_id === null ? (<ComputerIcon style={{marginLeft: "3px", marginRight:"5px"}} />) :(
                props.filebrowserobj.is_file ? (<DescriptionIcon style={{marginLeft: "3px", marginRight:"5px"}} />) : (
                    props.isOpen ? (<FolderOpenIcon style={{marginLeft: "3px", marginRight:"5px", color: props.filebrowserobj.filebrowserobjs_aggregate.aggregate.count > 0 || props.filebrowserobj.success !== null ? theme.folderColor : "grey"}} onClick={clickIcon}/>) : (<FolderIcon style={{paddingTop: "5px", marginLeft: "3px", marginRight:"5px"}} onClick={clickIcon}/>)
                )
                )}
            {props.filebrowserobj.nestingLevel > 0 && props.filebrowserobj.filebrowserobjs_aggregate.aggregate.count > 999 ? (<Tooltip title="Number of known children">
                <Badge style={{left: -50}} max={999}
                    badgeContent={props.filebrowserobj.filebrowserobjs_aggregate.aggregate.count} color="primary" anchorOrigin={{vertical: "bottom", horizontal: "left"}}></Badge>
                </Tooltip>) : (null)}
            <Typography style={{color:props.filebrowserobj.filebrowserobjs_aggregate.aggregate.count > 0 ||  props.filebrowserobj.success !== null ? theme.palette.text.primary : theme.palette.text.secondary}}>
                {props.filebrowserobj.parent_id === null ? (props.filebrowserobj.host) : (props.filebrowserobj.name_text)}
            </Typography>
            
            {props.filebrowserobj.success === true && props.filebrowserobj.nestingLevel > 0 ? (
                <Tooltip title="Successfully listed contents of folder">
                    <CheckCircleIcon fontSize="small" style={{ color: theme.palette.success.main}}/>
                </Tooltip>) : (
                props.filebrowserobj.success === false && props.filebrowserobj.nestingLevel > 0 ? (
                    <Tooltip title="Failed to list contents of folder">
                        <ErrorIcon fontSize="small" style={{ color: theme.palette.danger.main}} />
                    </Tooltip>
                ) : (
                    null
                )
            )}
        </Paper>
    )
}