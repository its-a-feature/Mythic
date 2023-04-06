import makeStyles from '@mui/styles/makeStyles';

export default makeStyles((theme) => ({
    headerCellRow: {
        display: 'flex',
        flexDirection: 'row',
        position: 'sticky',
        top: '0',
        left: '0',
        right: '0',
        zIndex: 1,
    },
    headerCell: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 0.25em',
        boxSizing: 'border-box',
        justifyContent: 'space-between',
        userSelect: 'none',
        backgroundColor: theme.palette.background.paper,
        borderTop: '1px solid ' + theme.tableHover,
        borderRight: '1px solid ' + theme.tableHover,
        borderBottom: '1px solid  ' + theme.tableHover,
        '&:first-child': {
            borderLeft: '1px solid ' + theme.tableHover,
        },
        '&:hover': {
            backgroundColor: theme.tableHover,
            cursor: 'pointer',
        },
    },
    hoveredRow: {
        backgroundColor: theme.tableHover,
    },
    cell: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 0.5em',
        boxSizing: 'border-box',
        fontFamily: 'monospace',
        borderBottom: '1px solid ' + theme.tableHover,
        cursor: "default !important",
    },
    cellInner: {
        width: '100%',
        whiteSpace: 'nowrap',
        overflowX: 'hidden',
        textOverflow: 'ellipsis',
    },
    draggableHandlesContainer: {
        position: 'absolute',
        top: 0,
        overflowX: 'hidden',
    },
    draggableHandlesClickArea: {
        position: 'absolute',
        top: 0,
        width: '16px',
        cursor: 'col-resize',
        pointerEvents: 'initial',
    },
    draggableHandlesIndicator: {
        position: 'absolute',
        top: 0,
        left: 8,
        width: '1px',
        backgroundImage: 'linear-gradient(#7f93c0, #00000000)',
    },
}));
