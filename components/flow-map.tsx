import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

interface ExportData {
    Country: string;
    Exports: number;
}

export default function FlowMap() {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        const width = 800;
        const height = 600;

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);

        const projection = d3.geoMercator()
            .scale(120)
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        const loadMapAndData = async () => {
            try {
                // Load the TopoJSON file directly
                const topoData = await d3.json("/countries-110m.json"); // Replace with the path to your local or remote TopoJSON file

                if (!topoData || !(topoData as any).objects?.countries) {
                    throw new Error("Invalid TopoJSON file.");
                }

                const geoData = topojson.feature(
                    topoData as any,
                    (topoData as any).objects.countries
                ) as unknown as GeoJSON.FeatureCollection<GeoJSON.GeometryObject>;

                const exportData: ExportData[] = await d3.csv("/exports.csv", (d) => ({
                    Country: d.Country || "",
                    Exports: +d.Exports || 0,
                }));

                if (!exportData.length) {
                    throw new Error("Export CSV data is empty or invalid.");
                }

                // Draw the map
                svg.append("g")
                    .selectAll("path")
                    .data(geoData.features)
                    .join("path")
                    .attr("fill", "#b8b8b8")
                    .attr("d", (d) => path(d) || "")
                    .style("stroke", "#fff")
                    .style("stroke-width", 0.5);

                const irelandCoords = projection([-8.2439, 53.4129]); // Longitude, Latitude for Ireland
                if (!irelandCoords) throw new Error("Failed to project Ireland's coordinates.");

                exportData.forEach((row) => {
                    const targetCountry = geoData.features.find(
                        (f) => f.properties?.name === row.Country
                    );
                    if (targetCountry) {
                        const targetCoords = projection(d3.geoCentroid(targetCountry));
                        if (targetCoords) {
                            const link: GeoJSON.Feature<GeoJSON.LineString> = {
                                type: "Feature",
                                geometry: {
                                    type: "LineString",
                                    coordinates: [
                                        [-8.2439, 53.4129], // Ireland's coordinates
                                        d3.geoCentroid(targetCountry), // Target country's centroid
                                    ],
                                },
                                properties: {}, // Empty properties object (can add more if needed)
                            };

                            svg.append("path")
                                .datum(link)
                                .attr("d", (d) => path(d) || "")
                                .style("fill", "none")
                                .style("stroke", "orange")
                                .style("stroke-width", Math.sqrt(row.Exports) / 1000);
                        }
                    } else {
                        console.warn(`Country "${row.Country}" not found in GeoJSON data.`);
                    }
                });
            } catch (error) {
                console.error("Error loading map or data:", error);
            }
        };

        loadMapAndData();
    }, []);

    return <svg ref={svgRef}></svg>;
}