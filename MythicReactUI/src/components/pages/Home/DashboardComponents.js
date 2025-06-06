import React from 'react';
import {useTheme} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { LineChart } from '@mui/x-charts/LineChart';
import Slider from '@mui/material/Slider';
import { PieChart, pieArcLabelClasses } from '@mui/x-charts/PieChart';
import { axisClasses } from '@mui/x-charts/ChartsAxis';
import {Gauge, GaugeContainer,
    GaugeValueArc,
    GaugeReferenceArc,
    useGaugeState} from '@mui/x-charts/Gauge';
import Table from '@mui/material/Table';
import { BarChart } from '@mui/x-charts/BarChart';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';

const normalColors = [
    '#09bdff',
    '#4cd5ff',
    '#1F94AD',
    '#2a7b9b',
    '#007FFF',
    '#0754a2',
    '#4b47a2',
    '#635bce',
    '#878be7',
    '#4e7ad7',
];


export const PieChartCard = ({
                          data, width = "100%", additionalStyles, innerElement,
                                 margin = {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
    }, colors = normalColors,
                                 onClick, title = "", editing, removeElement, customizeElement
                      }) => {
    const [showLegend, setShowLegend] = React.useState(true);
    const toggleLegend = () => {
        setShowLegend(!showLegend);
    }
    return (
        <div style={{
            marginRight: "5px",
            width: width,
            height: "100%",
            border: "1px solid gray",
            borderRadius: "4px",
            overflow: "hidden",
        }}>
            <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0,}}>
                {editing &&
                    <span>
                            <MythicStyledTooltip title={"Remove element"}>
                                <IconButton onClick={removeElement}>
                                    <DeleteIcon color={"error"}/>
                                </IconButton>
                            </MythicStyledTooltip>
                        </span>
                }
                {title}
                <span style={{float: "right"}}>
                    {customizeElement}
                    <MythicStyledTooltip title={showLegend ? "Hide Legend" : "Show Legend"}>
                        <IconButton onClick={toggleLegend} >
                            {showLegend ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>
                    </MythicStyledTooltip>
                </span>
            </h3>
            <PieChart
                skipAnimation={true}
                series={[
                    {
                        // item has id, label, value, data
                        //arcLabel: (item) => `${item.label}`,
                        //arcLabelMinAngle: 35,
                        //arcLabelRadius: "60%",
                        data: data,
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
                colors={colors}
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
        </div>
    );
}
function GaugePointer() {
    const { valueAngle, outerRadius, cx, cy } = useGaugeState();

    if (valueAngle === null) {
        // No value to display
        return null;
    }

    const target = {
        x: cx + outerRadius * Math.sin(valueAngle),
        y: cy - outerRadius * Math.cos(valueAngle),
    };
    return (
        <g>
            <circle cx={cx} cy={cy} r={5} fill="red" />
            <path
                d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
                stroke="red"
                strokeWidth={3}
            />
        </g>
    );
}
export const GaugeCard = ({data, width = "100%", additionalStyles, innerElement, hidden, margin = {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
}, colors = normalColors, onClick, title = "", editing, removeElement, customizeElement
                   }) => {
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
        <div style={{
            marginRight: "5px",
            width: width,
            height: "100%",
            border: "1px solid gray",
            overflow: "hidden",
            borderRadius: "4px",
        }}>
            <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0,}}>
                {editing &&
                    <span>
                            <MythicStyledTooltip title={"Remove element"}>
                                <IconButton onClick={removeElement}>
                                    <DeleteIcon color={"error"}/>
                                </IconButton>
                            </MythicStyledTooltip>
                        </span>
                }
                {title}
                <span style={{float: "right"}}>
                    {customizeElement}
                </span>
            </h3>
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
        </div>
    );
}
export const CallbackDataCard = ({mainTitle, secondTitle, mainElement, secondaryElement, width="100%",
                                 editing, removeElement}) => {
    return (
        <div style={{
            marginRight: "5px",
            width: width,
            height: "100%",
            border: "1px solid gray",
            overflow: "hidden",
            borderRadius: "4px",
        }} >
                <h5 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0}}>
                    {editing &&
                        <span >
                            <MythicStyledTooltip title={"Remove element"}>
                                <IconButton onClick={removeElement} >
                                    <DeleteIcon color={"error"}/>
                                </IconButton>
                            </MythicStyledTooltip>
                        </span>
                    }
                    {mainTitle}
                </h5>
                <div style={{height: 180, cursor: "pointer"}}>
                    <MythicStyledTooltip title={"Go to Active Callbacks"}>
                        {mainElement}
                        <h4 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0}}>
                            {secondTitle}
                        </h4>
                        {secondaryElement}
                    </MythicStyledTooltip>
                </div>
        </div>
    )
}
export const TableDataCard = ({title, width = "100%", tableHead, tableBody, editing, removeElement, customizeElement}) => {
    return (
        <div style={{
            marginRight: "5px",
            width: width,
            height: "100%",
            border: "1px solid gray",
            borderRadius: "4px",
        }}>
            <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0}}>
                {editing &&
                    <span >
                            <MythicStyledTooltip title={"Remove element"}>
                                <IconButton onClick={removeElement} >
                                    <DeleteIcon color={"error"}/>
                                </IconButton>
                            </MythicStyledTooltip>
                        </span>
                }
                {title}
                <span style={{float: "right", marginRight: "5px"}}>
                    {customizeElement}
                </span>
            </h3>
            <div style={{height: 200, overflowY: "auto"}}>
                <Table style={{ "maxWidth": "100%", "overflow": "auto"}} stickyHeader size="small">
                    {tableHead}
                    {tableBody}
                </Table>
            </div>
        </div>
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
        <div style={{
            marginBottom: "5px",
            marginTop: "10px",
            width: "100%",
            height: "100%",
            border: "1px solid gray",
            overflow: "hidden",
        }} >
            <Typography variant={"h3"} style={{margin: 0, padding: 0, position: "relative", left: "30%"}}>
                Tasks Issued per Day
            </Typography>
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
                height={300}
                {...additionalStyles}
            ></LineChart>
            <Slider
                value={value}
                onChange={handleChange}
                valueLabelDisplay="auto"
                min={range[0]}
                max={range[1]}
                sx={{ mt: 2, width: "80%", left: "10%" }}
            />
        </div>

    )
}
export const LineTimeMultiChartCard = ({data, additionalStyles, colors=normalColors, view_utc_time, editing, removeElement, customizeElement}) => {
    const [value, setValue] = React.useState([0, 0]);
    const [range, setRange] = React.useState([0, 0]);
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
        <div style={{
            width: "100%",
            height: "100%",
            marginRight: "5px",
            border: "1px solid gray",
            overflow: "hidden",
            borderRadius: "4px",
        }} >
            <Typography variant={"h3"} style={{margin: 0, padding: 0, position: "relative", left: "30%"}}>
                {editing &&
                    <span>
                        <MythicStyledTooltip title={"Remove element"}>
                            <IconButton onClick={removeElement}>
                                <DeleteIcon color={"error"}/>
                            </IconButton>
                        </MythicStyledTooltip>
                    </span>
                }
                Activity per Day {view_utc_time ? "( UTC )" : "( " + Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone + " )"}
                <span style={{}}>
                    {customizeElement}
                    <MythicStyledTooltip title={showLegend ? "Hide Legend" : "Show Legend"}>
                        <IconButton onClick={toggleLegend} >
                            {showLegend ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>
                    </MythicStyledTooltip>
                </span>
            </Typography>
            <LineChart
                colors={colors}
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
                color={"info"}
                size={"small"}
                valueLabelDisplay={"auto"}
                valueLabelFormat={sliderVal => sliderDate(sliderVal, view_utc_time)}
                min={range[0]}
                max={range[1]}
                sx={{ mt: 2, width: "80%", left: "10%" }}
            />
        </div>

    )
}
export const StackedBarChartCard = ({data, labels, title, width="100%", hidden, colors=normalColors, margin={
    right: 10,
    top: 40,
    bottom: 10,
}}) => {
    return (
        <div style={{
            marginRight: "5px",
            width: width,
            height: "100%",
            border: "1px solid gray",
            overflow: "hidden",
        }} >
            <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0, position: "absolute"}}>
                {title}
            </h3>
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
                colors={colors}
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
        </div>
    );
}