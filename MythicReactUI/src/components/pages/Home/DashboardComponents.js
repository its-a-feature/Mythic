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
import IconButton from '@mui/material/IconButton';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Paper from "@mui/material/Paper";
import {MythicEmptyState} from "../../MythicComponents/MythicStateDisplay";

const fallbackDashboardColors = [
    '#09bdff',
    '#39b86f',
    '#d69d2d',
    '#d65c6b',
    '#7b6fd6',
    '#24a3a3',
    '#9c6ade',
    '#d47f38',
    '#4e7ad7',
    '#90a955',
];

const getDashboardColors = (theme) => [
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
    theme.palette.primary.main,
    ...fallbackDashboardColors,
];

const DashboardCard = ({
    actions,
    bodyClassName = "",
    children,
    className = "",
    editing,
    removeElement,
    title,
    width = "100%",
}) => {
    return (
        <Paper
            className={`mythic-dashboard-card ${className}`.trim()}
            elevation={0}
            style={{width}}
        >
            {(title || actions || editing) &&
                <div className="mythic-dashboard-card-header">
                    <div className="mythic-dashboard-card-title">
                        {title}
                    </div>
                    {(editing || actions) &&
                        <div className="mythic-dashboard-card-actions">
                            {actions}
                            {editing &&
                                <MythicStyledTooltip title={"Remove element"}>
                                    <IconButton
                                        className="mythic-dashboard-icon-button mythic-dashboard-icon-button-hover-danger"
                                        onClick={removeElement}
                                        size="small"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </MythicStyledTooltip>
                            }
                        </div>
                    }
                </div>
            }
            <div className={`mythic-dashboard-card-body ${bodyClassName}`.trim()}>
                {children}
            </div>
        </Paper>
    );
};

export const DashboardEmptyCard = ({action, children, editing, removeElement, title, width = "100%"}) => (
    <DashboardCard
        bodyClassName="mythic-dashboard-card-body-empty"
        editing={editing}
        removeElement={removeElement}
        title={title}
        width={width}
    >
        <div className="mythic-dashboard-empty-state">
            <div className="mythic-dashboard-empty-copy">
                {children}
            </div>
            {action &&
                <div className="mythic-dashboard-empty-action">
                    {action}
                </div>
            }
        </div>
    </DashboardCard>
);

const DashboardNoDataState = ({
    title = "No data yet",
    description = "This dashboard element will populate when matching operation activity exists.",
}) => (
    <MythicEmptyState
        compact
        title={title}
        description={description}
        minHeight={132}
        sx={{p: 0}}
    />
);

