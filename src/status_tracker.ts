import { Roll20ApiScript } from "./roll20ApiScript";
import { stat } from "fs";

const tokenMarkers = ["red", "blue", "green", "brown", "purple", "pink", "yellow", "dead", "skull", "sleepy", "half-heart", "half-haze", "interdiction", "snail", "lightning-helix", "spanner", "chained-heart", "chemical-bolt", "death-zone", "drink-me", "edge-crack", "ninja-mask", "stopwatch", "fishing-net", "overdrive", "strong", "fist", "padlock", "three-leaves", "fluffy-wing", "pummeled", "tread", "arrowed", "aura", "back-pain", "black-flag", "bleeding-eye", "bolt-shield", "broken-heart", "cobweb", "broken-shield", "flying-flag", "radioactive", "trophy", "broken-skull", "frozen-orb", "rolling-bomb", "white-tower", "grab", "screaming", "grenade", "sentry-gun", "all-for-one", "angel-outfit", "archery-target"] as const;
type TokenMarker = typeof tokenMarkers[number];

const statusDurations = ["save", "sott", "eott", "sost", "eost", "sustain", "encounter"] as const;
type StatusDuration = typeof statusDurations[number];

interface Status {
    description: string;
    duration: StatusDuration;
    marker: string;
    sourceId: string;
    sourceName: string;
    targetId: string;
    targetName: string;
    turns: number;
}

class StatusTracker extends Roll20ApiScript {

    private statusesByTarget = new Map<string, Status[]>();
    private statusesBySource = new Map<string, Status[]>();
    private turnOrder: TurnOrdering[] = [];

    public constructor() {
        super("Status Tracker", "status");
    }

    public register() {
        super.register();
        on("change:campaign:turnorder", (currentCampaign, previousCampaign) => {
            const currentTurnOrder = JSON.parse(currentCampaign.get("turnorder") || "[]") as TurnOrdering[];
            this.turnOrder = currentTurnOrder;
            const previousTurnOrder = JSON.parse(previousCampaign.turnorder || "[]") as TurnOrdering[];

            // If no turn order, combat is over or hasn't started
            if (currentTurnOrder.length === 0) {
                this.log("Clearing statuses");
                this.statusesBySource.clear();
                this.statusesByTarget.clear();
                return;
            }

            const previousFirst = _.first(previousTurnOrder);
            const currentFirst = _.first(currentTurnOrder);
            // If first ids are the same, probably new combatant added, or rearranged
            if (previousFirst?.id === currentFirst?.id) { return; }

            const previousLast = _.last(previousTurnOrder);
            const currentLast = _.last(currentTurnOrder);
            // If last ids are the same, probably combatant delayed
            if (previousLast?.id === currentLast?.id) { return; }

            if (currentLast !== undefined) {
                const lastTargetStatuses = this.statusesByTarget.get(currentLast.id);
                if (lastTargetStatuses !== undefined) {
                    // Decrement turns for each eott status
                    _.filter(lastTargetStatuses, s => s.duration === "eott").forEach(s => s.turns -= 1);
                }
                const lastSourceStatuses = this.statusesBySource.get(currentLast.id);
                if (lastSourceStatuses !== undefined) {
                    // Decrement turns for each eost status
                    _.filter(lastSourceStatuses, s => s.duration === "eost").forEach(s => s.turns -= 1);
                }
            }

            if (currentFirst !== undefined) {
                const firstTargetStatuses = this.statusesByTarget.get(currentFirst.id);
                if (firstTargetStatuses !== undefined) {
                    // Decrement turns for each sott status
                    _.filter(firstTargetStatuses, s => s.duration === "sott").forEach(s => s.turns -= 1);
                }

                const firstSourceStatuses = this.statusesBySource.get(currentFirst.id);
                if (firstSourceStatuses !== undefined) {
                    // Decrement turns for each sost status
                    _.filter(firstSourceStatuses, s => s.duration === "sost").forEach(s => s.turns -= 1);
                }
            }

            // Cleanup statuses
            for (const [id, statuses] of this.statusesByTarget) {
                const token = getObj("graphic", id);
                if (token) {
                    // Remove markers for ended statuses
                    const markersToRemove = _.filter(statuses, s => s.turns === 0).map(s => s.marker);
                    let targetMarkers = token.get("statusmarkers").split(",");
                    targetMarkers = _.without(targetMarkers, ...markersToRemove);
                    token.set("statusmarkers", targetMarkers.join(","));
                }
                // Remove ended statuses from map
                this.statusesByTarget.set(id, _.filter(statuses, s => s.turns > 0));
            }
            for (const [id, statuses] of this.statusesBySource) {
                // Remove ended statuses from map
                this.statusesBySource.set(id, _.filter(statuses, s => s.turns > 0));
            }

            if (currentFirst !== undefined) {
                this.outputStatuses(currentFirst.id);
            }
        });
        on("change:graphic:statusmarkers", (currentGraphic, previousGraphic) => {
            this.log(`${currentGraphic.get("name")} status markers updated`);

            let currentStatuses = this.statusesByTarget.get(currentGraphic.id);
            if (currentStatuses === undefined) { return; }

            const currentMarkers = currentGraphic.get("statusmarkers").split(",");
            currentStatuses = _.filter(currentStatuses, s => _.contains(currentMarkers, s.marker));
            this.statusesByTarget.set(currentGraphic.id, currentStatuses);

            this.outputStatuses(currentGraphic.id);
        });
    }

