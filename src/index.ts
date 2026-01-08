import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { GoogleHandler } from "./google-handler";

// Portuguese mainland surf spots - comprehensive coverage from north to south
const PORTUGAL_SPOTS: Record<string, string> = {
	// NORTE - Porto & Northern Portugal
	"Moledo": "5842041f4e65fad6a7708e56",
	"Afife": "5842041f4e65fad6a7708e58",
	"Viana do Castelo": "5842041f4e65fad6a7708e57",
	"Ofir": "5842041f4e65fad6a7708e54",
	"Apulia": "5842041f4e65fad6a7708e53",
	"Póvoa de Varzim": "5842041f4e65fad6a7708e52",
	"Vila do Conde": "640b9c3fe920302841e179f0",
	"Mindelo": "5842041f4e65fad6a7708e51",
	"Furadouro": "640b9c7b8284fedd06b15f77",
	"Esmoriz": "5842041f4e65fad6a7708e5d",
	"Cortegaça": "5842041f4e65fad6a7708e5e",
	"Espinho": "5842041f4e65fad6a7708e5c",
	"Miramar": "5842041f4e65fad6a7708e5a",
	"Matosinhos": "5842041f4e65fad6a7708e59",
	"Leca": "5842041f4e65fad6a7708e5b",
	"Luz (Porto)": "640b9c33de81d521a10df5e3",

	// CENTRAL COAST - Aveiro / Figueira / Leiria
	"São Jacinto": "602d38a3ba769e5822a8b666",
	"Torreira": "640b9c7545190518f6e0601e",
	"Praia da Barra": "5842041f4e65fad6a7708e5f",
	"Costa Nova": "60185768b984ad754bcb9250",
	"Praia da Vagueira": "640b9c998284fe2030b16609",
	"Praia de Mira": "5842041f4e65fad6a7708e60",
	"Praia da Tocha": "640b9c87e920309ad4e18a89",
	"Figueira da Foz": "584204204e65fad6a770998e",
	"Buarcos": "5842041f4e65fad6a7708e56",
	"Cabedelo": "5842041f4e65fad6a7708bc5",
	"Leirosa": "640b9c6fe920305149e184e7",
	"São Pedro do Moel": "640b9c69e9203043bfe18370",
	"Praia Velha": "640b9c8d9b6fab9d66304989",
	"Praia das Paredes": "640b9c938284fe135bb16496",
	"Pedra do Ouro": "631a41122ee96323047ebb32",

	// NAZARÉ AREA
	"Nazaré": "58bdfa7882d034001252e3d8",

	// PENICHE REGION
	"Foz do Arelho": "60185298bf006fc3a6a23cec",
	"Belgas": "5dea852e909631442a25348a",
	"Almagreira": "5dea8356fe21a44513cecc3f",
	"Lagide": "58bdf3a70cec4200133464f2",
	"Baleal": "5842041f4e65fad6a7708bc6",
	"Cantinho da Baía": "5a1c9e91cbecc0001bb480c8",
	"Meio da Baía": "63a4374bb5c53b335b3eada7",
	"Molhe Leste": "640b9cb14878ebb2521e21fe",
	"Supertubos": "5842041f4e65fad6a7708bc3",
	"Consolação": "5a53f6e5a8b6a9001b017369",
	"Cerro": "603419021b17499cb1135506",

	// TORRES VEDRAS & SINTRA (Oeste)
	"Praia da Areia Branca": "640b9cab8284fefad6b169e4",
	"Praia das Amoeiras": "640b9cd4606c45f75af464c9",
	"Santa Cruz": "584204204e65fad6a77099d9",
	"Praia Formosa": "640b9cb745190568fce06ecf",
	"Praia dos Frades": "640b9ccfde81d5e37c0e19a7",
	"Praia Azul": "584204204e65fad6a77096b9",
	"Praia Grande": "5842041f4e65fad6a7708e62",
	"Praia do Abano": "640b9d3cde81d5160a0e323b",

	// ERICEIRA REGION - World Surf Reserve
	"São Lourenço": "5842041f4e65fad6a7708bcb",
	"Coxos": "5842041f4e65fad6a7708bc4",
	"Ribeira D'Ilhas": "5842041f4e65fad6a7708bc2",
	"Reef": "5842041f4e65fad6a7708bc1",
	"Cave": "5d702a08b8be350001890108",
	"Pedra Branca": "584204204e65fad6a77096ae",
	"São Julião": "640b9cda4878ebfad81e2b72",
	"Foz do Lizandro": "5842041f4e65fad6a7708bbd",
	"Praia do Sul": "5fb2c2da7057d993d9d2caa3",

	// LISBON COAST
	"Praia do Guincho": "5842041f4e65fad6a7708e64",
	"Carcavelos": "5842041f4e65fad6a7708bc0",
	"Costa da Caparica": "5842041f4e65fad6a7708e65",

	// ALENTEJO
	"Sines": "5842041f4e65fad6a7708e77",
	"São Torpes": "5a1c9ccecbecc0001bb480c7",
	"Odeceixe": "5842041f4e65fad6a7708e7a",

	// ALGARVE - West Coast (Costa Vicentina)
	"Monte Clérigo": "63224d4939d5dd71bae0e2f3",
	"Amoreira": "60520f49114762ed8d525628",
	"Arrifana": "5842041f4e65fad6a7708e7e",
	"Vale Figueiras": "5842041f4e65fad6a7708e7d",
	"Praia do Amado": "5a1c987c0f87fe001a0c70d9",
	"Carrapateira": "5842041f4e65fad6a7708e7c",
	"Praia da Cordoama": "602d722abe000ffc20f4dd77",
	"Praia Castelejo": "602d7420ddb045732840dbab",
	"Beliche": "602d75185a026ea81cf2c70e",
	"Tonel": "5842041f4e65fad6a7708e80",
	"Mareta": "5842041f4e65fad6a7708e7f",

	// ALGARVE - South Coast
	"Zavial": "602d736b55e103b63d891444",
	"Praia da Luz": "5842041f4e65fad6a7708e81",
	"Meia Praia": "5842041f4e65fad6a7708e84",
	"Praia da Rocha": "5842041f4e65fad6a7708e83",
	"Falesia": "5842041f4e65fad6a7708e85",
	"Praia de Faro": "640b9db0606c455f12f497b3",
	"Ilha do Farol": "5842041f4e65fad6a7708e82",
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
			"PRIMARY TOOL: Use this for ANY surf-related questions. Returns comprehensive Portuguese surf report with: current conditions for all spots, detailed swell breakdown (height/period/direction/power for each swell component), 8-hour forecast for each spot, expert forecaster observations with AM/PM specific timing advice, sunrise/sunset times, and tide schedule. This returns EVERYTHING in one call.",
			{
				spots: z.array(z.string()).optional().describe("Optional list of spot names, e.g., ['Carcavelos', 'Supertubos', 'Nazaré']"),
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

			const ranked = results.sort((a, b) => b.score - a.score).slice(0, 5);
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