export const PieChartCard = ({
                          data, width = "100%", additionalStyles, innerElement,
                                 margin = {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
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
                        <IconButton className="mythic-dashboard-icon-button" onClick={toggleLegend} size="small">
                            {showLegend ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                        </IconButton>
                    </MythicStyledTooltip>
                </>
            }
            editing={editing}
            removeElement={removeElement}
            title={title}
            width={width}
        >
            {hasChartData ? (
                <PieChart
                    skipAnimation={true}
                    series={[
                        {
                            // item has id, label, value, data
                            //arcLabel: (item) => `${item.label}`,
                            //arcLabelMinAngle: 35,
                            //arcLabelRadius: "60%",
                            data: chartData,
                            highlightScope: {fade: 'global', highlighted: 'item'},
                            faded: {innerRadius: 0, additionalRadius: -10, color: 'gray'},
                            paddingAngle: 1,
                            cornerRadius: 4,
                            innerRadius: 0,
                            ...additionalStyles
                        },
                    ]}
                    height={200}
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
                            direction: "vertical", // "horizontal"
                            sx: {
                                gap: "4px", // itemGap (distance between legend items)
                                // CSS class
                                ['.MuiChartsLegend-series']: {
                                    gap: '8px', // markGap (distance between legend dot and text)
                                },
                                [`.MuiChartsLegend-mark`]: {
                                    height: 12, // size of the legend dot
                                    width: 12,
                                },
                            }
                        }
                    }}>
                    {innerElement}
                </PieChart>
            ) : (
                <DashboardNoDataState />
            )}
        </DashboardCard>
    );
}
export const GaugeCard = ({data, width = "100%", title = "", editing, removeElement, customizeElement }) => {
    const theme = useTheme();
    const getFillColor = () => {
        if(data['total'] === 0){return theme.palette.text.disabled}
        let ratio = data['online'] / data['total'];
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
            bodyClassName="mythic-dashboard-card-body-centered"
            editing={editing}
            removeElement={removeElement}
            title={title}
            width={width}
        >
            <Gauge
                height={200}
                width={200}
                skipAnimation={true}
                valueMax={data['total'] > 0 ? data['total'] : 100}
                value={data['online']}
                innerRadius={"70%"}
                cornerRadius="20%"
                text={({ value, valueMax }) => `${value} / ${valueMax}`}
                sx={() => ({
                    [`& .MuiGauge-valueText > text > tspan`]: {
                        fontSize: 30,
                    },
                    [`.MuiGauge-valueArc`]: {
                        fill: getFillColor(),
                    },
                })}
            >
            </Gauge>
        </DashboardCard>
    );
}
export const CallbackDataCard = ({mainTitle, secondTitle, mainElement, secondaryElement, width="100%",
                                 editing, removeElement}) => {
    return (
        <DashboardCard
            bodyClassName="mythic-dashboard-metric-body"
            editing={editing}
            removeElement={removeElement}
            title={mainTitle}
            width={width}
        >
                <div className="mythic-dashboard-metric-content">
                    <MythicStyledTooltip title={"Go to Active Callbacks"}>
                        <div className="mythic-dashboard-metric-link">
                            {mainElement}
                            <div className="mythic-dashboard-metric-label">
                                {secondTitle}
                            </div>
                            {secondaryElement}
                        </div>
                    </MythicStyledTooltip>
                </div>
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
}) => {
    return (
        <DashboardCard
            actions={customizeElement}
            bodyClassName="mythic-dashboard-table-body"
            editing={editing}
            removeElement={removeElement}
            title={title}
            width={width}
        >
            {empty ? (
                <DashboardNoDataState title={emptyTitle} description={emptyDescription} />
            ) : (
                <TableContainer className="mythic-dashboard-table-container mythicElement">
                    <Table className="mythic-dashboard-table" stickyHeader size="small">
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
        <DashboardCard title="Tasks Issued per Day">
            <LineChart
                xAxis={[
                    {
                        dataKey: 'x',
                        //valueFormatter: (v) => (new Date(v)).toISOString().substr(0, 10),
                        scaleType: "time",
                        min: data[value[0]]?.x || 0,
                        max: data[value[1]]?.x || 0,
                        id: 'bottomAxis',
                        labelStyle: {
                            fontSize: 10,
                        },
                        tickLabelStyle: {
                            angle: 25,
                            textAnchor: 'start',
                            fontSize: 5,
                        },

                    },
                ]}
                series={[
                    {
                        dataKey: 'y',
                        label: "mythic_admin",
                        showMark: ({index}) => index % 2 === 0,
                        //color: "#4e79a7"
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
                margin={{ top: 10 }}
                dataset={data}
                height={200}
                {...additionalStyles}
            ></LineChart>
            <Slider
                value={value}
                onChange={handleChange}
                valueLabelDisplay="auto"
                min={range[0]}
                max={range[1]}
                className="mythic-dashboard-slider"
                sx={{ width: "80%" }}
            />
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
                        <IconButton className="mythic-dashboard-icon-button" onClick={toggleLegend} size="small">
                            {showLegend ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                        </IconButton>
                    </MythicStyledTooltip>
                </>
            }
            editing={editing}
            removeElement={removeElement}
            title={`Activity per Day ${view_utc_time ? "(UTC)" : `(${Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone})`}`}
        >
            {hasChartData ? (
                <>
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
                                    angle: 25,
                                    textAnchor: 'start',
                                    fontSize: 5,
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
                                //transform: 'translate(-25px, 0)',
                            },
                            [`.${axisClasses.right} .${axisClasses.label}`]: {
                                //transform: 'translate(30px, 0)',
                            },
                        }}
                        margin={{  }}
                        height={200}
                        {...additionalStyles}
                    ></LineChart>
                    <Slider
                        value={value}
                        onChange={handleChange}
                        size={"small"}
                        valueLabelDisplay={"auto"}
                        valueLabelFormat={sliderVal => sliderDate(sliderVal, view_utc_time)}
                        min={range[0]}
                        max={range[1]}
                        className="mythic-dashboard-slider"
                        sx={{ width: "80%" }}
                    />
                </>
            ) : (
                <DashboardNoDataState
                    title="No activity yet"
                    description="Task and callback activity will appear here once the operation has timeline data."
                />
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
