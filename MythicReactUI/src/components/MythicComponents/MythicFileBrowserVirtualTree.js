import { alpha } from "@mui/material";
import { styled } from '@mui/material/styles';
import React, { useCallback, useMemo } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
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
import WidgetsIcon from '@mui/icons-material/Widgets';
import ListSubheader from '@mui/material/ListSubheader';

const PREFIX = 'FileBrowserVirtualTree';

const classes = {
  rowContainer: `${PREFIX}-rowContainer`,
  row: `${PREFIX}-row`,
  rowButtonWrapper: `${PREFIX}-rowButtonWrapper`,
  rowButton: `${PREFIX}-rowButton`,
  rowLabel: `${PREFIX}-rowLabel`,
  heading: `${PREFIX}-heading`,
  secondaryHeading: `${PREFIX}-secondaryHeading`,
  taskAndTimeDisplay: `${PREFIX}-taskAndTimeDisplay`,
  secondaryHeadingExpanded: `${PREFIX}-secondaryHeadingExpanded`,
  icon: `${PREFIX}-icon`,
  details: `${PREFIX}-details`,
  column: `${PREFIX}-column`,
  paper: `${PREFIX}-paper`,
  table: `${PREFIX}-table`,
  visuallyHidden: `${PREFIX}-visuallyHidden`
};

const StyledAutoSizer = styled(AutoSizer)((
  {
    theme
  }
) => ({
  [`& .${classes.rowContainer}`]: {},

  [`& .${classes.row}`]: {
    display: "flex",
    alignItems: "left",
    marginLeft: (props) => theme.spacing(3 * props.depth),
    userSelect: "none",
    whiteSpace: "nowrap"
  },

  [`& .${classes.rowButtonWrapper}`]: {
    width: theme.spacing(3),
    textAlign: "center",
    "&:hover": {
      cursor: "pointer",
      textDecoration: "underline"
    }
  },

  [`& .${classes.rowButton}`]: {
    width: theme.spacing(3)
  },

  [`& .${classes.rowLabel}`]: {
    marginLeft: theme.spacing(0.5)
  },

  [`& .${classes.heading}`]: {
    fontSize: theme.typography.pxToRem(15),
    whiteSpace: 'pre-line',
},

  [`& .${classes.secondaryHeading}`]: {
      fontSize: theme.typography.pxToRem(15),
      //color: theme.palette.text.secondary,
      overflow: 'hidden',
      display: 'block',
      textOverflow: 'ellipsis',
      maxWidth: 'calc(90vw)',
      whiteSpace: 'nowrap',
  },

  [`& .${classes.taskAndTimeDisplay}`]: {
      fontSize: theme.typography.pxToRem(12),
      color: theme.palette.text.secondary,
      overflow: 'hidden',
      display: 'block',
      textOverflow: 'ellipsis',
      maxWidth: 'calc(90vw)',
      whiteSpace: 'nowrap',
  },

  [`& .${classes.secondaryHeadingExpanded}`]: {
      fontSize: theme.typography.pxToRem(15),
      //color: theme.palette.text.secondary,
      display: 'block',
      overflow: 'auto',
      maxWidth: 'calc(90vw)',
      whiteSpace: 'break-word',
  },

  [`& .${classes.icon}`]: {
      verticalAlign: 'middle',
      height: 20,
      width: 20,
  },

  [`& .${classes.details}`]: {
      alignItems: 'center',
  },

  [`& .${classes.column}`]: {
      padding: '0 5px 0 0',
      display: 'inline-block',
      margin: 0,
      height: 'auto',
  },

  [`& .${classes.paper}`]: {
      width: '100%',
      marginBottom: theme.spacing(2),
  },

  [`& .${classes.table}`]: {
      minWidth: 750,
  },

  [`& .${classes.visuallyHidden}`]: {
      border: 0,
      clip: 'rect(0 0 0 0)',
      height: 1,
      margin: -1,
      overflow: 'hidden',
      padding: 0,
      position: 'absolute',
      top: 20,
      width: 1,
  }
}));

