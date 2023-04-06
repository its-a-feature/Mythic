import React, {useRef, useEffect, useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import * as d3 from 'd3';
import {createContextMenu} from './D3ContextMenu';
import dagreD3 from 'dagre-d3';
import {useTheme} from '@mui/material/styles';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { Typography } from '@mui/material';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function getStyles(name, selectedOptions, theme) {
    return {
      fontWeight:
      selectedOptions.indexOf(name) === -1
          ? theme.typography.fontWeightRegular
          : theme.typography.fontWeightMedium,
    };
  }

export function C2PathDialog(props) {
    const dagreRef = useRef(null);   
    const [reZoom, setReZoom] = useState(true);
    const theme = useTheme();
    const labelComponentOptions = ["id", "user", "host", "ip", "domain", "os", "process_name"];
    const [selectedComponentOptions, setSelectedComponentOptions] = React.useState(["id", "user"]);
    const [selectedGroupBy, setSelectedGroupBy] = React.useState("host");
    const groupByOptions = ["host", "user", "ip", "domain", "os", "process_name", "extra_info"];
    const [viewConfig, setViewConfig] = React.useState({
        rankDir: "LR",
        label_components: selectedComponentOptions,
        packet_flow_view: true,
        include_disconnected: true,
        show_all_nodes: true,
        group_by: selectedGroupBy
    });
    const handleChange = (event) => {
        const {
          target: { value },
        } = event;
        setSelectedComponentOptions(
          // On autofill we get a stringified value.
          typeof value === 'string' ? value.split(',') : value,
        );
      };
    const handleGroupByChange = (event) => {
        setSelectedGroupBy(event.target.value);
    }
    useEffect( () => {
        setViewConfig({...viewConfig, label_components: selectedComponentOptions})
    }, [selectedComponentOptions])
    useEffect( () => {
        setViewConfig({...viewConfig, group_by: selectedGroupBy});
    }, [selectedGroupBy])
    useEffect( () => {
        
        const node_events = {
            "mouseover": (parent, node, d) => {return},
            "mouseout": (parent, node, d) => {return},
            "click": (parent, node, d) => {return},
            "contextmenu": []
        }
        drawC2PathElements(props.callbackgraphedges, dagreRef, true, viewConfig, node_events, theme);
        setReZoom(false);
    }, [props.callbackgraphedges, reZoom, theme, viewConfig])
  return (
    <React.Fragment>
        <div style={{padding: "10px"}}>
            <Typography variant='h4' style={{display:"inline-block", marginTop: "10px"}}>
            Callback {props.callback.display_id}'s Egress Path
            </Typography>
            <div style={{float: "right"}}>
                <FormControl sx={{ width: 200,  marginTop: "10px" }}>
                    <InputLabel id="demo-chip-label">Group Callbacks By</InputLabel>
                    <Select
                    labelId="demo-chip-label"
                    id="demo-chip"
                    
                    value={selectedGroupBy}
                    onChange={handleGroupByChange}
                    input={<OutlinedInput id="select-chip" label="Group Callbacks By" />}
                    >
                    {groupByOptions.map((name) => (
                        <MenuItem
                        key={name}
                        value={name}
                        >
                        {name}
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
                <FormControl sx={{minWidth: 300, marginTop: "10px"}}>
                    <InputLabel id="demo-multiple-chip-label">Display Properties per Callback</InputLabel>
                    <Select
                    labelId="demo-multiple-chip-label"
                    id="demo-multiple-chip"
                    multiple
                    value={selectedComponentOptions}
                    onChange={handleChange}
                    input={<OutlinedInput id="select-multiple-chip" label="Display Properties per Callback" />}
                    MenuProps={MenuProps}
                    >
                    {labelComponentOptions.map((name) => (
                        <MenuItem
                            key={name}
                            value={name}
                            style={getStyles(name, selectedComponentOptions, theme)}
                            >
                        {name}
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
            </div>
        </div>
        <DialogContent dividers={true}>
            <React.Fragment>
                <svg ref={dagreRef} id="nodeTree" style={{width: "100%", height: "calc(75vh)", marginTop: "10px"}}></svg>
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}


export const drawC2PathElements = (edges, dagreRef, reZoom, view_config, node_events, theme) =>{
    const disconnected = `stroke: ${theme.palette.warning.main}; stroke-width: 3px; stroke-dasharray: 5, 5; fill:none`;
    const disconnectedArrow = `fill: ${theme.palette.warning.main}`;
    const connected = `stroke: ${theme.palette.info.main}; fill: none; stroke-width: 1.5px;`;
    const connectedArrow = `stroke: ${theme.palette.info.main}; fill: ${theme.palette.info.main}; stroke-width: 1.5px;`
    const nodeColor = `fill: ${theme.palette.success.main},`;
    const nodeLabelStyle = `labelStyle: "font-size: 2em"; fill: ${theme.palette.text.primary}`;
    const edgeLabelStyle = `labelStyle: "font-size: 2em"; fill: ${theme.palette.text.primary}`;
    const add_edge_to_mythic = (g, edge, view_config) => {
        if(!edge.source.active && !view_config["show_all_nodes"]){return}
        add_node(g, edge.source, view_config);
        g.setEdge(edge.source.id, "Mythic",  {label: edge.c2profile.name, edge_id: edge.id, end_timestamp: edge.end_timestamp,
            style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
            arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)
    }
    const getGroupBy = (node, view_config) => {
        if(node[view_config.group_by].length === 0){
            return " ";
        } else if(view_config.group_by === "ip") {
            try{
                let parts = JSON.parse(node[view_config.group_by]);
                if(parts.length > 0){return parts[0]}
                return "";
            }catch(error){
                console.log(error)
                return node[view_config.group_by];
            }
        } else if(view_config.group_by === "user"){
            if(node["integrity_level"] > 2){
                return node[view_config.group_by] + "*";
            }else{
                return node[view_config.group_by];
            }
        } else{
            return node[view_config.group_by];
        }
    }
    const add_node = (g, node, view_config) => {
        g.setNode(node.id, {label: getLabel(node, view_config["label_components"]),  node: node, style: nodeColor, labelStyle: nodeLabelStyle, shape: 'rect', isParent:false});
        g.setNode(getGroupBy(node, view_config), {label:  getGroupBy(node, view_config), clusterLabelPos: 'top', style: `fill:${theme.palette.graphGroup}`, node: null, labelStyle: nodeLabelStyle, isParent: true});
        g.setParent(node.id, getGroupBy(node, view_config));
        g.setNode(getGroupBy(node, view_config) + "mythic_expander", {label:"", shape: "square", node: node, isParent: false})
        g.setParent(getGroupBy(node, view_config) + "mythic_expander", getGroupBy(node, view_config))
    }
    const getLabel = (edge, label_components) => {
        return label_components.map( (name) => {
            if(name === "ip"){
                try{
                    let parts = JSON.parse(edge[name]);
                    if(parts.length > 0){return parts[0]}
                    return "";
                }catch(error){
                    console.log(error)
                    return edge[name];
                }
            } else if(name === "user") {
                if(edge["integrity_level"] > 2){
                    return edge[name] + "*";
                }else{
                    return edge[name];
                }
            } else {
                return edge[name]
            }
            
        }).join(", ");
    }
    const add_edge_p2p = (g, edge, view_config) => {
        if(!edge.source.active && !edge.destination.active && !view_config["show_all_nodes"]){
            return;
        }else if(!view_config["show_all_nodes"]){
            //at least one of the two nodes is active and we don't want to show all the nodes
            if(edge.source.active){add_node(g, edge.source, view_config)}
            if(edge.destination.active){add_node(g, edge.destination, view_config)}
            // not adding an edge because one of the nodes could be non-existent
            if(!edge.source.active || !edge.destination.active){
                return;
            }
        }else{
            add_node(g, edge.source, view_config);
            add_node(g, edge.destination, view_config);
        }
        if(view_config["packet_flow_view"]){
            createEdge(g, edge, true);
        }else{
            createEdge(g, edge, false);
        }
    }
    const createEdge = (g, edge, egress_flow) =>{
        if(egress_flow){
            if(edge.source.to_mythic){
                g.setEdge(edge.destination.id, edge.source.id,  {label: edge.c2profile.name, edge_id: edge.id,end_timestamp: edge.end_timestamp,
                    style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
                    arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)
            } else {
                g.setEdge(edge.source.id, edge.destination.id,  {label: edge.c2profile.name, edge_id: edge.id,end_timestamp: edge.end_timestamp,
                    style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
                    arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)
            }
            
        }else{
            g.setEdge(edge.source.id, edge.destination.id,  {label: edge.c2profile.name, edge_id: edge.id,end_timestamp: edge.end_timestamp,
                style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
                arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)
        }
            
        
    }
    var g = new dagreD3.graphlib.Graph({ compound: true, multigraph: true, directed: true}).setGraph({rankdir: view_config["rankDir"]}).setDefaultEdgeLabel(function() {return {}; });
    var svg = d3.select(dagreRef.current);
    var svgGroup;
    var test = svg.select("g")._groups[0][0];
    if(test){
        svgGroup = svg.select("g");
    }else{
        svgGroup = svg.append("g");
    }
    var zoom = d3.zoom().on("zoom", function() {
          svgGroup.attr("transform", d3.event.transform);
        });
    if(reZoom){
        svg.select('g.output').remove();
        svg.call(zoom);
    }
    g.setNode("Mythic", {label: "Mythic", style: nodeColor, shape: 'rect', node: null, labelStyle: nodeLabelStyle});
    const createNewEdges = () => {
        // loop through until all edges have one side marked as "toward_mythic"
        let edgesToUpdate = edges.length;
        if (edgesToUpdate === 0) {return []}
        let edgesUpdated = 0;
        let tempEdges = [...edges];
        let toMythicIds = new Set();
        let loop_count = 0;
        while(edgesUpdated < edgesToUpdate){
            //console.log(edges, tempEdges, edgesToUpdate, edgesUpdated)
            
            tempEdges = tempEdges.map( e => {
                //console.log(e)
                if(!e.source.to_mythic && !e.destination.to_mythic){
                    if(e.source.id === e.destination.id){
                        e.source.to_mythic = true;
                        e.destination.to_mythic = true;
                        toMythicIds.add(e.source.id);
                        
                        edgesUpdated += 1;
                    } else if(toMythicIds.has(e.source.id)){
                        e.source.to_mythic = true;
                        e.destination.to_mythic = false;
                        edgesUpdated += 1;
                    } else if(toMythicIds.has(e.destination.id)){
                        e.destination.to_mythic = true;
                        e.source.to_mythic = false;
                        edgesUpdated += 1;
                    } else {
                        // check if either source/destination has any edges that identify
                        tempEdges.forEach( e2 => {
                            if(e2.source.id === e.source.id){
                                // only look at edges that contain our source
                                if(e2.destination.to_mythic){
                                    e.source.to_mythic = true;
                                    edgesUpdated += 1;
                                }
                            } else if(e2.destination.id === e.source.id){
                                if(e2.source.to_mythic){
                                    e.source.to_mythic = true;
                                    edgesUpdated += 1;
                                }
                            }
                        })
                    }
                } else {
                    edgesUpdated += 1;
                }
                //edgesUpdated += 1;
                return e;
            })
            loop_count += 1;
            if (loop_count > 2 * edgesToUpdate){
                console.log("aborting early", tempEdges, edgesUpdated)
                edgesUpdated = edgesToUpdate;
                
            }
        }
        return tempEdges
    }
    const updatedEdges = createNewEdges();
    updatedEdges.forEach( (edge) => {
        if(!view_config["include_disconnected"] && edge.end_timestamp !== null){return}
        if(edge.destination.id === edge.source.id){
            if(g.hasEdge(edge.source.id, "Mythic", edge.c2profile.name)){
                // we already have an edge to Mythic from our source id, check if this edge is newer or not
                if(edge.id > g.edge(edge.source.id, "Mythic", edge.c2profile.name).edge_id){
                    add_edge_to_mythic(g, edge, view_config);
                }
            }else{
                //this is a new edge to mythic
                add_edge_to_mythic(g, edge, view_config);
            }
        }else{
            if(g.hasEdge(edge.source.id, edge.destination.id, edge.c2profile.name)){
                //we've seen an edge between these two before
                if(edge.id > g.edge(edge.source.id, edge.destination.id, edge.c2profile.name).edge_id){
                    add_edge_p2p(g, edge, view_config);
                }else{
                    console.log("doing nothing, dropping data");
                }
            }else{
                //this is a new edge
                add_edge_p2p(g, edge, view_config);
            }
            
        }
    });
    var render = new dagreD3.render();
    var width = svg.node().getBoundingClientRect().width;
    var height = svg.node().getBoundingClientRect().height;
    render.shapes().rect = function rect(parent, bbox, node) {
         var shapeSvg = parent.insert("image")
             .attr("class", "nodeImage")
             .attr("xlink:href", function(d) {
                 if (node.node) {
                    return "/static/" + node.node.payload.payloadtype.name + ".svg";
                 }else{
                    return "/static/mythic.svg";
                 }
             }).attr("x", function(d){
                return (-1 * bbox.width)/2 + "px";
             })
             .attr("y", "-20px")
             .attr("width", function(d) {
                return Math.max(40, bbox.width);
             })
             .attr("height", function(d){
                return 40;
             })
             .on("mouseover", function(d) { node_events["mouseover"](parent, node, d) })
             .on("mouseout", function(d) { node_events["mouseout"](parent, node, d) })
             .on("click", function(d) { d3.event.preventDefault(); node_events["click"](parent, node, d) })
             .on("contextmenu", (d) => {createContextMenu(g, node, node_events["contextmenu"], width, height, "#callbacksgraph")});
         node.intersect = function(point) {
             //return dagreD3.intersect.circle(node, 25, point);
             //console.log(node, point, Math.max(node.width, node.label?.length))
             return dagreD3.intersect.rect({...node, height: 75}, point)
         };
         return shapeSvg;
     };
     render.shapes().square = function square(parent, bbox, node){
         var shapeSvg = parent.insert("rect")
            .attr("width", function(d) {
                let candidates = g.children(getGroupBy(node.node, view_config));
                let longest = getGroupBy(node.node, view_config).length;
                if(candidates !== undefined){
                    candidates.forEach( (x) => {
                        if(g.node(x).label.length > longest){
                            longest = g.node(x).label.length;
                        }
                    });
                }
                if(view_config["rankDir"] === "LR"){
                    // need a box at least as long as the host name or longest label with matching parent
                    return longest * 9 + "px";
                }else{
                    // need a box at least as long as the hostname or longest label with matching parent
                    //   need to also subtract width of elements for everything with an edge to Mythic
                    if(candidates !== undefined){
                        let count = 0;
                        candidates.forEach( (x) => {
                            if(g.outEdges(x, "Mythic").length > 0){
                                count += 1;
                            }
                        });
                        longest = (longest * 9) - (count * 100);
                        if(longest < 0){ return 0}
                        return longest + "px";
                    }else{
                        console.log("candidates were undefined");
                    }
                }
            })
            .attr("height", 0);
        return shapeSvg;
     }
     // if a parent has no children then it should be removed
    
    render(svgGroup, g);
    if(reZoom){
        var graphWidth = g.graph().width + 40;
        var graphHeight = g.graph().height + 40;
        var zoomScale = Math.min(width / graphWidth, height / graphHeight);
        var translateX = (width / 2) - ((graphWidth * zoomScale) / 2)
        var translateY = (height / 2) - ((graphHeight * zoomScale) / 2);
        var svgZoom = svg.transition().duration(500);
        svgZoom.call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(zoomScale));
    }
    svgGroup.selectAll("g.nodes g.label")
        .attr("transform", "translate(0,30)");
}
export const getNodeEdges = (g, node) =>{
    return g.nodeEdges(node);
}

