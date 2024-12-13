import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import world from 'world-atlas/countries-50m.json';
import { Topology, Objects } from "topojson-specification";

interface WorldTopology extends Topology<Objects<GeoJSON.GeoJsonProperties>> { }

export default function Map() {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const drawMap = () => {
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

        // Precompute star positions
        const numStars = 200;
        const stars = Array.from({ length: numStars }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5
        }));

        // Draw the black background with stars
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

        const projection = d3.geoOrthographic()
            .scale(Math.min(width, height) / 2.2)
            .translate([width / 2, height / 2])
            .clipAngle(90)
            .rotate([8.2439, -53.4129]); // Center the sphere on Ireland

        const path = d3.geoPath(projection, context);

        const worldTyped = world as unknown as WorldTopology;
        const countries = topojson.feature(worldTyped, worldTyped.objects.countries);

        let rotation: [number, number, number] = [8.2439, -53.4129, 0]; // Initial rotation centered on Ireland
        let zoomLevel = 1;

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
                        context.fillStyle = '#f0e4d7';
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
        

            // Get the center coordinates of Ireland and Russia from the JSON map data
            let irelandFeature, russiaFeature;
            if ("features" in countries) {
                irelandFeature = countries.features.find(f => f.properties?.name === "Ireland");
                russiaFeature = countries.features.find(f => f.properties?.name === "Russia");
            }

            if (irelandFeature && russiaFeature) {
                const irelandCoords = d3.geoCentroid(irelandFeature);
                const russiaCoords = d3.geoCentroid(russiaFeature);

                const projectedIrelandCoords = projection(irelandCoords);
                const projectedRussiaCoords = projection(russiaCoords);

                if (projectedIrelandCoords && projectedRussiaCoords) {
                    const link = {
                        type: "LineString",
                        coordinates: [irelandCoords, russiaCoords]
                    };

                    context.beginPath();
                    path(link as d3.GeoPermissibleObjects);
                    context.strokeStyle = "red"; // Color of the line
                    context.lineWidth = 5; // Width of the line
                    context.stroke();
                }
            }
        
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