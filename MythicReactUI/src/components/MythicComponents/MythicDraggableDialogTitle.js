import DialogTitle from '@mui/material/DialogTitle';
import {useTheme} from '@mui/material/styles';


export const MythicDraggableDialogTitle = ({children}) => {
    const theme = useTheme();
    return (
        <DialogTitle id="mythic-draggable-title" style={{
            cursor: 'move',
            width: "100%",
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
        }}>
            {children}
        </DialogTitle>
    )
}
