import * as d3 from "d3";
import React, { useEffect, useRef } from "react";

interface ChartProps {
    data: d3.DSVRowArray<string>;
    country: string;
    year: string;
}

export default function DonutChart({ data, country, year }: ChartProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        const svgElement = d3.select(svgRef.current);
        svgElement.selectAll("*").remove(); // Clear previous content

        const segments: { key: string; value: number }[] = [];
        let totalValue = 0;
        data.forEach((row) => {
            if (row["Country"] === country && row["Year"] === year) {
                if (row["Commodity Group"] === "Total merchandise trade (0 - 9)") {
                    totalValue = Math.round(Number(row["VALUE"]));
                } else {
                    const commodity = row["Commodity Group"];
                    const value = Math.round(Number(row["VALUE"]));
                    if (!isNaN(value)) {
                        segments.push({ key: commodity, value });
                    }
                }
            }
        });

        // Set dimensions and margins
        const width = 450;
        const height = 450;
        const margin = 40;

        // The radius of the donut chart
        const radius = Math.min(width, height) / 2 - margin;

        // Create the color scale
        const color = d3.scaleOrdinal()
            .domain(segments.map((d) => d.key))
            .range([
                "#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#33FFF5",
                "#F5FF33", "#9C33FF", "#FF9633", "#33FF9C", "#FF3333"
            ]);

        // Append the SVG object to the ref
        const svg = svgElement
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        // Create tooltip
        const tooltip = d3.select(svgRef.current.parentNode as HTMLElement)
            .append("div")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("padding", "5px")
            .style("border-radius", "5px")
            .style("box-shadow", "0px 0px 10px rgba(0,0,0,0.1)")
            .style("pointer-events", "none")
            .style("opacity", 0);

        // Compute the position of each group on the pie
        const pie = d3.pie<{ key: string; value: number }>()
            .value((d) => d.value);

        const dataReady = pie(segments);

        // Shape helper to build arcs
        const arcGenerator = d3.arc<d3.PieArcDatum<{ key: string; value: number }>>()
            .innerRadius(radius * 0.6) // Inner radius for donut chart
            .outerRadius(radius);

        // Build the donut chart
        svg.selectAll(".slice")
            .data(dataReady)
            .enter()
            .append("path")
            .attr("class", "slice")
            .attr("d", arcGenerator)
            .attr("fill", (d, i) => color(d.data.key) as string)
            .attr("stroke", "white")
            .style("stroke-width", "0.5px")
            .style("opacity", 0.7)
            .on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                    .html(`<b>Category:</b> ${d.data.key.split('(')[0].trim()}<br/><b>Value:</b> \$${d.data.value.toLocaleString()}`)
                    .style("min-width", "300px")
                    .style("left", `${event.offsetX + 10}px`)
                    .style("top", `${event.offsetY + 10}px`)
                    .style("color", "black");
            })
            .on("mousemove", (event) => {
                tooltip.style("left", `${event.offsetX + 10}px`)
                    .style("top", `${event.offsetY + 10}px`);
            })
            .on("mouseout", () => {
                tooltip.style("opacity", 0);
            });

        // Add total value text in the center
        svg.append("text")
            .attr("text-anchor", "middle")
            .style("font-size", "28px")
            .style("font-weight", "bold")
            .style("fill", "white")
            .text(`\$${totalValue.toLocaleString()}`);
    }, [data, country, year]);

    return <svg ref={svgRef} />;
}