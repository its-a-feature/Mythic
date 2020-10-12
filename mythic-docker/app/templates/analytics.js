document.title="Analytics";
var command_frequencies = new Vue({
    el: '#commandFrequencies',
    data: {
        frequencies: {},
        total_counts: [],
        selected_frequencies: [],
        ptype_breakdowns: {}
    },
    delimiters: ['[[', ']]']
});
var artifact_overview = new Vue({
    el: '#artifactOverview',
    data: {
        artifacts: {"artifact_counts": 0},
        payload_frequencies: "",
        selected_artifact: ""
    },
    delimiters: ['[[', ']]']
});
var callback_analysis = new Vue({
    el: '#callbackAnalysis',
    data: {
        callbacks: {"hosts": {}, "users": {}}
    },
    delimiters: ['[[', ']]']
});
var event_analysis = new Vue({
    el: '#EventOverview',
    data: {
        operator: ""
    },
    delimiters: ['[[', ']]']
});

function update_command_frequencies(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){
            let donut_payload_type = donutChart()
                .width(960)
                .height(500)
                .cornerRadius(3) // sets how rounded the corners are on each slice
                .padAngle(0.015) // effectively dictates the gap between slices
                .variable('count')
                .category('name')
                .clickAction((data)=>{
                    d3.selectAll('.operator_specific').remove();
                    command_frequencies.selected_frequencies = [];
                    command_frequencies.$forceUpdate();
                    Vue.nextTick().then(function(){
                        let inner_donuts = donutChart()
                            .width(660)
                            .height(300)
                            .cornerRadius(3) // sets how rounded the corners are on each slice
                            .padAngle(0.015) // effectively dictates the gap between slices
                            .variable('count')
                            .category('name');
                        let new_data = [];
                        let i = 0;
                        for(const [p, v] of Object.entries(command_frequencies.ptype_breakdowns)){
                            let inner_data = []; // specific entries for a payload type
                            for(const[c, n] of Object.entries(v)){
                                inner_data.push({"name": c, "count": n});
                            }
                            new_data.push({"id": i, "name": p, "values": inner_data});
                            i++;
                        }
                        command_frequencies.selected_frequencies = new_data;
                        command_frequencies.$forceUpdate();
                        Vue.nextTick().then(function () {
                            for(let i = 0; i < command_frequencies.selected_frequencies.length; i++){
                                d3.select('#operator_command_usage_' + command_frequencies.selected_frequencies[i]['id'])
                                .datum(command_frequencies.selected_frequencies[i]['values'])
                                .call(inner_donuts); // draw chart in div
                            }
                        });
                    });
                });
            let donut_user = donutChart()
                .width(960)
                .height(500)
                .cornerRadius(3) // sets how rounded the corners are on each slice
                .padAngle(0.015) // effectively dictates the gap between slices
                .variable('count')
                .category('name')
                .clickAction((data)=>{
                    d3.selectAll('.operator_specific').remove();
                    command_frequencies.selected_frequencies = [];
                    command_frequencies.$forceUpdate();
                    Vue.nextTick().then(function(){
                        let inner_donuts = donutChart()
                            .width(660)
                            .height(300)
                            .cornerRadius(3) // sets how rounded the corners are on each slice
                            .padAngle(0.015) // effectively dictates the gap between slices
                            .variable('count')
                            .category('name');
                        let new_data = [];
                        let i = 0;
                        // for a given operator, get all of their payload-specific stats
                        for(const [p, v] of Object.entries(command_frequencies.frequencies[data['data']['name']])){
                            let inner_data = [];
                            for(const[c, n] of Object.entries(v)){
                                if(c !== "total_count"){
                                    inner_data.push({"name": c, "count": n});
                                }
                            }
                            new_data.push({"id": i, "name": p + " - " + data['data']['name'], "values": inner_data});
                            i++;
                        }

                        command_frequencies.selected_frequencies = new_data;
                        command_frequencies.$forceUpdate();
                        Vue.nextTick().then(function () {
                            for(let i = 0; i < command_frequencies.selected_frequencies.length; i++){
                                d3.select('#operator_command_usage_' + command_frequencies.selected_frequencies[i]['id'])
                                .datum(command_frequencies.selected_frequencies[i]['values'])
                                .call(inner_donuts); // draw chart in div
                            }
                        });
                    });
                });
            let payload_counts = [];
            let payloads = {};
            command_frequencies.frequencies = data['output'];
            let user_count = 0;
            for(let i in data['output']){ // loop through operators
                for(let j in data['output'][i]){ // loop through payload types
                    user_count += data['output'][i][j]['total_count'];
                    if(payloads.hasOwnProperty(j)){
                        payloads[j] += data['output'][i][j]['total_count'];
                    }else{
                        payloads[j] = data['output'][i][j]['total_count'];
                    }
                    // aggregate the per-operator counts of commands
                    if(!command_frequencies.ptype_breakdowns.hasOwnProperty(j)){
                        command_frequencies.ptype_breakdowns[j] = {};
                    }
                    for(const[k,v] of Object.entries(data['output'][i][j])){
                        if(k !== "total_count"){
                            if(command_frequencies.ptype_breakdowns[j].hasOwnProperty(k)){
                                // we've seen the command before, add to the count
                                command_frequencies.ptype_breakdowns[j][k] += v;
                            }else{
                                command_frequencies.ptype_breakdowns[j][k] = v;
                            }
                        }
                    }
                }
                command_frequencies.total_counts.push({"name": i, "count":user_count});
                user_count = 0;
            }
            for(const [k,v] of Object.entries(payloads)){
                payload_counts.push({"name": k, "count": v});
            }
            d3.select('#payload_type_usage')
                .datum(payload_counts)
                .call(donut_payload_type); // draw chart in div
            d3.select('#operator_usage')
                .datum(command_frequencies.total_counts)
                .call(donut_user);

        }else{
            alertTop("danger", data['error']);
        }
    }catch(error){
        console.log(error);
        alertTop("danger", "Session expired, please refresh");
    }
}
function update_artifact_overview(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){
            artifact_overview.artifacts = data['output'];
            artifact_overview.$forceUpdate();
            let target_artifacts = donutChart()
                .width(960)
                .height(500)
                .cornerRadius(3) // sets how rounded the corners are on each slice
                .padAngle(0.015) // effectively dictates the gap between slices
                .variable('count')
                .category('name')
                .clickAction((data2)=> {
                    d3.selectAll('.payload_artifact_specific').remove();
                    artifact_overview.payload_frequencies = [];
                    artifact_overview.$forceUpdate();
                    if (artifact_overview.artifacts["artifact_payloads"].hasOwnProperty(data2.data.name)) {
                        artifact_overview.selected_artifact = data2.data.name;
                        Vue.nextTick().then(function () {
                            let inner_donuts = donutChart()
                                .width(660)
                                .height(330)
                                .cornerRadius(3) // sets how rounded the corners are on each slice
                                .padAngle(0.015) // effectively dictates the gap between slices
                                .variable('count')
                                .category('name');
                            let new_data = [];
                            let i = 0;
                            for (const [p, v] of Object.entries(artifact_overview.artifacts["artifact_payloads"][data2.data.name])) {
                                let inner_data = []; // specific entries for a payload type
                                for (const [c, n] of Object.entries(v)) {
                                    inner_data.push({"name": c, "count": n});
                                }
                                new_data.push({"id": i, "name": p, "values": inner_data});
                                i++;
                            }
                            artifact_overview.payload_frequencies = new_data;
                            artifact_overview.$forceUpdate();
                            Vue.nextTick().then(function () {
                                for (let i = 0; i < new_data.length; i++) {
                                    d3.select('#payload_command_usage_' + artifact_overview.payload_frequencies[i]['id'])
                                        .datum(artifact_overview.payload_frequencies[i]['values'])
                                        .call(inner_donuts); // draw chart in div
                                }
                            });
                        });
                    }
                    else{
                        artifact_overview.selected_artifact = "";
                    }
                });
            let target_artifact_data = [];
            for(const[k,v] of Object.entries(artifact_overview.artifacts['artifact_counts'])){
                if(k !== "total_count"){
                    target_artifact_data.push({
                        "name": k,
                        "agent_reported": v["agent_reported"],
                        "manual_adds": v["manual"],
                        "count": v["agent_reported"] + v["manual"],

                    });
                }
            }
            d3.select('#target_artifacts')
                .datum(target_artifact_data)
                .call(target_artifacts); // draw chart in div
            let file_artifacts = [];
            let file_donut_artifacts = donutChart()
                .width(960)
                .height(500)
                .cornerRadius(3) // sets how rounded the corners are on each slice
                .padAngle(0.015) // effectively dictates the gap between slices
                .variable('count')
                .category('name');
            for(const[k,v] of Object.entries(artifact_overview.artifacts['files'])){
                if(v['total_count'] !== 0 && v['total_count'] !== undefined){
                    let new_dict = {"name": k, "count": v["total_count"]};
                    for(const[o,d] of Object.entries(v["operators"])){
                        new_dict[o] = d;
                    }
                    file_artifacts.push(new_dict);
                }
            }
            d3.select('#file_artifacts')
                .datum(file_artifacts)
                .call(file_donut_artifacts); // draw chart in div
        }else{
            alertTop("danger", data['error']);
        }
    }catch(error){
        alertTop("danger", "Session expired, please refresh");
    }
}
function update_callback_analysis(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){
            callback_analysis.callbacks['hosts'] = data['hosts'];
            callback_analysis.callbacks['users'] = data['users'];
            let donut = donutChart()
                .width(960)
                .height(500)
                .cornerRadius(3) // sets how rounded the corners are on each slice
                .padAngle(0.015) // effectively dictates the gap between slices
                .variable('count')
                .category('name');
            d3.select('#callbacks_by_host_vis')
                .datum(callback_analysis.callbacks['hosts'])
                .call(donut); // draw chart in div
            d3.select('#callbacks_by_user_vis')
                .datum(callback_analysis.callbacks['users'])
                .call(donut); // draw chart in div
            let barChart = BarChart("Number of Callbacks", "Operation Days (UTC)")
              .width(960)
              .height(550)
              .x("date")
              .y("count");
          d3.select("#callback_timeline")
            .datum(data['timings'])
            .call(barChart);
        }else{
            alertTop("danger", data['error']);
        }
    }catch(error){
        console.log(error);
        alertTop("danger", "Session expired, please refresh");
    }
}
function update_task_overview(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){
          let barChart = BarChart("Number of Tasks", "Operation Days (UTC)")
              .width(960)
              .height(550)
              .x("date")
              .y("count");
          d3.select("#task_timeline")
            .datum(data['output'])
            .call(barChart);
        }else{
            alertTop("danger", data['error']);
        }

    }catch(error){
        console.log(error);
        alertTop("danger", "Session expired, please refresh");
    }
}
function update_event_overview(response){
    try{
        let data = JSON.parse(response);
        if(data['status'] === "success"){
          let barChart = BarChart("Number of Events", "Operation Days (UTC)")
              .width(960)
              .height(550)
              .x("date")
              .y("count");
          d3.select("#event_timeline")
            .datum(data['timings'])
            .call(barChart);
          let donut = donutChart()
                .width(960)
                .height(500)
                .cornerRadius(3) // sets how rounded the corners are on each slice
                .padAngle(0.015) // effectively dictates the gap between slices
                .variable('count')
                .category('name')
                .clickAction((data2)=> {
                    d3.selectAll('.operator_specific_events svg').remove();
                    if (data["operators"].hasOwnProperty(data2.data.name)) {
                        event_analysis.operator = data2.data.name;
                        let inner_donuts = donutChart()
                            .width(660)
                            .height(500)
                            .cornerRadius(3) // sets how rounded the corners are on each slice
                            .padAngle(0.015) // effectively dictates the gap between slices
                            .variable('count')
                            .category('name');
                        Vue.nextTick().then(function () {
                            d3.select('#operator_event_overview')
                                .datum(data["operators"][data2.data.name])
                                .call(inner_donuts); // draw chart in div
                        });
                    }
                    else{
                        event_analysis.operator = "";
                    }
                });
            d3.select('#event_overview')
                .datum(data['output'])
                .call(donut); // draw chart in div
        }else{
            alertTop("danger", data['error']);
        }
    }catch(error){
        console.log(error);
        alertTop("danger", "Session expired, please refresh");
    }
}
function BarChart(xTitle, yTitle){
        var width,
            height,
            xScale = d3.scaleTime(),
            yScale = d3.scaleLinear(),
            color = d3.scaleOrdinal(d3.schemeCategory20c),
            x,
            y,
            margin = { top: 15, bottom: 120, left: 80, right: 20 },
            xAxis = d3.axisBottom(xScale),
            yAxis = d3.axisLeft(yScale);

        function my(selection){

          if(!x) throw new Error("Bar Chart x column must be defined.");
          if(!y) throw new Error("Bar Chart y column must be defined.");
          if(!height) throw new Error("Bar Chart height must be defined.");

          selection.each(function(data) {
            width = document.getElementById("task_graph_div").clientWidth;
            let element_width = width/80;
            xAxis = xAxis.ticks(width/80).tickFormat(d3.timeFormat("%m-%d-%Y:%H"));
            var svg = d3.select(this)
                .attr("width", width)
                .attr("height", height);

            var g = svg.selectAll("g")
              .data([1]);
            g = g.enter().append("g")
              .merge(g)
                .attr("transform",
                      "translate(" + margin.left + "," + margin.top +")");

            var innerWidth = width - margin.left - margin.right;
            var innerHeight = height - margin.top - margin.bottom;
            data.forEach(function(d){
                d.date = d3.timeParse("%m/%d/%Y %H:%M:%S")(d.date);
            });

            xScale
              .domain(d3.extent(data, function(d){ return d.date}))
              .rangeRound([0, innerWidth]).nice();
            yScale
              .domain([0, d3.max(data, function (d){ return d[y] })])
              .rangeRound([innerHeight, 0]);
            let new_data = [];
            data = data.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));
            data.forEach(function(d){
               let scaled = xScale(d.date);
               let found = false;
               new_data.forEach(function(n){
                   let cur_scaled = xScale(n.date);
                   if(scaled >= cur_scaled && scaled <= (cur_scaled + element_width)){
                       found = true;
                       n.count += 1;
                   }
               });
               if(!found){
                   new_data.push({"date": d.date, "count": 1});
               }
            });
            data = new_data;
            xScale
              .domain(d3.extent(data, function(d){ return d.date}))
              .rangeRound([0, innerWidth]).nice();
            yScale
              .domain([0, d3.max(data, function (d){ return d[y] })])
              .rangeRound([innerHeight, 0]);
            var xAxisG = g.selectAll(".x-axis").data([1]);
            xAxisG.enter().append("g")
                .attr("class", "x-axis")
              .merge(xAxisG)
                .attr("transform", "translate(0," + innerHeight +")")
                .call(xAxis)
            .attr("font-size", "1rem")
            .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
            var yAxisG = g.selectAll(".y-axis").data([1]);
            yAxisG.enter().append("g")
                .attr("class", "y-axis")
              .merge(yAxisG)
                .call(yAxis)
                .attr("font-size", "1rem");
            g.append('g')
            .attr('class', 'grid')
            .call(yAxis
                .scale(yScale)
                .tickSize(-innerWidth, 0, 0)
                .tickFormat(''));
            var rects = g.selectAll("rect")
              .data(data);
            rects.exit().remove();
            rects.enter().append("rect")
              .merge(rects)
                .attr("x", function (d){ return xScale(d[x]); })
                .attr("y", function (d){ return yScale(d[y]); })
                .attr("width", element_width)
                .attr("height", function (d){
                  return innerHeight - yScale(d[y]);
                })
                .attr('fill', function(d){return color(d.date)});
          g.append('text')
            .attr('x', -(height / 2) + margin.left )
            .attr('y', -50)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
              .attr('font-size', '1.5rem')
              .attr('fill', '{{config["text-color"]}}')
            .text(xTitle);
          g.append('text')
            .attr('x', (width / 2)  )
            .attr('y', height - 20)
            .attr('text-anchor', 'middle')
              .attr('font-size', '1.5rem')
              .attr('fill', '{{config["text-color"]}}')
            .text(yTitle);
          });

        }

        my.x = function (_){
          return arguments.length ? (x = _, my) : x;
        };

        my.y = function (_){
          return arguments.length ? (y = _, my) : y;
        };

        my.width = function (_){
          return arguments.length ? (width = _, my) : width;
        };

        my.height = function (_){
          return arguments.length ? (height = _, my) : height;
        };

        return my;
      }
