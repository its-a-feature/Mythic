import React, {useCallback} from 'react';
import { makeStyles, fade } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import {useTheme} from '@material-ui/core/styles';
import {FixedSizeTree} from 'react-vtree';
import Autosizer from 'react-virtualized-auto-sizer';
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

const getNodeData = (node, nestingLevel, theme) => ({
    data: {
        id: node.id.toString(), // mandatory
        isLeaf: node.children === undefined || node.children.length === 0,
        isOpenByDefault: true, //mandatory
        name: node.name,
        nestingLevel,
        theme,
        ...node
    },
    nestingLevel,
    node
});
export const CallbacksTabsProcessBrowserTree = ({treeRoot, theme}) => {
    const treeWalker = useCallback(
        function* treeWalker() {
            for(let i = 0; i < treeRoot.length; i++){
                yield getNodeData(treeRoot[i], 0, theme);
            }
            while(true){
                const parent = yield;
                for(let i = 0; i < parent.node.children.length; i++){
                    yield getNodeData(parent.node.children[i], parent.nestingLevel + 1, theme);
                }
            }
        }, [treeRoot, theme]);
    return (
        treeRoot.length === 0 ? (<div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Process Listing Data</div>) : (
            <Autosizer>
                {({height, width}) => (
                    <FixedSizeTree
                        treeWalker={treeWalker}
                        height={height - 10}
                        width={width - 10}
                        itemSize={30}
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
    return (
        <Paper className={classes.root} elevation={5} style={{backgroundColor: theme.body, color: theme.text, alignItems: "center", display: "flex"}}>
            <Typography >
                {props.filebrowserobj.process_id} - {props.filebrowserobj.name}
            </Typography>
        </Paper>
    )
}