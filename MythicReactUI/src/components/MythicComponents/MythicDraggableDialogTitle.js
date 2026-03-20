import DialogTitle from '@mui/material/DialogTitle';


export const MythicDraggableDialogTitle = ({children}) => {
    return (
        <DialogTitle id="mythic-draggable-title" style={{ cursor: 'move', width: "100%" }}>
            {children}
        </DialogTitle>
    )
}