import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import world from 'world-atlas/countries-50m.json';
import { Topology, Objects } from "topojson-specification";
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink, SankeyGraph } from "d3-sankey";

interface WorldTopology extends Topology<Objects<GeoJSON.GeoJsonProperties>> { }
interface MapProps {
    data: d3.DSVRowArray<string>;
    category: string;
    year: string;
    onCountrySelect: (country: string) => void;
}

export default function GlobeMap({ data, category, year, onCountrySelect }: MapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    let zoomLevel = useRef(0.8);
    let rotation = useRef<[number, number, number]>([8.2439, -53.4129, 0]);

    async function drawMap() {
        if (!containerRef.current) return;

        const width = window.innerWidth;
        const height = window.innerHeight;
        const baseScale = Math.min(width, height) / 2.2;

        d3.select(containerRef.current).selectAll('*').remove();

        const svg = d3.select(containerRef.current)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const tooltip = d3.select(containerRef.current)
            .append('div')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('border', '1px solid #ccc')
            .style('padding', '5px')
            .style('border-radius', '5px')
            .style('box-shadow', '0 0 5px rgba(0,0,0,0.3)')
            .style('pointer-events', 'none')
            .style('opacity', 0);

        const numStars = 200;
        const stars = Array.from({ length: numStars }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5
        }));

        const drawBackground = () => {
            svg.append('rect')
                .attr('width', width)
                .attr('height', height)
                .attr('fill', 'black');

            stars.forEach(star => {
                svg.append('circle')
                    .attr('cx', star.x)
                    .attr('cy', star.y)
                    .attr('r', star.radius)
                    .attr('fill', 'white');
            });

            // Add title to the top center of the background
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', 40)
                .attr('fill', 'white')
                .attr('font-size', '24px')
                .attr('text-anchor', 'middle')
                .text("Visualisation of Ireland's Global Exports");
        };

        const drawSankey = () => {
            // Prepare the trade data
            const tradeData: { [key: string]: number } = {};
            let total = 0;
            data.forEach((row) => {
                if (row["Year"] === year && row["Commodity Group"] !== "Total merchandise trade (0 - 9)") {
                    const commodityGroup = row["Commodity Group"] as string;
                    const value = Number(row["VALUE"]) * 1000;
                    tradeData[commodityGroup] = (tradeData[commodityGroup] || 0) + value;
                    total += value;
                }
            });

            const country = "Ireland";
            const graph: SankeyGraph<
                SankeyNode<{ id: string }, {}>,
                SankeyLink<{}, {}>
            > = {
                nodes: [],
                links: [],
            };

            const objectEntries = Object.entries(tradeData);

            let nodeIndex = 0;
            graph.nodes.push({ id: country });
            nodeIndex++;

            graph.nodes.push({ id: "Other Exports" });
            nodeIndex++;

            graph.links.push({
                source: 0,
                target: 1,
                value: 0,
            });

            objectEntries.forEach((entry) => {
                const commodity = entry[0];
                const value = entry[1];
                const portion = value / total;
                if (portion > 0.02) {
                    graph.nodes.push({ id: commodity });
                    graph.links.push({
                        source: 0,
                        target: nodeIndex,
                        value,
                    });
                    nodeIndex++;
                } else {
                    graph.links[0].value += value;
                }
            });

            if (graph.nodes.length === 1 || graph.links.length === 0) {
                console.error("Sankey graph data is incomplete.");
                return;
            }

            const paddingHeight = 60; // Adjust as needed
            const padding = 20;
            const width = Number(svg.attr('width')) - padding * 2;
            const height = Number(svg.attr('height')) - paddingHeight * 2;

            // Create a Sankey generator
            const sankeyGenerator = sankey<SankeyNode<{ id: string }, {}>, SankeyLink<{}, {}>>()
                .nodeWidth(100)
                .nodePadding(20)
                .extent([[padding, paddingHeight], [padding + width, paddingHeight + height]]);

            const sankeyData = sankeyGenerator(graph);

            if (!sankeyData) {
                console.error("Sankey generation failed.");
                return;
            }

            const { nodes, links } = sankeyData;
            // Merge links with width less than 1 into "Other Commodities"
            const otherLinks = links.filter(link => link.width && link.width < 1);
            const otherValue = otherLinks.reduce((acc, link) => acc + (link.value || 0), 0);

            if (otherValue > 0) {
                const otherNode = { id: "Other Commodities" };
                graph.nodes.push(otherNode);

                otherLinks.forEach(link => {
                    link.target = graph.nodes.length - 1;
                });

                graph.links.push({
                    source: objectEntries.length,
                    target: graph.nodes.length - 1,
                    value: otherValue,
                });
            }

            // Filter out the merged links
            const filteredLinks = links.filter(link => link.width && link.width >= 1);

            const link = svg.append("g")
                .attr("fill", "none")
                .attr("stroke-opacity", 0.5)
                .selectAll("path")
                .data(filteredLinks)
                .enter().append("path")
                .attr("d", sankeyLinkHorizontal())
                .attr("stroke", (d) => {
                    const gradientId = `gradient-${d.index}`;
                    const gradient = svg.append("defs")
                        .append("linearGradient")
                        .attr("id", gradientId)
                        .attr("gradientUnits", "userSpaceOnUse")
                        .attr("x1", Number((d.source as SankeyNode<{ id: string }, {}>).x1))
                        .attr("x2", Number((d.target as SankeyNode<{ id: string }, {}>).x0));

                    gradient.append("stop")
                        .attr("offset", "0%")
                        .attr("stop-color", "rgba(0, 128, 255, 0.7)");

                    gradient.append("stop")
                        .attr("offset", "100%")
                        .attr("stop-color", "rgba(255, 128, 0, 0.5)");

                    return `url(#${gradientId})`;
                })
                .attr("stroke-width", (d) => Math.max(1, d.width || 0));

            // Draw nodes
            const node = svg.append("g")
                .selectAll(".node")
                .data(nodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${d.x0},${d.y0})`);

            node.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", d => (d.y1 ?? 0) - (d.y0 ?? 0))
                .attr("width", d => (d.x1 ?? 0) - (d.x0 ?? 0))
                .attr("fill", "#4682B4")
                .attr("stroke", "#000");


            node.append("text")
                .attr("x", d => d.id === country ? ((d.x1 ?? 0) - (d.x0 ?? 0)) / 2 : ((d.x1 ?? 0) - (d.x0 ?? 0)) / 2 + 45)
                .attr("y", d => ((d.y1 ?? 0) - (d.y0 ?? 0)) / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", d => d.id === country ? "middle" : "end")
                .attr("fill", "white")
                .attr("font-size", d => d.id === country ? "20px" : "13px")
                .text(d => d.id.split('(')[0].trim());

            // Prepare the tooltip
            const tooltip = d3.select(containerRef.current)
                .append('div')
                .style('position', 'absolute')
                .style('background', 'white')
                .style('color', 'black')
                .style('padding', '5px')
                .style('border-radius', '5px')
                .style('pointer-events', 'none')
                .style('opacity', 0);

            // Add mouseover event for tooltip
            svg.on('mousemove', (event) => {
                const [x, y] = d3.pointer(event);
                const hoveredNode = nodes.find((node) =>
                    x >= node.x0! && x <= node.x1! && y >= node.y0! && y <= node.y1!
                );
                const value = hoveredNode ? hoveredNode.value : 0;

                if (hoveredNode) {
                    tooltip.style('opacity', 1)
                        .html(`<b>Category:</b> ${hoveredNode.id.split('(')[0].trim()}<br/><b>Value:</b> €${Math.round(Number(value) / 1000000000).toLocaleString()} billion`)
                        .style('left', `${event.pageX - 300}px`)
                        .style('top', `${event.pageY - 80}px`)
                        .style('color', 'black');
                } else {
                    tooltip.style('opacity', 0);
                }
            });

            svg.on('mouseout', () => {
                tooltip.style('opacity', 0);
            });
        };

        const worldTyped = world as unknown as WorldTopology;
        const countries = topojson.feature(worldTyped, worldTyped.objects.countries);

        if (!("features" in countries)) return;
        const irelandFeature = countries.features.find(f => f.properties?.name === "Ireland");
        if (!irelandFeature) return;
        const irelandCoords = d3.geoCentroid(irelandFeature);
        if (!irelandCoords) return;

        const projection = d3.geoOrthographic()
            .scale(baseScale * zoomLevel.current)
            .translate([width / 2, height / 2])
            .clipAngle(90)
            .rotate(rotation.current);

        const path = d3.geoPath(projection);

        const drawLinks = () => {
            const links: { source: [number, number]; target: [number, number]; exportValue: number; country: string; value: number; }[] = [];
            let maxExportValue = 0;

            for (let i = 0; i < data.length; i++) {
                if (data[i]["Commodity Group"] !== category || data[i]["Year"] !== year) continue;
                let country = data[i].Country;
                let exportValue = Number(data[i]["VALUE"]) * 1000;

                if (country === "USA") country = "United States of America";
                if (country === "Great Britain") {
                    country = "United Kingdom";
                    exportValue += Number(data[i + 1]["VALUE"]) * 1000;
                }

                const targetCountry = countries.features.find(
                    (f) => f.properties?.name === country
                );

                if (targetCountry) {
                    const targetCoords = d3.geoCentroid(targetCountry);
                    if (targetCoords) {
                        links.push({
                            source: irelandCoords,
                            target: targetCoords,
                            exportValue,
                            country,
                            value: 0
                        });
                    }
                }
                if (exportValue > maxExportValue) {
                    maxExportValue = exportValue;
                }
            }

            links.forEach(link => {
                link.value = (link.exportValue / maxExportValue);
            });

            const linkGroup = svg.append("g")
                .attr("class", "links");

            links.forEach(link => {
                const { source, target, value, country } = link;
                const lineWidth = value * 50;
                const interpolate = d3.geoInterpolate(source, target);
                const steps = 50;
                const color = d3.interpolateRainbow(value);

                for (let i = 0; i < steps; i++) {
                    const t1 = i / steps;
                    const t2 = (i + 1) / steps;
                    const point1 = interpolate(t1);
                    const point2 = interpolate(t2);

                    linkGroup.append("path")
                        .datum({
                            type: "LineString",
                            coordinates: [point1, point2]
                        })
                        .attr("d", path as any)
                        .attr("stroke", color)
                        .attr("stroke-width", 1 + (lineWidth * t2))
                        .attr("stroke-linecap", "round")
                        .attr("fill", "none");
                }
            });
        };

        const draw = () => {
            svg.selectAll('*').remove();

            drawBackground();
            drawSankey();

            svg.append("path")
                .datum({ type: "Sphere" })
                .attr("d", path as unknown as string)
                .attr("fill", "#87CEEB");

            if ("features" in countries) {
                svg.selectAll(".country")
                    .data(countries.features)
                    .enter().append("path")
                    .attr("class", "country")
                    .attr("d", path)
                    .attr("fill", (d) => d.properties?.name === "Ireland" ? '#009A49' : '#C2D784')
                    .attr("stroke", 'rgba(0, 0, 0, 0.5)')
                    .attr("stroke-width", 0.2 * zoomLevel.current)
                    .attr("stroke-linejoin", "round")
                    .on('mouseover', (event, d) => {
                        tooltip.style('opacity', 1)
                            .html(d.properties?.name)
                            .style('color', 'black');
                    })
                    .on('mousemove', (event) => {
                        tooltip.style('left', `${event.pageX + 10}px`)
                            .style('top', `${event.pageY + 10}px`);
                    })
                    .on('mouseout', () => {
                        tooltip.style('opacity', 0);
                    });

                svg.selectAll(".country")
                    .attr("stroke-width", function () {
                        return Math.max(0.4, 0.2 * zoomLevel.current);
                    });
            }

            drawLinks();
        };

        const drag = d3.drag<SVGSVGElement, unknown>()
            .on('start', (event) => {
                event.sourceEvent.preventDefault();
            })
            .on('drag', (event) => {
                const dx = event.dx;
                const dy = event.dy;
                const rotationSpeed = 0.3 / zoomLevel.current;
                rotation.current[0] += dx * rotationSpeed;
                rotation.current[1] -= dy * rotationSpeed;

                projection.rotate(rotation.current);
                draw();
            });

        const svgNode = svg.node();
        if (svgNode) {
            d3.select(svgNode).call(drag);
        }

        draw();

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.8, 9])
            .on('zoom', (event) => {
                // Apply the zoom scale to the projection
                projection.scale(baseScale * event.transform.k);
                zoomLevel.current = event.transform.k;
                draw();
            });

        d3.select(svg.node() as SVGSVGElement).call(zoom).call(zoom.transform, d3.zoomIdentity.scale(zoomLevel.current));

        svg.on('click', (event) => {
            const [x, y] = d3.pointer(event);
            const invert = projection.invert ? projection.invert([x, y]) : null;

            if (invert && "features" in countries) {
                const feature = countries.features.find((f) => {
                    return f.geometry && d3.geoContains(f, invert);
                });

                if (feature && feature.properties && feature.properties.name) {
                    let country = feature.properties.name;
                    if (country === "United States of America") country = "USA";
                    if (country === "United Kingdom") country = "Great Britain";
                    onCountrySelect(country);
                }
            }
        });
    };

    useEffect(() => {
        drawMap();

        const handleResize = () => drawMap();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        drawMap();
    }, [category, year]);


    return <div ref={containerRef}></div>;
}
