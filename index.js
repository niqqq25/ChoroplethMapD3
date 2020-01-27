(async function ready() {
    const map = await fetchMap();
    const data = await fetchData();
    loadChoroplethMap({ map, data });
})();

async function fetchMap() {
    const response = await fetch(
        "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json"
    );
    const json = await response.json();

    if (response.ok) {
        return json;
    } else {
        console.error(json);
    }
}

async function fetchData() {
    const response = await fetch(
        "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json"
    );
    const json = await response.json();

    if (response.ok) {
        return json;
    } else {
        console.error(json);
    }
}

function loadChoroplethMap({ map, data }) {
    const container = d3.select("#choropleth-map-container");

    //title
    container
        .append("h2")
        .attr("id", "title")
        .text("United States Educational Attainment");

    //description
    container
        .append("p")
        .attr("id", "description")
        .text(
            "Percentage of adults age 25 and older with a bachelor's degree or higher (2010-2014)"
        );

    //legend

    const legendHeight = 10;
    const legendWidth = 300;

    const legend = container
        .append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("overflow", "visible")
        .attr("id", "legend");

    const colors = d3.schemeGreens[6];
    const educationArr = data.map(d => d.bachelorsOrHigher);
    const minEducation = Math.min(...educationArr);
    const maxEducation = Math.max(...educationArr);

    const innerLegendTicks = colors.map((color, i) => {
        const tick = (maxEducation - minEducation) / colors.length;
        return tick * i + minEducation;
    });
    innerLegendTicks.shift();
    const legendTicks = [minEducation, ...innerLegendTicks, maxEducation];

    const legendThreshold = d3
        .scaleThreshold()
        .domain(innerLegendTicks)
        .range(colors);

    const legendScale = d3
        .scaleLinear()
        .domain([minEducation, maxEducation])
        .range([0, legendWidth]);

    legend
        .selectAll("rect")
        .data(colors)
        .enter()
        .append("rect")
        .attr("x", (d, i) => legendScale(legendTicks[i]))
        .attr("y", 0)
        .attr("width", (d, i) =>
            legendScale(legendTicks[i + 1] - legendTicks[i] + minEducation)
        )
        .attr("height", legendHeight)
        .attr("fill", d => d);

    const legendAxis = d3
        .axisBottom(legendScale)
        .tickValues(legendTicks)
        .tickFormat(d => Math.round(d) + "%");

    legend
        .append("g")
        .attr("id", "temp-axis")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    //tooltip
    const tooltip = container
        .append("pre")
        .attr("id", "tooltip")
        .attr("class", "tooltip--hidden");

    //chropleth map
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const height = 400 - margin.top - margin.bottom;
    const width = 800 - margin.right - margin.left;

    const chroplethMap = container
        .append("svg")
        .attr("id", "chropleth-map")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.top)
        .style("overflow", "visible")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const feature = topojson.feature(map, map.objects.counties);
    const projection = d3.geoIdentity().fitSize([width, height], feature);
    const path = d3.geoPath().projection(projection);

    //join data
    feature.features.forEach(
        feat => (feat.education = data.find(el => el.fips === feat.id))
    );

    chroplethMap
        .selectAll("path")
        .data(feature.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d =>
            d.education.bachelorsOrHigher
                ? legendThreshold(d.education.bachelorsOrHigher)
                : colors(0)
        )
        .attr("class", "county")
        .attr("data-fips", d => d.id)
        .attr("data-education", d => d.education.bachelorsOrHigher || 0)
        .on("mouseover", d => {
            tooltip
                .classed("tooltip--hidden", false)
                .style("left", d3.event.pageX + 10 + "px")
                .style("top", d3.event.pageY + 10 + "px")
                .attr("data-education", d.education.bachelorsOrHigher)
                .text(formatTooltipText(d.education));
        })
        .on("mouseout", () => {
            tooltip.classed("tooltip--hidden", true);
        });
}

function formatTooltipText(data) {
    if (data) {
        const { area_name, state, bachelorsOrHigher } = data;
        return `${area_name}, ${state}: ${bachelorsOrHigher}%`;
    } else {
        return "No data found";
    }
}
