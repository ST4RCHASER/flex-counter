import { createCanvas, loadImage } from "canvas";
export interface Env {
	COUNTER: KVNamespace;
}

const convertToBase64 = async (text: string) => {
	const buffer = new TextEncoder().encode(text);
	const base64 = String.fromCharCode(...new Uint8Array(buffer));
	return base64;
}
async function handleRequest(request: Request, env: Env) {
	const url = new URL(request.url);
	const path = url.pathname;
	const query = url.searchParams;
	const method = request.method;
	if (path === "/") {
		return new Response("<h1>:/</h1>", {
			headers: { "Content-Type": "text/html" },
		});
	} else if (method === "GET" || method === "POST" || method === "PUT" || method === "PATCH") {
		const pathToBase = await convertToBase64(path);
		let count = Number(await env.COUNTER.get("count-" + pathToBase, 'text') || "0");
		await env.COUNTER.put("count-" + pathToBase, String(++count));
		if (query.get("type") === "json") {
			return new Response(JSON.stringify({ count }), {
				headers: { "Content-Type": "application/json" },
			});
		} else if (query.get("type") === "image") {
			const images = query.get("images")?.split(";") || [];
			if (images.length !== 10) {
				return new Response("Invalid image count", { status: 400 });
			}
			const image = await generateCounterImage(count, images);
			return new Response(image, {
				headers: { "Content-Type": "image/png" },
			});
		} else {
			return new Response(`${count}`, {
				headers: { "Content-Type": "text/plain" },
			});
		}
	}
}

async function generateCounterImage(count: number, imageUrls: string[]): Promise<Blob> {
	//TODO: make image support
	const digits = count.toString().split('').map(Number);
	const images = await Promise.all(imageUrls.map(url => loadImage(url)));
	const digitWidth = images[0].width;
	const digitHeight = images[0].height;
	const canvasWidth = digitWidth * digits.length;
	const canvasHeight = digitHeight;

	const canvas = createCanvas(canvasWidth, canvasHeight);
	const ctx = canvas.getContext("2d");
	digits.forEach((digit, index) => {
		ctx.drawImage(images[digit], index * digitWidth, 0, digitWidth, digitHeight);
	});

	const buffer = canvas.toBuffer("image/png");
	return new Blob([buffer], { type: "image/png" });
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		return handleRequest(request, env);
	},
};
