import React, {useEffect, useRef} from 'react';
import {Button} from '@mui/material';
import { MythicViewJSONAsTableDialog, MythicDialog } from '../../MythicComponents/MythicDialog';
import { MythicDisplayTextDialog } from '../../MythicComponents/MythicDisplayTextDialog';
import { ResponseDisplayTableDialogTable } from './ResponseDisplayTableDialogTable';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import 'react-virtualized/styles.css';
import {TaskFromUIButton} from './TaskFromUIButton';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import {snackActions} from '../../utilities/Snackbar';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faList, faTrashAlt, faSkullCrossbones, faCamera, faSyringe, faFolder, faFolderOpen, faFileArchive, faCog, faFileWord, faFileExcel, faFilePowerpoint, faFilePdf, faDatabase, faKey, faFileCode, faDownload, faUpload, faFileImage, faCopy, faBoxOpen, faFileAlt } from '@fortawesome/free-solid-svg-icons';
// --------
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';

const onCopyToClipboard = (data) => {
  let result = copyStringToClipboard(data);
  if(result){
    snackActions.success("Copied text!");
  }else{
    snackActions.error("Failed to copy text");
  }
}
const getIconName = (iconName) => {
  switch(iconName.toLowerCase()){
    case "openfolder":
    case "folder":
      return faFolderOpen;
    case "closedfolder":
      return faFolder;
    case "archive":
    case "zip":
      return faFileArchive;
    case "diskimage":
      return faBoxOpen;
    case "executable":
      return faCog;
    case "word":
      return faFileWord;
    case "excel":
      return faFileExcel;
    case "powerpoint":
      return faFilePowerpoint;
    case "pdf":
    case "adobe":
      return faFilePdf;
    case "database":
      return faDatabase;
    case "key":
      return faKey;
    case "code":
    case "source":
      return faFileCode;
    case "download":
      return faDownload;
    case "upload":
      return faUpload;
    case "png":
    case "jpg":
    case "image":
      return faFileImage;
    case "list":
      return faList;
    case "delete":
      return faTrashAlt;
    case "inject":
      return faSyringe;
    case "kill":
      return faSkullCrossbones;
    case "camera":
      return faCamera;
    default:
      return faFileAlt;
  }
}

