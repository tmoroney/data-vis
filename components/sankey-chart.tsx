import * as d3 from "d3";
import React, { useEffect, useRef } from "react";
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from "d3-sankey";

interface Node {
    name: string;
}

interface Link {
    source: number;
    target: number;
    value: number;
}

interface Graph {
    nodes: Node[];
    links: Link[];
}

interface ChartProps {
    data: d3.DSVRowArray<string>;
    country: string;
    year: string;
}

export default function SankeyChart({ data, country, year }: ChartProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        const nodeMap = new Map<string, number>();
        let graph: Graph = { nodes: [], links: [] };
    
        if (!nodeMap.has(country)) {
            nodeMap.set(country, graph.nodes.length);
            graph.nodes.push({ name: country });
        }
    
        for (let i = 0; i < data.length; i++) {
            if (data[i]["Country"] === country && data[i]["Year"] === year) {
                const commodity = data[i]["Commodity Group"];
                const value = Number(data[i]["VALUE"]);
    
                if (!nodeMap.has(commodity)) {
                    nodeMap.set(commodity, graph.nodes.length);
                    graph.nodes.push({ name: commodity });
                }
    
                graph.links.push({
                    source: nodeMap.get(commodity)!,
                    target: nodeMap.get(country)!,
                    value,
                });
            }
        }
    
        if (graph.nodes.length === 0 || graph.links.length === 0) {
            console.error("Graph data is incomplete or empty. Ensure valid nodes and links.");
            return;
        }
    
        console.log("Graph nodes:", graph.nodes);
        console.log("Graph links:", graph.links);
    
        const width = 800;
        const height = 600;
    
        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);
    
        const sankeyGenerator = sankey<SankeyNode<Node, Link>, SankeyLink<Node, Link>>()
            .nodeWidth(20)
            .nodePadding(10)
            .size([width, height]);
    
        try {
            const sankeyData = sankeyGenerator({
                nodes: graph.nodes.map((d) => ({ ...d })),
                links: graph.links.map((d) => ({ ...d })),
            });
    
            svg.selectAll(".node")
                .data(sankeyData.nodes)
                .join("rect")
                .attr("class", "node")
                .attr("x", (d) => d.x0 || 0)
                .attr("y", (d) => d.y0 || 0)
                .attr("width", (d) => (d.x1 || 0) - (d.x0 || 0))
                .attr("height", (d) => (d.y1 || 0) - (d.y0 || 0))
                .attr("fill", "#4682B4")
                .attr("stroke", "#000");
    
            svg.selectAll(".link")
                .data(sankeyData.links)
                .join("path")
                .attr("class", "link")
                .attr("d", sankeyLinkHorizontal())
                .attr("fill", "none")
                .attr("stroke", "#888")
                .attr("stroke-width", (d) => Math.max(1, d.width || 0))
                .attr("opacity", 0.7);
    
        } catch (error) {
            console.error("Error generating Sankey chart:", error);
        }
    }, [data, country, year]);

    return <svg ref={svgRef} />;
}
