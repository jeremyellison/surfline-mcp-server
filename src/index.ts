import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { GoogleHandler } from "./google-handler";

// Portuguese mainland surf spots - prioritizing Lisbon region
const PORTUGAL_SPOTS: Record<string, string> = {
	// Lisbon Region
	"Costa da Caparica": "5842041f4e65fad6a7708e65",
	"Carcavelos": "5842041f4e65fad6a7708bc0",
	"Praia do Guincho": "5842041f4e65fad6a7708e64",
	// Ericeira Region (World Surf Reserve)
	"Ribeira D'Ilhas": "5842041f4e65fad6a7708bc2",
	"São Julião": "640b9cda4878ebfad81e2b72",
	"Cave": "5d702a08b8be350001890108",
	// Peniche Region
	"Supertubos": "5842041f4e65fad6a7708bc3",
	"Baleal": "5842041f4e65fad6a7708bc6",
	"Cantinho da Baía": "5a1c9e91cbecc0001bb480c8",
	// Nazaré (Big Wave)
	"Nazaré": "58bdfa7882d034001252e3d8",
};

// Helper functions
async function fetchSurfData(spotId: string, endpoint: string) {
	const url = `https://services.surfline.com/kbyg/spots/forecasts/${endpoint}`;
	const params = new URLSearchParams({ spotId, days: "3" });
	const response = await fetch(`${url}?${params}`);
	return response.json();
}

