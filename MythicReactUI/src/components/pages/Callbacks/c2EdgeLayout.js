// Keep ELK's ports and label boxes in the same coordinates as the React Flow canvas.
export const addC2LayoutData = (graph, edges, labelSizes) => {
    const direction = graph.layoutOptions["elk.direction"];
    const horizontal = direction === "LEFT" || direction === "RIGHT";
    const forward = direction === "RIGHT" || direction === "DOWN";
    const nodes = new Map();
    const visit = (node) => {
        nodes.set(node.id, node);
        node.layoutOptions = {...node.layoutOptions,
            "elk.portConstraints": node.children?.length ? "FIXED_RATIO" : "FIXED_POS"};
        node.ports = [];
        (node.children || []).forEach(visit);
    };
    graph.children.forEach(visit);
    graph.layoutOptions["elk.edgeRouting"] = "ORTHOGONAL";
    graph.layoutOptions["elk.spacing.edgeLabel"] = 8;
    const addPort = (edge, source) => {
        const node = nodes.get(source ? edge.source : edge.target);
        const count = node.data?.sourceCount || 1;
        const index = Number(edge.sourceHandle);
        const ratio = source && node.type === "agentNode" && count > 1 && index > 0 ? (index - 0.5) / count : 0.5;
        const farSide = source ? forward : !forward;
        const id = `${edge.id}:${source ? "source" : "target"}`;
        node.ports.push({
            id,
            width: 0,
            height: 0,
            x: horizontal ? (farSide ? node.width : 0) : node.width * ratio,
            y: horizontal ? node.height * ratio : (farSide ? node.height : 0),
            layoutOptions: {"elk.port.side": horizontal ? (farSide ? "EAST" : "WEST") : (farSide ? "SOUTH" : "NORTH")},
        });
        return id;
    };
    graph.edges.forEach((layoutEdge, index) => {
        const edge = edges[index];
        layoutEdge.sources = [addPort(edge, true)];
        layoutEdge.targets = [addPort(edge, false)];
        const size = labelSizes[edge.id];
        if(!edge.hidden && size){
            layoutEdge.labels = [{
                id: `${edge.id}:label`,
                text: edge.label || "routes",
                width: size.width,
                height: size.height,
                layoutOptions: {
                    "elk.edgeLabels.placement": "CENTER",
                    "elk.edgeLabels.inline": "false",
                },
            }];
        }
    });
};

export const getC2LayoutEdges = (layout, initialEdges) => {
    const origins = new Map();
    const laidOutEdges = new Map();
    const visit = (node, parentX = 0, parentY = 0) => {
        const origin = {x: parentX + (node.x || 0), y: parentY + (node.y || 0)};
        origins.set(node.id, origin);
        (node.edges || []).forEach((edge) => laidOutEdges.set(edge.id, {edge, origin}));
        (node.children || []).forEach((child) => visit(child, origin.x, origin.y));
    };
    visit(layout);
    return initialEdges.map((edge) => {
        const result = laidOutEdges.get(edge.id);
        if(!result){return edge}
        const origin = origins.get(result.edge.container) || result.origin;
        const absolute = (point) => ({x: origin.x + point.x, y: origin.y + point.y});
        const sections = (result.edge.sections || []).map((section) => ({
            startPoint: absolute(section.startPoint),
            bendPoints: (section.bendPoints || []).map(absolute),
            endPoint: absolute(section.endPoint),
        }));
        const label = result.edge.labels?.[0];
        return {
            ...edge,
            data: {
                ...edge.data,
                c2Layout: {
                    sections,
                    label: label ? {...absolute(label), width: label.width, height: label.height} : undefined,
                },
            },
        };
    });
};

export const getC2EdgeGeometry = (layout, source, target) => {
    const sections = layout?.sections;
    if(!sections?.length){return null}
    const start = sections[0].startPoint;
    const end = sections[sections.length - 1].endPoint;
    // A manual move invalidates the stored route. The renderer falls back to a live Bezier.
    if(Math.hypot(start.x - source.x, start.y - source.y) > 3 ||
        Math.hypot(end.x - target.x, end.y - target.y) > 3){return null}
    return {
        path: sections.map((section, index) => {
            const points = [section.startPoint, ...section.bendPoints, section.endPoint];
            if(index === 0){points[0] = source}
            if(index === sections.length - 1){points[points.length - 1] = target}
            return points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x},${point.y}`).join(" ");
        }).join(" "),
        label: layout.label,
    };
};
