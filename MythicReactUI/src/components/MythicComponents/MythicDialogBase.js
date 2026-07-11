import React from "react";
import Dialog from "@mui/material/Dialog";
import Paper from "@mui/material/Paper";
import Draggable from "react-draggable";
import {useTheme} from "@mui/material/styles";

let mythicDialogIdCounter = 0;
let mythicDialogStack = [];

const MythicDraggableDialogPaper = React.forwardRef(function MythicDraggableDialogPaper(props, ref) {
  const {draggableCancel, draggableHandle, draggableOnStart, draggableOnStop, ...paperProps} = props;
  const nodeRef = React.useRef(null);
  const setPaperRef = React.useCallback((node) => {
    nodeRef.current = node;
    if(typeof ref === "function"){
      ref(node);
    }else if(ref){
      ref.current = node;
    }
  }, [ref]);
  const onStart = React.useCallback((event, data) => {
    return draggableOnStart?.(event, data, nodeRef.current);
  }, [draggableOnStart]);
  return (
    <Draggable nodeRef={nodeRef} handle={draggableHandle} cancel={draggableCancel}
               onStart={onStart} onStop={draggableOnStop}>
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
    paperStyle: {margin: "0", height: "fit-content", width: "stretch"},
    containerStyle: {},
    hideBackdrop: false,
    modified: false,
  });
  const descriptionElementRef = React.useRef(null);
  React.useEffect(() => {
    if(!props.open){return undefined;}
    mythicDialogStack = mythicDialogStack.filter((id) => id !== dialogIdRef.current);
    mythicDialogStack.push(dialogIdRef.current);
    return () => {
      mythicDialogStack = mythicDialogStack.filter((id) => id !== dialogIdRef.current);
    };
  }, [props.open]);
  const isTopDialog = () => mythicDialogStack[mythicDialogStack.length - 1] === dialogIdRef.current;
  React.useEffect(() => {
    if(props.open && descriptionElementRef.current !== null){
      descriptionElementRef.current.focus();
    }
  }, [props.open]);
  const dialogOnClick = (event) => {
    if(event.target.classList?.contains("MuiDialog-container")){
      event.stopPropagation();
      if(isTopDialog() && draggedState.hideBackdrop){
        props.onClose?.();
      }
    }
  };
  const handleOnClose = (event, reason) => {
    if(reason === "backdropClick" || reason === "escapeKeyDown"){
      event?.stopPropagation?.();
      if(!isTopDialog()){return;}
    }
    if(reason === "backdropClick" && draggedState.hideBackdrop){return;}
    props.onClose?.();
  };
  const onStart = React.useCallback((event, _data, paperNode) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setDraggedState((currentState) => {
      if(currentState.modified){return currentState;}
      const dragTarget = paperNode || event?.target?.closest?.(".MuiPaper-root") || event?.target?.offsetParent;
      const targetWidth = dragTarget?.offsetWidth || event?.target?.offsetParent?.offsetWidth || 0;
      return {
        style: {},
        paperStyle: {...(targetWidth > 0 ? {width: `${targetWidth}px`} : {}), margin: 0, overflowY: "auto"},
        containerStyle: {overflow: "visible"},
        hideBackdrop: true,
        modified: true,
      };
    });
  }, []);
  const onStop = React.useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
  }, []);
  return (
    <Dialog open={props.open} onClose={handleOnClose} scroll="paper" maxWidth={props.maxWidth} fullWidth={true}
            PaperComponent={MythicDraggableDialogPaper}
            PaperProps={{draggableHandle: "#mythic-draggable-title", draggableCancel: '[class*="MuiDialogContent-root"]', draggableOnStart: onStart, draggableOnStop: onStop}}
            style={{...props.style, ...draggedState.style}} disableEnforceFocus={true} disablePortal={false}
            hideBackdrop={draggedState.hideBackdrop} aria-labelledby="scroll-dialog-title"
            aria-describedby="scroll-dialog-description"
            sx={{
              ".MuiPaper-root": {borderRadius: "8px", backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.borderColor}`, ...draggedState.paperStyle},
              ".MuiDialog-container": {...draggedState.containerStyle},
            }}
            onMouseDown={dialogOnClick} onContextMenu={(event) => event.stopPropagation()}>
      {props.innerDialog}
    </Dialog>
  );
}
