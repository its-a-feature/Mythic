import React, {useRef, useEffect, useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import * as d3 from 'd3';
import {createContextMenu} from './D3ContextMenu';
import dagreD3 from 'dagre-d3';
import {muiTheme} from '../../../themes/Themes.js';
import { autoType } from 'd3';

export function C2PathDialog(props) {
    const dagreRef = useRef(null);   
    const [reZoom, setReZoom] = useState(true);
    
    useEffect( () => {
        const view_config = {
            rankDir: "LR",
            label_components: ["id"],
            packet_flow_view: true,
            include_disconnected: true,
            show_all_nodes: true
        }
        const node_events = {
            "mouseover": (parent, node, d) => {return},
            "mouseout": (parent, node, d) => {return},
            "click": (parent, node, d) => {return},
            "contextmenu": []
        }
        drawC2PathElements(props.callbackgraphedges, dagreRef, reZoom, view_config, node_events);
        setReZoom(false);
    }, [props.callbackgraphedges, reZoom])
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Callback {props.id}'s Egress Path</DialogTitle>
        <DialogContent dividers={true}>
            <React.Fragment>
                <svg ref={dagreRef} id="nodeTree" style={{width: "100%", height: "calc(78vh)", marginTop: "10px"}}></svg>
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}
const disconnected = `stroke: ${muiTheme.palette.warning.main}; stroke-width: 3px; stroke-dasharray: 5, 5; fill:none`;
const disconnectedArrow = `fill: ${muiTheme.palette.warning.main}`;
const connected = `stroke: ${muiTheme.palette.info.main}; fill: none; stroke-width: 1.5px;`;
const connectedArrow = `stroke: ${muiTheme.palette.info.main}; fill: ${muiTheme.palette.info.main}; stroke-width: 1.5px;`
const nodeColor = `fill: ${muiTheme.palette.success.main}`;
const nodeLabelStyle = `labelStyle: "font-size: 2em";`;
const edgeLabelStyle = `labelStyle: "font-size: 2em"`;
const add_edge_to_mythic = (g, edge, view_config) => {
    if(!edge.source.active && !view_config["show_all_nodes"]){return}
    add_node(g, edge.source, view_config);
    g.setEdge(edge.source.id, "Mythic",  {label: edge.c2profile.name, edge_id: edge.id, end_timestamp: edge.end_timestamp,direction: edge.direction,
        style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
        arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)
}
const add_node = (g, node, view_config) => {
    g.setNode(node.id, {label: getLabel(node, view_config["label_components"]),  node: node, style: nodeColor, labelStyle: nodeLabelStyle, shape: 'circle'});
    g.setNode(node.host, {label: node.host, clusterLabelPos: 'top', style: 'fill:#d3d7e8', node: null});
    g.setParent(node.id, node.host);
}
const getLabel = (edge, label_components) => {
    return label_components.map( (name) => {
        return edge[name]
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
    if(edge.direction === 1){
        if(view_config["packet_flow_view"]){
            createEdge(g, edge, 2);
        }else{
            createEdge(g, edge, 1);
        }
    }else if(edge.direction === 2){
        createEdge(g, edge, 2);
    }else{
        createEdge(g, edge, 1);
        createEdge(g, edge, 2);
    }
}
const createEdge = (g, edge, adjusted_direction) =>{
    if(adjusted_direction === 1){
        g.setEdge(edge.source.id, edge.destination.id,  {label: edge.c2profile.name, edge_id: edge.id,end_timestamp: edge.end_timestamp, direction: edge.direction,
                    style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
                    arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)
    }else if(adjusted_direction === 2){
        g.setEdge(edge.destination.id, edge.source.id,  {label: edge.c2profile.name, edge_id: edge.id, end_timestamp: edge.end_timestamp, direction: edge.direction,
                    style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
                    arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)
    }
}

export const drawC2PathElements = (edges, dagreRef, reZoom, view_config, node_events) =>{
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
    g.setNode("Mythic", {label: "", style: nodeColor, shape: 'circle', node: null, labelStyle: nodeLabelStyle});
    edges.forEach( (edge) => {
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
            if(edge.direction === 1){
                if(!view_config["packet_flow_view"]){
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
                }else{
                    if(g.hasEdge(edge.destination.id, edge.source.id, edge.c2profile.name)){
                        //we've seen an edge between these two before
                        if(edge.id > g.edge(edge.destination.id, edge.source.id, edge.c2profile.name).edge_id){
                            add_edge_p2p(g, edge, view_config);
                        }
                    }else{
                        //this is a new edge
                        add_edge_p2p(g, edge, view_config);
                    }
                }
                
            }else if(edge.direction === 2){
                if(g.hasEdge(edge.destination.id, edge.source.id, edge.c2profile.name)){
                    //we've seen an edge between these two before
                   
                    if(edge.id > g.edge(edge.destination.id, edge.source.id, edge.c2profile.name).edge_id){
                        add_edge_p2p(g, edge, view_config);
                    }
                }else{
                    //this is a new edge
                    add_edge_p2p(g, edge, view_config);
                }
            }
        }
    });
    var render = new dagreD3.render();
    var width = svg.node().getBoundingClientRect().width;
    var height = svg.node().getBoundingClientRect().height;
         render.shapes().circle = function circle(parent, bbox, node) {
         var shapeSvg = parent.insert("image")
             .attr("class", "nodeImage")
             .attr("xlink:href", function(d) {
                 if (node.node) {
                    return "/new/agents/" + node.node.payload.payloadtype.ptype + ".svg";
                 }else{
                    return "/new/agents/mythic.svg";
                 }
             }).attr("x", "-20px")
             .attr("y", "-20px")
             .attr("width", "40px")
             .attr("height", "40px")
             .on("mouseover", function(d) { node_events["mouseover"](parent, node, d) })
             .on("mouseout", function(d) { node_events["mouseout"](parent, node, d) })
             .on("click", function(d) { d3.event.preventDefault(); node_events["click"](parent, node, d) })
             .on("contextmenu", (d) => {createContextMenu(g, node, node_events["contextmenu"], width, height, "#callbacksgraph")});
         node.intersect = function(point) {
             return dagreD3.intersect.circle(node, 20, point);
         };
         return shapeSvg;
     };
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

