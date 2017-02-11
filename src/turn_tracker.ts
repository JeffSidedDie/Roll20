import { Roll20ApiScript } from "./roll20ApiScript";

class TurnTracker extends Roll20ApiScript {

	private active = false;
	private round = 0;
	private currentTurnOrder: TurnOrdering[] = [];
	private turns: { [id: string]: number } = {};

	constructor() {
		super("Turn Tracker", "tracker");
	}

	public isActive() {
		return this.active;
	};

	public start() {
		this.active = true;
		this.round = 1;
		this.showRound();
		log("TurnTracker started.");
	};

	public stop() {
		this.active = false;
		this.round = 0;
		this.turns = {};
		this.currentTurnOrder = [];
		log("TurnTracker stopped.");
	};

	public processTurnOrder(incomingTurnOrder: TurnOrdering[]) {
		if (!incomingTurnOrder) {
			throw new Error("Turn order is null or undefined.");
		}

		// No combatants left, assume combat over
		if (incomingTurnOrder.length === 0) {
			log("Combat Ended");
			this.stop();
			return;
		}

		let possibleTurnChange = false;

		// First turn of combat
		if (this.currentTurnOrder.length === 0) {
			_.forEach(incomingTurnOrder, (incomingCombatant) => {
				this.turns[incomingCombatant.id] = 0;
			});
			this.incrementTurn(incomingTurnOrder[0]);
			log("First Turn");
			possibleTurnChange = true;

		} else {
			// Find expected values to determine if order changed
			const currentCombatantId = this.currentTurnOrder[0].id;
			const lastCombatantId = this.currentTurnOrder[this.currentTurnOrder.length - 1].id;

			let orderFirstChangedIndex = -1;
			let orderLastChangedIndex = -1;

			_.forEach(incomingTurnOrder, (incomingCombatant, index) => {
				const correspondingCurrentCombatant = this.currentTurnOrder[index];
				if (!correspondingCurrentCombatant || incomingCombatant.id !== correspondingCurrentCombatant.id) { // Combatant added or order changed
					if (!possibleTurnChange) {
						possibleTurnChange = true;
						orderFirstChangedIndex = index;
					}
					orderLastChangedIndex = index;

				} else if (incomingCombatant.pr !== correspondingCurrentCombatant.pr) { // Initiative changed
					log("Initiative Changed");

				} else if (incomingCombatant._pageid !== correspondingCurrentCombatant._pageid) { // Combatant changed pages
					log("Pageid Changed");

				} else if (incomingCombatant.custom !== correspondingCurrentCombatant.custom) { // Custom changed?
					log("Custom Changed");
				}
			});

			// Figure out specifically how order changed
			if (possibleTurnChange) {
				if (this.currentTurnOrder.length < incomingTurnOrder.length) { // Combatant added
					this.turns[incomingTurnOrder[orderFirstChangedIndex].id] = this.round - 1;
					possibleTurnChange = false;
					log("Combatant Added");

				} else if (this.currentTurnOrder.length > incomingTurnOrder.length) { // Combatant removed
					delete this.turns[this.currentTurnOrder[orderFirstChangedIndex].id];
					possibleTurnChange = false;
					log("Combatant Removed");

				} else {
					// Ordering actually changed
					if (incomingTurnOrder[incomingTurnOrder.length - 1].id === currentCombatantId) { // Expected progression
						this.incrementTurn(incomingTurnOrder[0]);
						log("Normal Turn");

					} else if (incomingTurnOrder[0].id === lastCombatantId) { // Backed up
						this.decrementTurn(this.currentTurnOrder[0]);
						log("Backup Turn");

					} else {
						let isLegalMove = true;
						// Check to make sure the combatant that moved did not move past a combatant that has had more or less turns
						if (incomingTurnOrder[orderLastChangedIndex - 1].id === this.currentTurnOrder[orderLastChangedIndex].id) { // Combatant moved down
							const movedCombatant = incomingTurnOrder[orderLastChangedIndex];
							let movedCombatantCurrentTurns = this.turns[movedCombatant.id];
							if (movedCombatant.id === currentCombatantId) {
								movedCombatantCurrentTurns -= 1; // Subtract a turn from current combatant when delaying since they will decremented
							}
							// Moving down the turn order is legal as long as every combatant now-ahead the moved one has taken same turns
							for (let i = orderFirstChangedIndex; i <= orderLastChangedIndex - 1; i++) {
								if (this.turns[incomingTurnOrder[i].id] !== movedCombatantCurrentTurns) {
									isLegalMove = false;
								}
							}
							if (isLegalMove) {
								if (movedCombatant.id === currentCombatantId) { // Current combatant delayed
									this.decrementTurn(this.currentTurnOrder[0]);
									this.incrementTurn(incomingTurnOrder[0]);
								} else {
									possibleTurnChange = false;
								}
								log("Move Down");
							}
						} else { // Combatant moved up
							const movedCombatant = incomingTurnOrder[orderFirstChangedIndex];
							const movedCombatantCurrentTurns = this.turns[movedCombatant.id];
							// Moving up the turn order is legal as long as every combatant now-before the moved one has taken same turns
							for (let i = orderFirstChangedIndex + 1; i <= orderLastChangedIndex; i++) {
								const incomingCombatant = incomingTurnOrder[i];
								let incomingCombatantTurns = this.turns[incomingCombatant.id];
								if (incomingCombatant.id === currentCombatantId) {
									incomingCombatantTurns -= 1; // Subtract a turn from current combatant when interrupting since they will decremented
								}
								if (this.turns[incomingCombatant.id] !== movedCombatantCurrentTurns) {
									isLegalMove = false;
								}
							}
							if (isLegalMove) {
								if (orderFirstChangedIndex === 0) { // Current combatant interrupted
									this.decrementTurn(this.currentTurnOrder[0]);
									this.incrementTurn(incomingTurnOrder[0]);
								} else {
									possibleTurnChange = false;
								}
								log("Move Down");
							}
						}
						if (!isLegalMove) {
							log("Illegal Move");
							throw new Error("Illegal move.");
						}
					}
				}
			}
		}
		this.currentTurnOrder = incomingTurnOrder;
		if (possibleTurnChange) {
			this.showCurrentTurn();
		}
	};

