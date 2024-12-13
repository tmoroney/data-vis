import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import world from 'world-atlas/countries-50m.json';
import { Topology, Objects } from "topojson-specification";

interface WorldTopology extends Topology<Objects<GeoJSON.GeoJsonProperties>> { }
interface MapProps {
    data: d3.DSVRowArray<string>;
    category: string;
    year: string;
}

export default function Map({ data, category, year }: MapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    async function drawMap() {
        if (!containerRef.current) return;

        // create map of countries
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

        // Calculate star positions for the background
        const numStars = 200;
        const stars = Array.from({ length: numStars }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5
        }));

        // Draw the black background with stars (purely aesthetic)
        const drawBackground = () => {
            context.fillStyle = "black";
            context.fillRect(0, 0, width, height);

            // Draw precomputed stars
            stars.forEach(star => {
                context.beginPath();
                context.arc(star.x, star.y, star.radius, 0, 2 * Math.PI);
                context.fillStyle = "white";
                context.fill();
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
            .scale(Math.min(width, height) / 2.2)
            .translate([width / 2, height / 2])
            .clipAngle(90)
            .rotate([8.2439, -53.4129]); // Center the sphere on Ireland

        const path = d3.geoPath(projection, context);

        // Initial rotation centered on Ireland
        let rotation: [number, number, number] = [8.2439, -53.4129, 0];
        let zoomLevel = 1;

        const batchedLines = () => {
            const links = [];
            let total = 0;
            for (let i = 0; i < data.length; i++) {
                if (data[i]["Commodity Group"] != category || data[i]["Year"] != year ) continue;
                const country = data[i].Country;
                const exportValue = Number(data[i]["VALUE"]);

                const targetCountry = countries.features.find(
                    (f) => f.properties?.name === country
                );

                if (targetCountry) {
                    const targetCoords = d3.geoCentroid(targetCountry);
                    if (targetCoords) {
                        links.push({
                            source: irelandCoords,
                            target: targetCoords,
                            exportValue: exportValue,
                            value: 0 // Initialize value property
                        });
                    }
                }
                total += exportValue;
            }
            
            // Calculate the percentage of the maximum value for the links
            for (let i = 0; i < links.length; i++) {
                links[i]["value"] = links[i].exportValue / total;
            }

            // Draw the links with a gradient effect
            links.forEach(link => {
                const { source, target, exportValue, value } = link;
                const lineWidth = exportValue * 0.0000025; // Full width of the line

                const interpolate = d3.geoInterpolate(source, target);
                const steps = 100; // Number of steps for the gradient effect

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
                    context.strokeStyle = "rgba(255, 0, 0, 0.7)"; // Color of the line
                    context.lineWidth = 0.4 + (lineWidth * t2); // Start with a width of 0.2 and gradually increase
                    context.stroke();
                }
            });
        };

        const draw = () => {
            context.save();
            context.clearRect(0, 0, width, height);

            drawBackground();

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
                    context.strokeStyle = 'rgba(0, 0, 0, 0.5)'; // Set border opacity to 50%
                    context.lineWidth = 0.2 * zoomLevel;
                    context.fill();

                    if (context.lineWidth < 0.4) {
                        context.lineWidth = 0.4;
                    }

                    context.stroke();
                });
            }

            batchedLines();

            context.restore();
        };

        const drag = d3.drag<HTMLCanvasElement, unknown>()
            .on('start', (event) => {
                event.sourceEvent.preventDefault();
            })
            .on('drag', (event) => {
                const dx = event.dx;
                const dy = event.dy;
                const rotationSpeed = 0.2 / zoomLevel;
                rotation[0] += dx * rotationSpeed;
                rotation[1] -= dy * rotationSpeed;

                projection.rotate(rotation);
                draw();
            });

        d3.select(canvas).call(drag);

        draw();

        const zoom = d3.zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([1, 9])
            .on('zoom', (event) => {
                zoomLevel = event.transform.k;
                projection.scale(Math.min(width, height) / 2.2 * zoomLevel);
                draw();
            });

        d3.select(canvas).call(zoom);

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
    };

    useEffect(() => {
        drawMap();

        const handleResize = () => drawMap();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <div ref={containerRef}></div>;
}