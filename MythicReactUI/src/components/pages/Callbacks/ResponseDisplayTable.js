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
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import IconButton from '@mui/material/IconButton';
import {snackActions} from '../../utilities/Snackbar';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import MythicResizableGrid from '../../MythicComponents/MythicResizableGrid';
import {faList, faTrashAlt, faSkullCrossbones, faCamera, faSyringe, faFolder, faFolderOpen, faFileArchive, faCog,
  faFileWord, faFileExcel, faFilePowerpoint, faFilePdf, faDatabase, faKey, faFileCode, faDownload, faUpload,
  faFileImage, faCopy, faBoxOpen, faFileAlt, faCirclePlus, faCheck, faSquareXmark, faRotate } from '@fortawesome/free-solid-svg-icons';
import {Dropdown, DropdownMenuItem} from "../../MythicComponents/MythicNestedMenus";
import {GetComputedFontSize} from "../../MythicComponents/MythicSavedUserSetting";

const onCopyToClipboard = (data) => {
  let result = copyStringToClipboard(data);
  if(result){
    snackActions.success("Copied text!");
  }else{
    snackActions.error("Failed to copy text");
  }
}
export const getIconName = (iconName) => {
  switch(iconName.toLowerCase()){
    case "add":
      return faCirclePlus;
    case "x":
      return faSquareXmark;
    case "check":
      return faCheck;
    case "refresh":
      return faRotate;
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
    case "cog":
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
export const getIconColor = (theme, color) => {
  switch(color){
    case "info":
      return theme.palette.info.main;
    case "warning":
      return theme.palette.warning.main;
    case "primary":
      return theme.palette.primary.main;
    case "error":
      return theme.palette.error.main;
    case "success":
      return theme.palette.success.main;
    case "secondary":
      return theme.palette.success.main;
    default:
      return color;
  }
}
const doubleClickRow = () => {

}
const ResponseDisplayTableStringCellCopy = ({cellData}) => {
  return (
      cellData?.copyIcon &&
      <MythicStyledTooltip title={"Copy to clipboard"}>
        <IconButton onClick={() => onCopyToClipboard(cellData["plaintext"])} size="small">
          <FontAwesomeIcon icon={faCopy} />
        </IconButton>
      </MythicStyledTooltip>
  )
}
const ResponseDisplayTableFontAwesomeStartIcon = ({cellData}) => {
  const theme = useTheme();
  return (
      cellData?.startIcon &&
      <MythicStyledTooltip title={cellData?.startIconHoverText || ""} >
        <FontAwesomeIcon icon={getIconName(cellData?.startIcon)} style={{marginRight: "5px", color: getIconColor(theme, cellData?.startIconColor  || "")}}/>
      </MythicStyledTooltip>
  )
}
const ResponseDisplayTableFontAwesomeEndIcon = ({cellData}) => {
  const theme = useTheme();
  return (
      cellData?.endIcon &&
      <MythicStyledTooltip title={cellData?.endIconHoverText || ""}>
        <FontAwesomeIcon icon={getIconName(cellData?.endIcon)} style={{color: getIconColor(theme, cellData?.endIconColor  || "")}}/>
      </MythicStyledTooltip>
  )
}
const ResponseDisplayTableStringCell = ({cellData, rowData}) => {
  return (
    <div style={{...(cellData?.cellStyle || null), height: "100%"}}>
      <ResponseDisplayTableStringCellCopy cellData={cellData} />
      <ResponseDisplayTableFontAwesomeStartIcon cellData={cellData} />
      {cellData?.plaintextHoverText? (
        <MythicStyledTooltip title={cellData.plaintextHoverText}>
          <pre style={{display: "inline-block", margin: 0}}>
            {cellData?.plaintext?.replaceAll?.("\n", "") || " "}
          </pre>
          
        </MythicStyledTooltip>
      ) : (
        <pre style={{display: "inline-block", margin: 0}}>
            {cellData?.plaintext?.replaceAll?.("\n","") || " "}
          </pre>
      )}
      <ResponseDisplayTableFontAwesomeEndIcon cellData={cellData} />
    </div>
  );
}
const ResponseDisplayTableNumberCell = ({cellData, rowData}) => {
  return (
    <div style={{...(cellData?.cellStyle || null), height: "100%"}}>
      {cellData?.copyIcon? 
        <MythicStyledTooltip title={"Copy to clipboard"}>
            <IconButton onClick={() => onCopyToClipboard(cellData["plaintext"])} size="small">
                <FontAwesomeIcon icon={faCopy} />
            </IconButton>
        </MythicStyledTooltip> : null}
      {cellData?.startIcon? 
        <MythicStyledTooltip title={cellData?.startIconHoverText || ""} >
            <FontAwesomeIcon icon={getIconName(cellData?.startIcon)} style={{marginRight: "5px", color: cellData?.startIconColor  || ""}}/>
        </MythicStyledTooltip>
         : null
      }
      {cellData?.plaintextHoverText? (
        <MythicStyledTooltip title={cellData.plaintextHoverText}>
          <pre style={{display: "inline-block",  margin: 0}}>
            {cellData?.plaintext  || " "}
          </pre>
          
        </MythicStyledTooltip>
      ) : (
        <pre style={{display: "inline-block",  margin: 0}}>
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
    <div style={{...(cellData?.cellStyle || null), height: "100%"}}>
        {cellData?.plaintextHoverText? (
        <MythicStyledTooltip title={cellData.plaintextHoverText} >
          <pre style={{display: "inline-block", margin: 0}}>
            {getStringSize({cellData})}
          </pre>
          
        </MythicStyledTooltip>
      ) : (
        <pre style={{display: "inline-block", margin: 0}}>
            {getStringSize({cellData})}
          </pre>
      )}
     </div>
  );
}
const actionCellButtonStyle = {paddingTop: 0, paddingBottom: 0};
const ResponseDisplayTableActionCell = ({cellData, callback_id, rowData}) => {
  return (
    <div style={{ height: "100%"}}>
      {cellData?.plaintext && cellData.plaintext}
      {cellData?.button && <ResponseDisplayTableActionCellButton cellData={cellData} callback_id={callback_id} />}
    </div>
  );
}
const ResponseDisplayTableActionCellButton = ({cellData, callback_id}) => {
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
  switch(cellData.button.type.toLowerCase()){
      case "dictionary":
        return (
            <React.Fragment>
              <MythicStyledTooltip title={cellData?.button?.hoverText || "View Data"} >
                <Button size="small" color="info"
                        onClick={() => setOpenButton(true)} disabled={cellData?.button?.disabled || false}
                        startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.disabled ? "unset" :  getIconColor(theme, cellData?.button?.startIconColor)}}/> : null}
                        style={{...actionCellButtonStyle}}
                >{cellData?.button?.name}</Button>
              </MythicStyledTooltip>
              {openButton &&
                  <MythicDialog fullWidth={true} maxWidth="lg" open={openButton}
                                onClose={()=>{setOpenButton(false);}}
                                innerDialog={<MythicViewJSONAsTableDialog title={cellData?.button?.title} leftColumn={cellData?.button?.leftColumnTitle}
                                                                          rightColumn={cellData?.button?.rightColumnTitle} value={cellData?.button?.value || {}} onClose={()=>{setOpenButton(false);}} />}
                  />
              }
            </React.Fragment>
        )
      case "string":
        return (
            <React.Fragment>
              <MythicStyledTooltip title={cellData?.button?.hoverText || "View Data"} >
                <Button size="small" color="info"
                        onClick={() => setOpenButton(true)} disabled={cellData?.button?.disabled || false}
                        startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.disabled ? "unset" :  getIconColor(theme, cellData?.button?.startIconColor)}}/> : null}
                        style={{...actionCellButtonStyle}}
                >{cellData?.button?.name}</Button>
              </MythicStyledTooltip>
              {openButton &&
                  <MythicDisplayTextDialog fullWidth={true} maxWidth="lg" open={openButton} title={cellData?.button?.title} value={cellData?.button?.value || ""}
                                           onClose={()=>{setOpenButton(false);}}
                  />
              }
            </React.Fragment>
        )
      case "table":
        return (
            <React.Fragment>
              <MythicStyledTooltip title={cellData?.button?.hoverText || "View Data"} >
                <Button size="small" color="info"
                        onClick={() => setOpenButton(true)} disabled={cellData?.button?.disabled || false}
                        startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.disabled ? "unset" :  getIconColor(theme, cellData?.button?.startIconColor || "")}}/> : null}
                        style={{...actionCellButtonStyle}}
                >{cellData?.button?.name}</Button>
              </MythicStyledTooltip>
              {openButton &&
                  <MythicDialog fullWidth={true} maxWidth="xl" open={openButton}
                                onClose={()=>{setOpenButton(false);}}
                                innerDialog={<ResponseDisplayTableDialogTable title={cellData?.button?.title}
                                                                              table={cellData?.button?.value || {}} callback_id={callback_id} onClose={()=>{setOpenButton(false);}} />}
                  />
              }
            </React.Fragment>
        )
      case "task":
        return (
            <React.Fragment>
              <MythicStyledTooltip title={cellData?.button?.hoverText || "Submit Task"}>
                <Button size="small" onClick={() => setOpenTaskingButton(true)} disabled={cellData?.button?.disabled || false}  color="warning"
                        startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.disabled ? "unset" : getIconColor(theme, cellData?.button?.startIconColor || "")}}/> : null}
                        style={{...actionCellButtonStyle}}
                >{cellData?.button?.name ? cellData?.button?.name : cellData?.button?.startIcon ? null : "Submit Task"}</Button>
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
                  <MythicDisplayTextDialog fullWidth={true} maxWidth="lg" open={openStringButton} title={taskingData?.title} value={taskingData?.value || ""}
                                           onClose={finishedViewingData}
                  />
              }
              {openTableButton &&
                  <MythicDialog fullWidth={true} maxWidth="xl" open={openTableButton}
                                onClose={finishedViewingData}
                                innerDialog={<ResponseDisplayTableDialogTable title={taskingData?.title}
                                                                              table={taskingData?.value || {}} callback_id={callback_id} onClose={finishedViewingData} />}
                  />
              }
              <Button size="small" color="info" ref={dropdownAnchorRef}
                      onClick={() => setOpenDropdownButton(true)} disabled={cellData?.button?.disabled || false}
                      startIcon={cellData?.button?.startIcon ? <FontAwesomeIcon icon={getIconName(cellData?.button?.startIcon)} style={{color: cellData?.button?.disabled ? "unset" :  getIconColor(theme, cellData?.button?.startIconColor || "")}}/> : null}
                      style={{...actionCellButtonStyle}}
              >{cellData?.button?.name || " "}</Button>
              <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
                <Dropdown
                    isOpen={dropdownAnchorRef.current}
                    onOpen={setOpenDropdownButton}
                    externallyOpen={openDropdownButton}
                    menu={
                      cellData.button.value.map((option, index) => (
                          <DropdownMenuItem
                              key={option.name + index}
                              disabled={option.disabled}
                              onClick={(event) => handleMenuItemClick(event, index)}
                          >
                            <MythicStyledTooltip title={option?.hoverText || (option.type === "task" ? "Task an Agent" : "Display Data")}>
                              {option?.startIcon ? <FontAwesomeIcon icon={getIconName(option?.startIcon)} style={{color: getIconColor(theme, cellData?.button?.startIconColor || ""), marginRight: "5px"}}/> : null}
                              {option.name}
                            </MythicStyledTooltip>
                          </DropdownMenuItem>
                      ))
                    }
                />
              </ClickAwayListener>
            </React.Fragment>
        )
    }
}

