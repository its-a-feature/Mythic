import React from 'react';
import FileBrowserVirtualTree from '../../MythicComponents/MythicFileBrowserVirtualTree';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {ViewCallbackMythicTreeGroupsDialog} from "./ViewCallbackMythicTreeGroupsDialog";
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import ListSubheader from '@mui/material/ListSubheader';


export const CallbacksTabsFileBrowserTree = ({ treeRootData, treeAdjMatrix, fetchFolderData, setTableData, taskListing, tableOpenedPathId, showDeletedFiles, tabInfo, selectedFolderData}) => {
    const [openNodes, setOpenNodes] = React.useState({});
    const groupName = React.useRef("");
    const [openViewGroupsDialog, setOpenViewGroupDialog] = React.useState(false);
    const toggleNodeExpanded = (nodeId, nodeData) => {
        //console.log("toggleNodeExpanded", nodeId, nodeData);
        setTableData(nodeData);
        fetchFolderData(nodeData);
        setOpenNodes({
          ...openNodes,
          [nodeId]: true
        });
      };
    const toggleNodeCollapsed = (nodeId, nodeData) => {
        setOpenNodes({
          ...openNodes,
          [nodeId]: false
        });
      };
    const onSelectNode = (nodeId, nodeData) => {
        if(nodeData.root){

        }else if(nodeData.is_group){
            groupName.current = nodeData.group;
            setOpenViewGroupDialog(true);
        }else {
            //console.log(nodeData);
            setTableData(nodeData);
        }

    };
    React.useEffect( () => {
      setOpenNodes({
        ...openNodes,
        [tableOpenedPathId]: true
      });
    }, [tableOpenedPathId]);
    const contextMenuOptions = [
      {
          name: 'Task Listing', 
          click: ({event, node, callback_id, callback_display_id}) => {
              taskListing(node, callback_id, callback_display_id);
          }
      },
  ];
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const contextMenuData = React.useRef({});
    const onContextMenu = ({event, item, itemTreeData}) => {
        event.preventDefault();
        event.stopPropagation();
        contextMenuData.current = {item, itemTreeData,
        x: event.clientX, y:event.clientY};
        if(contextMenuData.current.item?.root){

        }else if(contextMenuData.current.item?.is_group){

        }else {
            if(contextMenuOptions && contextMenuOptions.length > 0){
                setOpenContextMenu(true);
            }
        }
    }
    const handleMenuItemClick = (event, index, callback_id, callback_display_id) => {
        event.preventDefault();
        event.stopPropagation();
        contextMenuOptions[index].click({event,
            node:  {...contextMenuData.current?.item, group: contextMenuData.current?.itemTreeData?.group, host: contextMenuData.current?.itemTreeData?.host},
            callback_id, callback_display_id
        });
        setOpenContextMenu(false);
    };
    const handleClose = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpenContextMenu(false);
    };
  return(
      <>
          <FileBrowserVirtualTree
              showDeletedFiles={showDeletedFiles}
              treeRootData={treeRootData}
              treeAdjMatrix={treeAdjMatrix}
              openNodes={openNodes}
              selectedFolderData={selectedFolderData}
              onSelectNode={onSelectNode}
              onExpandNode={toggleNodeExpanded}
              onCollapseNode={toggleNodeCollapsed}
              onContextMenu={onContextMenu}
              tabInfo={tabInfo}
          />
          {openViewGroupsDialog &&
              <MythicDialog
                  fullWidth={true}
                  maxWidth={"xl"}
                  open={openViewGroupsDialog}
                  onClose={() => {setOpenViewGroupDialog(false);}}
                  innerDialog={
                      <ViewCallbackMythicTreeGroupsDialog group_name={groupName.current}
                                                          onClose={() => {setOpenViewGroupDialog(false);}} />
                  }
              />
          }
              <Popper open={openContextMenu} anchorEl={null} disablePortal role={undefined} transition style={{
                  zIndex: 4,  top: contextMenuData.current?.y, left: contextMenuData.current?.x }}>
                  {({ TransitionProps, placement }) => (
                      <Grow
                          {...TransitionProps}
                          style={{
                              transformOrigin: placement === 'bottom' ? 'left top' : 'left bottom',
                          }}
                      >
                          <Paper className={"dropdownMenuColored"}>
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
                                          contextMenuData.current.item?.callback && contextMenuData.current.item?.["callback"]?.["id"] !== tabInfo["callbackID"] &&
                                          <ListSubheader component={"li"} className={"MuiListSubheader-root"}>
                                              Act from originating Callback: {contextMenuData.current.item?.callback?.["display_id"] || tabInfo["displayID"]}
                                          </ListSubheader>
                                      }
                                      {
                                          contextMenuData.current.item?.callback && contextMenuData.current.item?.["callback"]?.["id"] !== tabInfo["callbackID"] &&
                                          contextMenuOptions.map((option, index) => (
                                              <MenuItem
                                                  key={option.name + index}
                                                  onClick={(event) => handleMenuItemClick(event, index,
                                                      contextMenuData.current.item?.["callback"]?.["id"] || tabInfo["callbackID"],
                                                      contextMenuData.current.item?.["callback"]?.["display_id"] || tabInfo["displayID"])}
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


      </>

  )
};