function degreesToCompass(degrees: number): string {
	const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
	const idx = Math.floor((degrees + 11.25) / 22.5) % 16;
	return directions[idx];
}

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
type Props = {
	login: string;
	name: string;
	email: string;
	accessToken: string;
};

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
	server = new McpServer({
		name: "Portugal Surf Forecast",
		version: "1.0.0",
	});

	async init() {
		// Get complete surf report (all data at once)
		this.server.tool(
			"get_complete_surf_report",
			"PRIMARY TOOL: Use this for ANY surf-related questions. Returns comprehensive Portuguese surf report with: current conditions for all 10 spots, detailed swell breakdown (height/period/direction/power for each swell component), 8-hour forecast for each spot, expert forecaster observations with AM/PM specific timing advice, sunrise/sunset times, and tide schedule. This returns EVERYTHING in one call.",
			{
				spots: z.array(z.string()).optional().describe("Optional list of spot names, e.g., ['Carcavelos', 'Supertubos']"),
			},
			async ({ spots }) => {
				// Fetch forecaster notes with AM/PM details (using Carcavelos as reference)
				const carcavelosId = "5842041f4e65fad6a7708bc0";
				let forecasterNotes = [];
				try {
					const data = await fetchSurfData(carcavelosId, "conditions");
					const conditions = data?.data?.conditions || [];
					forecasterNotes = conditions.slice(0, 3).map((condition: any) => ({
						date: condition.forecastDay,
						forecaster: condition.forecaster?.name || "Surfline",
						headline: condition.headline || "",
						observation: condition.observation?.replace(/<br\/?>/g, "\n") || "",
						am: condition.am?.observation ? {
							observation: condition.am.observation,
							rating: condition.am.rating?.key,
							surf: condition.am.minHeight && condition.am.maxHeight
								? `${condition.am.minHeight}-${condition.am.maxHeight}${condition.am.plus ? "+" : ""}ft`
								: undefined,
							humanRelation: condition.am.humanRelation || undefined,
						} : undefined,
						pm: condition.pm?.observation ? {
							observation: condition.pm.observation,
							rating: condition.pm.rating?.key,
							surf: condition.pm.minHeight && condition.pm.maxHeight
								? `${condition.pm.minHeight}-${condition.pm.maxHeight}${condition.pm.plus ? "+" : ""}ft`
								: undefined,
							humanRelation: condition.pm.humanRelation || undefined,
						} : undefined,
					}));
				} catch (error) {
					forecasterNotes = [{ error: String(error) }];
				}

				// Fetch tide info
				let tideInfo = {};
				try {
					const data = await fetchSurfData(carcavelosId, "tides");
					const tides = data?.data?.tides || [];
					const tideLoc = data?.associated?.tideLocation || {};
					const now = Date.now() / 1000;
					const upcomingTides = tides
						.filter((t: any) => t.timestamp > now && (t.type === "HIGH" || t.type === "LOW"))
						.slice(0, 6)
						.map((t: any) => ({
							time: new Date(t.timestamp * 1000).toLocaleString('en-US', {
								timeZone: 'Europe/Lisbon',
								month: 'short',
								day: 'numeric',
								hour: 'numeric',
								minute: '2-digit',
								hour12: true
							}),
							type: t.type,
							height: t.height,
						}));
					tideInfo = {
						location: tideLoc.name || "Lisbon",
						upcomingTides,
					};
				} catch (error) {
					tideInfo = { error: String(error) };
				}

				// Fetch sunrise/sunset times
				let sunlightTimes = {};
				try {
					const data = await fetchSurfData(carcavelosId, "weather");
					const sunlight = data?.data?.sunlightTimes?.[0];
					if (sunlight) {
						// Convert to local Lisbon time string manually
						const formatLocalTime = (timestamp: number) => {
							const date = new Date(timestamp * 1000);
							// Format in Lisbon timezone
							return date.toLocaleTimeString('en-US', {
								timeZone: 'Europe/Lisbon',
								hour: 'numeric',
								minute: '2-digit',
								hour12: true
							});
						};

						sunlightTimes = {
							sunrise: formatLocalTime(sunlight.sunrise),
							sunset: formatLocalTime(sunlight.sunset),
							dawn: formatLocalTime(sunlight.dawn),
							dusk: formatLocalTime(sunlight.dusk),
						};
					}
				} catch (error) {
					sunlightTimes = { error: String(error) };
				}

				// Fetch spot conditions with FULL details
				const spotsToFetch = spots && spots.length > 0 ? spots : Object.keys(PORTUGAL_SPOTS);
				const spotConditions = [];

				for (const spotName of spotsToFetch) {
					const spotId = PORTUGAL_SPOTS[spotName];
					if (!spotId) {
						spotConditions.push({ spot: spotName, error: "Unknown spot" });
						continue;
					}

					try {
						const [waveData, windData, ratingData] = await Promise.all([
							fetchSurfData(spotId, "wave"),
							fetchSurfData(spotId, "wind"),
							fetchSurfData(spotId, "rating"),
						]);

						// Current conditions (first entry)
						const currentWave = waveData?.data?.wave?.[0] || {};
						const currentWind = windData?.data?.wind?.[0] || {};
						const currentRating = ratingData?.data?.rating?.[0] || {};
						const surf = currentWave.surf || {};
						const windCompass = currentWind.direction ? degreesToCompass(currentWind.direction) : "";

						// Get next 12 hours of forecasts
						const hourlyForecast = [];
						const now = Date.now() / 1000;
						const waves = waveData?.data?.wave || [];
						const winds = windData?.data?.wind || [];
						const ratings = ratingData?.data?.rating || [];

						for (let i = 0; i < Math.min(12, waves.length); i++) {
							if (waves[i].timestamp > now) {
								hourlyForecast.push({
									time: new Date(waves[i].timestamp * 1000).toLocaleString('en-US', {
										timeZone: 'Europe/Lisbon',
										month: 'short',
										day: 'numeric',
										hour: 'numeric',
										minute: '2-digit',
										hour12: true
									}),
									surf: `${waves[i].surf?.min}-${waves[i].surf?.max}${waves[i].surf?.plus ? "+" : ""}ft`,
									humanRelation: waves[i].surf?.humanRelation || "",
									wind: {
										speed: winds[i]?.speed || 0,
										direction: winds[i]?.direction ? degreesToCompass(winds[i].direction) : "",
										type: winds[i]?.directionType || "N/A",
									},
									rating: ratings[i]?.rating?.value || 0,
								});
							}
						}

						// Extract swell details
						const swells = (currentWave.swells || [])
							.filter((s: any) => s.height > 0)
							.map((s: any) => ({
								height: `${s.height.toFixed(1)}ft`,
								period: `${s.period}s`,
								direction: `${Math.round(s.direction)}° (${degreesToCompass(s.direction)})`,
								impact: s.impact,
								power: Math.round(s.power),
							}));

						spotConditions.push({
							spot: spotName,
							current: {
								surf: `${surf.min}-${surf.max}${surf.plus ? "+" : ""}ft`,
								humanRelation: surf.humanRelation || "",
								power: Math.round(currentWave.power || 0),
								wind: {
									speed: currentWind.speed || 0,
									direction: windCompass,
									type: currentWind.directionType || "N/A",
								},
								rating: {
									value: currentRating.rating?.value || 0,
									key: currentRating.rating?.key || "N/A",
								},
							},
							swells,
							hourlyForecast: hourlyForecast.slice(0, 8), // Next 8 hours
						});
					} catch (error) {
						spotConditions.push({ spot: spotName, error: String(error) });
					}
				}

				// Return everything together
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									forecasterNotes,
									sunlightTimes,
									tides: tideInfo,
									spotConditions,
								},
								null,
								2
							),
						},
					],
				};
			},
		);

		// Keep individual tools for specific queries (secondary - use complete report instead)
		this.server.tool(
			"get_surf_forecast",
			"SECONDARY TOOL: Returns only basic spot conditions without forecaster notes or tides. Prefer get_complete_surf_report instead for complete information.",
			{
				spots: z.array(z.string()).optional().describe("Optional list of spot names, e.g., ['Carcavelos', 'Supertubos']"),
			},
			async ({ spots }) => {
				const spotsToFetch = spots && spots.length > 0 ? spots : Object.keys(PORTUGAL_SPOTS);
				const results = [];

				for (const spotName of spotsToFetch) {
					const spotId = PORTUGAL_SPOTS[spotName];
					if (!spotId) {
						results.push({ spot: spotName, error: "Unknown spot" });
						continue;
					}

					try {
						const [waveData, windData, ratingData] = await Promise.all([
							fetchSurfData(spotId, "wave"),
							fetchSurfData(spotId, "wind"),
							fetchSurfData(spotId, "rating"),
						]);

						const wave = waveData?.data?.wave?.[0] || {};
						const wind = windData?.data?.wind?.[0] || {};
						const rating = ratingData?.data?.rating?.[0] || {};
						const surf = wave.surf || {};
						const windCompass = wind.direction ? degreesToCompass(wind.direction) : "";

						results.push({
							spot: spotName,
							surf: `${surf.min}-${surf.max}${surf.plus ? "+" : ""}ft`,
							humanRelation: surf.humanRelation || "",
							wind: {
								speed: wind.speed || 0,
								direction: windCompass,
								type: wind.directionType || "N/A",
							},
							rating: {
								value: rating.rating?.value || 0,
								key: rating.rating?.key || "N/A",
							},
						});
					} catch (error) {
						results.push({ spot: spotName, error: String(error) });
					}
				}

				return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
			},
		);

		// Get forecaster notes tool
		this.server.tool(
			"get_forecaster_notes",
			"SECONDARY TOOL: Returns only forecaster notes. Prefer get_complete_surf_report which includes this plus more.",
			{
				days: z.number().optional().default(3).describe("Number of days to fetch (default 3)"),
			},
			async ({ days }) => {
				const carcavelosId = "5842041f4e65fad6a7708bc0";
				try {
					const data = await fetchSurfData(carcavelosId, "conditions");
					const conditions = data?.data?.conditions || [];
					const notes = conditions.slice(0, days).map((condition: any) => ({
						date: condition.forecastDay,
						forecaster: condition.forecaster?.name || "Surfline",
						headline: condition.headline || "",
						observation: condition.observation?.replace(/<br\/?>/g, "\n") || "",
					}));
					return { content: [{ type: "text", text: JSON.stringify(notes, null, 2) }] };
				} catch (error) {
					return { content: [{ type: "text", text: `Error: ${error}` }] };
				}
			},
		);

		// Get tides tool
		this.server.tool("get_tides", "SECONDARY TOOL: Returns only tides. Prefer get_complete_surf_report which includes this plus more.", {}, async () => {
			const carcavelosId = "5842041f4e65fad6a7708bc0";
			try {
				const data = await fetchSurfData(carcavelosId, "tides");
				const tides = data?.data?.tides || [];
				const tideLoc = data?.associated?.tideLocation || {};
				const now = Date.now() / 1000;
				const upcomingTides = tides
					.filter((t: any) => t.timestamp > now && (t.type === "HIGH" || t.type === "LOW"))
					.slice(0, 6)
					.map((t: any) => ({
						time: new Date(t.timestamp * 1000).toLocaleString('en-US', {
							timeZone: 'Europe/Lisbon',
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: '2-digit',
							hour12: true
						}),
						type: t.type,
						height: t.height,
					}));

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									location: tideLoc.name || "Lisbon",
									tides: upcomingTides,
								},
								null,
								2,
							),
						},
					],
				};
			} catch (error) {
				return { content: [{ type: "text", text: `Error: ${error}` }] };
			}
		});

		// Get best spot tool
		this.server.tool("get_best_spot", "SPECIALIZED TOOL: Ranks all spots by quality score. Use get_complete_surf_report first, then this for rankings if needed.", {}, async () => {
			// Fetch all spots
			const allSpots = Object.keys(PORTUGAL_SPOTS);
			const results = [];

			for (const spotName of allSpots) {
				const spotId = PORTUGAL_SPOTS[spotName];
				try {
					const [waveData, windData, ratingData] = await Promise.all([
						fetchSurfData(spotId, "wave"),
						fetchSurfData(spotId, "wind"),
						fetchSurfData(spotId, "rating"),
					]);

					const wave = waveData?.data?.wave?.[0] || {};
					const wind = windData?.data?.wind?.[0] || {};
					const rating = ratingData?.data?.rating?.[0] || {};
					const surf = wave.surf || {};
					const windCompass = wind.direction ? degreesToCompass(wind.direction) : "";

					let score = 0;
					score += (rating.rating?.value || 0) * 2;
					if (wind.directionType === "Offshore") score += 3;
					else if (wind.directionType === "Cross-shore") score += 1;
					if (wind.speed < 5) score += 2;
					else if (wind.speed > 15) score -= 2;
					const sizeMatch = `${surf.min}`.match(/^(\d+)/);
					const minSize = sizeMatch ? parseInt(sizeMatch[1]) : 0;
					if (minSize >= 2) score += 1;
					if (minSize >= 3) score += 1;

					results.push({
						spot: spotName,
						surf: `${surf.min}-${surf.max}${surf.plus ? "+" : ""}ft`,
						humanRelation: surf.humanRelation || "",
						wind: {
							speed: wind.speed || 0,
							direction: windCompass,
							type: wind.directionType || "N/A",
						},
						rating: {
							value: rating.rating?.value || 0,
							key: rating.rating?.key || "N/A",
						},
						score,
					});
				} catch (error) {
					// Skip spots with errors
				}
			}

			const ranked = results.sort((a, b) => b.score - a.score).slice(0, 3);
			return { content: [{ type: "text", text: JSON.stringify(ranked, null, 2) }] };
		});
	}
}

export default new OAuthProvider({
	// NOTE - during the summer 2025, the SSE protocol was deprecated and replaced by the Streamable-HTTP protocol
	// https://developers.cloudflare.com/agents/model-context-protocol/transport/#mcp-server-with-authentication
	apiHandlers: {
		"/sse": MyMCP.serveSSE("/sse"), // deprecated SSE protocol - use /mcp instead
		"/mcp": MyMCP.serve("/mcp"), // Streamable-HTTP protocol
	},
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: GoogleHandler as any,
	tokenEndpoint: "/token",
});