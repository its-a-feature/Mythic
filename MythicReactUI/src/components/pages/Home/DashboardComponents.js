import {MythicActionButton} from "../../MythicComponents/MythicActionButton";
import React from 'react';
import {useTheme} from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import Slider from '@mui/material/Slider';
import { PieChart, pieArcLabelClasses } from '@mui/x-charts/PieChart';
import { axisClasses } from '@mui/x-charts/ChartsAxis';
import {Gauge} from '@mui/x-charts/Gauge';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import { BarChart } from '@mui/x-charts/BarChart';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Paper from "@mui/material/Paper";
import {MythicEmptyState} from "../../MythicComponents/MythicStateDisplay";
import {MythicChip} from "../../MythicComponents/MythicChip";

export const getDashboardColors = (theme) => [
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
    theme.palette.primary.main,
    ...(theme.chartSeriesColors || []),
];

const DashboardCard = ({
    actions,
    bodyClassName = "",
    children,
    className = "",
    editing,
    removeElement,
    size = "standard",
    title,
    width = "100%",
}) => {
    return (
        <Paper
            className={`mythic-dashboard-card flex flex-column mythic-dashboard-card-${size} relative bg-surface-raised border-subtle ${className} min-w-0 overflow-hidden w-full`.trim()}
            elevation={0}
            style={{width}}
        >
            {(title || actions || editing) &&
                <div className="mythic-dashboard-card-header items-center flex flex-none gap-5 justify-between min-w-0 overflow-hidden relative bg-surface-muted">
                    <div className="mythic-dashboard-card-title text-sm font-800 leading-120 min-w-0 text-primary">
                        {title}
                    </div>
                    {(editing || actions) &&
                        <div className="mythic-dashboard-card-actions items-center flex flex-none flex-wrap gap-3 justify-end">
                            {actions}
                            {editing &&
                                <MythicStyledTooltip title={"Remove element"}>
                                    <MythicActionButton iconOnly
                                        appearance="raised" colorMode="hover" tone="error"
                                        onClick={removeElement}
                                        size="small"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </MythicActionButton>
                                </MythicStyledTooltip>
                            }
                        </div>
                    }
                </div>
            }
            <div className={`mythic-dashboard-card-body flex flex-fill flex-column ${bodyClassName} min-h-0 min-w-0 overflow-hidden`.trim()}>
                {children}
            </div>
        </Paper>
    );
};

export const DashboardEmptyCard = ({action, children, editing, removeElement, title, width = "100%"}) => (
    <DashboardCard
            bodyClassName="mythic-dashboard-card-body-empty p-6"
        editing={editing}
        removeElement={removeElement}
        title={title}
        width={width}
    >
        <div className="mythic-dashboard-empty-state border-dashed text-sm leading-140 items-center flex flex-fill flex-column gap-6 justify-center min-h-0 rounded bg-surface-muted text-muted text-center">
            <div className="mythic-dashboard-empty-copy">
                {children}
            </div>
            {action &&
                <div className="mythic-dashboard-empty-action items-center flex justify-center">
                    {action}
                </div>
            }
        </div>
    </DashboardCard>
);

const DashboardNoDataState = ({
    action,
    title = "No data yet",
    description = "This dashboard element will populate when matching operation activity exists.",
}) => (
    <MythicEmptyState
        action={action}
        compact
        title={title}
        description={description}
        minHeight={0}
        sx={{flex: "1 1 auto", height: "100%", minHeight: 0, p: 0}}
    />
);

