import React from 'react';
import FileBrowserVirtualTree from '../../MythicComponents/MythicFileBrowserVirtualTree';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {ViewCallbackMythicTreeGroupsDialog} from "./ViewCallbackMythicTreeGroupsDialog";
import ListIcon from '@mui/icons-material/List';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {getAllParentNodes} from "./CallbacksTabsFileBrowser";
import {Dropdown, DropdownMenuItem, DropdownNestedMenuItem} from "../../MythicComponents/MythicNestedMenus";

export const getOpenIDFromNode = (node) => {
    return `${node.group};${node.host};${node.full_path_text}`;
}
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
          [getOpenIDFromNode(nodeData)]: true
        });
      };
    const toggleNodeCollapsed = (nodeId, nodeData) => {
        setOpenNodes({
          ...openNodes,
          [getOpenIDFromNode(nodeData)]: false
        });
      };
    const onSelectNode = (nodeId, nodeData) => {
        if(nodeData.root){
            setTableData(nodeData);
        }else if(nodeData.is_group){
            groupName.current = nodeData.group;
            setOpenViewGroupDialog(true);
        }else {
            //console.log(nodeData);
            //setTableData(nodeData);
            toggleNodeExpanded(nodeId, nodeData);
        }

    };
    React.useEffect( () => {
        let group = tableOpenedPathId.group;
        if(group === ""){
            group = selectedFolderData.group;
        }
        let host = tableOpenedPathId.host;
        if(host === ""){
            host = selectedFolderData.host;
        }
        let allPaths = [...getAllParentNodes(tableOpenedPathId), ...getAllParentNodes(selectedFolderData)];
        const additionalOpenNodes = allPaths.reduce( (prev, cur) => {
            return {...prev, [getOpenIDFromNode({group: group, host: host, full_path_text: cur})]: true}
        }, {})
      setOpenNodes({
        ...openNodes,
        [getOpenIDFromNode(tableOpenedPathId)]: true,
        [getOpenIDFromNode(selectedFolderData)]: true,
          ...additionalOpenNodes
      });
    }, [tableOpenedPathId, selectedFolderData]);
    const contextMenuOptions= (callback_id, callback_display_id, node) => [
      {
          name: 'List', type: "item", icon: <ListIcon color="warning" style={{ paddingRight: '5px'}} />,
          click: ({event}) => {
              event.stopPropagation();
              taskListing(node, callback_id, callback_display_id);
          }
      },
  ];
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const contextMenuData = React.useRef({});
    const onContextMenu = ({event, item, itemTreeData, dropdownRef}) => {
        event.preventDefault();
        event.stopPropagation();
        contextMenuData.current = {item, itemTreeData,
        x: event.clientX, y:event.clientY, dropdownRef};
        if(contextMenuData.current.item?.root){

        }else if(contextMenuData.current.item?.is_group){

        }else {
            let options = [{
                name: contextMenuData.current?.item?.name_text, icon: null, disabled: true, type: "item",
                click: () => {}
            }];
            options.push(...contextMenuOptions(tabInfo["callbackID"], tabInfo["displayID"], contextMenuData.current?.item));
            if(contextMenuData.current?.item?.callback?.["display_id"] !== tabInfo["displayID"]){
                options.push({
                    name: "Original Callback", icon: null, click: () => {}, type: "menu",
                    menuItems: [
                        ...contextMenuOptions(contextMenuData.current?.item?.callback?.id, contextMenuData.current?.item?.callback?.display_id)
                    ]
                })
            }
            contextMenuData.current.options = options;
            setOpenContextMenu(true);
        }
    }
    const handleMenuItemClick = (event, click) => {
        event.preventDefault();
        event.stopPropagation();
        click({event});
        //contextMenuOptions[index].click({event,
        //    node:  {...contextMenuData.current?.item, group: contextMenuData.current?.itemTreeData?.group, host: contextMenuData.current?.itemTreeData?.host},
        //    callback_id, callback_display_id
        //});
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
          {openContextMenu &&
              <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
                  <Dropdown
                      isOpen={contextMenuData.current?.dropdownRef?.current}
                      onOpen={setOpenContextMenu}
                      externallyOpen={openContextMenu}
                      style={{
                          top: contextMenuData.current?.y,
                          left: contextMenuData.current?.x
                      }}
                      menu={[
                          ...contextMenuData.current?.options?.map((option, index) => (
                              option.type === 'item' ? (
                                  <DropdownMenuItem
                                      key={option.name}
                                      disabled={option.disabled}
                                      onClick={(event) => handleMenuItemClick(event, option.click)}
                                  >
                                      {option.icon} {option.name}
                                  </DropdownMenuItem>
                              ) : option.type === 'menu' ? (
                                  <DropdownNestedMenuItem
                                      label={option.name}
                                      disabled={option.disabled}
                                      menu={
                                          option.menuItems.map((menuOption, indx) => (
                                              <DropdownMenuItem
                                                  key={menuOption.name}
                                                  disabled={menuOption.disabled}
                                                  onClick={(event) => handleMenuItemClick(event, menuOption.click)}
                                              >
                                                  {menuOption.icon}{menuOption.name}
                                              </DropdownMenuItem>
                                          ))
                                      }
                                  />
                              ) : null))
                      ]}/>
              </ClickAwayListener>
          }

      </>

  )
};