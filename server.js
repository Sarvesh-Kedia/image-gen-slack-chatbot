require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = 80;

app.use(express.json());

// Health check route
app.get('/', (req, res) => {
	console.log('GET / received');
	res.send('Server is up!');
});


// Main Slack webhook (handles app mentions + challenge)
app.post('/slack-webhook', async (req, res) => {
	const body = req.body;
	console.log('POST /slack-webhook received:', body);
	
	// Handle Slack URL verification
	if (body.type === 'url_verification') {
		return res.status(200).send(body.challenge);
	}

	// Handle app mentions
	if (body.event && body.event.type === 'app_mention') {

		// Respond immediately to Slack
		res.status(200).send(); 

		const user = body.event.user;
		var text = body.event.text;
		const channel = body.event.channel;
		const ts = body.event.ts;

		text = text.replace(`<@U091LRXJ5JQ>`, '').trim(); // Remove bot mention from text

		console.log(`Bot mentioned by ${user}: "${text}"`);

		// Optional: trigger image generation (example)
		// You could use the text as a prompt
		const replicateResponse = await generateImage(text);

		// Send response back to Slack (text or image URL)
		await axios.post('https://slack.com/api/chat.postMessage', {
			channel: channel,
			text: `Here's your generated Image!\n${replicateResponse.output?.[0] || 'No image generated.'}`,
			thread_ts: ts
		}, {
			headers: {
				Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
				'Content-Type': 'application/json',
			}
		});

	}

	res.status(200).send('No action taken.');
});

// Helper: Replicate image generation function
async function generateImage(prompt) {
	const response = await axios.post(
		'https://api.replicate.com/v1/predictions',
		{
			version: "sarvesh-kedia/assignment-model:481829d4ec676bc5ee637c0ca8989cda7bde9d0013f75e5e2a1b978d26baea45",
			input: {
				prompt,
				model: "dev",
				go_fast: false,
				lora_scale: 1,
				megapixels: "1",
				num_outputs: 1,
				aspect_ratio: "1:1",
				output_format: "webp",
				guidance_scale: 3,
				output_quality: 80,
				prompt_strength: 0.8,
				extra_lora_scale: 1,
				num_inference_steps: 28
			}
		},
		{
			headers: {
				Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
				'Content-Type': 'application/json',
				'Prefer': 'wait'
			}
		}
	);

	return response.data;
}


// Start the server
app.listen(port, '0.0.0.0',() => {
	console.log(`Server running on http://0.0.0.0:${port}`);
});
