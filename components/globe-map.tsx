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
    let zoomLevel = useRef(1);
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
                    source: i,
                    target: objectEntries.length,
                    value,
                });
            }

            graph.nodes.push({ id: country });

            console.log("Sankey graph:", graph);
        
            if (graph.nodes.length === 1 || graph.links.length === 0) {
                console.error("Sankey graph data is incomplete.");
                return;
            }
        
            // Create a Sankey generator
            const sankeyGenerator = sankey<SankeyNode<{ id: string }, {}>, SankeyLink<{}, {}>>()
                .nodeWidth(15)
                .nodePadding(10)
                .extent([[0, 0], [canvas.width-100, canvas.height-20]]);
        
            const sankeyData = sankeyGenerator(graph);
        
            if (!sankeyData) {
                console.error("Sankey generation failed.");
                return;
            }
        
            const { nodes, links } = sankeyData;
        
            // Draw links
            links.forEach((link) => {
                const sourceNode = link.source as SankeyNode<{}, {}>;
                const targetNode = link.target as SankeyNode<{}, {}>;
        
                context.beginPath();
                const gradient = context.createLinearGradient(
                    sourceNode.x1!,
                    sourceNode.y0!,
                    targetNode.x0!,
                    targetNode.y1!
                );
        
                gradient.addColorStop(0, "rgba(0, 128, 255, 0.5)");
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
            nodes.forEach((node) => {
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
                context.fillStyle = "#fff";
                context.font = "12px Arial";
                context.textAlign = "center";
                const centerX = (node.x0! + node.x1!) / 2;
                const centerY = (node.y0! + node.y1!) / 2;
                context.fillText(node.id, centerX, centerY);
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
                const exportValue = Number(data[i]["VALUE"]);

                if (country === "USA") country = "United States of America";

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
                const steps = 100;
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
                    onCountrySelect(feature.properties.name);
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
