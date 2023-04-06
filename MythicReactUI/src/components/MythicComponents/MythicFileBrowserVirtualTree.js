import { alpha } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import React, { useCallback, useMemo } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import { snackActions } from '../utilities/Snackbar';
import {faFolderOpen, faFolder} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ComputerIcon from '@mui/icons-material/Computer';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorIcon from '@mui/icons-material/Error';
import { useTheme } from '@mui/material/styles';
import { Typography } from '@mui/material';
import { MythicStyledTooltip } from "./MythicStyledTooltip";
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';

const useStyles = makeStyles((theme) => ({
  rowContainer: {},
  row: {
    display: "flex",
    alignItems: "left",
    marginLeft: (props) => theme.spacing(3 * props.depth),
    userSelect: "none",
    whiteSpace: "nowrap"
  },
  rowButtonWrapper: {
    width: theme.spacing(3),
    textAlign: "center",
    "&:hover": {
      cursor: "pointer",
      textDecoration: "underline"
    }
  },
  rowButton: {
    width: theme.spacing(3)
  },
  rowLabel: {
    marginLeft: theme.spacing(0.5)
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    whiteSpace: 'pre-line',
},
secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    //color: theme.palette.text.secondary,
    overflow: 'hidden',
    display: 'block',
    textOverflow: 'ellipsis',
    maxWidth: 'calc(90vw)',
    whiteSpace: 'nowrap',
},
taskAndTimeDisplay: {
    fontSize: theme.typography.pxToRem(12),
    color: theme.palette.text.secondary,
    overflow: 'hidden',
    display: 'block',
    textOverflow: 'ellipsis',
    maxWidth: 'calc(90vw)',
    whiteSpace: 'nowrap',
},
secondaryHeadingExpanded: {
    fontSize: theme.typography.pxToRem(15),
    //color: theme.palette.text.secondary,
    display: 'block',
    overflow: 'auto',
    maxWidth: 'calc(90vw)',
    whiteSpace: 'break-word',
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
    padding: '0 5px 0 0',
    display: 'inline-block',
    margin: 0,
    height: 'auto',
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

const VirtualTreeRow = ({
  onSelectNode,
  onExpandNode,
  onCollapseNode,
  onDoubleClickNode,
  contextMenuOptions,
  ...ListProps
}) => {
  //console.log("listprops", ListProps)
  const itemTreeData = ListProps.data[ListProps.index];
  const item = ListProps.treeRootData[itemTreeData.host]?.[itemTreeData.full_path_text] || itemTreeData;
  //console.log("item", item, "itemlookup", ListProps.treeRootData[itemTreeData.host]?.[itemTreeData.name])
  const dropdownAnchorRef = React.useRef(null);
  const theme = useTheme();
  const classes = useStyles();
  const handleOnClickButton = (e) => {
    e.stopPropagation();
    if (itemTreeData.isOpen) {
      onCollapseNode(item.id, item);
    } else {
      snackActions.info('fetching elements...', { autoClose: false });
      onExpandNode(item.id, item);
    }
  };
  const handleOnClickRow = (e) => {
    onSelectNode(item.id, item);
  };
  const [openContextMenu, setOpenContextMenu] = React.useState(false);
  const handleContextClick = useCallback(
      (event) => {
          event.preventDefault();
          event.stopPropagation();
          if(contextMenuOptions && contextMenuOptions.length > 0){
              
              setOpenContextMenu(true);
          }
      },
      [contextMenuOptions] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const handleMenuItemClick = (event, index) => {
      event.preventDefault();
      event.stopPropagation();
      contextMenuOptions[index].click({event, node: item});
      setOpenContextMenu(false);
  };
  const handleClose = (event) => {
      if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
        return;
      }
      setOpenContextMenu(false);
    };
  return (
    <div style={ListProps.style}>
    <div style={{display: 'flex' , marginBottom: "1px", flexGrow: 1, width: "100%"}}>
        {[...Array(itemTreeData.depth)].map((o, i) => (
            <div
                key={'folder' + itemTreeData.id + 'lines' + i}
                style={{
                    borderLeft: `2px dashed ${alpha(theme.palette.text.primary, 0.4)}`,
                    marginLeft: 7,
                    paddingRight: 7,
                    display: 'inline-block',
                }}></div>
        ))}
        <div
          className={classes.root}
          style={{ backgroundColor: theme.body, color: theme.text, alignItems: 'center', display: 'flex', paddingRight: "10px", textDecoration: itemTreeData.deleted ? 'line-through' : ''  }}
          onClick={handleOnClickRow}
          onContextMenu={handleContextClick}
          ref={dropdownAnchorRef}
          >
            <Popper open={openContextMenu} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
                  {({ TransitionProps, placement }) => (
                    <Grow
                      {...TransitionProps}
                      style={{
                        transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                      }}
                    >
                      <Paper variant="outlined" style={{backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}>
                        <ClickAwayListener onClickAway={handleClose}>
                          <MenuList id="split-button-menu"  >
                            {contextMenuOptions.map((option, index) => (
                              <MenuItem
                                key={option.name + index}
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
          {itemTreeData.root  ? (
              <ComputerIcon style={{ marginLeft: '3px', marginRight: '5px' }} onClick={handleOnClickButton} />
          ) : !itemTreeData.can_have_children ? (
              <DescriptionIcon style={{ marginLeft: '3px', marginRight: '5px' }} />
          ) : itemTreeData.isOpen ? (
            <FontAwesomeIcon 
              icon={faFolderOpen} 
              style={{
                marginLeft: '3px',
                marginRight: '5px',
                color: theme.folderColor
              }} 
              size={"1x"}
              onClick={handleOnClickButton} />
          ) : (
              <FontAwesomeIcon 
                style={{ paddingTop: '5px', marginLeft: '3px', marginRight: '5px', color: theme.folderColor }} size={"lg"} icon={faFolder} onClick={handleOnClickButton} />
          )}
          <Typography
              style={{
                  color:
                  itemTreeData.children.length > 0 ||
                      item.success !== null
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
              }} component="pre">
              {itemTreeData.name}
          </Typography>

          {item.success === true && itemTreeData.depth > 0 ? (
              <MythicStyledTooltip title='Successfully listed contents of folder'>
                  <CheckCircleOutlineIcon fontSize='small' color="success" />
              </MythicStyledTooltip>
          ) : item.success === false && itemTreeData.depth > 0 ? (
              <MythicStyledTooltip title='Failed to list contents of folder'>
                  <ErrorIcon fontSize='small' color="error" />
              </MythicStyledTooltip>
          ) : null}
      </div>
    </div>
    </div>
  );
};

const FileBrowserVirtualTree = ({
  treeRootData,
  treeAdjMatrix,
  openNodes,
  onSelectNode,
  onExpandNode,
  onCollapseNode,
  contextMenuOptions,
}) => {
  const flattenNode = useCallback(
    // node is just a full_path_text
    (node, host, depth = 0) => {
      if(depth === 0){
        
        return [
          {
            id: treeRootData[host][node].id,
            name: treeRootData[host][node].name_text,
            full_path_text: treeRootData[host][node].full_path_text,
            deleted: treeRootData[host][node].deleted,
            depth,
            isLeaf: Object.keys(treeAdjMatrix[host]?.[node] || {}).length === 0,
            can_have_children: treeRootData[host][node].can_have_children,
            isOpen: true,
            children: (treeAdjMatrix[host]?.[node] || {}),
            host,
            root: true
          },
          ...(Object.keys(treeAdjMatrix[host]?.[node] || {})).reduce( (prev, cur) => {
            if(!treeRootData[host][cur].can_have_children){return [...prev]}
            return [...prev, flattenNode(cur, host, depth+1)];
        }, []).flat()
        ];
      }
      if (openNodes[treeRootData[host][node].id] === true) {
        return [
          {
            id: treeRootData[host][node].id,
            name: treeRootData[host][node].name_text,
            full_path_text: treeRootData[host][node].full_path_text,
            deleted: treeRootData[host][node].deleted,
            depth,
            isLeaf: Object.keys(treeAdjMatrix[host]?.[node] || {}).length === 0,
            can_have_children: treeRootData[host][node].can_have_children,
            isOpen: true,
            children: (treeAdjMatrix[host]?.[node] || {}), 
            host,
            root: false,
          },
          ...(Object.keys(treeAdjMatrix[host]?.[node] || {})).reduce( (prev, cur) => {
            if(!treeRootData[host][cur].can_have_children){return [...prev]}
            return [...prev, flattenNode(cur, host, depth+1)];
        }, []).flat()
        ];
      }
      return [
        {
          id: treeRootData[host][node].id,
          name: treeRootData[host][node].name_text,
          full_path_text: treeRootData[host][node].full_path_text,
          deleted: treeRootData[host][node].deleted,
          depth,
          isLeaf: Object.keys(treeAdjMatrix[host]?.[node] || {}).length === 0,
          can_have_children: treeRootData[host][node].can_have_children,
          isOpen: false,
          children: (treeAdjMatrix[host]?.[node] || {}), 
          host,
          root: false,
        }
      ];
     
    },
    [openNodes] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const flattenedNodes = useMemo(() => {
    //console.log("in tree", treeRootData, treeAdjMatrix)
    // need to return an array
    let finalData = [];
    for(const [host, matrix] of Object.entries(treeAdjMatrix)){
      finalData.push({
        id: host,
        name: host,
        depth: 0,
        isLeaf: false,
        isOpen: true,
        can_have_children: true,
        host, 
        root: true,
        deleted: false,
        success: true,
        children: matrix[""],
        full_path_text: host,
      });
      finalData.push(...Object.keys(matrix[""]).map(c => flattenNode(c, host, 1)).flat())
    }
    //console.log("flattened data", finalData)
    return finalData;
    //nodes.map((node) => flattenNode(node)).flat()
  },[flattenNode, treeRootData, treeAdjMatrix]
  );
  return (
    flattenedNodes.length > 0 ? (
      <AutoSizer>
      {(AutoSizerProps) => (
        <List
          itemData={flattenedNodes}
          direction="vertical"
          height={AutoSizerProps.height - 10}
          width={AutoSizerProps.width - 10}
          itemCount={flattenedNodes.length}
          itemSize={24}
        >
          {(ListProps) => (
            <VirtualTreeRow
              {...ListProps}
              treeRootData={treeRootData}
              onSelectNode={onSelectNode}
              onExpandNode={onExpandNode}
              onCollapseNode={onCollapseNode}
              contextMenuOptions={contextMenuOptions}
            />
          )}
        </List>
      )}
    </AutoSizer>
    ) : (null)
    
  );
};

export default FileBrowserVirtualTree;