function donutChart() {
    var width,
        height,
        margin = {top: 10, right: 10, bottom: 10, left: 10},
        colour = d3.scaleOrdinal(d3.schemeCategory20c), // colour scheme
        variable, // value in data that will dictate proportions on chart
        category, // compare data by
        padAngle, // effectively dictates the gap between slices
        floatFormat = d3.format('.4r'),
        cornerRadius,
        clickAction = undefined;

    function chart(selection){
        selection.each(function(data) {
            // generate chart

            // ===========================================================================================
            // Set up constructors for making donut. See https://github.com/d3/d3-shape/blob/master/README.md
            width = d3.select(this)._groups[0][0].clientWidth;
            let radius = Math.min(width, height) / 2;

            // creates a new pie generator
            let pie = d3.pie()
                .value(function(d) { return floatFormat(d[variable]); })
                .sort(null);

            // contructs and arc generator. This will be used for the donut. The difference between outer and inner
            // radius will dictate the thickness of the donut
            let arc = d3.arc()
                .outerRadius(radius * 0.8)
                .innerRadius(radius * 0.6)
                .cornerRadius(cornerRadius)
                .padAngle(padAngle);

            // this arc is used for aligning the text labels
            let outerArc = d3.arc()
                .outerRadius(radius * 0.9)
                .innerRadius(radius * 0.9);
            // ===========================================================================================

            // ===========================================================================================
            // append the svg object to the selection
            let svg = selection.append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
              .append('g')
                .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
            // ===========================================================================================

            // ===========================================================================================
            // g elements to keep elements within svg modular
            svg.append('g').attr('class', 'slices');
            svg.append('g').attr('class', 'labelName');
            svg.append('g').attr('class', 'lines');
            // ===========================================================================================

            // ===========================================================================================
            // add and colour the donut slices
            let path = svg.select('.slices')
                .datum(data).selectAll('path')
                .data(pie)
              .enter().append('path')
                .attr('fill', function(d) { return colour(d.data[category]); })
                .attr('d', arc);
            // ===========================================================================================

            // ===========================================================================================
            // add text labels
            let label = svg.select('.labelName').selectAll('text')
                .data(pie)
              .enter().append('text')
                .attr('dy', '.35em')
                .html(function(d) {
                    // add "key: value" for given category. Number inside tspan is bolded in stylesheet.
                    return d.data[category] + ': <tspan>' + d.data[variable] + '</tspan>';
                })
                .attr('transform', function(d, i) {

                    // effectively computes the centre of the slice.
                    // see https://github.com/d3/d3-shape/blob/master/README.md#arc_centroid
                    let pos = outerArc.centroid(d);
                    // changes the point to be on left or right depending on where label is.
                    pos[0] = radius * 0.97 * (midAngle(d) < Math.PI ? 1 : -1);
                    return 'translate(' + pos + ')';
                })
                .style('fill', "{{config['text-color']}}")
                .style('text-anchor', function(d) {
                    // if slice centre is on the left, anchor text to start, otherwise anchor to end
                    return (midAngle(d)) < Math.PI ? 'start' : 'end';
                });
            // ===========================================================================================
              const nodes = svg.select('.labelName').selectAll('text').nodes();
              for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                  const previous = nodes[i];
                  const elem = nodes[j];
                  const thisbb = elem.getBoundingClientRect(),
                    prevbb = previous.getBoundingClientRect();
                  if (!(thisbb.right < prevbb.left ||
                    thisbb.left > prevbb.right ||
                    thisbb.bottom < prevbb.top ||
                    thisbb.top > prevbb.bottom)) {
                    const matrix = previous.transform.baseVal.consolidate().matrix;
                    d3.select(elem).attr('transform', `translate(${matrix.e}, ${matrix.f + prevbb.bottom - prevbb.top})`);

                  }
                  //const elemMatrix = elem.transform.baseVal.consolidate().matrix;
                  //pieData[j].pos = [elemMatrix.e, elemMatrix.f];
                }
              }
            // ===========================================================================================
            // add lines connecting labels to slice. A polyline creates straight lines connecting several points
            let polyline = svg.select('.lines')
                .selectAll('polyline')
                .data(pie)
              .enter().append('polyline')
                .attr('points', function(d) {

                    // see label transform function for explanations of these three lines.
                    let pos = outerArc.centroid(d);
                    pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
                    return [arc.centroid(d), outerArc.centroid(d), pos]
                });
            // ===========================================================================================

            // ===========================================================================================
            // add tooltip to mouse events on slices and labels
            svg.selectAll('.labelName text, .slices path').call(toolTip);
            // ===========================================================================================

            // ===========================================================================================
            // Functions

            // calculates the angle for the middle of a slice
            function midAngle(d) { return d.startAngle + (d.endAngle - d.startAngle) / 2; }

            // function that creates and adds the tool tip to a selected element
            function toolTip(selection) {

                // add tooltip (svg circle element) when mouse enters label or slice
                selection.on('mouseenter', function (data) {

                    svg.append('circle')
                        .attr('class', 'toolCircle')
                        .attr('r', radius * 0.55) // radius of tooltip circle
                        .style('fill', colour(data.data[category])) // colour based on category mouse is over
                        .style('fill-opacity', 0.25);
                    svg.append('text')
                        .attr('class', 'toolCircle')
                        .attr('dy', -15) // hard-coded. can adjust this to adjust text vertical alignment in tooltip
                        .html(toolTipHTML(data)) // add text to the circle.
                        .style('font-size', '1em')
                        .style('text-anchor', 'middle')
                        .style('fill', '{{config["text-color"]}}');

                });
                selection.on('click', clickAction);

                // remove the tooltip when mouse leaves the slice/label
                selection.on('mouseout', function () {
                    d3.selectAll('.toolCircle').remove();
                });
            }

            // function to create the HTML string for the tool tip. Loops through each key in data object
            // and returns the html string key: value
            function toolTipHTML(data) {

                let tip = '',
                    i   = 0;
                for (let key in data.data) {
                    // leave off 'dy' attr for first tspan so the 'dy' attr on text element works. The 'dy' attr on
                    // tspan effectively imitates a line break.
                    if (i === 0){
                        if(key === "name"){
                            tip += '<tspan x="0">' + data.data[key] + '</tspan>';
                        }else{
                            tip += '<tspan x="0">' + key + ': ' + data.data[key] + '</tspan>';
                        }
                    }
                    else {
                        tip += '<tspan x="0" dy="1.2em">' + key + ': ' + data.data[key] + '</tspan>';
                    }
                    i++;
                }

                return tip;
            }
            // ===========================================================================================

        });
    }

    // getter and setter functions. See Mike Bostocks post "Towards Reusable Charts" for a tutorial on how this works.
    chart.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return chart;
    };

    chart.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return chart;
    };

    chart.margin = function(value) {
        if (!arguments.length) return margin;
        margin = value;
        return chart;
    };

    chart.radius = function(value) {
        if (!arguments.length) return radius;
        radius = value;
        return chart;
    };

    chart.padAngle = function(value) {
        if (!arguments.length) return padAngle;
        padAngle = value;
        return chart;
    };

    chart.cornerRadius = function(value) {
        if (!arguments.length) return cornerRadius;
        cornerRadius = value;
        return chart;
    };

    chart.colour = function(value) {
        if (!arguments.length) return colour;
        colour = value;
        return chart;
    };

    chart.variable = function(value) {
        if (!arguments.length) return variable;
        variable = value;
        return chart;
    };

    chart.category = function(value) {
        if (!arguments.length) return category;
        category = value;
        return chart;
    };

    chart.clickAction = function(value){
        clickAction = value;
        return chart;
    }

    return chart;
}
function send_command_frequencies_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/command_frequency", update_command_frequencies, "GET", null);
}
function send_callback_analysis_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/callback_analysis", update_callback_analysis, "GET", null);
}
function send_artifact_overview_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/artifact_overview", update_artifact_overview, "GET", null);
}
function send_task_overview_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/task_frequency", update_task_overview, "GET", null);
}
function send_event_overview_data(){
    httpGetAsync("{{http}}://{{links.server_ip}}:{{links.server_port}}{{links.api_base}}/analytics/event_frequency", update_event_overview, "GET", null);
}
send_command_frequencies_data();
send_callback_analysis_data();
send_artifact_overview_data();
send_task_overview_data();
send_event_overview_data();
