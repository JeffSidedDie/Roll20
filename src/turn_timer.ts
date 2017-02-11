import { Roll20ApiScript } from "./roll20ApiScript";

class TurnTimer extends Roll20ApiScript {
	private time = 0;
	private text: Text;
	private interval: NodeJS.Timer;
	private isActive = false;
	private isRegistered = false;
	private currentPlayerName: string;
	private nextPlayerName: string;

	constructor() {
		super("Turn Timer", "timer");
	}

	public start() {
		if (this.isActive) { return; }

		if (!this.text) {
			const currentPageId = Campaign().get("playerpageid");
			const text = createObj("text", {
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
			if (!text) {
				throw new Error("Could not create timer text.");
			} else {
				this.text = text;
				log("Timer text created");
			}
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
				if (!this.isRegistered) {
					on("change:campaign:turnorder", (currentCampaign) => {
						if (this.isActive) {
							this.parseTurnOrderAndSetCurrentAndNextPlayerNames(currentCampaign.get("turnorder"));
						}
					});
					this.isRegistered = true;
				}
				this.parseTurnOrderAndSetCurrentAndNextPlayerNames(Campaign().get("turnorder"));
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

	private parseTurnOrderAndSetCurrentAndNextPlayerNames(currentTurnOrderString: string): void {
		const currentTurnOrder = JSON.parse(currentTurnOrderString || "[]") as TurnOrdering[];
		_.some(currentTurnOrder, (currentCombatant, index) => {
			const token = getObj("graphic", currentCombatant.id);
			if (token) {
				const character = getObj("character", token.get("represents"));
				if (character) {
					const player = getObj("player", character.get("controlledby"));
					if (player) {
						const name = player.get("_displayname");
						if (index === 0) {
							if (this.currentPlayerName !== name) {
								this.currentPlayerName = name;
								log("Current player: " + name);
							}
						} else {
							if (this.nextPlayerName !== name) {
								this.nextPlayerName = name;
								log("Next player: " + name);
							}
							return true;
						}
					} else if (index === 0 && this.currentPlayerName !== "") {
						this.currentPlayerName = "";
						log("No current player.");
					}
				}
			}
			return false;
		});
	}
}

new TurnTimer().register();