const VirtualTreeRow = ({
  onSelectNode,
  onExpandNode,
  onCollapseNode,
  onDoubleClickNode,
  contextMenuOptions,
  tabInfo,
  ...ListProps
}) => {
  const itemTreeData = ListProps.data[ListProps.index];
  const item = ListProps.treeRootData[itemTreeData.group]?.[itemTreeData.host]?.[itemTreeData.full_path_text] || itemTreeData;
  //console.log("item", item, "itemlookup", ListProps.treeRootData[itemTreeData.host]?.[itemTreeData.name])
  const dropdownAnchorRef = React.useRef(null);
  const theme = useTheme();

  const handleOnClickButton = (e) => {
    e.stopPropagation();
    if (itemTreeData.isOpen) {
      onCollapseNode(item.id, {...item, group: itemTreeData.group, host: itemTreeData.host});
    } else {
      //snackActions.info('fetching elements...', { autoClose: false });
      onExpandNode(item.id,  {...item, group: itemTreeData.group, host: itemTreeData.host});
    }
  };
  const handleOnClickRow = (e) => {
      onSelectNode(item.id,  {...item, group: itemTreeData.group, host: itemTreeData.host});
  };
  const [openContextMenu, setOpenContextMenu] = React.useState(false);

  const handleContextClick = useCallback(
      (event) => {
          event.preventDefault();
          event.stopPropagation();
          if(item.root){

          }else if(item.is_group){

          }else {
              if(contextMenuOptions && contextMenuOptions.length > 0){
                  setOpenContextMenu(true);
              }
          }

      },
      [contextMenuOptions] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const handleMenuItemClick = (event, index, callback_id, callback_display_id) => {
      event.preventDefault();
      event.stopPropagation();
      contextMenuOptions[index].click({event,
          node:  {...item, group: itemTreeData.group, host: itemTreeData.host},
          callback_id, callback_display_id
      });
      setOpenContextMenu(false);
  };
  const handleClose = (event) => {
      if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
        return;
      }
      setOpenContextMenu(false);
    };
  return (
    <div className={"hoverme"} style={ListProps.style} onContextMenu={handleContextClick} ref={dropdownAnchorRef} onClick={handleOnClickRow}>
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

          >
            <Popper open={openContextMenu} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 4}}>
                  {({ TransitionProps, placement }) => (
                    <Grow
                      {...TransitionProps}
                      style={{
                        transformOrigin: placement === 'bottom' ? 'left top' : 'left bottom',
                      }}
                    >
                      <Paper variant="outlined" className={"dropdownMenuColored"}>
                        <ClickAwayListener onClickAway={handleClose}>
                          <MenuList id="split-button-menu" style={{paddingTop: 0}} >
                              <ListSubheader component={"li"} className={"MuiListSubheader-root"}>
                                  Act from current Callback: {tabInfo["displayID"]}
                              </ListSubheader>
                            {contextMenuOptions.map((option, index) => (
                              <MenuItem
                                key={option.name + index}
                                onClick={(event) => handleMenuItemClick(event, index, tabInfo["callbackID"], tabInfo["displayID"])}
                              >
                                {option.name}
                              </MenuItem>
                            ))}
                              {
                                  item?.callback && item?.["callback"]?.["id"] !== tabInfo["callbackID"] &&
                                      <ListSubheader component={"li"} className={"MuiListSubheader-root"}>
                                          Act from originating Callback: {item?.callback?.["display_id"] || tabInfo["displayID"]}
                                      </ListSubheader>
                              }
                              {
                                  item?.callback && item?.["callback"]?.["id"] !== tabInfo["callbackID"] &&
                                  contextMenuOptions.map((option, index) => (
                                      <MenuItem
                                          key={option.name + index}
                                          onClick={(event) => handleMenuItemClick(event, index,
                                              item?.["callback"]?.["id"] || tabInfo["callbackID"],
                                              item?.["callback"]?.["display_id"] || tabInfo["displayID"])}
                                      >
                                          {option.name}
                                      </MenuItem>
                                  ))
                              }

                          </MenuList>
                        </ClickAwayListener>
                      </Paper>
                    </Grow>
                  )}
            </Popper>
          {itemTreeData.is_group ? (
              <WidgetsIcon style={{marginLeft: "3px", marginRight: "5px" }} />
          ): itemTreeData.root  ? (
              <ComputerIcon style={{ marginLeft: '3px', marginRight: '5px' }}  />
          ) : !itemTreeData.can_have_children ? (
              <DescriptionIcon style={{ marginLeft: '3px', marginRight: '5px' }} />
          ) : itemTreeData.isOpen ? (
            <FontAwesomeIcon 
              icon={faFolderOpen} 
              style={{
                marginLeft: '3px',
                marginRight: '5px',
                color: item?.metadata?.has_children ? theme.folderColor : theme.palette.text.secondary,
              }} 
              size={"1x"}
              onClick={handleOnClickButton} />
          ) : (
              <FontAwesomeIcon 
                style={{ paddingTop: '5px', marginLeft: '3px', marginRight: '5px', color: item?.metadata?.has_children ? theme.folderColor : theme.palette.text.secondary, }}
                    size={"lg"} icon={faFolder} onClick={handleOnClickButton} />
          )}
          <Typography
              style={{
                  color:
                      item?.metadata?.has_children ||
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
  showDeletedFiles,
  tabInfo,
}) => {
  const flattenNode = useCallback(
    // node is just a full_path_text
    (node, group, host, depth = 0) => {
        //console.log(node, group, host, depth);
      if(depth === 0){
        return [
          {
            id: treeRootData[group][host][node].id,
            name: treeRootData[group][host][node].name_text,
            full_path_text: treeRootData[group][host][node].full_path_text,
            deleted: treeRootData[group][host][node].deleted,
            depth,
            isLeaf: Object.keys(treeAdjMatrix[group][host]?.[node] || {}).length === 0,
            can_have_children: treeRootData[group][host][node].can_have_children,
            isOpen: true,
            children: (treeAdjMatrix[group][host]?.[node] || {}),
            host,
            group,
            root: true
          },
          ...(Object.keys(treeAdjMatrix[group][host]?.[node] || {})).reduce( (prev, cur) => {
            if(!treeRootData[group][host][cur].can_have_children){return [...prev]}
            return [...prev, flattenNode(cur, group, host, depth+1)];
        }, []).flat()
        ];
      }
      if (openNodes[treeRootData[group][host][node].id] === true) {
        return [
          {
            id: treeRootData[group][host][node].id,
            name: treeRootData[group][host][node].name_text,
            full_path_text: treeRootData[group][host][node].full_path_text,
            deleted: treeRootData[group][host][node].deleted,
            depth,
            isLeaf: Object.keys(treeAdjMatrix[group][host]?.[node] || {}).length === 0,
            can_have_children: treeRootData[group][host][node].can_have_children,
            isOpen: true,
            children: (treeAdjMatrix[group][host]?.[node] || {}),
            host,
            group,
            root: false,
          },
          ...(Object.keys(treeAdjMatrix[group][host]?.[node] || {})).reduce( (prev, cur) => {
            if(!treeRootData[group][host][cur].can_have_children){return [...prev]}
            if(!showDeletedFiles && treeRootData[group][host][cur].deleted){return [...prev]}
            return [...prev, flattenNode(cur, group, host, depth+1)];
        }, []).flat()
        ];
      }
      return [
        {
          id: treeRootData[group][host][node].id,
          name: treeRootData[group][host][node].name_text,
          full_path_text: treeRootData[group][host][node].full_path_text,
          deleted: treeRootData[group][host][node].deleted,
          depth,
          isLeaf: Object.keys(treeAdjMatrix[group]?.[host]?.[node] || {}).length === 0,
          can_have_children: treeRootData[group][host][node].can_have_children,
          isOpen: false,
          children: (treeAdjMatrix[group]?.[host]?.[node] || {}),
          host,
          group,
          root: false,
        }
      ];
     
    },
    [openNodes, showDeletedFiles] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const flattenedNodes = useMemo(() => {
    //console.log("in tree", treeRootData, treeAdjMatrix)
    // need to return an array
    let finalData = [];
    //console.log(treeAdjMatrix);
      const groupKeys = Object.keys(treeAdjMatrix).sort();
      for(let i = 0; i < groupKeys.length; i++){
        finalData.push({
            id: groupKeys[i],
            name: groupKeys[i],
            depth: 0,
            isLeaf: false,
            isOpen: true,
            can_have_children: true,
            root: false,
            group: groupKeys[i],
            is_group: true,
            deleted: false,
            success: true,
            children: treeAdjMatrix[groupKeys[i]],
            full_path_text: groupKeys[i],
        });
        const hostKeys = Object.keys(treeAdjMatrix[groupKeys[i]]).sort();
        for(let j = 0; j < hostKeys.length; j++){
        //for(const [host, matrix] of Object.entries(hosts)){
            finalData.push({
                id: hostKeys[j],
                name: hostKeys[j],
                depth: 1,
                isLeaf: false,
                isOpen: true,
                can_have_children: true,
                host: hostKeys[j],
                group: groupKeys[i],
                root: true,
                deleted: false,
                children: treeAdjMatrix[groupKeys[i]][hostKeys[j]][""],
                full_path_text: hostKeys[j],
            });
            //console.log(matrix);
            finalData.push(...Object.keys(treeAdjMatrix[groupKeys[i]][hostKeys[j]][""]).reduce((prev, c) => {
                if(!showDeletedFiles && c.deleted) {
                    return [...prev];
                } else {
                    return [...prev, ...flattenNode(c, groupKeys[i], hostKeys[j], 2)]
                }
            }, []).flat())
        }
    }

    //console.log("flattened data", finalData)
    return finalData;
    //nodes.map((node) => flattenNode(node)).flat()
  },[flattenNode, treeRootData, treeAdjMatrix, showDeletedFiles]);
  return flattenedNodes.length > 0 ? (
    <StyledAutoSizer>
    {(AutoSizerProps) => (
      <List
        itemData={flattenedNodes}
        direction="vertical"
        height={AutoSizerProps.height}
        width={AutoSizerProps.width}
        itemCount={flattenedNodes.length}
        itemSize={24}
      >
        {(ListProps) => (
          <VirtualTreeRow
            {...ListProps}
            tabInfo={tabInfo}
            treeRootData={treeRootData}
            onSelectNode={onSelectNode}
            onExpandNode={onExpandNode}
            onCollapseNode={onCollapseNode}
            contextMenuOptions={contextMenuOptions}
          />
        )}
      </List>
    )}
  </StyledAutoSizer>
  ) : null;
};

export default FileBrowserVirtualTree;
