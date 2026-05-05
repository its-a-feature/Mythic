import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function MythicDialogBody({children, className, compact = false, ...props}) {
    return (
        <Box
            className={joinClasses("mythic-dialog-body", compact && "mythic-dialog-body-compact", className)}
            {...props}
        >
            {children}
        </Box>
    );
}

export function MythicDialogSection({title, description, actions, children, className, ...props}) {
    return (
        <Box component="section" className={joinClasses("mythic-dialog-section", className)} {...props}>
            {(title || description || actions) &&
                <Box className="mythic-dialog-section-header">
                    <Box sx={{minWidth: 0}}>
                        {title &&
                            <Typography component="h3" className="mythic-dialog-section-title">
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
                        <Box className="mythic-dialog-section-actions">
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
            className={joinClasses("mythic-dialog-grid", className)}
            sx={{"--mythic-dialog-grid-min": minWidth, ...sx}}
            {...props}
        >
            {children}
        </Box>
    );
}

export function MythicDialogChoiceRow({children, className, ...props}) {
    return (
        <Box className={joinClasses("mythic-dialog-choice-row", className)} {...props}>
            {children}
        </Box>
    );
}

export function MythicDialogChoiceDivider({children = "OR", className, ...props}) {
    return (
        <Box component="span" className={joinClasses("mythic-dialog-choice-divider", className)} {...props}>
            {children}
        </Box>
    );
}

export function MythicDialogFooter({children, className, ...props}) {
    return (
        <DialogActions className={joinClasses("mythic-dialog-actions", className)} {...props}>
            {children}
        </DialogActions>
    );
}

export function MythicDialogButton({children, className, intent = "secondary", ...props}) {
    return (
        <Button
            className={joinClasses("mythic-dialog-button", `mythic-dialog-button-${intent}`, className)}
            size="small"
            variant="contained"
            {...props}
        >
            {children}
        </Button>
    );
}

export function MythicForm({children, className, ...props}) {
    return (
        <Box component="form" className={joinClasses("mythic-form", className)} {...props}>
            {children}
        </Box>
    );
}

export function MythicFormGrid({children, className, minWidth = "16rem", sx = {}, ...props}) {
    return (
        <Box
            className={joinClasses("mythic-form-grid", className)}
            sx={{"--mythic-form-grid-min": minWidth, ...sx}}
            {...props}
        >
            {children}
        </Box>
    );
}

export function MythicFormField({children, className, description, label, required = false, ...props}) {
    return (
        <Box className={joinClasses("mythic-form-field", className)} {...props}>
            {(label || description) &&
                <Box className="mythic-form-field-copy">
                    {label &&
                        <Typography component="label" className="mythic-form-field-label">
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
            <Box className="mythic-form-field-control">
                {children}
            </Box>
        </Box>
    );
}

export function MythicFormNote({children, className, ...props}) {
    return (
        <Box className={joinClasses("mythic-form-note", className)} {...props}>
            {children}
        </Box>
    );
}

export function MythicFormSwitchRow({control, label, description, className, ...props}) {
    return (
        <Box className={joinClasses("mythic-form-switch-row", className)} {...props}>
            <Box sx={{minWidth: 0}}>
                <Typography component="div" className="mythic-form-field-label">
                    {label}
                </Typography>
                {description &&
                    <Typography component="div" className="mythic-form-field-description">
                        {description}
                    </Typography>
                }
            </Box>
            <Box className="mythic-form-switch-control">
                {control}
            </Box>
        </Box>
    );
}
