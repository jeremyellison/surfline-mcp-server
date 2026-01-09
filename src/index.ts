import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { GoogleHandler } from "./google-handler";

// Portuguese mainland surf spots - comprehensive coverage from north to south
const PORTUGAL_SPOTS: Record<string, string> = {
  // AVEIRO REGION - Northern Portugal coastal region
  "Praia de Paramos": "640b9ca58284fe2f98b168aa",
  "Cortegaca": "5842041f4e65fad6a7708e5e",
  "Esmoriz": "5842041f4e65fad6a7708e5d",
  "Espinho": "5842041f4e65fad6a7708e5c",
  "Furadouro": "640b9c7b8284fedd06b15f77",
  "Costa Nova": "60185768b984ad754bcb9250",
  "Praia da Barra": "5842041f4e65fad6a7708e5f",
  "Praia da Vagueira": "640b9c998284fe2030b16609",
  "São Jacinto": "602d38a3ba769e5822a8b666",
  "Torreira": "640b9c7545190518f6e0601e",

  // AZORES REGION - Portuguese archipelago - volcanic islands with excellent consistent waves
  "Terreiro": "584204204e65fad6a77099f1",
  "Mosteiros Left": "584204204e65fad6a77099dc",
  "Mosteiros Right": "584204204e65fad6a77099df",
  "Praia dos Mosteiros": "584204204e65fad6a77099da",
  "Ponta do Queimado": "584204204e65fad6a77099e9",
  "Quatro Ribeiras": "584204204e65fad6a77099eb",
  "Ponta Garca": "584204204e65fad6a77099e6",
  "Ribeira Quente Left": "584204204e65fad6a77099e7",
  "Ribeira Quente Right": "584204204e65fad6a77099ea",
  "Fajazinha": "640b88bf4519058d04db8cf9",
  "Contendas": "584204204e65fad6a77099f7",
  "Pescador": "584204204e65fad6a77099ef",
  "Ponta Negra": "584204204e65fad6a77099ed",
  "Praia da Vitoria": "584204204e65fad6a77099ec",
  "Salga": "584204204e65fad6a77099f0",
  "Santa Catarina": "584204204e65fad6a77099ee",
  "Sao Fernando": "584204204e65fad6a77099f3",
  "Vila Nova": "584204204e65fad6a77099e8",
  "Monte Verde": "584204204e65fad6a77099e1",
  "Praia de Santa Barbara(Areias)": "584204204e65fad6a77099d7",
  "Rabo de Peixe": "584204204e65fad6a77099dd",
  "Santa Cruz": "584204204e65fad6a77099e4",
  "Santa Iria": "584204204e65fad6a77099de",
  "Populo": "584204204e65fad6a7709986",
  "Santa Clara": "584204204e65fad6a77099e0",
  "Direita do Passe": "584204204e65fad6a77099f4",
  "Esquerda da Igreja": "584204204e65fad6a77099f8",
  "Faja Dos Vimes": "584204204e65fad6a77099fa",
  "Faja do Belo": "584204204e65fad6a77099f9",
  "Faja dos Cubres": "584204204e65fad6a77099f6",
  "Feiticeiras": "584204204e65fad6a77099f2",
  "Lago do Linho": "584204204e65fad6a77099f5",
  "Agua de Alto": "584204204e65fad6a77099e3",
  "Vila Franca": "584204204e65fad6a77099e5",

  // BEJA REGION - Southwest Portugal - remote and less crowded southern coast
  "Praia de Almograve": "640b9d8c606c459297f48dc1",
  "Praia do Brejo Largo": "640b9da34878eb10411e5a66",
  "Odeceixe": "5842041f4e65fad6a7708e7a",
  "Zambujeria do Mar": "60185f31bce8961418450de1",
  "Cogumelo": "640b9d79e920306c07e1c199",
  "Malhao": "5842041f4e65fad6a7708e7b",
  "Praia das Furnas": "640b9d98451905b436e0a2b7",
  "Praia de Nossa Senhora": "640b9d92606c45c215f48fcf",
  "Praia dos Alteirinhos": "640b9daa8284fe4082b1a549",

  // BRAGA REGION - Northern Portugal - includes excellent beach breaks
  "Apulia": "602d61a45320dcba9581aa1e",
  "Praia Nova": "640b9c51e920302e2ae17df1",
  "Ofir": "602d62ee54697db75918e8cc",
  "Sauve Mar": "602d36c964be7430f25249e2",
  "Fão": "640b9c45e92030b426e17b32",

  // COIMBRA REGION - Central Portugal - beautiful coastal spots with consistent swell
  "Buarcos": "5842041f4e65fad6a7708e56",
  "Cabedelo": "5842041f4e65fad6a7708bc5",
  "Figueira da Foz": "584204204e65fad6a770998e",
  "Praia de Mira": "5842041f4e65fad6a7708e60",
  "Praia da Tocha": "640b9c87e920309ad4e18a89",
  "Leirosa": "640b9c6fe920305149e184e7",

  // FARO REGION - Algarve - Portugal's famous southern region with 39 major surf spots
  "Praia da Baleeira": "640b9df8de81d590240e5dad",
  "Praia do Túnel": "640b9e098284fe59aeb1ba9e",
  "Praia da Galé": "6341b80703aac276d038a747",
  "Praia dos Salgados": "6019da736dfeb6790b0e4317",
  "Amoreira": "60520f49114762ed8d525628",
  "Arrifana": "5842041f4e65fad6a7708e7e",
  "Vale Figueiras": "5842041f4e65fad6a7708e7d",
  "Praia de Alvor": "640b9dfd4519052a92e0ba0f",
  "Praia da Corredoura": "640b9df19b6fab7c27309b0b",
  "Praia da Marinha": "640b9db6b6d7692571952ca7",
  "Carriagem": "640b9d73e920305e26e1c02c",
  "Monte Clérigo": "63224d4939d5dd71bae0e2f3",
  "Praia da Murração": "640b9dd4606c450b23f49f63",
  "Praia da Pena Furada": "640b9dc24878eb42451e6175",
  "Praia do Carvoeiro": "640b9dceb6d76948e49531e4",
  "Fuzeta Beach": "640b9e03b6d7691ef4953e1f",
  "Praia do Telheiro": "640b9dc8606c454d18f49cfe",
  "Praia do Barranco": "640b9debde81d5ba5c0e5af9",
  "Meia Praia": "5842041f4e65fad6a7708e84",
  "Praia Da Luz": "5842041f4e65fad6a7708e81",
  "Praia do Burgau": "60520e838cd1df7ad30436c1",
  "Ilha do Farol": "5842041f4e65fad6a7708e82",
  "Praia do Mirouço": "640b9ddfb6d769abeb953630",
  "Praia de Faro": "640b9db0606c455f12f497b3",
  "Praia da Rocha": "5842041f4e65fad6a7708e83",
  "Praia da Oura": "640b9e0f451905b4a6e0bde9",
  "Praia de Salema": "60521255b723e15d9afbcc1a",
  "Praia dos Mouranitos": "640b9dd99b6fabf8c9309586",
  "Zavial": "602d736b55e103b63d891444",
  "Beliche": "602d75185a026ea81cf2c70e",
  "Mareta": "5842041f4e65fad6a7708e7f",
  "Tonel": "5842041f4e65fad6a7708e80",
  "Praia da Coelha": "640b9dbcb6d76979a2952e10",
  "Praia do Martinhal": "640b9de54878eb2de71e699d",
  "Carrapateira": "5842041f4e65fad6a7708e7c",
  "Praia Castelejo": "602d7420ddb045732840dbab",
  "Praia da Cordoama": "602d722abe000ffc20f4dd77",
  "Praia da Ponta Ruiva": "602d75c4c03c6fc269235797",
  "Praia do Amado": "5a1c987c0f87fe001a0c70d9",
  "Falesia": "5842041f4e65fad6a7708e85",

  // LEIRIA REGION - Central-west coast with great beach breaks and point breaks including Supertubos
  "Almagreira": "5dea8356fe21a44513cecc3f",
  "Belgas": "5dea852e909631442a25348a",
  "Lagide": "58bdf3a70cec4200133464f2",
  "Meio da Baía": "63a4374bb5c53b335b3eada7",
  "Foz do Arelho": "60185298bf006fc3a6a23cec",
  "Nazaré": "58bdfa7882d034001252e3d8",
  "Baleal": "5842041f4e65fad6a7708bc6",
  "Cantinho da Baía": "5a1c9e91cbecc0001bb480c8",
  "Cerro": "603419021b17499cb1135506",
  "Consolação": "5a53f6e5a8b6a9001b017369",
  "Molhe Leste": "640b9cb14878ebb2521e21fe",
  "Supertubos": "5842041f4e65fad6a7708bc3",
  "Pedra do Ouro": "631a41122ee96323047ebb32",
  "Praia dos Frades": "640b9ccfde81d5e37c0e19a7",
  "São Martinho do Porto": "6019e348f121bc152c418dcc",
  "São Pedro do Moel": "640b9c69e9203043bfe18370",
  "Praia Velha": "640b9c8d9b6fab9d66304989",
  "Praia das Paredes": "640b9c938284fe135bb16496",

  // LISBON REGION - Capital region - large variety of breaks from beach breaks to reefs (42 spots)
  "Praia da Adraga": "640b9d054878eb35041e35bb",
  "Praia das Moitas": "640b9d5a4519050a6ce093ca",
  "Praia Do Guincho": "5842041f4e65fad6a7708e64",
  "Praia da Crismina": "640b9d42b6d769019f951114",
  "Praia da Aguda": "640b9d2f606c45858af4797d",
  "Praia dos Moleiros": "640b9d364519057849e08ba2",
  "Praia da Vigia": "640b9ce6b6d769df0b94fc57",
  "Praia Porto Chão": "640b9cc9b6d769875694f5de",
  "Praia da Ursa": "640b9d174519050958e08490",
  "Praia da Samarra": "640b9cec8284fee602b179ab",
  "Praia de Santa Rita": "640b9cbdde81d582c90e15b1",
  "Praia do Porto Novo": "640b9cc3b6d7696d2c94f4a4",
  "Praia de Caxias": "640b9d60606c45bbe5f4841b",
  "Praia Grande": "5842041f4e65fad6a7708e62",
  "Praia Pequena": "584204214e65fad6a7709d28",
  "Praia das Maçãs": "601853a64071addd994eeb43",
  "Praia da Cruz Quebrada": "640b9d294878ebc4c91e3d61",
  "Praia de Torre": "602d64e1d663ff28d7a951c2",
  "Cave": "5d702a08b8be350001890108",
  "Coxos": "5842041f4e65fad6a7708bc4",
  "Foz do Lizandro": "5842041f4e65fad6a7708bbd",
  "Pedra Branca": "584204204e65fad6a77096ae",
  "Praia do Sul": "5fb2c2da7057d993d9d2caa3",
  "Reef": "5842041f4e65fad6a7708bc1",
  "Ribeira D'Ilhas": "5842041f4e65fad6a7708bc2",
  "São Lourenço": "5842041f4e65fad6a7708bcb",
  "Matadouro": "64bbfc3868c6112c8d112deb",
  "Estoril": "5842041f4e65fad6a7708e66",
  "Praia do Abano": "640b9d3cde81d5160a0e323b",
  "Praia da Baleia": "640b9ce1606c453dd8f4675f",
  "Praia do Magoito": "640b9d23e920304216e1ad8e",
  "Parede": "640b9d6db6d769d0c8951b5b",
  "Praia Da Areia Branca": "640b9cab8284fefad6b169e4",
  "Praia Formosa": "640b9cb745190568fce06ecf",
  "Praia das Amoeiras": "640b9cd4606c45f75af464c9",
  "Praia Azul": "584204204e65fad6a77096b9",
  "Santa Cruz": "584204204e65fad6a77099d9",
  "São Julião": "640b9cda4878ebfad81e2b72",
  "Carcavelos": "5842041f4e65fad6a7708bc0",
  "São Pedro do Estoril": "640b9d679b6fab7dac307b39",

  // MADEIRA REGION - Portuguese island archipelago - warm water, consistent swells, tropical vibes
  "Madalena do Mar": "584204204e65fad6a7709b6c",
  "Jardim do Mar": "5842041f4e65fad6a7708cb6",
  "Paul do Mar": "5842041f4e65fad6a7708cb7",
  "Ponta Pequena": "5842041f4e65fad6a7708cb5",
  "Machico": "640b8b228284fe4750ad2436",
  "Ponta Paul": "640b8b0f451905d197dc20f5",
  "Ponta de Tristao": "584204204e65fad6a7709b6b",
  "Lugar de Baixo": "584204204e65fad6a7709b6d",
  "Ribeira da Janela": "640b8b1be9203035f9dd4ba1",
  "Achadas da Cruz": "640b8b15606c455d15f011ac",
  "Porto da Cruz": "584204204e65fad6a7709b68",
  "Faja da Areia": "584204204e65fad6a77099c6",
  "Ponta Delgada": "584204204e65fad6a7709b6a",
  "Supertubes (Vila Baleira)": "584204204e65fad6a7709b67",

  // PORTO REGION - Northern coast near Portugal's second city - consistent beach breaks
  "Azurara": "602d5dfebe000f44bdf4dd71",
  "Vila do Conde": "640b9c3fe920302841e179f0",
  "Leca": "5842041f4e65fad6a7708e5b",
  "Praia da Madalena": "640b9c9f9b6fab1dcd304d94",
  "Mindelo": "602d538c79cfa2fee3504d6e",
  "Miramar": "640b9c819b6fab254d3046f8",
  "Praia de Labruge": "640b9c63451905fc91e05b98",
  "Luz (Porto)": "640b9c33de81d521a10df5e3",
  "Matosinhos": "5842041f4e65fad6a7708e59",
  "Praia de Lavadores": "640b9c5e606c458c22f449a1",
  "Praia do Marreco": "640b9c58b6d76964bd94db98",
  "Perafita": "640b9c39e9203056dce1788c",
  "Póvoa do Varzim": "602d5f7ba393ff3687f098ae",
  "Agucadoura": "5842041f4e65fad6a7708e5a",

  // SETUBAL REGION - South of Lisbon - diverse spots from beach breaks to reef breaks
  "Praia da Vieirinha": "631e33650a3907c24527bdf6",
  "Bicas": "640b9cf8606c45e808f46d79",
  "Praia dos Lagosteiros": "640b9d0be920306c20e1a88f",
  "Fonte da Telha": "584204204e65fad6a77099d5",
  "Castelo": "584204204e65fad6a77099d8",
  "Marcelino": "584204214e65fad6a7709d15",
  "Praia da Cornelia": "5dbf6037eb8ddf00015a883f",
  "Praia da Rainha": "602d65b2c30216a5fdf26598",
  "Praia da Saude": "640b9d48b6d7692692951263",
  "São João da Caparica": "5dbb587ff387900001fee288",
  "Praia do Pego": "591b423c1907e50013cd93cc",
  "Lagoa de Albufeira": "640b9cfe4878eb47751e344d",
  "Portinho da Arrabida": "5fd7b854ec6be70e1690dfa5",
  "Porto Covo": "640b9d808284fe36ddb19a69",
  "Praia do Burrinho": "640b9d9d45190561b6e0a415",
  "Praia do Areão": "640b9d86de81d5afbd0e42ee",
  "Sesimbra": "640b9cf38284fe0e10b17b6d",
  "Sao Torpes": "5a1c9ccecbecc0001bb480c7",
  "Sines": "5842041f4e65fad6a7708e77",
  "Cova Do Vapor": "584204204e65fad6a77096ad",
  "Praia do Pescador": "640b9d4ede81d58fdf0e363b",
  "Praia do Rei": "640b9d54de81d5217b0e37a6",

  // VIANA DO CASTELO REGION - Far north coast - smaller region with quality beach breaks
  "Moledo": "602d32da0762cf29b3929d79",
  "Viana do Castelo": "5842041f4e65fad6a7708e57",
  "Vila Praia de Âncora": "640b9c4bde81d548b00dfb95",
  "Afife": "5842041f4e65fad6a7708e58"
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