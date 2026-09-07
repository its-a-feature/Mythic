import React from 'react';
import Box from '@mui/material/Box';
import {MythicActionButton} from './MythicActionButton';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function MythicDialogBody({children, className, compact = false, ...props}) {
    return (
        <Box
            className={joinClasses("mythic-dialog-body flex flex-column gap-6 min-w-0 w-full", compact && "mythic-dialog-body-compact gap-4", className)}
            {...props}
        >
            {children}
        </Box>
    );
}

export function MythicDialogSection({title, description, actions, children, className, ...props}) {
    return (
        <Box component="section" className={joinClasses("mythic-dialog-section bg-surface-muted border-subtle min-w-0 rounded", className)} {...props}>
            {(title || description || actions) &&
                <Box className="mythic-dialog-section-header items-start flex gap-6 justify-between min-w-0">
                    <Box sx={{minWidth: 0}}>
                        {title &&
                            <Typography component="h3" className="mythic-dialog-section-title text-sm font-700 leading-125 text-primary">
                                {title}
                            </Typography>
                        }
                        {description &&
                            <Typography component="div" className="mythic-dialog-section-description">
                                {description}
                            </Typography>
                        }
                    </Box>
                    {actions &&
                        <Box className="mythic-dialog-section-actions items-center flex flex-none gap-3">
                            {actions}
                        </Box>
                    }
                </Box>
            }
            {children}
        </Box>
    );
}

export function MythicDialogGrid({children, className, minWidth = "16rem", sx = {}, ...props}) {
    return (
        <Box
            className={joinClasses("mythic-dialog-grid items-logical-start gap-5 min-w-0 w-full grid", className)}
            sx={{"--mythic-dialog-grid-min": minWidth, ...sx}}
            {...props}
        >
            {children}
        </Box>
    );
}

export function MythicDialogChoiceRow({children, className, ...props}) {
    return (
        <Box className={joinClasses("mythic-dialog-choice-row items-center gap-4 w-full grid", className)} {...props}>
            {children}
        </Box>
    );
}

export function MythicDialogChoiceDivider({children = "OR", className, ...props}) {
    return (
        <Box component="span" className={joinClasses("mythic-dialog-choice-divider text-xs font-700 text-muted text-center", className)} {...props}>
            {children}
        </Box>
    );
}

export function MythicDialogFooter({children, className, ...props}) {
    return (
        <DialogActions className={className} {...props}>
            {children}
        </DialogActions>
    );
}

export function MythicDialogButton({children, className, intent = "secondary", ...props}) {
    const tone = intent === "destructive" ? "error" : intent;
    return (
        <MythicActionButton
            className={joinClasses("mythic-dialog-button", className)}
            colorMode="always"
            size="small"
            tone={tone}
            variant="contained"
            {...props}
        >
            {children}
        </MythicActionButton>
    );
}

export function MythicForm({children, className, ...props}) {
    return (
        <Box component="form" className={joinClasses("mythic-form flex flex-column gap-6 min-w-0 w-full", className)} {...props}>
            {children}
        </Box>
    );
}

export function MythicFormGrid({children, className, minWidth = "16rem", sx = {}, ...props}) {
    return (
        <Box
            className={joinClasses("mythic-form-grid items-logical-start gap-6 min-w-0 w-full grid", className)}
            sx={{"--mythic-form-grid-min": minWidth, ...sx}}
            {...props}
        >
            {children}
        </Box>
    );
}

export function MythicFormField({children, className, description, label, required = false, ...props}) {
    return (
        <Box className={joinClasses("mythic-form-field flex flex-column gap-3 min-w-0", className)} {...props}>
            {(label || description) &&
                <Box className="mythic-form-field-copy min-w-0">
                    {label &&
                        <Typography component="label" className="mythic-form-field-label text-xs font-750 leading-125 text-primary">
                            {label}{required && <Box component="span" className="mythic-form-field-required"> *</Box>}
                        </Typography>
                    }
                    {description &&
                        <Typography component="div" className="mythic-form-field-description">
                            {description}
                        </Typography>
                    }
                </Box>
            }
            <Box className="mythic-form-field-control min-w-0 w-full">
                {children}
            </Box>
        </Box>
    );
}

export function MythicFormNote({children, className, ...props}) {
    return (
        <Box className={joinClasses("mythic-form-note text-xs leading-140 rounded bg-neutral-1 border-subtle text-muted", className)} {...props}>
            {children}
        </Box>
    );
}

export function MythicFormSwitchRow({control, label, description, className, ...props}) {
    return (
        <Box className={joinClasses("mythic-form-switch-row py-5 px-6 items-center flex gap-6 justify-between min-w-0 w-full rounded bg-surface border-subtle", className)} {...props}>
            <Box sx={{minWidth: 0}}>
                <Typography component="div" className="mythic-form-field-label text-xs font-750 leading-125 text-primary">
                    {label}
                </Typography>
                {description &&
                    <Typography component="div" className="mythic-form-field-description">
                        {description}
                    </Typography>
                }
            </Box>
            <Box className="mythic-form-switch-control flex-none">
                {control}
            </Box>
        </Box>
    );
}