const createRowCells = ({row, rowIndex, headers, callback_id}) => {
  return headers.map((header, colIndex) => {
    const cellData = row[header.plaintext];
    const key = `${rowIndex}-${colIndex}-${header.plaintext}`;
    switch(header.type){
      case "string":
        return <ResponseDisplayTableStringCell key={key} cellData={cellData} rowData={row}/>
      case "size":
        return <ResponseDisplayTableSizeCell key={key} cellData={cellData} rowData={row}/>
      case "button":
        return <ResponseDisplayTableActionCell callback_id={callback_id} key={key} cellData={cellData} rowData={row}/>
      case "number":
        return <ResponseDisplayTableNumberCell callback_id={callback_id} key={key} cellData={cellData} rowData={row} />
      default:
        return <ResponseDisplayTableStringCell key={key} cellData={cellData} rowData={row}/>
    }
  })
}
export const ResponseDisplayTable = ({table, callback_id, expand, task}) =>{
  const theme = useTheme();
  const rowHeight = GetComputedFontSize() + 7;
  const headerHeight = GetComputedFontSize() + 32;
  const maxHeight = 375;
  const [dataHeight, setDataHeight] = React.useState(maxHeight);
  const [allData, setAllData] = React.useState([]);
  const [sortData, setSortData] = React.useState({sortKey: null, sortType: null, sortDirection: "ASC"})
  const sortedData = React.useMemo(() => {
    if (sortData.sortKey === null || sortData.sortType === null) {
      return allData
    }
    const tmpData = [...allData];
    if(sortData.sortType === "number" || sortData.sortType === "size"){
      tmpData.sort((a, b) => {
        if(a[sortData.sortKey]["plaintext"] === b[sortData.sortKey]["plaintext"]){
          return 0;
        }else if(a[sortData.sortKey]["plaintext"] === undefined || a[sortData.sortKey]["plaintext"] === null){
          return -1;
        }else if(b[sortData.sortKey]["plaintext"] === undefined || b[sortData.sortKey]["plaintext"] === null){
          return 1;
        }else{
          try{
            return parseInt(a[sortData.sortKey]["plaintext"]) > parseInt(b[sortData.sortKey]["plaintext"]) ? 1 : -1;
          }catch(error){
            console.log("failed to parse ints for sorting", a[sortData.sortKey]["plaintext"], b[sortData.sortKey]["plaintext"]);
            return a[sortData.sortKey]["plaintext"] > b[sortData.sortKey]["plaintext"] ? 1: -1;
          }
        }

      });
    }else if(sortData.sortType === "date"){
      tmpData.sort((a,b) => {
        if(a[sortData.sortKey]["plaintext"] ===  b[sortData.sortKey]["plaintext"]){
          return 0;
        }else if(a[sortData.sortKey]["plaintext"] === undefined || a[sortData.sortKey]["plaintext"] === null){
          return -1;
        }else if(b[sortData.sortKey]["plaintext"] === undefined || b[sortData.sortKey]["plaintext"] === null){
          return 1;
        }else{
          try{
            return (new Date(a[sortData.sortKey]["plaintext"])) > (new Date(b[sortData.sortKey]["plaintext"])) ? 1: -1
          }catch(error){
            console.log("failed to parse dates for sorting", a[sortData.sortKey]["plaintext"], b[sortData.sortKey]["plaintext"]);
            return a[sortData.sortKey]["plaintext"] > b[sortData.sortKey]["plaintext"] ? 1: -1;
          }
        }

      });
    }else{
      tmpData.sort( (a, b) => {
        if(a[sortData.sortKey]["plaintext"] === b[sortData.sortKey]["plaintext"]){
          return 0;
        }else if(a[sortData.sortKey]["plaintext"] === undefined || a[sortData.sortKey]["plaintext"] === null){
          return -1;
        }else if(b[sortData.sortKey]["plaintext"] === undefined || b[sortData.sortKey]["plaintext"] === null){
          return 1;
        } else {
          try{
            return a[sortData.sortKey]["plaintext"].localeCompare(b[sortData.sortKey]["plaintext"]);
          }catch(error){
            console.log("failed to localeCompare strings for sorting", a[sortData.sortKey]["plaintext"], b[sortData.sortKey]["plaintext"]);
            return a[sortData.sortKey]["plaintext"] > b[sortData.sortKey]["plaintext"] ? 1: -1;
          }
        }
      });
    }
    if(sortData.sortDirection === "DESC"){
      tmpData.reverse();
    }
    return tmpData;
  }, [allData, sortData]);
  const onClickHeader = (e, columnIndex) => {
    const column = table.headers[columnIndex];

    if(column.disableSort){
        return;
    }
    if (!column.plaintext) {
        setSortData({sortKey: null, sortType: null, sortDirection: "ASC"});
    }
    if (sortData.sortKey === column.plaintext) {
        if (sortData.sortDirection === 'ASC') {
            setSortData({sortKey: column.plaintext, sortType: column.type, sortDirection: "DESC"});
        } else {
            setSortData({sortKey: column.plaintext, sortType: column.type, sortDirection: "ASC"});
        }
    } else {
        setSortData({sortKey: column.plaintext, sortType: column.type, sortDirection: "ASC"});
    }
  };
  const gridData = React.useMemo(
    () => {
        return sortedData.map((row, rowIndex) => {
          return createRowCells({row, headers: table.headers, callback_id, rowIndex});
        });
    }, [sortedData, table?.headers, callback_id]
  );
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
        name: 'Copy Row as JSON', icon: null,
        click: ({event, columnIndex, rowIndex, data}) => {
            const filteredData = filterOutButtonsFromRowData(data);
            onCopyToClipboard(JSON.stringify(filteredData, null, 2));
        }, type: "item"
    },
    {
      name: 'Copy Row as CSV', icon: null,
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
      },
      type: "item",
  },
  {
    name: 'Copy Row as TSV', icon: null,
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
    },
    type: "item",
},
];
  
  useEffect( () => {
    setAllData([...table.rows]);
    setDataHeight(Math.min(maxHeight, (table.rows.length * rowHeight) + headerHeight));
  }, [table.rows])
  const sortColumn = table.headers.findIndex((column) => column.plaintext === sortData.sortKey);
  const tableStyle = React.useMemo( () => {
    return expand ? {flexGrow: 1,
          minHeight: gridData.length > 0 ? Math.min(maxHeight, dataHeight) : headerHeight,
          width: "99%", position: "relative"} :
        {height: dataHeight, position: "relative"}
  }, [expand, dataHeight, gridData]);
  return (
        <div style={{height: "100%", display: "flex", flexDirection: "column", position: "relative", width: "100%"}}>
            {table?.title && (
                <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}} variant={"elevation"}>
                  <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    {table.title}
                  </Typography>
                </Paper>
            )}

          <div style={tableStyle}>
            <MythicResizableGrid
                  columns={table.headers}
                  sortIndicatorIndex={sortColumn}
                  sortDirection={sortData.sortDirection}
                  items={gridData}
                  widthMeasureKey={"plaintext"}
                  headerNameKey={"plaintext"}
                  onDoubleClickRow={doubleClickRow}
                  rowHeight={rowHeight}
                  onClickHeader={onClickHeader}
                  rowContextMenuOptions={contextMenuOptions}
              />
          </div>
        </div>
    
  )   
}
