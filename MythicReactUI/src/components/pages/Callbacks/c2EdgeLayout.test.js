/** @jest-environment node */
import ELK from 'elkjs/lib/elk.bundled.js';
import {addC2LayoutData, getC2LayoutEdges, getC2EdgeGeometry} from './c2EdgeLayout';

const elk = new ELK();
const node = (id, extra = {}) => ({id, type: 'agentNode', width: 100, height: 80,
    data: {sourceCount: 1}, layoutOptions: {}, ...extra});
const edge = (id, source, target, extra = {}) => ({id, source, target, sourceHandle: '1',
    label: 'long-profile-name', type: 'C2IconEdge', data: {has_logo: true}, ...extra});
const graph = (direction, children, edges) => ({id: 'root',
    layoutOptions: {'elk.algorithm': 'layered', 'elk.direction': direction,
        'elk.layered.spacing.nodeNodeBetweenLayers': 100},
    children, edges: edges.map((e) => ({...e, sources: [e.source], targets: [e.target]}))});

test.each(['RIGHT', 'LEFT', 'UP', 'DOWN'])('reserves a full chip box and keeps the %s route beside it', async (direction) => {
    const edges = [edge('e', 'a', 'b')];
    const input = graph(direction, [node('a'), node('b')], edges);
    addC2LayoutData(input, edges, {e: {width: 320, height: 28}});
    const result = await elk.layout(input);
    const [output] = getC2LayoutEdges(result, edges);
    const {sections, label} = output.data.c2Layout;
    expect(label.width).toBe(320);
    expect(label.height).toBe(28);
    const horizontal = ['RIGHT', 'LEFT'].includes(direction);
    for(const n of result.children){
        const overlaps = label.x < n.x + n.width && label.x + label.width > n.x &&
            label.y < n.y + n.height && label.y + label.height > n.y;
        expect(overlaps).toBe(false);
    }
    const gap = Math.abs(result.children[0].x - result.children[1].x) - 100;
    expect(!horizontal || gap >= 320).toBe(true);
    // No routed segment may cross the label's interior.
    for(const section of sections){
        const points = [section.startPoint, ...section.bendPoints, section.endPoint];
        points.slice(1).forEach((p, i) => {
            const prev = points[i];
            const clearsLabel = prev.y === p.y ?
                p.y <= label.y - 8 || p.y >= label.y + label.height + 8 ||
                    Math.max(prev.x, p.x) <= label.x || Math.min(prev.x, p.x) >= label.x + label.width :
                p.x <= label.x - 8 || p.x >= label.x + label.width + 8 ||
                    Math.max(prev.y, p.y) <= label.y || Math.min(prev.y, p.y) >= label.y + label.height;
            expect(clearsLabel).toBe(true);
        });
    }
    const source = sections[0].startPoint;
    const target = sections[sections.length - 1].endPoint;
    expect(getC2EdgeGeometry(output.data.c2Layout, source, target).path).toContain('L');
    expect(getC2EdgeGeometry(output.data.c2Layout, {...source, x: source.x + 20}, target)).toBeNull();
    expect(output.data.has_logo).toBe(true);
});

test('uses the individual React Flow source handle positions for parallel profiles', async () => {
    const edges = [edge('first', 'a', 'b'), edge('second', 'a', 'b', {sourceHandle: '2'})];
    const input = graph('RIGHT', [node('a', {data: {sourceCount: 2}}), node('b')], edges);
    addC2LayoutData(input, edges, {first: {width: 90, height: 28}, second: {width: 240, height: 28}});
    const result = await elk.layout(input);
    const outputs = getC2LayoutEdges(result, edges);
    expect(outputs[0].data.c2Layout.sections[0].startPoint.y).toBe(result.children[0].y + 20);
    expect(outputs[1].data.c2Layout.sections[0].startPoint.y).toBe(result.children[0].y + 60);
    expect(outputs[0].data.c2Layout.label).not.toEqual(outputs[1].data.c2Layout.label);
});

test('converts nested edge label and route coordinates to canvas coordinates', async () => {
    const edges = [edge('inside', 'a', 'b')];
    const input = graph('RIGHT', [node('group', {type: 'groupNode rounded', width: 400, height: 200,
        children: [node('a'), node('b')]})], edges);
    addC2LayoutData(input, edges, {inside: {width: 180, height: 28}});
    const result = await elk.layout(input);
    const [output] = getC2LayoutEdges(result, edges);
    const parent = result.children[0];
    const source = parent.children.find((n) => n.id === 'a');
    const point = output.data.c2Layout.sections[0].startPoint;
    expect(point).toEqual({x: parent.x + source.x + source.width, y: parent.y + source.y + source.height / 2});
    const localEdge = result.edges[0];
    expect(output.data.c2Layout.label.x).toBe(parent.x + localEdge.labels[0].x);
    expect(output.data.c2Layout.label.y).toBe(parent.y + localEdge.labels[0].y);
});

test('keeps expanded group ports centered when ELK resizes the group', async () => {
    const edges = [edge('inside', 'a', 'b'), edge('outside', 'group', 'mythic')];
    const input = graph('RIGHT', [node('group', {type: 'groupNode rounded', width: 400, height: 200,
        children: [node('a'), node('b')]}), node('mythic')], edges);
    addC2LayoutData(input, edges, {inside: {width: 320, height: 28}, outside: {width: 160, height: 28}});
    const result = await elk.layout(input);
    const output = getC2LayoutEdges(result, edges).find((e) => e.id === 'outside');
    const parent = result.children.find((n) => n.id === 'group');
    const point = output.data.c2Layout.sections[0].startPoint;
    expect(point.x).toBe(parent.x + parent.width);
    expect(point.y).toBe(parent.y + parent.height / 2);
});

test('does not allocate labels for hidden layout edges', async () => {
    const edges = [edge('hidden', 'a', 'b', {hidden: true, label: ''})];
    const input = graph('RIGHT', [node('a'), node('b')], edges);
    addC2LayoutData(input, edges, {hidden: {width: 320, height: 28}});
    expect(input.edges[0].labels).toBeUndefined();
});
