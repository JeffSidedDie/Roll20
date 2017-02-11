import { Roll20ApiScript } from "./roll20ApiScript";

class TurnTimer extends Roll20ApiScript {
	private time = 0;
	private text: Text;
	private interval: NodeJS.Timer;
	private isActive = false;

	constructor() {
		super("Turn Timer", "timer");
	}

	public start() {
		if (this.isActive) { return; }

		if (!this.text) {
			const currentPageId = Campaign().get("playerpageid");
			this.text = createObj("text", {
				_pageid: currentPageId,
				color: "rgb(0,255,0)",
				font_family: "Candal",
				font_size: 100,
				height: 100,
				layer: "objects",
				left: 100,
				top: 100,
				width: 100,
			});
			log("Timer text created");
		}

		this.time = 10;
		this.text.set("text", this.time.toString());
		this.interval = setInterval(() => {
			this.time--;
			this.text.set("text", this.time.toString());

			if (this.time === 6) {
				this.text.set("color", "rgb(255,255,0)");
			} else if (this.time === 3) {
				this.text.set("color", "rgb(255,0,0)");
			}

			if (this.time === 0) {
				clearInterval(this.interval);
			}
		}, 1000);
		this.isActive = true;
	}

	public stop() {
		if (this.interval) {
			clearInterval(this.interval);
		}
		if (this.text) {
			this.text.set("text", "");
		}
		this.time = 0;
		this.isActive = false;
	}

	protected apiChatMessageHandler(message: ApiChatEventData) {
		const commands = message.content.split(" ");
		if (commands.length !== 2) {
			this.sendChatFromScript("No command given.");
			return;
		}
		switch (commands[1]) {
			case "start":
				this.start();
				break;
			case "stop":
				this.stop();
				break;
			default:
				this.sendChatFromScript("Unknown command.");
				break;
		}
	}
}

new TurnTimer().register();
