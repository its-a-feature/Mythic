import React, {useEffect} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { toLocalTime } from '../utilities/Time';
import AceEditor from 'react-ace';
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-searchbox";
import {useTheme} from '@mui/material/styles';
import WrapTextIcon from '@mui/icons-material/WrapText';
import {IconButton} from '@mui/material';
import {MythicStyledTooltip} from "./MythicStyledTooltip";
import Draggable from 'react-draggable';
import {MythicDraggableDialogTitle} from "./MythicDraggableDialogTitle";
import {MythicDialogButton, MythicDialogFooter} from "./MythicDialogLayout";

let mythicDialogIdCounter = 0;
let mythicDialogStack = [];

const MythicDraggableDialogPaper = React.forwardRef(function MythicDraggableDialogPaper(props, ref) {
    const {
        draggableCancel,
        draggableHandle,
        draggableOnStart,
        draggableOnStop,
        ...paperProps
    } = props;
    const nodeRef = React.useRef(null);
    const setPaperRef = React.useCallback((node) => {
        nodeRef.current = node;
        if(typeof ref === "function"){
            ref(node);
        } else if(ref){
            ref.current = node;
        }
    }, [ref]);
    const onStart = React.useCallback((event, data) => {
        return draggableOnStart?.(event, data, nodeRef.current);
    }, [draggableOnStart]);
    return (
        <Draggable
            nodeRef={nodeRef}
            handle={draggableHandle}
            cancel={draggableCancel}
            onStart={onStart}
            onStop={draggableOnStop}
        >
            <Paper {...paperProps} ref={setPaperRef} />
        </Draggable>
    );
});