const ResponseDisplayTableStringCell = ({cellData, rowData}) => {
  return (
    <div style={{...cellData?.cellStyle}}>
      {cellData?.startIcon? 
        <MythicStyledTooltip title={cellData?.startIconHoverText || ""} >
            <FontAwesomeIcon icon={getIconName(cellData?.startIcon)} style={{marginRight: "5px", color: cellData?.startIconColor  || ""}}/>
        </MythicStyledTooltip>
         : null
      }
      {cellData?.plaintextHoverText &&
        <MythicStyledTooltip title={cellData.plaintextHoverText}>
          <pre style={{display: "inline-block"}}>
            {cellData?.plaintext?.replaceAll?.("\n", "") || cellData?.plaintext}
          </pre>
          
        </MythicStyledTooltip>
      }
      <pre style={{display: "inline-block"}}>
          {cellData?.plaintext?.replaceAll?.("\n", "") || cellData?.plaintext}
      </pre>

      { cellData?.endIcon &&
       <MythicStyledTooltip title={cellData?.endIconHoverText || ""}>
          <FontAwesomeIcon icon={getIconName(cellData?.endIcon)} style={{color: cellData?.endIconColor  || ""}}/>
      </MythicStyledTooltip>
      }
    </div>
  );
}
const ResponseDisplayTableDateCell = ({cellData, rowData}) => {
  return (
      <div style={{...(cellData?.cellStyle || null)}}>
        {cellData?.startIcon?
            <MythicStyledTooltip title={cellData?.startIconHoverText || ""} >
              <FontAwesomeIcon icon={getIconName(cellData?.startIcon)} style={{marginRight: "5px", color: cellData?.startIconColor  || ""}}/>
            </MythicStyledTooltip>
            : null
        }
        {cellData?.plaintextHoverText? (
            <MythicStyledTooltip title={cellData.plaintextHoverText}>
          <pre style={{display: "inline-block"}}>
            {cellData?.plaintext?.toISOString?.()}
          </pre>

            </MythicStyledTooltip>
        ) : (
            <pre style={{display: "inline-block"}}>
            {cellData?.plaintext?.toISOString?.()}
          </pre>
        )}
        {cellData?.endIcon?
            <MythicStyledTooltip title={cellData?.endIconHoverText || ""}>
              <FontAwesomeIcon icon={getIconName(cellData?.endIcon)} style={{color: cellData?.endIconColor  || ""}}/>
            </MythicStyledTooltip>: null
        }
      </div>
  );
}
const ResponseDisplayTableNumberCell = ({cellData, rowData}) => {
  return (
    <div style={{...(cellData?.cellStyle || null)}}>
      {cellData?.startIcon? 
        <MythicStyledTooltip title={cellData?.startIconHoverText || ""} >
            <FontAwesomeIcon icon={getIconName(cellData?.startIcon)} style={{marginRight: "5px", color: cellData?.startIconColor  || ""}}/>
        </MythicStyledTooltip>
         : null
      }
      {cellData?.plaintextHoverText? (
        <MythicStyledTooltip title={cellData.plaintextHoverText}>
          <pre style={{display: "inline-block"}}>
            {cellData?.plaintext  || " "}
          </pre>
          
        </MythicStyledTooltip>
      ) : (
        <pre style={{display: "inline-block"}}>
            {cellData?.plaintext || " "}
          </pre>
      )}
      {cellData?.endIcon? 
       <MythicStyledTooltip title={cellData?.endIconHoverText || ""}>
          <FontAwesomeIcon icon={getIconName(cellData?.endIcon)} style={{color: cellData?.endIconColor  || ""}}/>
        </MythicStyledTooltip>: null
      }
    </div>
  );
}
export const getStringSize = ({cellData}) => {
  try{
      // process for getting human readable string from bytes: https://stackoverflow.com/a/18650828
      let bytes = parseInt(cellData["plaintext"]);
      if (cellData["plaintext"] === ''){
        return ""
      }
      if (bytes === 0){
        return "0 Bytes";
      }
      const decimals = 2;
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }catch(error){
    return cellData?.plaintext?.replaceAll?.("\n", "") || ""
    
  }
}
const ResponseDisplayTableSizeCell = ({cellData, rowData}) => {
  return (
    <div style={{...(cellData?.cellStyle || null)}}>
        {cellData?.plaintextHoverText? (
        <MythicStyledTooltip title={cellData.plaintextHoverText} >
          <pre style={{display: "inline-block"}}>
            {getStringSize({cellData})}
          </pre>
          
        </MythicStyledTooltip>
      ) : (
        <pre style={{display: "inline-block"}}>
            {getStringSize({cellData})}
          </pre>
      )}
     </div>
  );
}
const ResponseDisplayTableActionCell = ({cellData, callback_id, rowData}) => {
  const theme = useTheme();
  const [openButton, setOpenButton] = React.useState(false);
  const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
  const [openDictionaryButton, setOpenDictionaryButton] = React.useState(false);
  const [openStringButton, setOpenStringButton] = React.useState(false);
  const [openTableButton, setOpenTableButton] = React.useState(false);
  const dropdownAnchorRef = useRef(null);
  const [openDropdownButton, setOpenDropdownButton] = React.useState(false);
  const [taskingData, setTaskingData] = React.useState({});
  const handleClose = (event) => {
    if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
      return;
    }
    setOpenDropdownButton(false);
  };
  const handleMenuItemClick = (event, index) => {
    switch(cellData.button.value[index].type.toLowerCase()){
      case "task":
        setTaskingData(cellData.button.value[index]);
        setOpenTaskingButton(true);
        break;
      case "dictionary":
        setTaskingData(cellData.button.value[index]);
        setOpenDictionaryButton(true);
        break;
      case "string":
        setTaskingData(cellData.button.value[index]);
        setOpenStringButton(true);
        break;
      case "table":
        setTaskingData(cellData.button.value[index]);
        setOpenTableButton(true);
        break;
    }
    setOpenDropdownButton(false);
  };
  const finishedTasking = () => {
    setOpenButton(false);
    setOpenTaskingButton(false);
    setOpenDictionaryButton(false);
    setOpenStringButton(false);
    setOpenTableButton(false);
    setTaskingData({});
  }
  const finishedViewingData = () => {
    setOpenButton(false);
    setOpenTaskingButton(false);
    setOpenDictionaryButton(false);
    setOpenStringButton(false);
    setOpenTableButton(false);
    setTaskingData({});
  }
  const getButtonObject = () => {
    switch(cellData.button.type.toLowerCase()){
      case "dictionary":
        return (
          <React.Fragment>
            <MythicStyledTooltip title={cellData?.button?.hoverText || " "} >
              <Button size="small" variant="contained" color="primary" 
                onClick={() => setOpenButton(true)} disabled={cellData?.button?.disabled || false}
                startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.startIconColor  || ""}}/> : null}
                >{cellData?.button?.name || " "}</Button>
            </MythicStyledTooltip>
            {openButton &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openButton} 
                    onClose={()=>{setOpenButton(false);}} 
                    innerDialog={<MythicViewJSONAsTableDialog title={cellData?.button?.title || "Title Here"} leftColumn={cellData?.button?.leftColumnTitle || "Left Column"} 
                    rightColumn={cellData?.button?.rightColumnTitle || "Right Column"} value={cellData?.button?.value || {}} onClose={()=>{setOpenButton(false);}} />}
                />
              }
            </React.Fragment>
        )
      case "string":
        return (
          <React.Fragment>
            <MythicStyledTooltip title={cellData?.button?.hoverText || " "} >
              <Button size="small" variant="contained" color="primary" 
                onClick={() => setOpenButton(true)} disabled={cellData?.button?.disabled || false}
                startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.startIconColor  || ""}}/> : null}
                >{cellData?.button?.name || " "}</Button>
            </MythicStyledTooltip>
            {openButton &&
                <MythicDisplayTextDialog fullWidth={true} maxWidth="lg" open={openButton} title={cellData?.button?.title || "Title Here"} value={cellData?.button?.value || ""}
                    onClose={()=>{setOpenButton(false);}}
                />
              }
          </React.Fragment>
        )
      case "table": 
        return (
          <React.Fragment>
            <MythicStyledTooltip title={cellData?.button?.hoverText || " "} >
              <Button size="small" variant="contained" color="primary" 
                onClick={() => setOpenButton(true)} disabled={cellData?.button?.disabled || false}
                startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.startIconColor  || ""}}/> : null}
                >{cellData?.button?.name || " "}</Button>
            </MythicStyledTooltip>
            {openButton &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openButton} 
                    onClose={()=>{setOpenButton(false);}} 
                    innerDialog={<ResponseDisplayTableDialogTable title={cellData?.button?.title || "Title Here"} 
                    table={cellData?.button?.value || {}} callback_id={callback_id} onClose={()=>{setOpenButton(false);}} />}
                />
              }
          </React.Fragment>
        )
      case "task":
        return (
          <React.Fragment>
            <MythicStyledTooltip title={cellData?.button?.hoverText || " "}>
              <Button size="small" onClick={() => setOpenTaskingButton(true)} disabled={cellData?.button?.disabled || false} variant="contained" color="warning" 
                startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.startIconColor  || ""}}/> : null}
              >{cellData?.button?.name || " "}</Button>
            </MythicStyledTooltip>
            {openTaskingButton && 
              <TaskFromUIButton ui_feature={cellData?.button?.ui_feature || " "} 
                callback_id={callback_id} 
                parameters={cellData?.button?.parameters || ""}
                openDialog={cellData?.button?.openDialog || false}
                getConfirmation={cellData?.button?.getConfirmation || false}
                acceptText={cellData?.button?.acceptText || "confirm"}
                selectCallback={cellData?.button?.selectCallback || false}
                onTasked={() => setOpenTaskingButton(false)}/>
            }
          </React.Fragment>
        )
      case "menu":
        return (
          <React.Fragment>
            {openTaskingButton && 
              <TaskFromUIButton ui_feature={taskingData.ui_feature} 
                callback_id={callback_id} 
                parameters={taskingData.parameters}
                openDialog={taskingData?.openDialog || false}
                getConfirmation={taskingData?.getConfirmation || false}
                acceptText={taskingData?.acceptText || "confirm"}
                selectCallback={taskingData?.selectCallback || false}
                onTasked={finishedTasking}/>
            }
            {openDictionaryButton && 
              <MythicDialog fullWidth={true} maxWidth="lg" open={openDictionaryButton} 
                onClose={finishedViewingData} 
                innerDialog={<MythicViewJSONAsTableDialog title={taskingData.title} leftColumn={taskingData.leftColumnTitle} 
                rightColumn={taskingData.rightColumnTitle} value={taskingData.value} onClose={finishedViewingData} />}
            />
            }
            {openStringButton &&
              <MythicDisplayTextDialog fullWidth={true} maxWidth="lg" open={openStringButton} title={taskingData?.title || "Title Here"} value={taskingData?.value || ""}
                  onClose={finishedViewingData}
              />
            }
            {openTableButton &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openTableButton} 
                    onClose={finishedViewingData} 
                    innerDialog={<ResponseDisplayTableDialogTable title={taskingData?.title || "Title Here"} 
                    table={taskingData?.value || {}} callback_id={callback_id} onClose={finishedViewingData} />}
                />
              }
              <Button size="small" variant="contained" color="primary" ref={dropdownAnchorRef}
                onClick={() => setOpenDropdownButton(true)} disabled={cellData?.button?.disabled || false}
                startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.startIconColor  || ""}}/> : null}
                >{cellData?.button?.name || " "}</Button>
                <Popper open={openDropdownButton} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 4}}>
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
                            {cellData.button.value.map((option, index) => (
                              <MenuItem
                                key={option.name + index}
                                disabled={option.disabled}
                                onClick={(event) => handleMenuItemClick(event, index)}
                              >
                                <MythicStyledTooltip title={option?.hoverText || (option.type === "task" ? "Task an Agent" : "Display Data")}>
                                    {option?.startIcon ? <FontAwesomeIcon icon={getIconName(option?.startIcon)} style={{color: option?.startIconColor  || "", marginRight: "5px"}}/> : null}
                                    {option.name}
                                </MythicStyledTooltip>
                              </MenuItem>
                            ))}
                          </MenuList>
                        </ClickAwayListener>
                      </Paper>
                    </Grow>
                  )}
                </Popper>
          </React.Fragment>
        )
    }
  }
  return (
    <div style={{...(rowData?.rowStyle || null), ...(cellData?.cellStyle || null)}}>
      {cellData?.plaintext ? cellData.plaintext : null}
      {cellData?.button ? (getButtonObject()) : null}
    </div>
  );
}


