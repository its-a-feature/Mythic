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
import { Typography } from '@mui/material';
import { MythicStyledTooltip } from "./MythicStyledTooltip";
import WidgetsIcon from '@mui/icons-material/Widgets';
import { areEqual } from 'react-window';

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
  height: "100%",
  minHeight: 0,
  minWidth: 0,
  overflow: "hidden",
  width: "100%",

  [`& .${classes.rowContainer}`]: {
    cursor: "pointer",
    overflow: "hidden",
    transition: "background-color 120ms ease, color 120ms ease",
  },

  [`& .${classes.rowContainer}:hover`]: {
    backgroundColor: theme.palette.action.hover,
  },

  [`& .${classes.row}`]: {
    display: "flex",
    alignItems: "center",
    height: "100%",
    minWidth: "fit-content",
    paddingRight: theme.spacing(1),
    userSelect: "none",
    whiteSpace: "nowrap",
    width: "100%",
  },

  [`& .${classes.row}[data-deleted="true"]`]: {
    textDecoration: "line-through",
  },

  [`& .${classes.rowButtonWrapper}`]: {
    alignSelf: "stretch",
    borderLeft: `2px dashed ${alpha(theme.palette.text.primary, 0.34)}`,
    flex: "0 0 14px",
    marginLeft: 7,
  },

  [`& .${classes.rowButton}`]: {
    alignItems: "center",
    display: "inline-flex",
    flex: "0 0 auto",
    justifyContent: "center",
    width: theme.spacing(3),
  },

  [`& .${classes.rowLabel}`]: {
    color: theme.palette.text.primary,
    fontFamily: "inherit",
    fontSize: theme.typography.pxToRem(13),
    lineHeight: 1.35,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  [`& .${classes.rowLabel}[data-muted="true"]`]: {
    color: theme.palette.text.secondary,
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
      flex: "0 0 auto",
      height: 16,
      marginLeft: 3,
      marginRight: 5,
      verticalAlign: 'middle',
      width: 16,
  },

  [`& .${classes.icon}[data-folder="true"]`]: {
      color: theme.folderColor,
  },

  [`& .${classes.icon}[data-empty="true"]`]: {
      color: theme.emptyFolderColor,
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
      height: "100%",
      marginBottom: 0,
      minHeight: 0,
      minWidth: 0,
      overflow: "hidden",
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
function itemKey(index, data) {
    // Find the item at the specified index.
    // In this case "data" is an Array that was passed to List as "itemData".
    const item = data[index];
    if(item.root){
        return `${item.group};${item.id}`;
    }
    if(item.is_group){
        return item.group;
    }
    return `${item.group};${item.host};${item.full_path_text}`;
}
const VirtualTreeRow = React.memo(({
  onSelectNode,
  onExpandNode,
  onCollapseNode,
  onDoubleClickNode,
  onContextMenu,
  tabInfo,
  selectedFolderData,
  ...ListProps
}) => {
  const itemTreeData = ListProps.data[ListProps.index];
  const item = ListProps.treeRootData[itemTreeData.group]?.[itemTreeData.host]?.[itemTreeData.full_path_text] || itemTreeData;
  //console.log("item", item, "itemlookup", ListProps.treeRootData[itemTreeData.host]?.[itemTreeData.name])
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
  const handleContextClick = (e) => {
      onContextMenu({event: e, item, itemTreeData});
  }
  const selectedPath = () => {
      if(itemTreeData.group === selectedFolderData.group && itemTreeData.host === selectedFolderData.host){
          if(itemTreeData.root){
              return "selectedCallbackHierarchy";
          }
          if(selectedFolderData.full_path_text === itemTreeData.full_path_text){
              return "selectedCallback";
          }
      }
      return "";
    }
  return (
    <div className={`${classes.rowContainer} hoverme ${selectedPath()}`.trim()}
         style={ListProps.style}
         onContextMenu={handleContextClick}
         onClick={handleOnClickRow}>
    <div className={classes.row} data-deleted={itemTreeData.deleted ? "true" : undefined}>
        {[...Array(itemTreeData.depth)].map((o, i) => (
            <span
                className={classes.rowButtonWrapper}
                key={'folder' + itemTreeData.id + 'lines' + i}
            />
        ))}

          {itemTreeData.is_group ? (
              <WidgetsIcon className={classes.icon} />
          ): itemTreeData.root  ? (
              <ComputerIcon className={classes.icon}  />
          ) : !itemTreeData.can_have_children ? (
              <DescriptionIcon className={classes.icon} />
          ) : itemTreeData.isOpen ? (
            <FontAwesomeIcon 
              icon={faFolderOpen} 
              className={classes.icon}
              data-folder={item?.has_children || item.success ? "true" : undefined}
              data-empty={item?.has_children || item.success ? undefined : "true"}
              size={"lg"}
              onClick={handleOnClickButton} />
          ) : (
              <FontAwesomeIcon 
                className={classes.icon}
                data-folder={item?.has_children || item.success ? "true" : undefined}
                data-empty={item?.has_children || item.success ? undefined : "true"}
                size={"lg"}
                icon={faFolder} onClick={handleOnClickButton} />
          )}
          <Typography
              className={classes.rowLabel}
              data-muted={item?.has_children || item.success !== null ? undefined : "true"}
              component="pre">
              {itemTreeData.name}
          </Typography>

          {item.success === true && itemTreeData.depth > 0 ? (
              <MythicStyledTooltip title='Successfully listed contents of folder'>
                  <CheckCircleOutlineIcon className={classes.icon} fontSize='small' color="success" />
              </MythicStyledTooltip>
          ) : item.success === false && itemTreeData.depth > 0 ? (
              <MythicStyledTooltip title='Failed to list contents of folder'>
                  <ErrorIcon className={classes.icon} fontSize='small' color="error" />
              </MythicStyledTooltip>
          ) : null}

    </div>
    </div>
  );
}, areEqual);
const caseInsensitiveCompare = (a, b) => {
    try{
        return a.localeCompare(b);
    }catch(error){
        console.log("localeCompare failed for", a, b);
        return a < b;
    }
}
const FileBrowserVirtualTreePreMemo = ({
  treeRootData,
  treeAdjMatrix,
  openNodes,
  onSelectNode,
  onExpandNode,
  onCollapseNode,
  onContextMenu,
  showDeletedFiles,
  selectedFolderData,
  tabInfo,
}) => {
    const gridRef = React.useRef(null);
  const flattenNode = useCallback(
    // node is just a full_path_text
    (node, group, host, depth = 0) => {
        //console.log(node, group, host, depth);
      if(depth === 0){
        return [
          {
            id: treeRootData[group]?.[host]?.[node].id,
            name: treeRootData[group]?.[host]?.[node].name_text,
            full_path_text: treeRootData[group]?.[host]?.[node].full_path_text,
            deleted: treeRootData[group]?.[host]?.[node].deleted,
            depth,
            isLeaf: Object.keys(treeAdjMatrix[group]?.[host]?.[node] || {}).length === 0,
            can_have_children: treeRootData[group]?.[host]?.[node].can_have_children,
            isOpen: true,
            children: (treeAdjMatrix[group][host]?.[node] || {}),
            host,
            group,
            root: true
          },
          ...(Object.keys(treeAdjMatrix[group]?.[host]?.[node] || {})).sort(caseInsensitiveCompare).reduce( (prev, cur) => {
            if(!treeRootData[group][host][cur].can_have_children){return [...prev]}
            return [...prev, flattenNode(cur, group, host, depth+1)];
        }, []).flat()
        ];
      }
      if (openNodes[`${group};${host};${treeRootData[group][host][node].full_path_text}`] === true) {
        return [
          {
            id: treeRootData[group][host][node].id,
            name: treeRootData[group][host][node].name_text,
            full_path_text: treeRootData[group][host][node].full_path_text,
            deleted: treeRootData[group][host][node].deleted,
            depth,
            isLeaf: Object.keys(treeAdjMatrix[group]?.[host]?.[node] || {}).length === 0,
            can_have_children: treeRootData[group][host][node].can_have_children,
            isOpen: true,
            children: (treeAdjMatrix[group]?.[host]?.[node] || {}),
            host,
            group,
            root: false,
          },
          ...(Object.keys(treeAdjMatrix[group]?.[host]?.[node] || {})).sort(caseInsensitiveCompare).reduce( (prev, cur) => {
            if(!treeRootData[group][host][cur].can_have_children){return [...prev]}
            if(!showDeletedFiles && treeRootData[group][host][cur].deleted){return [...prev]}
            return [...prev, flattenNode(cur, group, host, depth+1)];
        }, []).flat()
        ];
      }
      return [
        {
          id: treeRootData[group]?.[host]?.[node].id,
          name: treeRootData[group]?.[host]?.[node].name_text,
          full_path_text: treeRootData[group]?.[host]?.[node].full_path_text,
          deleted: treeRootData[group]?.[host]?.[node].deleted,
          depth,
          isLeaf: Object.keys(treeAdjMatrix[group]?.[host]?.[node] || {}).length === 0,
          can_have_children: treeRootData[group]?.[host]?.[node].can_have_children,
          isOpen: false,
          children: (treeAdjMatrix[group]?.[host]?.[node] || {}),
          host,
          group,
          root: false,
        }
      ];
     
    },
    [openNodes, showDeletedFiles, treeAdjMatrix] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const flattenedNodes = useMemo(() => {
    //console.log("in tree", treeRootData, treeAdjMatrix)
    // need to return an array
    let finalData = [];
    //console.log(treeAdjMatrix);
      const groupKeys = Object.keys(treeAdjMatrix).sort(caseInsensitiveCompare);
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
        const hostKeys = Object.keys(treeAdjMatrix[groupKeys[i]]).sort(caseInsensitiveCompare);
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
            finalData.push(...Object.keys(treeAdjMatrix[groupKeys[i]][hostKeys[j]][""]).sort(caseInsensitiveCompare).reduce((prev, c) => {
                if(!showDeletedFiles && c.deleted) {
                    return [...prev];
                } else {
                    return [...prev, ...flattenNode(c, groupKeys[i], hostKeys[j], 2)]
                }
            }, []).flat())
        }
    }
    return finalData;
    //nodes.map((node) => flattenNode(node)).flat()
  },[flattenNode, treeRootData, treeAdjMatrix, showDeletedFiles]);
  React.useEffect( () => {
      let rowIndex = flattenedNodes?.findIndex(e =>
          e.full_path_text === selectedFolderData.full_path_text &&
          e.host === selectedFolderData.host &&
          e.group === selectedFolderData.group
      );
      if(rowIndex >= 0){
          if(gridRef.current){
              gridRef.current?.scrollToItem(rowIndex, "smart")
          }
      }
  }, [selectedFolderData, flattenedNodes]);
  return flattenedNodes.length > 0 ? (
    <div className="mythic-process-browser-table-shell">
      <StyledAutoSizer>
      {(AutoSizerProps) => (
        <List
          itemData={flattenedNodes}
          layout="vertical"
          height={AutoSizerProps.height}
          width={AutoSizerProps.width}
          itemCount={flattenedNodes.length}
          itemKey={itemKey}
          itemSize={24}
          ref={gridRef}
        >
          {(ListProps) => (
            <VirtualTreeRow
              {...ListProps}
              tabInfo={tabInfo}
              selectedFolderData={selectedFolderData}
              treeRootData={treeRootData}
              onSelectNode={onSelectNode}
              onExpandNode={onExpandNode}
              onCollapseNode={onCollapseNode}
              onContextMenu={onContextMenu}
            />
          )}
        </List>
      )}
    </StyledAutoSizer>
    </div>
  ) : null;
};
export const FileBrowserVirtualTree = React.memo(FileBrowserVirtualTreePreMemo);
