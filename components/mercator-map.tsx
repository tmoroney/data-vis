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

        // Clear previous drawings
        d3.select(containerRef.current).selectAll('*').remove();

        const canvas = d3.select(containerRef.current)
            .append('canvas')
            .attr('width', width)
            .attr('height', height)
            .node() as HTMLCanvasElement;

        const context = canvas.getContext('2d');
        if (!context) return;

        const projection = d3.geoMercator()
            .center([0, 45]) // Center on Europe
            .scale(width * 0.2) // Adjust scale based on screen width for better zoom
            .translate([width / 2, height / 2]);

        const path = d3.geoPath(projection, context);

        const worldTyped = world as unknown as WorldTopology;
        const countries = topojson.feature(worldTyped, worldTyped.objects.countries);

        // Zoom and pan functionality
        const zoom = d3.zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([1, 8]) // Limit zoom scale
            .on('zoom', (event) => {
                const transform = event.transform;
                context.save();
                context.clearRect(0, 0, width, height);
                context.translate(transform.x, transform.y);
                context.scale(transform.k, transform.k);

                if ('features' in countries) {
                    countries.features.forEach((feature) => {
                        context.beginPath();
                        path(feature);
                        context.fillStyle = '#f0e4d7'; // Old paper color
                        context.strokeStyle = '#8b4513'; // Dark brown
                        context.lineWidth = 0.5 / transform.k;
                        context.fill();
                        context.stroke();
                    });
                }

                context.restore();
            });

        d3.select(canvas).call(zoom);

        // Initial render
        if ('features' in countries) {
            countries.features.forEach((feature) => {
                context.beginPath();
                path(feature);
                context.fillStyle = '#f0e4d7'; // Old paper color
                context.strokeStyle = '#8b4513'; // Dark brown
                context.lineWidth = 0.5;
                context.fill();
                context.stroke();
            });
        }
    };

    useEffect(() => {
        drawMap();

        // Redraw map on window resize
        const handleResize = () => drawMap();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <div ref={containerRef}></div>;
}