	protected apiChatMessageHandler(message: ApiChatEventData) {
		const commands = message.content.split(" ");
		if (commands.length !== 2) {
			this.sendChatFromScript("No command given.");
			return;
		}
		switch (commands[1]) {
			case "start":
				const campaign = Campaign();
				const turnOrderStr = campaign.get("turnorder");
				let turnOrder = JSON.parse(turnOrderStr || "[]") as TurnOrdering[];
				turnOrder = _.sortBy(turnOrder, (t) => t.pr).reverse();
				const newTurnOrderStr = JSON.stringify(turnOrder);
				campaign.set("turnorder", newTurnOrderStr);
				this.start();
				this.processTurnOrder(turnOrder);

				on("change:campaign:turnorder", (currentCampaign, previousCampaign) => {
					const currentTurnOrder = JSON.parse(currentCampaign.get("turnorder") || "[]") as TurnOrdering[];
					if (this.isActive()) {
						try {
							this.processTurnOrder(currentTurnOrder);
						} catch (e) {
							this.sendChatFromScript((e as Error).message);
							currentCampaign.set("turnorder", previousCampaign.turnorder);
						}
					}
				});
				break;
			case "stop":
				this.stop();
				break;
			default:
				this.sendChatFromScript("Unknown command.");
				break;
		}
	}

	private showRound() {
		this.sendChatFromScript("<h2>Round " + this.round + "</h2>");
	}

	private showCurrentTurn() {
		const currentCombatantId = this.currentTurnOrder[0].id;
		const token = getObj("graphic", currentCombatantId);
		this.sendChatFromScript("<h3> " + token.get("name") + " - Turn " + this.turns[currentCombatantId] + "</h3>");
	};

	private incrementTurn(combatant: TurnOrdering) {
		if (this.turns[combatant.id] === undefined) {
			this.turns[combatant.id] = 1;
		} else {
			this.turns[combatant.id]++;
		}
		if (this.turns[combatant.id] > this.round) {
			this.round++;
			this.showRound();
		}
	}

	private decrementTurn(combatant: TurnOrdering) {
		if (this.turns[combatant.id] !== undefined) {
			this.turns[combatant.id]--;
			if (_.all(this.turns, (t) => t === this.round)) {
				this.round--;
				this.showRound();
			}
		}
	}
}

new TurnTracker().register();