    private outputStatuses(targetId: string) {
        const token = getObj("graphic", targetId);
        if (token) {
            let message = `<div style="font-style:normal;font-weight:normal;"><h3> ${token.get("name")} Status</h3><table style="width:100%;">`;
            const firstTargetStatuses = this.statusesByTarget.get(targetId);
            if (firstTargetStatuses !== undefined) {
                firstTargetStatuses.forEach((s, i) => message += `<tr style="background-color:${i % 2 === 0 ? "#b6ab91" : "#cec7b6"};"><td style="padding:3px;">${s.description}</td><td style="padding:3px;"><i>${s.sourceName}<br/>${s.duration} ${s.turns}</i></td></tr>`);
            }
            message += "</table></div>";
            if (token.get("layer") === "objects") {
                this.sendDescFromScript(message);
            } else {
                this.sendGmOnlyFromScript(message);
            }
        }
    }

    protected apiChatMessageHandler(message: ApiChatEventData): void {
        const content = message.content.replace(`!${this.apiCommand} `, "");
        if (content.indexOf("|", 0) === -1) {
            this.outputStatuses(content);
        } else {
            const args = content.split("|");
            if (args.length !== 5) { return this.sendChatFromScript("Improper argument format. Expected @{target|token_id}|duration|turns|marker|description."); }

            const targetToken = getObj("graphic", args[0]);
            if (targetToken === undefined) { return this.sendChatFromScript("Could not find target token."); }

            const duration = statusDurations.find(sd => sd === args[1]);
            if (duration === undefined) { return this.sendChatFromScript("Improper duration."); }

            const turns = parseInt(args[2]);
            if (turns <= 0) { return this.sendChatFromScript("Turns must be greater than 0."); }

            const markerNameAtIndex = args[3].indexOf("@");
            const markerName = markerNameAtIndex === -1 ? args[3] : args[3].substring(0, markerNameAtIndex);
            const marker = tokenMarkers.find(tm => tm === markerName);
            if (marker === undefined) { return this.sendChatFromScript("Improper marker."); }

            if (this.turnOrder.length === 0) { return this.sendChatFromScript("No tokens in turn tracker."); }
            const sourceToken = getObj("graphic", this.turnOrder[0].id);
            if (sourceToken === undefined) { return this.sendChatFromScript("Could not find source token."); }

            const status: Status = {
                duration,
                turns,
                marker: args[3],
                description: args[4],
                sourceId: sourceToken.id,
                sourceName: sourceToken.get("name"),
                targetId: targetToken.id,
                targetName: targetToken.get("name"),
            };
            this.log(`Added status: ${JSON.stringify(status)}`);

            const sourceStatuses = this.statusesBySource.get(sourceToken.id) || [];
            const sIndex = sourceStatuses.findIndex(s => s.description === status.description);

            const targetStatuses = this.statusesByTarget.get(targetToken.id) || [];
            const tIndex = targetStatuses.findIndex(s => s.description === status.description);

            const targetMarkers = targetToken.get("statusmarkers").split(",");
            if (targetMarkers.indexOf(status.marker) === -1) {
                targetMarkers.push(status.marker);
            } else if (sIndex === -1 && tIndex === -1) {
                return this.sendChatFromScript("Duplicate marker.");
            }
            targetToken.set("statusmarkers", targetMarkers.join(","));

            if (sIndex === -1) {
                sourceStatuses.push(status);
            } else {
                sourceStatuses[sIndex] = status;
            }
            this.statusesBySource.set(sourceToken.id, sourceStatuses);

            if (tIndex === -1) {
                targetStatuses.push(status);
            } else {
                targetStatuses[sIndex] = status;
            }
            this.statusesByTarget.set(targetToken.id, targetStatuses);

            this.outputStatuses(targetToken.id);
        }
    }
}

new StatusTracker().register();
