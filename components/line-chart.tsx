import * as d3 from "d3";
import { useEffect, useRef } from "react";

interface ChartProps {
    data: d3.DSVRowArray<string>;
    category: string;
}

export default function LineChart({ data, category }: ChartProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        const svgElement = d3.select(svgRef.current);
        svgElement.selectAll("*").remove(); // Clear previous content

        let parsedData: { year: number; value: number }[] = [];

        for (let i = 0; i < data.length; i++) {
            if (data[i]["Commodity Group"] === category) {
                const year = Number(data[i]["Year"]);
                const value = Number(data[i]["VALUE"]) * 1000;
                const existing = parsedData.find((d) => d.year === year);
                if (existing) {
                    existing.value += value;
                } else {
                    parsedData.push({ year, value });
                }
            }
        }

        // Sort data by year
        parsedData.sort((a, b) => a.year - b.year);

        // Set dimensions and margins
        const width = 820;
        const height = 450;
        const margin = 60;

        // Create scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(parsedData, (d) => d.year) as [number, number])
            .range([margin, width - margin]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(parsedData, (d) => d.value)!])
            .range([height - margin, margin]);

        // Append the SVG object to the ref
        const svg = svgElement
            .attr("width", width)
            .attr("height", height)
            .append("g");

        // Create line generator
        const line = d3.line<{ year: number; value: number }>()
            .x((d) => xScale(d.year))
            .y((d) => yScale(d.value));

        // Append the line
        svg.append("path")
            .datum(parsedData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        // Append x-axis
        const xAxis = svg.append("g")
            .attr("transform", `translate(0,${height - margin})`)
            .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.format("d")));

        // Adjust the x-axis label
        xAxis.append("text")
            .attr("fill", "white") // Change text color to white
            .attr("x", width / 2)
            .attr("y", margin - 20) // Move the label further away from the axis
            .attr("text-anchor", "middle")
            .text("Year")
            .style("font-size", "1.5em");

        const yAxis = svg.append("g")
            .attr("transform", `translate(${margin},0)`)
            .call(d3.axisLeft(yScale).ticks(10).tickFormat((d) => {
                const format = d3.format(".2s");
                return format(d).replace("G", "B");
            }));

        // Adjust the y-axis label
        yAxis.append("text")
            .attr("fill", "white") // Change text color to white
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin + 15) // Move the label further away from the axis
            .attr("text-anchor", "middle")
            .text("Export Value (€)")
            .style("font-size", "1.5em");

        // Tooltip
        const tooltip = d3.select(tooltipRef.current)
            .append('div')
            .style('width', '200px')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('color', 'black')
            .style('border', '1px solid #ccc')
            .style('padding', '5px')
            .style('border-radius', '5px')
            .style('box-shadow', '0 0 5px rgba(0,0,0,0.3)')
            .style('pointer-events', 'none')
            .style('display', 'none');

        // Add circles for each data point
        svg.selectAll("circle")
            .data(parsedData)
            .enter()
            .append("circle")
            .attr("cx", (d) => xScale(d.year))
            .attr("cy", (d) => yScale(d.value))
            .attr("r", 8)
            .attr("fill", "steelblue")
            .on("mouseover", (event, d) => {
                tooltip.style("display", "block")
                    .html(`<b>Year:</b> ${d.year}<br><b>Value:</b> €${Math.round(Number(d.value)).toLocaleString()}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("left", `${event.pageX - 300}px`)
                    .style("top", `${event.pageY - 80}px`);
            })
            .on("mouseout", () => {
                tooltip.style("display", "none");
            });

    }, [data, category]);

    return (
        <>
            <svg ref={svgRef} />
            <div ref={tooltipRef} />
        </>
    );
}