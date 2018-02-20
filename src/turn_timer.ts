import { Roll20ApiScript } from "./roll20ApiScript";

class TurnTimer extends Roll20ApiScript {
    private readonly baseTextColor = "rgb(0,255,0)";
    private currentPlayerName = "";
    private readonly firstWarningTextColor = "rgb(255,255,0)";
    private readonly firstWarningTime = 60;
    private interval: NodeJS.Timer | undefined;
    private readonly intervalMilliseconds = 1000;
    private isActive = false;
    private isRegistered = false;
    private readonly maxTime = 90;
    private nextPlayerName = "";
    private readonly secondWarningTextColor = "rgb(255,0,0)";
    private readonly secondWarningTime = 30;
    private text: Text | undefined;
    private time = 0;

    public constructor() {
        super("Turn Timer", "timer");
    }

    public activate() {
        if (!this.isRegistered) {
            on("change:campaign:turnorder", (currentCampaign) => {
                if (this.isActive) {
                    this.parseTurnOrderAndSetCurrentAndNextPlayerNames(currentCampaign.get("turnorder"));
                }
            });
            this.isRegistered = true;
        }
        const currentPageId = Campaign().get("playerpageid");
        if (!this.text || this.text.get("_pageid") !== currentPageId) {
            if (this.text) {
                this.text.remove();
            }

            const text = createObj("text", {
                _pageid: currentPageId,
                color: this.baseTextColor,
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
        this.isActive = true;
    }

    public deactivate() {
        this.isActive = false;
        this.stop();
        this.hide();
        this.currentPlayerName = "";
        this.nextPlayerName = "";
    }

    public hide() {
        if (this.text) {
            this.text.set("text", "");
        }
    }

    public reset() {
        this.time = this.maxTime;
        if (this.text) {
            this.text.set("color", this.baseTextColor);
        }
    }

    public start() {
        if (!this.isActive) {
            this.activate();
            this.reset();
        }
        this.stop();

        if (!this.currentPlayerName || !this.text) { return; }

        this.text.set("text", this.time.toString());
        this.interval = setInterval(() => {
            if (!this.text || !this.interval) { return; }

            this.time--;
            this.text.set("text", this.time.toString());

            if (this.time === this.firstWarningTime) {
                this.text.set("color", this.firstWarningTextColor);
                this.sendChatFromScript(`/w \"${this.currentPlayerName}\" First warning! You have ${this.time} seconds left.`);
            } else if (this.time === this.secondWarningTime) {
                this.text.set("color", this.secondWarningTextColor);
                this.sendChatFromScript(`/w \"${this.currentPlayerName}\" Second warning! You have ${this.time} seconds left.`);
            }

            if (this.time === 0) {
                clearInterval(this.interval);
                this.sendChatFromScript(`The timer has expired for ${this.currentPlayerName}'s turn!`);
            }
        }, this.intervalMilliseconds);
    }

    public stop() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    protected apiChatMessageHandler(message: ApiChatEventData) {
        const commands = message.content.split(" ");
        const expectedLength = 2;
        if (commands.length !== expectedLength) {
            return this.sendChatFromScript("No command given.");
        }
        switch (commands[1]) {
            case "on":
                this.activate();
                break;
            case "start":
                this.parseTurnOrderAndSetCurrentAndNextPlayerNames(Campaign().get("turnorder"));
                this.start();
                break;
            case "stop":
                this.stop();
                break;
            case "reset":
                this.reset();
                break;
            case "off":
                this.deactivate();
                break;
            default:
                this.sendChatFromScript("Unknown command.");
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
                                this.reset();
                                this.start();
                                this.sendChatFromScript(`/w \"${this.nextPlayerName}\" It's your turn! You have ${this.time} seconds.`);
                                log(`Current player: ${name}`);
                            }
                        } else {
                            if (this.nextPlayerName !== name) {
                                this.nextPlayerName = name;
                                this.sendChatFromScript(`/w \"${this.nextPlayerName}\" You're up next, get ready!`);
                                log(`Next player: ${name}`);
                            }

                            return true;
                        }
                    } else if (index === 0 && this.currentPlayerName !== "") {
                        this.currentPlayerName = "";
                        this.stop();
                        this.hide();
                        log("No current player.");
                    }
                }
            }

            return false;
        });
    }
}

new TurnTimer().register();