export const PieChartCard = ({
                          data, width = "100%", additionalStyles, innerElement,
                                 margin = {
        left: 8,
        right: 8,
        top: 8,
        bottom: 8,
    }, colors,
                                 onClick, title = "", editing, removeElement, customizeElement
                      }) => {
    const [showLegend, setShowLegend] = React.useState(true);
    const toggleLegend = () => {
        setShowLegend(!showLegend);
    }
    const theme = useTheme();
    const chartData = Array.isArray(data) ? data : [];
    const hasChartData = chartData.length > 0;
    return (
        <DashboardCard
            actions={
                <>
                    {customizeElement}
                    <MythicStyledTooltip title={showLegend ? "Hide Legend" : "Show Legend"}>
                        <MythicActionButton iconOnly
                                            appearance="raised"
                                            colorMode="hover"
                                            tone="info"
                                            onClick={toggleLegend} size="small">
                            {showLegend ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                        </MythicActionButton>
                    </MythicStyledTooltip>
                </>
            }
            bodyClassName="mythic-dashboard-chart-body gap-3"
            editing={editing}
            removeElement={removeElement}
            title={title}
            width={width}
        >
            {hasChartData ? (
                <div className="mythic-dashboard-chart-canvas flex flex-fill mythic-dashboard-chart-canvas-pie p-2 items-center justify-center min-h-0 min-w-0 overflow-hidden w-full rounded bg-neutral-1 border-subtle">
                    <PieChart
                        skipAnimation={true}
                        series={[
                            {
                                data: chartData,
                                highlightScope: {fade: 'global', highlighted: 'item'},
                                faded: {innerRadius: 0, additionalRadius: -10, color: 'gray'},
                                paddingAngle: 1,
                                cornerRadius: 4,
                                innerRadius: 0,
                                ...additionalStyles
                            },
                        ]}
                        height={210}
                        margin={margin}
                        sx={{
                            [`& .${pieArcLabelClasses.root}`]: {
                                fill: 'white',
                                fontWeight: 'bold',
                            },
                        }}
                        colors={colors || getDashboardColors(theme)}
                        onItemClick={onClick}
                        hideLegend={!showLegend}
                        slotProps={{
                            legend: {
                                direction: "vertical",
                                sx: {
                                    gap: "5px",
                                    ['.MuiChartsLegend-series']: {
                                        gap: '8px',
                                    },
                                    [`.MuiChartsLegend-mark`]: {
                                        height: 10,
                                        rx: 2,
                                        width: 10,
                                    },
                                    [`.MuiChartsLegend-label`]: {
                                        fontSize: 11,
                                        fontWeight: 650,
                                    },
                                }
                            }
                        }}>
                        {innerElement}
                    </PieChart>
                </div>
            ) : (
                <div className="mythic-dashboard-chart-canvas flex flex-fill mythic-dashboard-chart-canvas-empty items-stretch min-h-0 min-w-0 overflow-hidden w-full rounded bg-neutral-1 border-subtle">
                    <DashboardNoDataState />
                </div>
            )}
        </DashboardCard>
    );
}
export const GaugeCard = ({data, width = "100%", title = "", editing, removeElement, customizeElement }) => {
    const theme = useTheme();
    const online = data?.online || 0;
    const total = data?.total || 0;
    const percentOnline = total > 0 ? Math.round((online / total) * 100) : 0;
    const statusLevel = total === 0 ? "neutral" : percentOnline > 85 ? "success" : percentOnline > 50 ? "warning" : "danger";
    const statusLabel = total === 0 ? "No services" : percentOnline > 85 ? "Healthy" : percentOnline > 50 ? "Degraded" : "Attention";
    const getFillColor = () => {
        if(total === 0){return theme.palette.text.disabled}
        let ratio = online / total;
        if( ratio > 0.85){
            return theme.palette.success.main;
        }else if(ratio > 0.5){
            return theme.palette.warning.main;
        } else {
            return theme.palette.error.main;
        }
    }
    return (
        <DashboardCard
            actions={customizeElement}
            bodyClassName="mythic-dashboard-kpi-body"
            editing={editing}
            removeElement={removeElement}
            size="metric"
            title={title}
            width={width}
        >
            <div className="mythic-dashboard-service-kpi bg-neutral-1 border-subtle flex flex-fill gap-6 justify-between items-center flex-row min-h-0 min-w-0 overflow-hidden rounded">
                <div className="mythic-dashboard-kpi-main flex flex-fill flex-column justify-center min-h-0 min-w-0">
                    <div className="mythic-dashboard-kpi-status-row items-center flex gap-4 justify-between min-w-0">
                        <MythicChip label={statusLabel} tone={statusLevel === "danger" ? "error" : statusLevel} />
                        <span className="mythic-dashboard-kpi-percent text-xs font-850 leading-100 flex-none text-muted">{percentOnline}%</span>
                    </div>
                    <div className="mythic-dashboard-kpi-value-row flex gap-3 min-w-0">
                        <span className="mythic-dashboard-kpi-value text-hero text-primary">{online}</span>
                        <span className="mythic-dashboard-kpi-total text-xl leading-100 text-muted">/ {total}</span>
                    </div>
                    <div className="mythic-dashboard-kpi-label text-xs font-750 leading-125 text-muted">
                        Services online
                    </div>
                </div>
                <div className="mythic-dashboard-kpi-gauge items-center flex justify-center">
                    <Gauge
                        height={112}
                        width={112}
                        skipAnimation={true}
                        valueMax={total > 0 ? total : 100}
                        value={online}
                        innerRadius={"72%"}
                        cornerRadius="20%"
                        text={() => `${percentOnline}%`}
                        sx={() => ({
                            [`& .MuiGauge-valueText > text > tspan`]: {
                                fontSize: 18,
                                fontWeight: 850,
                            },
                            [`.MuiGauge-valueArc`]: {
                                fill: getFillColor(),
                            },
                        })}
                    >
                    </Gauge>
                </div>
            </div>
        </DashboardCard>
    );
}
export const CallbackDataCard = ({mainTitle, primaryValue, totalValue, primaryLabel, secondaryValue, secondaryLabel,
                                 statusLabel = "Tracking", statusLevel = "info", onClick, width="100%",
                                 actions, editing, removeElement}) => {
    const handleKeyDown = (event) => {
        if(!onClick){
            return;
        }
        if(event.key === "Enter" || event.key === " "){
            event.preventDefault();
            onClick();
        }
    };
    return (
        <DashboardCard
            actions={actions}
            bodyClassName="mythic-dashboard-kpi-body"
            editing={editing}
            removeElement={removeElement}
            size="metric"
            title={mainTitle}
            width={width}
        >
            <MythicStyledTooltip title={"Go to Active Callbacks"}>
                <div
                    className="mythic-dashboard-callback-kpi bg-neutral-1 border-subtle flex flex-fill gap-6 justify-between flex-column min-h-0 min-w-0 overflow-hidden rounded cursor-pointer"
                    onClick={onClick}
                    onKeyDown={handleKeyDown}
                    role={onClick ? "button" : undefined}
                    tabIndex={onClick ? 0 : undefined}
                >
                    <div className="mythic-dashboard-kpi-main flex flex-fill flex-column justify-center min-h-0 min-w-0">
                        <div className="mythic-dashboard-kpi-status-row items-center flex gap-4 justify-between min-w-0">
                            <MythicChip label={statusLabel} tone={statusLevel === "danger" ? "error" : statusLevel} />
                        </div>
                        <div className="mythic-dashboard-kpi-value-row flex gap-3 min-w-0">
                            <span className="mythic-dashboard-kpi-value text-hero text-primary">{primaryValue}</span>
                            <span className="mythic-dashboard-kpi-total text-xl leading-100 text-muted">/ {totalValue}</span>
                        </div>
                        <div className="mythic-dashboard-kpi-label text-xs font-750 leading-125 text-muted">
                            {primaryLabel}
                        </div>
                    </div>
                    <div className="mythic-dashboard-kpi-secondary-panel py-4 px-5 items-center flex gap-4 min-w-0 rounded bg-neutral-1 border-subtle">
                        <span className="mythic-dashboard-kpi-secondary-value text-3xl leading-100 flex-none text-primary">{secondaryValue}</span>
                        <span className="mythic-dashboard-kpi-secondary-label text-xs font-700 leading-125 min-w-0 wrap-anywhere text-muted">{secondaryLabel}</span>
                    </div>
                </div>
            </MythicStyledTooltip>
        </DashboardCard>
    )
}
export const TableDataCard = ({
    title,
    width = "100%",
    tableHead,
    tableBody,
    editing,
    removeElement,
    customizeElement,
    empty = false,
    emptyTitle,
    emptyDescription,
    emptyAction,
    summary = true,
    tableClassName = "",
}) => {
    const tableClasses = [
        "mythic-dashboard-table max-w-full overflow-auto w-full",
        summary ? "mythic-dashboard-summary-table table-fixed" : "",
        tableClassName,
    ].filter(Boolean).join(" ");
    return (
        <DashboardCard
            actions={customizeElement}
            bodyClassName="mythic-dashboard-table-body"
            editing={editing}
            removeElement={removeElement}
            size="table"
            title={title}
            width={width}
        >
            {empty ? (
                <TableContainer className="mythic-dashboard-table-container flex-fill mythic-dashboard-empty-container flex overflow-hidden h-full min-h-0 min-w-0 overflow-auto w-full bg-neutral-1">
                    <DashboardNoDataState title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </TableContainer>
            ) : (
                <TableContainer className="mythic-dashboard-table-container flex-fill h-full min-h-0 min-w-0 overflow-auto w-full bg-neutral-1">
                    <Table className={tableClasses} stickyHeader size="small">
                        {tableHead}
                        {tableBody}
                    </Table>
                </TableContainer>
            )}
        </DashboardCard>
    )
}
export const LineTimeChartCard = ({data, additionalStyles}) => {
    const [value, setValue] = React.useState([0, 0]);
    const [range, setRange] = React.useState([0, 0]);
    React.useEffect( () => {

        if(data.length > 0){
            setValue([0, data.length-1])
            setRange([0, data.length-1])
        }

    }, [data]);
    const minDistance = 1;
    const handleChange = (event, newValue, activeThumb) => {
        if (!Array.isArray(newValue)) {
            return;
        }

        if (newValue[1] - newValue[0] < minDistance) {
            if (activeThumb === 0) {
                const clamped = Math.min(newValue[0], 100 - minDistance);
                setValue([clamped, clamped + minDistance]);
            } else {
                const clamped = Math.max(newValue[1], minDistance);
                setValue([clamped - minDistance, clamped]);
            }
        } else {
            setValue(newValue);
        }
    };
    return (
        <DashboardCard bodyClassName="mythic-dashboard-chart-body gap-3" title="Tasks Issued per Day" size="wide">
            <div className="mythic-dashboard-chart-canvas flex flex-fill mythic-dashboard-chart-canvas-line items-stretch justify-center min-h-0 min-w-0 overflow-hidden w-full rounded bg-neutral-1 border-subtle">
                <LineChart
                    xAxis={[
                        {
                            dataKey: 'x',
                            scaleType: "time",
                            min: data[value[0]]?.x || 0,
                            max: data[value[1]]?.x || 0,
                            id: 'bottomAxis',
                            labelStyle: {
                                fontSize: 10,
                            },
                            tickLabelStyle: {
                                angle: 0,
                                fontSize: 10,
                            },

                        },
                    ]}
                    series={[
                        {
                            dataKey: 'y',
                            label: "mythic_admin",
                            showMark: ({index}) => index % 2 === 0,
                        }
                    ]}
                    sx={{
                        [`.${axisClasses.left} .${axisClasses.label}`]: {
                            transform: 'translate(-25px, 0)',
                        },
                        [`.${axisClasses.right} .${axisClasses.label}`]: {
                            transform: 'translate(30px, 0)',
                        },
                    }}
                    margin={{ top: 18, right: 20, bottom: 28, left: 42 }}
                    dataset={data}
                    height={186}
                    {...additionalStyles}
                ></LineChart>
            </div>
            <div className="mythic-dashboard-chart-slider-row items-center flex flex-none justify-center rounded bg-neutral-1 border-subtle">
                <Slider
                    value={value}
                    onChange={handleChange}
                    valueLabelDisplay="auto"
                    min={range[0]}
                    max={range[1]}
                    className="mythic-dashboard-slider"
                />
            </div>
        </DashboardCard>

    )
}
export const LineTimeMultiChartCard = ({data, additionalStyles, colors, view_utc_time, editing, removeElement, customizeElement}) => {
    const theme = useTheme();
    const [value, setValue] = React.useState([0, 0]);
    const [range, setRange] = React.useState([0, 0]);
    const hasChartData = (data?.x?.length || 0) > 0 && (data?.y?.length || 0) > 0;
    React.useEffect( () => {

        if(data.x.length > 0){
            setValue([data.x.length - 8 > 0 ? data.x.length - 8 : 0, data.x.length-1])
            setRange([0, data.x.length-1])
        }

    }, [data]);
    const minDistance = 1;
    const [showLegend, setShowLegend] = React.useState(true);
    const toggleLegend = () => {
        setShowLegend(!showLegend);
    }
    const handleChange = (event, newValue, activeThumb) => {
        if (!Array.isArray(newValue)) {
            return;
        }

        if (newValue[1] - newValue[0] < minDistance) {
            if (activeThumb === 0) {
                const clamped = Math.min(newValue[0], 100 - minDistance);
                setValue([Math.max(0, clamped), Math.min(clamped + minDistance, data.x.length > 0 ? data.x.length -1 : 0)]);
            } else {
                const clamped = Math.max(newValue[1], minDistance);
                setValue([Math.max(0, clamped - minDistance), Math.min(clamped, data.x.length > 0 ? data.x.length -1 : 0)]);
            }
        } else {
            setValue(newValue);
        }
    };
    const sliderDate = (sliderVal, view_utc_time) => {
        if(view_utc_time){
            try {
                return data.x?.[sliderVal]?.toISOString()?.substr(0, 10);
            }catch(error){
                console.log("sliderDate utc error", error, sliderVal, data.x)
                return String(sliderVal);
            }
        }
        try {
            return data.x?.[sliderVal]?.toDateString();
        }catch(error){
            console.log("sliderDate error", error, sliderVal, data.x)
            return String(sliderVal);
        }
    }
    return (
        <DashboardCard
            actions={
                <>
                    {customizeElement}
                    <MythicStyledTooltip title={showLegend ? "Hide Legend" : "Show Legend"}>
                        <MythicActionButton iconOnly appearance="raised" colorMode="hover" tone="info" onClick={toggleLegend} size="small">
                            {showLegend ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                        </MythicActionButton>
                    </MythicStyledTooltip>
                </>
            }
            bodyClassName="mythic-dashboard-chart-body gap-3"
            editing={editing}
            removeElement={removeElement}
            size="wide"
            title={`Activity per Day ${view_utc_time ? "(UTC)" : `(${Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone})`}`}
        >
            {hasChartData ? (
                <>
                    <div className="mythic-dashboard-chart-canvas flex flex-fill mythic-dashboard-chart-canvas-line items-stretch justify-center min-h-0 min-w-0 overflow-hidden w-full rounded bg-neutral-1 border-subtle">
                        <LineChart
                            colors={colors || getDashboardColors(theme)}
                            hideLegend={!showLegend}
                            xAxis={[
                                {
                                    data: data.x,
                                    scaleType: "time",
                                    min: data?.x?.[value[0]] || 0,
                                    max: data?.x?.[value[1]] || 0,
                                    id: 'bottomAxis',
                                    tickMinStep: 86400000,
                                    labelStyle: {
                                        fontSize: 10,
                                    },
                                    tickLabelStyle: {
                                        angle: 0,
                                        fontSize: 10,
                                    },
                                },
                            ]}
                            yAxis={[
                                {id: "taskAxis", scaleType: "linear", label: "Tasks Issued"},
                                {id: "callbackAxis", scaleType: "linear", label: "Active Callbacks", position: "right"}
                            ]}
                            series={data.y}
                            sx={{
                                [`.${axisClasses.left} .${axisClasses.label}`]: {
                                    fontSize: 10,
                                },
                                [`.${axisClasses.right} .${axisClasses.label}`]: {
                                    fontSize: 10,
                                },
                            }}
                            margin={{ top: 18, right: 46, bottom: 30, left: 48 }}
                            height={186}
                            {...additionalStyles}
                        ></LineChart>
                    </div>
                    <div className="mythic-dashboard-chart-slider-row items-center flex flex-none justify-center rounded bg-neutral-1 border-subtle">
                        <Slider
                            value={value}
                            onChange={handleChange}
                            size={"small"}
                            valueLabelDisplay={"auto"}
                            valueLabelFormat={sliderVal => sliderDate(sliderVal, view_utc_time)}
                            min={range[0]}
                            max={range[1]}
                            className="mythic-dashboard-slider"
                        />
                    </div>
                </>
            ) : (
                <div className="mythic-dashboard-chart-canvas flex flex-fill mythic-dashboard-chart-canvas-empty items-stretch min-h-0 min-w-0 overflow-hidden w-full rounded bg-neutral-1 border-subtle">
                    <DashboardNoDataState
                        title="No activity yet"
                        description="Task and callback activity will appear here once the operation has timeline data."
                    />
                </div>
            )}
        </DashboardCard>

    )
}
export const StackedBarChartCard = ({data, labels, title, width="100%", hidden, colors, margin={
    right: 10,
    top: 40,
    bottom: 10,
}}) => {
    const theme = useTheme();
    return (
        <DashboardCard title={title} width={width}>
            <BarChart
                xAxis={[{
                    scaleType: "band",
                    data: labels,
                    tickLabelInterval: (value, index) => false
                }]}
                margin={margin}
                layout={"vertical"}
                series={data}
                height={200}
                colors={colors || getDashboardColors(theme)}
                hideLegend={hidden}
                slotProps={{
                    legend: {

                        padding: 15,
                        direction: "horizontal",

                        position: {
                            vertical: "top",
                            horizontal: "end"
                        }
                    }
                }} />
        </DashboardCard>
    );
}
