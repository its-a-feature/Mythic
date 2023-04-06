import * as d3 from "d3";

export const menuFactory = (g, x, y, menuItems, data, svgId) => {
    d3.select(`.contextMenu`).remove();
    // Draw the menu
    if(menuItems.length > 0){
        d3.select(svgId).append('g').attr('class', 'contextMenu')
            .selectAll('tmp')
            .data(menuItems).enter()
            .append('g').attr('class', "menuEntry")
            .style({'cursor': 'pointer'});

        // Draw menu entries
        d3.selectAll(`.menuEntry`)
            .append('rect')
            .attr('x', x)
            .attr('y', (d, i) => { return y + (i * 30); })
            .attr('rx', 2)
            .attr('fill', '#ffffff')
            .attr('width', 180)
            .attr('height', 30)
            .on('click', (d) => { d.action(g, data) });

        d3.selectAll(`.menuEntry`)
            .append('text')
            .text((d) => { return d.title; })
            .attr('x', x)
            .attr('y', (d, i) => { return y + (i * 30); })
            .attr('dy', 20)
            .attr('dx', 10)
            .on('click', (d) => { d.action(g, data) });

        // Other interactions
        d3.select('body')
            .on('click', () => {
                d3.select(`.contextMenu`).remove();
                d3.select(`.menuEntry`).remove();
            });
        }
}

export const createContextMenu = (g, d, menuItems, width, height, svgId) => {
    menuFactory(g, d3.event.pageX , d3.event.pageY - 80 , menuItems, d, svgId);
    d3.event.preventDefault();
}
