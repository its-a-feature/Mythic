import {useTheme} from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import {Typography} from "@mui/material";

export const MythicPageHeader = ({children, title, style={}, headerVariant="h6"}) => {
    const theme = useTheme();
    const headerTextColor = theme.palette.getContrastText(theme.pageHeader.main);
    return (
        <Paper elevation={0}
               style={{
                   backgroundColor: theme.pageHeader.main,
                   color: headerTextColor,
                   border: `1px solid ${theme.borderColor}`,
                   alignItems: "center",
                   display: "flex",
                   justifyContent: "space-between",
                   gap: "0.75rem",
                   minHeight: "44px",
                   marginBottom: "0rem",
                   padding: "0.5rem 0.75rem",
                   borderRadius: theme.shape.borderRadius,
                   ...style
        }}
        >
            <Typography variant={headerVariant} style={{
                textAlign: "left",
                display: "inline-block",
                marginLeft: "0.25rem",
                width: "100%",
                fontWeight: 650,
                letterSpacing: 0,
                color: headerTextColor,
            }}>
                {title}
            </Typography>
            <div style={{display: "flex", marginRight: "0.25rem", alignItems: "center", gap: "0.35rem", color: headerTextColor}}>
                {children}
            </div>
        </Paper>
    )

}
