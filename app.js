var TwitchWebSub = require("twitchwebsub");
var request = require("request");

var twitch_id = process.env.TWITCH_ID;
var twitch_topic = `https://api.twitch.tv/helix/users/follows?to_id=${twitch_id}`;
var discord_webhook = process.env.DISCORD_WEBHOOK;

var WebSub = TwitchWebSub.server({
	callback: process.env.CALLBACK,
	client_id: process.env.CLIENT_ID,
	secret: "strawberry"
});
var closingTime = false;

WebSub.listen(8080);

WebSub.on('denied', () => {
	console.log('DENIED', arguments);
	process.exit(2);
});

WebSub.on('error', () => {
	console.log('ERROR', arguments);
	process.exit(3);
});

WebSub.on('listen', () => {
	WebSub.on('subscribe', (d) => {
		console.log(`${d.topic} subscribed until ${(new Date(d.lease * 1000)).toLocaleString()}`);
	});

	WebSub.on('unsubscribe', (d) => {
		console.log(`${d.topic} unsubscribed.`);
		if (!closingTime) WebSub.subscribe(twitch_topic);
		if (closingTime) process.exit(0);
	});

	WebSub.subscribe(twitch_topic);

	WebSub.on('feed', (d) => {
		var feed = JSON.parse(d.feed);
		var follower = feed.data.from_id;

		request.get({
			url: `https://api.twitch.tv/helix/users?id=${follower}`,
			headers: {
				'Client-ID': process.env.CLIENT_ID
			},
			json: true
		}, (error, response, body) => {
			if (error) return;

			console.log("\n--[\x1b[34m New Follower \x1b[0m]------------------------------------");
			console.log(body.data[0].display_name || body.data[0].login);

			request.post({
				url: discord_webhook,
				body: {
					embeds: [{
						description: `**Display Name:** ${body.data[0].display_name}`,
						color: 6570404,
						author: {
							name: "New Follower"
						}
					}]
				},
				json: true
			});
		});
	});
});

process.on('SIGINT', () => {
	closingTime = true;
	WebSub.unsubscribe(twitch_topic);
	process.exit(0);
});