export function MythicDialog(props) {
    const theme = useTheme();
    const dialogIdRef = React.useRef(null);
    if(dialogIdRef.current === null){
        dialogIdRef.current = mythicDialogIdCounter++;
    }
    const [draggedState, setDraggedState] = React.useState({
        style: {},
        paperStyle: {
            margin: "0",
            height: "fit-content",
            width: "stretch"
        },
        containerStyle: {

        },
        hideBackdrop: false,
        modified: false
    });
    const descriptionElementRef = React.useRef(null);
    React.useEffect(() => {
        if(!props.open){
            return undefined;
        }
        mythicDialogStack = mythicDialogStack.filter((id) => id !== dialogIdRef.current);
        mythicDialogStack.push(dialogIdRef.current);
        return () => {
            mythicDialogStack = mythicDialogStack.filter((id) => id !== dialogIdRef.current);
        };
    }, [props.open]);
    const isTopDialog = () => {
        return mythicDialogStack[mythicDialogStack.length - 1] === dialogIdRef.current;
    };
    React.useEffect(() => {
    if (props.open) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [props.open]);
    const dialogOnClick = (e) => {
        if(e.target.classList?.contains("MuiDialog-container")){
            e.stopPropagation();
            if(!isTopDialog()){
                return;
            }
            if(draggedState.hideBackdrop){
                props.onClose?.();
            }
        }
    }
    const dialogOnContextMenu = (e) => {
        e.stopPropagation();
    }
    const handleOnClose = (event, reason) => {
        if(reason === "backdropClick" || reason === "escapeKeyDown"){
            event?.stopPropagation?.();
            if(!isTopDialog()){
                return;
            }
        }
        if(reason === "backdropClick" && draggedState.hideBackdrop){
            return;
        }
        props.onClose?.();
    }
    const onStart = React.useCallback((e, _data, paperNode) => {
        if(e){
            e.stopPropagation();
            e.preventDefault();
        }
        setDraggedState((currentState) => {
            if(currentState.modified){
                return currentState;
            }
            const dragTarget = paperNode || e?.target?.closest?.(".MuiPaper-root") || e?.target?.offsetParent;
            const targetWidth = dragTarget?.offsetWidth || e?.target?.offsetParent?.offsetWidth || 0;
            return {
                style: {},
                paperStyle: {
                    ...(targetWidth > 0 ? {width: targetWidth + "px"} : {}),
                    margin: 0,
                    overflowY: "auto",
                },
                containerStyle: {
                    overflow: "visible",
                },
                hideBackdrop: true,
                modified: true,
            };
        });
    }, []);
    const onStop = React.useCallback((e) => {
        if(e){
            e.stopPropagation();
            e.preventDefault();
        }
    }, []);
  return (
          <Dialog
            open={props.open}
            onClose={handleOnClose}
            scroll="paper"
            maxWidth={props.maxWidth}
            fullWidth={true}
            PaperComponent={MythicDraggableDialogPaper}
            PaperProps={{
                draggableHandle: "#mythic-draggable-title",
                draggableCancel: '[class*="MuiDialogContent-root"]',
                draggableOnStart: onStart,
                draggableOnStop: onStop,
            }}
            style={{...props.style, ...draggedState.style}}
            disableEnforceFocus={true}
            disablePortal={false}
            hideBackdrop={draggedState.hideBackdrop}
            aria-labelledby="scroll-dialog-title"
            aria-describedby="scroll-dialog-description"
            sx={{
                ".MuiPaper-root": {
                    borderRadius: "8px",
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.borderColor}`,
                    ...draggedState.paperStyle
                },
                ".MuiDialog-container": {
                    ...draggedState.containerStyle
                }
            }}
            onMouseDown={dialogOnClick}
            onContextMenu={dialogOnContextMenu}
          >
            {props.innerDialog}
          </Dialog>
  );
}

export function MythicModifyStringDialog(props) {
  const [comment, setComment] = React.useState("");
  const [wrap, setWrap] = React.useState(props.wrap ? props.wrap : false);
  const theme = useTheme();
    const onCommitSubmit = () => {
        props.onSubmit(comment);
        if(props.dontCloseOnSubmit){
            return;
        }
        props.onClose();
    }
    const onChange = (value) => {
        setComment(value);
    }
    useEffect( () => {
        try{
            setComment(JSON.stringify(JSON.parse(props.value), null, 2));
        }catch(error){
            setComment(props.value);
        }

    }, [props.value]);
  return (
    <React.Fragment>
        {props.title !== "" &&
            <MythicDraggableDialogTitle>{props.title}
                <MythicStyledTooltip title={wrap ? "Toggle off word wrap" : "Toggl on word wrap"}
                tooltipStyle={{float: "right"}}>
                    <IconButton onClick={() => {setWrap(!wrap)}}>
                        <WrapTextIcon color={wrap ? "success" : "secondary"} />
                    </IconButton>
                </MythicStyledTooltip>
            </MythicDraggableDialogTitle>
        }
        <DialogContent dividers={true} style={{ margin: 0, padding: 0}}>
            <AceEditor
                mode="json"
                theme={theme.palette.mode === 'dark' ? 'monokai' : 'github'}
                width="100%"
                fontSize={14}
                showPrintMargin={false}
                wrapEnabled={wrap}
                value={comment}
                focus={true}
                onChange={onChange}
                setOptions={{
                    tabSize: 4,
                    useWorker: false,
                    showInvisibles: false,
                }}
            />
        </DialogContent>
        { (props.onClose || props.onSubmit) &&
            <MythicDialogFooter>
                {props.onClose &&
                    <MythicDialogButton onClick={props.onClose}>
                        Close
                    </MythicDialogButton>
                }
                {props.onSubmit &&
                    <MythicDialogButton intent="primary" onClick={onCommitSubmit}>
                        {props.onSubmitText ? props.onSubmitText : "Submit"}
                    </MythicDialogButton>
                }
            </MythicDialogFooter>
        }
    </React.Fragment>
  );
}

const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const parseJSONDialogValue = (value) => {
  if(value === undefined || value === null){
    return value;
  }
  if(typeof value !== "string"){
    return value;
  }
  try{
    return JSON.parse(value);
  }catch(error){
    return value;
  }
}

const getJSONValueType = (value) => {
  if(value === null){return "null"}
  if(value === undefined){return "empty"}
  if(Array.isArray(value)){return "array"}
  if(isPlainObject(value)){return "object"}
  return typeof value;
}

const getJSONValueCount = (value) => {
  if(Array.isArray(value)){return value.length}
  if(isPlainObject(value)){return Object.keys(value).length}
  if(value === undefined || value === null || value === ""){return 0}
  return 1;
}

const getArrayObjectHeaders = (rows) => {
  const headers = [];
  rows.forEach((row) => {
    if(!isPlainObject(row)){return}
    Object.keys(row).forEach((key) => {
      if(!headers.includes(key)){
        headers.push(key);
      }
    });
  });
  return headers;
}

const JSONTypeBadge = ({value}) => {
  const type = getJSONValueType(value);
  const count = getJSONValueCount(value);
  const label = type === "array" ? `${count} item${count === 1 ? "" : "s"}` :
      type === "object" ? `${count} field${count === 1 ? "" : "s"}` :
      type;
  return <span className={`mythic-json-type-badge mythic-json-type-${type}`}>{label}</span>
}

const JSONPrimitiveValue = ({name, value, me}) => {
  const type = getJSONValueType(value);
  if(type === "null" || type === "empty" || value === ""){
    return <span className="mythic-json-value-empty">None</span>
  }
  if(type === "boolean"){
    return <span className={`mythic-json-value-boolean ${value ? "mythic-json-value-true" : "mythic-json-value-false"}`}>{value ? "True" : "False"}</span>
  }
  return <span className="mythic-json-value-primitive">{convertValueToContextValue(name, value, me)}</span>
}

const JSONTableCellValue = ({name, value, me, depth}) => {
  if(Array.isArray(value) || isPlainObject(value)){
    return (
      <JSONTableValue
        label={name}
        value={value}
        me={me}
        depth={depth + 1}
      />
    );
  }
  return <JSONPrimitiveValue name={name} value={value} me={me} />;
}

const JSONTableValue = ({label, value, me, depth=0, leftColumn="Name", rightColumn="Value"}) => {
  const type = getJSONValueType(value);
  const showPanelHeader = Boolean(label) && depth === 0;
  if(type !== "array" && type !== "object"){
    return <JSONPrimitiveValue name={label || ""} value={value} me={me} />;
  }
  if(type === "object"){
    const entries = Object.entries(value);
    return (
      <div className={`mythic-json-panel ${depth === 0 ? "mythic-json-panel-root" : ""}`}>
        {showPanelHeader &&
          <div className="mythic-json-panel-header">
            <span className="mythic-json-panel-title">{label}</span>
            <JSONTypeBadge value={value} />
          </div>
        }
        {entries.length === 0 ? (
          <div className="mythic-json-empty-state">No fields to display.</div>
        ) : (
          <TableContainer className="mythicElement mythic-json-table-wrap">
            <Table size="small" stickyHeader={depth === 0} style={{tableLayout: "fixed"}}>
              <TableHead>
                <TableRow>
                  <TableCell style={{width: depth === 0 ? "14rem" : "12rem"}}>{leftColumn}</TableCell>
                  <TableCell>{rightColumn}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map(([key, entryValue]) => (
                  <TableRow key={`${depth}-${key}`} hover>
                    <TableCell className="mythic-json-key-cell">
                      <div className="mythic-json-key-stack">
                        <span className="mythic-json-key">{key}</span>
                        <JSONTypeBadge value={entryValue} />
                      </div>
                    </TableCell>
                    <TableCell className="mythic-json-value-cell">
                      <JSONTableCellValue name={key} value={entryValue} me={me} depth={depth} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>
    );
  }
  const objectHeaders = getArrayObjectHeaders(value);
  const isObjectArray = value.length > 0 && objectHeaders.length > 0 && value.every((row) => isPlainObject(row));
  return (
    <div className={`mythic-json-panel ${depth === 0 ? "mythic-json-panel-root" : ""}`}>
      {showPanelHeader &&
        <div className="mythic-json-panel-header">
          <span className="mythic-json-panel-title">{label}</span>
          <JSONTypeBadge value={value} />
        </div>
      }
      {value.length === 0 ? (
        <div className="mythic-json-empty-state">No items to display.</div>
      ) : isObjectArray ? (
        <TableContainer className="mythicElement mythic-json-table-wrap">
          <Table size="small" stickyHeader={depth === 0} style={{tableLayout: "fixed", minWidth: `${Math.max(38, objectHeaders.length * 12)}rem`}}>
            <TableHead>
              <TableRow>
                <TableCell style={{width: "4rem"}}>#</TableCell>
                {objectHeaders.map((header) => (
                  <TableCell key={`array-header-${header}`} style={{width: "12rem"}}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {value.map((row, rowIndex) => (
                <TableRow key={`array-row-${rowIndex}`} hover>
                  <TableCell className="mythic-json-index-cell">{rowIndex + 1}</TableCell>
                  {objectHeaders.map((header) => (
                    <TableCell key={`array-row-${rowIndex}-${header}`} className="mythic-json-value-cell">
                      <JSONTableCellValue name={header} value={row[header]} me={me} depth={depth} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer className="mythicElement mythic-json-table-wrap">
          <Table size="small" stickyHeader={depth === 0} style={{tableLayout: "fixed"}}>
            <TableHead>
              <TableRow>
                <TableCell style={{width: "4rem"}}>#</TableCell>
                <TableCell>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {value.map((entryValue, rowIndex) => (
                <TableRow key={`array-value-row-${rowIndex}`} hover>
                  <TableCell className="mythic-json-index-cell">{rowIndex + 1}</TableCell>
                  <TableCell className="mythic-json-value-cell">
                    <JSONTableCellValue name={`${label || "value"} ${rowIndex + 1}`} value={entryValue} me={me} depth={depth} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

export function MythicViewJSONAsTableDialog(props) {
  const parsedValue = React.useMemo(() => parseJSONDialogValue(props.value), [props.value]);
  const rootLabel = props.title || "JSON Data";
  return (
    <React.Fragment>
        <MythicDraggableDialogTitle style={{wordBreak: "break-all", maxWidth: "100%"}}>
          <div className="mythic-json-title-row">
            <span>{rootLabel}</span>
            <JSONTypeBadge value={parsedValue} />
          </div>
        </MythicDraggableDialogTitle>
        <DialogContent dividers={true} className="mythic-dialog-body mythic-json-dialog-body">
          <JSONTableValue
            value={parsedValue}
            me={props.me}
            leftColumn={props.leftColumn || "Name"}
            rightColumn={props.rightColumn || "Value"}
          />
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
    </React.Fragment>
  );
}

export function MythicViewObjectPropertiesAsTableDialog(props) {
  const [comment, setComment] = React.useState([]);
    useEffect( () => {
        const permissions = props.keys.reduce( (prev, key) => {
          if(props.value[key] !== undefined && props.value[key] !== null && props.value[key] !== ""){
            return [...prev, {"name": key, "value": props.value[key]}]
          }
          else{
            return [...prev];
          }
        }, []);

      setComment(permissions);
    }, [props.value, props.keys]);
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
        <DialogContent dividers={true}>
        <Paper elevation={5} style={{position: "relative"}} variant={"elevation"}>
          <TableContainer component={Paper} className="mythicElement">
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                  <TableHead>
                      <TableRow>
                          <TableCell>{props.leftColumn}</TableCell>
                          <TableCell>{props.rightColumn}</TableCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                    {comment.map( (element, index) => (
                      <TableRow key={'row' + index}>
                        <TableCell style={{wordBreak: "break-all"}}>{element.name}</TableCell>
                        <TableCell style={{wordBreak: "break-all"}}>{convertValueToContextValue(element.name, element.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
              </Table>
            </TableContainer>
        </Paper>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
    </React.Fragment>
  );
}
const convertValueToContextValue = (key, value, me) => {
  const keyText = String(key || "").toLowerCase();
  if(value === undefined || value === null){
      return "";
  }
  if( keyText.includes("time") ){
    try{
        return TableRowDateCell({cellData: value, view_utc_time: me?.user?.view_utc_time})
    }catch(error){
        console.log("failed to parse metadata as date", key, value);
        return value;
    }
  } else if( keyText.includes("size") ){
      try{
          return TableRowSizeCell({cellData: value})
      }catch(error){
          console.log("failed to parse metadata as size", key, value);
          return value;
      }
  } else if (isPlainObject(value)) {
    return JSON.stringify(value, null, 2);
  } else if (Array.isArray(value)){
    return JSON.stringify(value, null, 2);
  } else if (value === true) {
    return "True";
  } else if (value === false) {
    return "False";
  } else {
      return value;
  }
}
export const TableRowDateCell = ({ cellData, rowData, view_utc_time=true }) => {

    try{
        let cellDataInt = parseInt(cellData)
        if(cellData === "" || cellData === undefined || cellDataInt <= 0){
            return "";
        }
        let view_utc = true;
        if(view_utc_time !== undefined){
            view_utc = view_utc_time
        }
        // handle Unix epoch timestamps
        if (view_utc) {
            let init_date = new Date(cellDataInt);
            return init_date.toDateString() + " " + init_date.toTimeString().substring(0, 8) + " UTC";
        } else {
            let timezoneDate = new Date(cellDataInt);
            timezoneDate.setTime(timezoneDate.getTime() - (timezoneDate.getTimezoneOffset() *60*1000));
            return timezoneDate.toLocaleDateString() + " " + timezoneDate.toLocaleString([], {hour12: true, hour: "2-digit", minute: "2-digit"});
        }
        //const dateData = new Date(cellDataInt).toISOString();
        //return toLocalTime(dateData.slice(0, 10) + " " + dateData.slice(11,-1), view_utc_time);
    }catch(error){
        try{
            let cellDataInt = parseInt(cellData)
            // handle windows FILETIME values
            const dateData = new Date( ((cellDataInt / 10000000) - 11644473600) * 1000).toISOString();
            return toLocalTime(dateData.slice(0, 10) + " " + dateData.slice(11,-1), view_utc_time);
        }catch(error2){
            console.log("error with timestamp: ", cellData);
            return String(cellData);
        }

    }
  
};
export const TableRowSizeCell = ({ cellData, rowData }) => {
  const getStringSize = () => {
      try {
          // process for getting human readable string from bytes: https://stackoverflow.com/a/18650828
          let bytes = parseInt(cellData);
          if (cellData === '' || cellData === undefined) return '';
          if (bytes === 0) return '0 B';
          const decimals = 2;
          const k = 1024;
          const dm = decimals < 0 ? 0 : decimals;
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

          const i = Math.floor(Math.log(bytes) / Math.log(k));

          return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
      } catch (error) {
          return cellData;
      }
  };
  return getStringSize(cellData);
};
