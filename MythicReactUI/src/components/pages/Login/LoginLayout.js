import React from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import {alpha, styled} from '@mui/material/styles';
import logo from '../../../assets/mythic-red.png';

const AuthPageRoot = styled('main')(({theme}) => ({
    alignItems: "center",
    backgroundColor: theme.surfaces?.app || theme.palette.background.default,
    backgroundImage: `linear-gradient(180deg, ${alpha(theme.pageHeader?.main || theme.palette.background.paper, theme.palette.mode === "dark" ? 0.34 : 0.62)} 0%, ${alpha(theme.palette.background.default, 0)} 34%)`,
    color: theme.palette.text.primary,
    display: "flex",
    minHeight: "100%",
    minWidth: 0,
    overflow: "auto",
    padding: "1rem",
    width: "100%",
    [theme.breakpoints.down("sm")]: {
        alignItems: "flex-start",
        padding: "0.75rem",
    },
}));

const AuthShell = styled('div')({
    margin: "0 auto",
    maxWidth: "28rem",
    minWidth: 0,
    width: "100%",
});

const FormPanel = styled(Paper)(({theme}) => ({
    backgroundColor: theme.surfaces?.raised || theme.palette.background.paper,
    backgroundImage: theme.gradients?.subtleAccent,
    border: `1px solid ${theme.table?.borderSoft || theme.borderColor}`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.035)" : "0 8px 18px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
}));

const LogoStage = styled('div')(({theme}) => {
    const stageSurface = theme.pageHeader?.main || theme.surfaces?.muted || theme.palette.background.paper;
    const stageTextColor = theme.pageHeaderText?.main || theme.palette.text.primary;
    const sectionAccentColor = theme.sectionHeader?.accent || theme.palette.primary.main;
    return {
        alignItems: "center",
        backgroundColor: stageSurface,
        backgroundImage: `linear-gradient(180deg, ${alpha(sectionAccentColor, theme.palette.mode === "dark" ? 0.12 : 0.08)} 0%, ${alpha(stageSurface, 0)} 100%)`,
        borderBottom: `1px solid ${theme.table?.borderSoft || theme.borderColor}`,
        boxShadow: `inset 0 1px 0 ${alpha(stageTextColor, 0.12)}`,
        display: "flex",
        justifyContent: "center",
        overflow: "hidden",
        padding: "1.35rem 1.25rem 1.1rem",
        position: "relative",
        "&::after": {
            background: `linear-gradient(90deg, ${alpha(sectionAccentColor, 0)} 0%, ${alpha(sectionAccentColor, theme.palette.mode === "dark" ? 0.58 : 0.42)} 50%, ${alpha(sectionAccentColor, 0)} 100%)`,
            bottom: 0,
            content: '""',
            height: 1,
            left: "18%",
            position: "absolute",
            right: "18%",
        },
        "& img": {
            display: "block",
            height: "auto",
            maxHeight: "12.5rem",
            maxWidth: "min(72%, 13rem)",
            objectFit: "contain",
            width: "100%",
        },
        [theme.breakpoints.down("sm")]: {
            padding: "1.05rem 1rem 0.95rem",
            "& img": {
                maxWidth: "min(68%, 10.5rem)",
            },
        },
    };
});

const FormBody = styled('div')(({theme}) => ({
    display: "flex",
    flex: "1 1 auto",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: 0,
    minWidth: 0,
    padding: "1rem 1.1rem 1.1rem",
    [theme.breakpoints.down("sm")]: {
        justifyContent: "flex-start",
        padding: "0.9rem",
    },
}));

export const AuthFormStack = styled(Stack)(({theme}) => ({
    gap: "0.65rem",
    width: "100%",
    "& .MuiButton-root": {
        minHeight: 36,
    },
    "& .MuiDivider-root": {
        borderColor: theme.table?.borderSoft || theme.borderColor,
        color: theme.palette.text.secondary,
        fontSize: "0.72rem",
        fontWeight: 750,
        letterSpacing: 0,
    },
}));

export const AuthMethodNote = styled('div')(({theme}) => ({
    alignItems: "center",
    backgroundColor: alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.13 : 0.07),
    border: `1px solid ${alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.38 : 0.24)}`,
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.text.secondary,
    display: "flex",
    fontSize: "0.78rem",
    fontWeight: 650,
    gap: "0.45rem",
    lineHeight: 1.35,
    padding: "0.55rem 0.65rem",
}));

export const AuthMenuPaper = styled(Paper)(({theme}) => ({
    backgroundColor: theme.surfaces?.raised || theme.palette.background.paper,
    border: `1px solid ${theme.table?.borderSoft || theme.borderColor}`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.palette.mode === "dark" ? "0 18px 48px rgba(0, 0, 0, 0.4)" : "0 18px 48px rgba(15, 23, 42, 0.12)",
    color: theme.palette.text.primary,
    marginTop: "0.35rem",
    minWidth: "17rem",
    overflow: "hidden",
}));

export function LoginLayout({children, footer}) {
    return (
        <AuthPageRoot>
            <AuthShell>
                <FormPanel elevation={0}>
                    <LogoStage>
                        <img src={logo} alt="Mythic logo" />
                    </LogoStage>
                    <FormBody>
                        {children}
                    </FormBody>
                    {footer}
                </FormPanel>
            </AuthShell>
        </AuthPageRoot>
    );
}
