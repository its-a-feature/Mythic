import React from 'react';
import FileBrowserVirtualTree from '../../MythicComponents/MythicFileBrowserVirtualTree';


export const CallbacksTabsFileBrowserTree = ({ treeRootData, treeAdjMatrix, fetchFolderData, setTableData, taskListing, tableOpenedPathId, showDeletedFiles}) => {
    const [openNodes, setOpenNodes] = React.useState({});
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
        setTableData(nodeData);
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
          click: ({event, node}) => {
              taskListing(node);
          }
      },
  ];
  return(
    <FileBrowserVirtualTree
        showDeletedFiles={showDeletedFiles}
        treeRootData={treeRootData}
        treeAdjMatrix={treeAdjMatrix}
        openNodes={openNodes}
        onSelectNode={onSelectNode}
        onExpandNode={toggleNodeExpanded}
        onCollapseNode={toggleNodeCollapsed}
        contextMenuOptions={contextMenuOptions}
    />
  )
};