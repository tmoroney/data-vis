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

        d3.select(containerRef.current).selectAll('*').remove();

        const canvas = d3.select(containerRef.current)
            .append('canvas')
            .attr('width', width)
            .attr('height', height)
            .node() as HTMLCanvasElement;

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

        const context = canvas.getContext('2d');
        if (!context) return;

        const numStars = 200;
        const stars = Array.from({ length: numStars }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5
        }));

        const drawBackground = () => {
            context.fillStyle = "black";
            context.fillRect(0, 0, width, height);

            stars.forEach(star => {
                context.beginPath();
                context.arc(star.x, star.y, star.radius, 0, 2 * Math.PI);
                context.fillStyle = "white";
                context.fill();
            });

            // Add title to the top center of the background
            context.fillStyle = "white";
            context.font = "24px Arial";
            context.textAlign = "center";
            context.fillText("Visualisation of Ireland's Global Exports", width / 2, 40);
        };

        const drawSankey = () => {
            if (!context) return;

            // Prepare the trade data
            const tradeData: { [key: string]: number } = {};
            data.forEach((row) => {
                if (row["Year"] === year && row["Commodity Group"] !== "Total merchandise trade (0 - 9)") {
                    const commodityGroup = row["Commodity Group"] as string;
                    const value = Number(row["VALUE"]);
                    tradeData[commodityGroup] = (tradeData[commodityGroup] || 0) + value;
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
            for (let i = 0; i < objectEntries.length; i++) {
                const commodity = objectEntries[i][0];
                const value = objectEntries[i][1];
                graph.nodes.push({ id: commodity });
                graph.links.push({
                    source: objectEntries.length,
                    target: i,
                    value,
                });
            }

            graph.nodes.push({ id: country });

            console.log("Sankey graph:", graph);

            if (graph.nodes.length === 1 || graph.links.length === 0) {
                console.error("Sankey graph data is incomplete.");
                return;
            }

            const paddingHeight = 20; // Adjust as needed
            const padding = 20;
            const width = canvas.width - padding * 2;
            const height = canvas.height - paddingHeight * 2;

            // Create a Sankey generator
            const sankeyGenerator = sankey<SankeyNode<{ id: string }, {}>, SankeyLink<{}, {}>>()
                .nodeWidth(80)
                .nodePadding(6)
                .extent([[padding, paddingHeight], [padding + width, paddingHeight + height]]);

            const sankeyData = sankeyGenerator(graph);

            if (!sankeyData) {
                console.error("Sankey generation failed.");
                return;
            }

            const { nodes, links } = sankeyData;

            // Draw links
            links.forEach((link) => {
                const sourceNode = link.source as SankeyNode<{ id: string }, {}>;
                const targetNode = link.target as SankeyNode<{}, {}>;

                context.beginPath();
                const gradient = context.createLinearGradient(
                    sourceNode.x1!,
                    sourceNode.y0!,
                    targetNode.x0!,
                    targetNode.y1!
                );

                gradient.addColorStop(0, "rgba(0, 128, 255, 0.7)");
                gradient.addColorStop(1, "rgba(255, 128, 0, 0.5)");

                context.strokeStyle = gradient;
                context.lineWidth = Math.max(1, link.width || 0);
                context.moveTo(sourceNode.x1!, link.y0!);
                context.bezierCurveTo(
                    sourceNode.x1! + link.width! / 2,
                    link.y0!,
                    targetNode.x0! - link.width! / 2,
                    link.y1!,
                    targetNode.x0!,
                    link.y1!
                );
                context.stroke();
            });

            // Draw nodes
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                context.beginPath();
                context.rect(
                    node.x0!,
                    node.y0!,
                    node.x1! - node.x0!,
                    node.y1! - node.y0!
                );
                context.fillStyle = "#4682B4";
                context.fill();
                context.strokeStyle = "#000";
                context.stroke();

                // Add node labels
                if (node.targetLinks?.length && node.targetLinks[0]?.width && node.targetLinks[0].width > 3 || node.id === country) {
                    context.fillStyle = "rgba(255, 255, 255, 1)";
                    context.font = "12px Arial";
                    context.textAlign = "right";
                    let centerX = (node.x0! + node.x1!) / 2 + 30;
                    if (node.id === country) {
                        context.textAlign = "center";
                        centerX = (node.x0! + node.x1!) / 2;
                        context.font = "20px Arial";
                    }
                    const centerY = (node.y0! + node.y1!) / 2;
                    context.fillText(node.id, centerX, centerY);
                }
            };

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
            canvas.addEventListener('mousemove', (event) => {
                const [x, y] = [event.offsetX, event.offsetY];
                const hoveredNode = nodes.find((node) =>
                    x >= node.x0! && x <= node.x1! && y >= node.y0! && y <= node.y1!
                );
                const value = hoveredNode ? hoveredNode.value : 0;

                if (hoveredNode) {
                    tooltip.style('opacity', 1)
                        .html(`<b>Category:</b> ${hoveredNode.id.split('(')[0].trim()}<br/><b>Value:</b> \$${Number(value).toLocaleString()}`)
                        .style('left', `${event.pageX - 300}px`)
                        .style('top', `${event.pageY - 80}px`)
                        .style('color', 'black');
                } else {
                    tooltip.style('opacity', 0);
                }
            });

            canvas.addEventListener('mouseout', () => {
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
            .scale(Math.min(width, height) / 2.2 * zoomLevel.current)
            .translate([width / 2, height / 2])
            .clipAngle(90)
            .rotate(rotation.current);

        const path = d3.geoPath(projection, context);

        const drawLinks = () => {
            const links: { source: [number, number]; target: [number, number]; exportValue: number; country: string; value: number; }[] = [];
            let maxExportValue = 0;

            for (let i = 0; i < data.length; i++) {
                if (data[i]["Commodity Group"] !== category || data[i]["Year"] !== year) continue;
                let country = data[i].Country;
                let exportValue = Number(data[i]["VALUE"]);

                if (country === "USA") country = "United States of America";
                if (country === "Great Britain") {
                    country = "United Kingdom";
                    exportValue += Number(data[i + 1]["VALUE"]);
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

                    context.beginPath();
                    path({
                        type: "LineString",
                        coordinates: [point1, point2]
                    } as d3.GeoPermissibleObjects);
                    context.strokeStyle = color;
                    context.lineWidth = 1 + (lineWidth * t2);
                    context.lineCap = "round";
                    context.stroke();
                }
            });
        };

        const draw = () => {
            context.save();
            context.clearRect(0, 0, width, height);

            drawBackground();
            drawSankey();

            context.beginPath();
            path({ type: "Sphere" });
            context.clip();

            context.beginPath();
            path({ type: "Sphere" });
            context.fillStyle = "#87CEEB";
            context.fill();

            if ("features" in countries) {
                countries.features.forEach((feature) => {
                    context.beginPath();
                    path(feature);
                    if (feature.properties && feature.properties.name === "Ireland") {
                        context.fillStyle = '#009A49';
                    } else {
                        context.fillStyle = '#C2D784';
                    }
                    context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                    context.lineWidth = 0.2 * zoomLevel.current;
                    context.fill();

                    if (context.lineWidth < 0.4) {
                        context.lineWidth = 0.4;
                    }

                    context.stroke();
                });
            }

            drawLinks();

            context.restore();
        };

        const drag = d3.drag<HTMLCanvasElement, unknown>()
            .on('start', (event) => {
                event.sourceEvent.preventDefault();
            })
            .on('drag', (event) => {
                const dx = event.dx;
                const dy = event.dy;
                const rotationSpeed = 0.2 / zoomLevel.current;
                rotation.current[0] += dx * rotationSpeed;
                rotation.current[1] -= dy * rotationSpeed;

                projection.rotate(rotation.current);
                draw();
            });

        d3.select(canvas).call(drag);

        draw();

        const zoom = d3.zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([0.8, 9])
            .on('zoom', (event) => {
                zoomLevel.current = event.transform.k;
                projection.scale(Math.min(width, height) / 2.2 * zoomLevel.current);
                draw();
            });

        d3.select(canvas).call(zoom).call(zoom.transform, d3.zoomIdentity.scale(zoomLevel.current));

        canvas.addEventListener('mousemove', (event) => {
            const [x, y] = [event.offsetX, event.offsetY];
            const invert = projection.invert ? projection.invert([x, y]) : null;

            if (invert && "features" in countries) {
                const feature = countries.features.find((f) => {
                    return f.geometry && d3.geoContains(f, invert);
                });

                if (feature && feature.properties && feature.properties.name) {
                    tooltip.style('opacity', 1)
                        .html(feature.properties.name)
                        .style('left', `${event.pageX + 10}px`)
                        .style('top', `${event.pageY + 10}px`)
                        .style('color', 'black');
                } else {
                    tooltip.style('opacity', 0);
                }
            } else {
                tooltip.style('opacity', 0);
            }
        });

        canvas.addEventListener('mouseout', () => {
            tooltip.style('opacity', 0);
        });

        canvas.addEventListener('click', (event) => {
            const [x, y] = [event.offsetX, event.offsetY];
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