export const ResponseDisplayMaterialReactTable = ({table, callback_id, expand, task}) =>{
  const theme = useTheme();
  const [allData, setAllData] = React.useState([]);
  const filterOutButtonsFromRowData = (data) => {
    let rowData = {};
    for(const key of Object.keys(data)){
      if(data[key]["plaintext"] !== undefined){
        rowData[key] = data[key]["plaintext"];
      }
    }
    return rowData;
  }
  const contextMenuOptions = [
    {
      name: 'Copy Row as JSON',
      click: ({event, columnIndex, rowIndex, data}) => {
        const filteredData = filterOutButtonsFromRowData(data);
        onCopyToClipboard(JSON.stringify(filteredData, null, 2));
      }
    },
    {
      name: 'Copy Row as CSV',
      click: ({event, columnIndex, rowIndex, data}) => {
        const filteredData = filterOutButtonsFromRowData(data);
        let outputHeaders = "";
        let outputRow = "";
        for(const key of Object.keys(filteredData)){
          if(outputHeaders === ""){
            outputHeaders += key;
          } else {
            outputHeaders += "," + key;
          }
          if(outputRow === ""){
            outputRow += filteredData[key];
          }else{
            outputRow += "," + filteredData[key];
          }
        }
        onCopyToClipboard(outputHeaders + "\n" + outputRow);
      }
    },
    {
      name: 'Copy Row as TSV',
      click: ({event, columnIndex, rowIndex, data}) => {
        const filteredData = filterOutButtonsFromRowData(data);
        let outputHeaders = "";
        let outputRow = "";
        for(const key of Object.keys(filteredData)){
          if(outputHeaders === ""){
            outputHeaders += key;
          } else {
            outputHeaders += "\t" + key;
          }
          if(outputRow === ""){
            outputRow += filteredData[key];
          }else{
            outputRow += "\t" + filteredData[key];
          }
        }
        onCopyToClipboard(outputHeaders + "\n" + outputRow);
      }
    },
  ];
  const columns = React.useMemo( () => table.headers.map( h => {
    return {
      accessorKey: `${h.plaintext}.plaintext`,
      header: h.plaintext,
      size: h.width,
      id: h.plaintext,
      enableClickToCopy: h.type !== 'button',
      filterVariant: h.type === 'number' || h.type === 'size' ? 'range' : 'text',
      enableResizing: h.type !== 'button',
      enableSorting: h.type !== 'button',
      enableColumnFilter: h.type !== 'button',
      grow: h.fillWidth,
      accessorFn: (row) => {
        if(h.type === "date"){
          return new Date(row[h.plaintext]?.plaintext || 0);
        }
        if(h.type === "number" || h.type === "size"){
          try{
            return Number(row[h.plaintext]?.plaintext);
          }catch(error){
            return row[h.plaintext]?.plaintext || "";
          }
        }
        return row[h.plaintext]?.plaintext || "";
      },
      Cell: ({cell, renderedCellValue}) => {
        let cellData = {...cell.row?.original?.[h.plaintext], plaintext: renderedCellValue};
        switch(h.type){
          case "string":
            return (
                <ResponseDisplayTableStringCell cellData={cellData} rowData={cell.row.original}/>
            )
          case "date":
            return (
                <ResponseDisplayTableDateCell cellData={cellData} rowData={cell.row.original}/>
            )
          case "size":
            return (
                <ResponseDisplayTableSizeCell cellData={cellData} rowData={cell.row.original}/>
            )
          case "button":
            return (
                <ResponseDisplayTableActionCell callback_id={callback_id} cellData={cellData} rowData={cell.row.original}/>
            )
          case "number":
            return (
                <ResponseDisplayTableNumberCell callback_id={callback_id} cellData={cellData} rowData={cell.row.original} />
            )
          default:
            return (
                <ResponseDisplayTableStringCell cellData={cellData} rowData={cell.row.original}/>
            )
        }
      }
    }
  }), [table.headers])


  useEffect( () => {
    setAllData([...table.rows]);
  }, [table.rows]);
  const materialReactTable = useMaterialReactTable({
    columns,
    data: allData,
    layoutMode: "grid",
    autoResetPageIndex: false,
    enableFacetedValues: true,
    enablePagination: true,
    enableBottomToolbar: true,
    enableStickyHeader: true,
    enableDensityToggle: false,
    enableColumnResizing: true,
    //enableColumnOrdering: true,
    //columnResizeMode: 'onEnd',
    defaultDisplayColumn: { enableResizing: true },
    muiTableContainerProps: { sx: { alignItems: "flex-start" } },
    mrtTheme: (theme) => ({
      baseBackgroundColor: theme.palette.background.default, //change default background color
    }),
    muiSearchTextFieldProps: {
      placeholder: 'Search loaded data',
      size: 'small',
      sx: { minWidth: '300px' },
      variant: 'outlined',
    },
    muiTableHeadCellProps: {
      sx: {
        border: '1px solid rgba(81, 81, 81, .5)',
        fontStyle: 'italic',
        fontWeight: 'bold',
      },
      style: {
        zIndex: 1,
      }
    },
    muiTableHeadRowProps: {
      sx: {}
    },
    muiTableBodyCellProps: ({ cell, table }) => {
      return {
        sx: {
          ...cell.row.original[cell.column.id]?.cellStyle,
          padding: "0 0 0 10px",
        }
      }
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        ...row?.original?.rowStyle, padding: 0
      },
      style: {padding: 0}
    }),
    enableRowActions: false,
    /*
    renderRowActions: ({ row }) => (
    <Box>
      <IconButton onClick={() => console.info('Edit')}>
        <EditIcon />
      </IconButton>
      <IconButton onClick={() => console.info('Delete')}>
        <DeleteIcon />
      </IconButton>
    </Box>
  ),
     */
    renderRowActionMenuItems: ({ row }) => contextMenuOptions.map( o => (
        <MenuItem key={o.name} onClick={() => {o.click({data: row.original})}}>{o.name}</MenuItem>
        )),
    muiTablePaperProps: {
      sx: { display: "flex", flexDirection: "column", width: "100%"}
    },
    muiTopToolbarProps: {
      sx: {backgroundColor: theme.materialReactTableHeader},
    },
    renderTopToolbarCustomActions: () => (
        <Typography variant="h5" >{table?.title || ""}</Typography>
    ),
    renderEmptyRowsFallback: ({ table }) => (
        <div style={{display: "flex", width: "100%", height: "100%", justifyContent: "center", flexDirection: "column", alignItems: "center"}}>
          <Typography variant={"h4"} >
            {"No Data"}
          </Typography>
        </div>
    ),
  });
  const scrollContent = (node, isAppearing) => {
    // only auto-scroll if you issued the task
    document.getElementById(`scrolltotaskbottom${task.id}`)?.scrollIntoView?.({
      //behavior: "smooth",
      block: "end",
      inline: "nearest"
    })
  }
  React.useLayoutEffect( () => {
    scrollContent()
  }, []);
  return (
        <MaterialReactTable table={materialReactTable} />
  )   
}
