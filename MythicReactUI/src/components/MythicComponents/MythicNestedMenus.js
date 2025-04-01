import * as React from "react";
import styled from "@emotion/styled";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ArrowRight from "@mui/icons-material/ArrowRight";
// slightly modified from https://medium.com/geekculture/creating-a-dropdown-with-nested-menu-items-using-react-mui-bb0c084226da
export const Dropdown = React.forwardRef(
    (
        {
            menu,
            isOpen: controlledIsOpen,
            onOpen: onControlledOpen,
            externallyOpen,
            minWidth,
            absoluteX,
            absoluteY,
            anchorReference="anchorEl",
            style,
            transformOrigin,
            anchorOrigin,
        },
        ref
    ) => {
        const [isInternalOpen, setInternalOpen] = React.useState(null);

        const isOpen = controlledIsOpen || isInternalOpen;

        let anchorRef = React.useRef(isOpen);
        if (ref) {
            anchorRef = ref;
        }
        const handleClose = (event) => {
            event.stopPropagation();

            if (anchorRef.current && anchorRef.current.contains(event.target)) {
                return;
            }

            handleForceClose();
        };
        const handleForceClose = () => {
            onControlledOpen ? onControlledOpen(null) : setInternalOpen(null);
        };
        const renderMenu = (menuItem, index) => {
            const { ...props } = menuItem.props;

            let extraProps = {};
            if (props.menu) {
                extraProps = {
                    parentMenuOpen: isOpen
                };
            }
            return React.createElement(menuItem.type, {
                ...props,
                key: index,
                ...extraProps,
                onClick: (event) => {
                    event.stopPropagation();
                    if (menuItem.props.onClick) {
                        menuItem.props.onClick(event);
                    }
                },
                children: props.menu
                    ? React.Children.map(props.menu, renderMenu)
                    : props.children
            });
        };
        const anchorEl = isOpen && isOpen.currentTarget ? isOpen.currentTarget : isOpen;
        return (
            <>
                <Menu
                    elevation={5}
                    PaperProps={{ sx: { minWidth: minWidth ?? 0 } }}
                    style={{zIndex: 100000, position: "absolute"}}
                    anchorEl={anchorReference === "anchorEl" ? anchorEl : undefined}
                    transition={"true"}
                    open={!!externallyOpen}
                    anchorPosition={anchorReference === "anchorEl" ? undefined : {top: absoluteY, left: absoluteX}}
                    anchorReference={ anchorReference ? anchorReference : "anchorEl"}
                    onClose={handleClose}
                    anchorOrigin={anchorOrigin ? anchorOrigin : {
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={transformOrigin ? transformOrigin : {
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    {React.Children.map(menu, renderMenu)}
                </Menu>
            </>
        );
    }
);

const NestedMenuItem = React.forwardRef((props, ref) => {
    const {
        parentMenuOpen,
        label,
        rightIcon = <ArrowRight style={{ fontSize: 16 }} />,
        children,
        customTheme,
        className,
        tabIndex: tabIndexProp,
        ContainerProps: ContainerPropsProp = {},
        rightAnchored,
        ...MenuItemProps
    } = props;

    const { ref: containerRefProp, ...ContainerProps } = ContainerPropsProp;

    const menuItemRef = React.useRef(null);
    React.useImperativeHandle(ref, () => menuItemRef.current);

    const containerRef = React.useRef(null);
    React.useImperativeHandle(containerRefProp, () => containerRef.current);

    const menuContainerRef = React.useRef(null);

    const [isSubMenuOpen, setIsSubMenuOpen] = React.useState(false);

    const handleMouseEnter = (event) => {
        setIsSubMenuOpen(true);

        if (ContainerProps?.onMouseEnter) {
            ContainerProps.onMouseEnter(event);
        }
    };

    const handleMouseLeave = (event) => {
        setIsSubMenuOpen(false);

        if (ContainerProps?.onMouseLeave) {
            ContainerProps.onMouseLeave(event);
        }
    };

    const isSubmenuFocused = () => {
        const active = containerRef.current?.ownerDocument?.activeElement;

        for (const child of menuContainerRef.current?.children ?? []) {
            if (child === active) {
                return true;
            }
        }
        return false;
    };

    const handleFocus = (event) => {
        if (event.target === containerRef.current) {
            setIsSubMenuOpen(true);
        }

        if (ContainerProps?.onFocus) {
            ContainerProps.onFocus(event);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            setIsSubMenuOpen(false);
            return;
        }

        if (isSubmenuFocused()) {
            event.stopPropagation();
        }

        const active = containerRef.current?.ownerDocument?.activeElement;

        if (event.key === "ArrowLeft" && isSubmenuFocused()) {
            containerRef.current?.focus();
        }

        if (
            event.key === "ArrowRight" &&
            event.target === containerRef.current &&
            event.target === active
        ) {
            const firstChild = menuContainerRef.current?.children[0];
            firstChild?.focus();
        }
        if(event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "ArrowLeft"){
            setIsSubMenuOpen(false);
        }


    };

    const open = isSubMenuOpen && parentMenuOpen;

    let tabIndex;
    if (!props.disabled) {
        tabIndex = tabIndexProp !== undefined ? tabIndexProp : -1;
    }

    return (
        <div
            {...ContainerProps}
            ref={containerRef}
            onFocus={handleFocus}
            tabIndex={tabIndex}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onKeyDown={handleKeyDown}
        >
            <MenuItem
                {...MenuItemProps}
                data-open={!!open || undefined}
                className={className}
                ref={menuItemRef}
            >
                {label}
                <div style={{ flexGrow: 1 }} />
                {rightIcon}
            </MenuItem>
            <Menu
                hideBackdrop
                disablePortal
                disableEnforceFocus={false}
                disableAutoFocus={false}
                style={{ pointerEvents: "none", zIndex: 100000}}
                anchorEl={menuItemRef.current}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: rightAnchored ? "left" : "right"
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: rightAnchored ? "right" : "left"
                }}
                css={customTheme}
                open={!!open}
                onClose={() => {
                    setIsSubMenuOpen(false);
                }}
                MenuListProps={{
                    'aria-hidden': false,
                    role: 'menu'
                }}
            >
                <div ref={menuContainerRef} style={{ pointerEvents: "auto" }}>
                    {children}
                </div>
            </Menu>
        </div>
    );
});

export const DropdownMenuItem = styled(MenuItem)`

`;

export const DropdownNestedMenuItem = styled(NestedMenuItem)`

`;