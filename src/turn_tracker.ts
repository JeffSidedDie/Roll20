class Tracker {
	private active = false;
	private round = 0;
	private currentId = "";
	private lastId = "";
	private turns: { [id: string]: number } = {};

	public isActive() {
		return this.active;
	};

	public start() {
		this.active = true;
		this.round = 1;
		log("StatusTracker started.");
	};

	public stop() {
		this.active = false;
		this.round = 0;
		this.currentId = "";
		this.lastId = "";
		this.turns = {};
		log("StatusTracker stopped.");
	};

	public getRound() {
		return this.round;
	};

	public getCurrentId() {
		return this.currentId;
	};

	public getTurnNumber(id: string) {
		return this.turns[id];
	};

	public processTurnOrder(turnOrder: TurnOrdering[]) {
		if (!turnOrder || !turnOrder.length || turnOrder.length <= 1) { return; }
		const first = turnOrder[0];
		const next = turnOrder[1];
		const last = turnOrder[turnOrder.length - 1];
		if (!this.currentId) { // First turn of combat
			this.incrementTurn(first);
			log("First Turn");
		} else if (this.currentId === last.id) { // Expected progression
			this.incrementTurn(first);
			log("Normal");
		} else if (this.lastId === first.id && this.currentId === next.id) { // Backed up
			this.decrementTurn(next);
			log("Backup");
		} else {
			// Walk through turn order in reverse to find current id and make
			// sure it didn't get moved past a combatant that has already gone
			// this turn
			let currentTurn: TurnOrdering | null = null;
			for (let i = turnOrder.length - 1; i > 0 /*Not including first*/; i--) {
				const turn = turnOrder[i];
				if (currentTurn) {
					const numTurns = this.turns[turn.id];
					const curTurns = this.turns[this.currentId];
					if (numTurns > curTurns - 1) {
						log("Illegal turn sequence");
						throw new Error("Illegal turn sequence.");
					}
				} else if (this.currentId === turn.id) {
					currentTurn = turn;
				}
			}
			if (currentTurn) { // Combatant delayed
				this.decrementTurn(currentTurn);
				this.incrementTurn(first);
				log("Delay");
			} else {
				log("Unknown turn sequence");
				throw new Error("Unknown turn sequence.");
			}
		}
		this.lastId = last.id;
		this.currentId = first.id;
	};

	public showRound() {
		const now = new Date();
		sendChat("", "/desc <h2>Round " + this.getRound() + "</h2><span>" + now.toLocaleTimeString() + "</span>");
	};

	public showCurrentTurn() {
		if (!this.isActive()) { return; }
		const currentId = this.getCurrentId();
		if (!currentId) { return; }
		const token = getObj("graphic", currentId);
		const now = new Date();
		sendChat("", "/desc <h3> " + token.get("name") + " - Turn " + this.getTurnNumber(currentId) + "</h3><span>" + now.toLocaleTimeString() + "</span>");
	};

	private incrementTurn(turn: TurnOrdering) {
		if (!turn) { return; }
		if (this.turns[turn.id] === undefined) {
			this.turns[turn.id] = 1;
		} else {
			this.turns[turn.id]++;
		}
		if (this.turns[turn.id] > this.round) {
			this.round++;
		}
	}

	private decrementTurn(turn: TurnOrdering) {
		if (!turn) { return; }
		if (this.turns[turn.id] !== undefined) {
			this.turns[turn.id]--;
		}
	}
}

on("ready", () => {
	const tracker = new Tracker();

	on("change:campaign:turnorder", (currentCampaign, previousCampaign) => {
		if (!currentCampaign || !previousCampaign) { return; }
		if (currentCampaign.get("_type") !== "campaign" || previousCampaign._type !== "campaign") { return; }
		const currentTurnOrder = JSON.parse(currentCampaign.get("turnorder") || "[]") as TurnOrdering[];
		const previousTurnOrder = JSON.parse(previousCampaign.turnorder || "[]") as TurnOrdering[];
		if (currentTurnOrder.length !== previousTurnOrder.length) { return; } // Combatant added or removed
		if (tracker.isActive()) {
			try {
				tracker.processTurnOrder(currentTurnOrder);
				tracker.showCurrentTurn();
			} catch (e) {
				currentCampaign.set("turnorder", previousCampaign.turnorder);
			}
		}
	});

	on("chat:message", (message) => {
		if (message.type === "api") {
			if (message.content === "!tracker start") {
				const campaign = Campaign();
				const turnOrderStr = campaign.get("turnorder");
				// log(turnorderStr);
				let turnOrder = JSON.parse(turnOrderStr || "[]") as TurnOrdering[];
				// log(turnorder);
				turnOrder = _.sortBy(turnOrder, (t) => t.pr).reverse();
				// log(turnorder);
				const newTurnOrderStr = JSON.stringify(turnOrder);
				campaign.set("turnorder", newTurnOrderStr);

				tracker.start();
				tracker.processTurnOrder(turnOrder);

				tracker.showRound();
				tracker.showCurrentTurn();
			}
			if (message.content === "!tracker stop") {
				tracker.stop();
			}
		}
	});

	log("StatusTracker loaded.");
});
