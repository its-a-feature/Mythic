import {useTheme} from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import {Typography} from "@mui/material";

export const MythicPageHeader = ({children, title, style={}, headerVariant="h5"}) => {
    const theme = useTheme();
    return (
        <Paper elevation={2}
               variant={"elevation"}
               style={{
                   backgroundColor: theme.pageHeader.main,
                   color: theme.pageHeaderText.main,
                   border: `1px solid ${theme.borderColor}`,
                   alignItems: "center",
                   display: "flex",
                   justifyContent: "space-between",
                   marginBottom: "0.5rem",
                   padding: "0.5rem",
                   borderRadius: "5px",
                   ...style
        }}
        >
            <Typography variant={headerVariant} style={{textAlign: "left", display: "inline-block", marginLeft: "1rem", width: "100%"}}>
                {title}
            </Typography>
            <div style={{display: "flex", marginRight: "1rem", alignItems: "center"}}>
                {children}
            </div>
        </Paper>
    )

}