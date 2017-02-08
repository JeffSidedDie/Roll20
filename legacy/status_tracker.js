(function () {
    "use strict";

    function Tracker() {
        var active = false;
        var round = 0;
        var currentId = null;
        var lastId = null;
        var turns = {};
        this.isActive = function isActive() {
            return active;
        };
        this.start = function start() {
            active = true;
            round = 1;
            log("StatusTracker started.");
        };
        this.stop = function stop() {
            active = false;
            round = 0;
            currentId = null;
            lastId = null;
            turns = {};
            log("StatusTracker stopped.");
        };
        this.getRound = function getRound() {
            return round;
        };
        this.getCurrentId = function getCurrentId() {
            return currentId;
        };
        this.getTurnNumber = function getTurnNumber(id) {
            return turns[id];
        };
        this.processTurnOrder = function processTurnOrder(turnOrder) {
            if (!turnOrder || !turnOrder.length || turnOrder.length <= 1) return;
            var first = turnOrder[0];
            var next = turnOrder[1];
            var last = turnOrder[turnOrder.length - 1];
            if (!currentId) { //First turn of combat
                incrementTurn(first);
                log("First Turn");
            }
            else if (currentId === last.id) { //Expected progression
                incrementTurn(first);
                log("Normal");
            }
            else if (lastId === first.id & currentId === next.id) { //Backed up
                decrementTurn(next);
                log("Backup");
            }
            else {
                //Walk through turn order in reverse to find current id and make
                //sure it didn't get moved past a combatant that has already gone
                //this turn
                var currentTurn = null;
                for (var i = turnOrder.length - 1; i > 0 /*Not including first*/; i--) {
                    var turn = turnOrder[i];
                    if (currentTurn) {
                        var numTurns = turns[turn.id];
                        var curTurns = turns[currentId];
                        if (numTurns > curTurns - 1) {
                            log("Illegal turn sequence");
                            throw "Illegal turn sequence.";
                        }
                    }
                    else if (currentId === turn.id) {
                        currentTurn = turn;
                    }
                }
                if (currentTurn) { //Combatant delayed
                    decrementTurn(currentTurn);
                    incrementTurn(first);
                    log("Delay");
                }
                else {
                    log("Unknown turn sequence");
                    throw "Unknown turn sequence.";
                }
            }
            lastId = last.id;
            currentId = first.id;
        };
        function incrementTurn(turn) {
            if (!turn) return;
            if (turns[turn.id] === undefined) {
                turns[turn.id] = 1;
            }
            else {
                turns[turn.id]++;
            }
            if (turns[turn.id] > round) {
                round++;
            }
        }
        function decrementTurn(turn) {
            if (!turn) return;
            if (turns[turn.id] !== undefined) {
                turns[turn.id]--;
            }
        }
        log("StatusTracker loaded.");
    }

    function TrackerDisplay(tracker) {
        this.showRound = function showRound() {
            var now = new Date();
            sendChat("", "/desc <h2>Round " + tracker.getRound() + "</h2><span>" + now.toLocaleTimeString() + "</span>");
        };
        this.showCurrentTurn = function showCurrentTurn() {
            if (!tracker.isActive()) return;
            var currentId = tracker.getCurrentId();
            if (!currentId) return;
            var token = getObj("graphic", currentId);
            var now = new Date();
            sendChat("", "/desc <h3> " + token.get("name") + " - Turn " + tracker.getTurnNumber(currentId) + "</h3><span>" + now.toLocaleTimeString() + "</span>");
        };
    }

    on("ready", function () {
        var tracker = new Tracker();
        var trackerDisplay = new TrackerDisplay(tracker);

        on("change:campaign:turnorder", function (currentCampaign, previousCampaign) {
            if (!currentCampaign || !previousCampaign) return;
            if (currentCampaign.get("_type") !== "campaign" || previousCampaign._type !== "campaign") return;
            var currentTurnOrder = JSON.parse(currentCampaign.get("turnorder") || "[]");
            var previousTurnOrder = JSON.parse(previousCampaign.turnorder || "[]");
            if (currentTurnOrder.length !== previousTurnOrder.length) return; //Combatant added or removed
            if (tracker.isActive()) {
                try {
                    tracker.processTurnOrder(currentTurnOrder);
                    trackerDisplay.showCurrentTurn();
                }
                catch (e) {
                    currentCampaign.set("turnorder", previousCampaign.turnorder);
                }
            }
        });

        on("chat:message", function (message) {
            if (message.type === "api") {
                if (message.content === "!tracker start") {
                    var campaign = Campaign();
                    var turnOrderStr = campaign.get("turnorder");
                    //log(turnorderStr);
                    var turnOrder = JSON.parse(turnOrderStr || "[]");
                    //log(turnorder);
                    turnOrder = _.sortBy(turnOrder, "pr").reverse();
                    //log(turnorder);
                    var newTurnOrderStr = JSON.stringify(turnOrder);
                    campaign.set("turnorder", newTurnOrderStr);

                    tracker.start();
                    tracker.processTurnOrder(turnOrder);

                    trackerDisplay.showRound();
                    trackerDisplay.showCurrentTurn();
                }
                if (message.content === "!tracker stop") {
                    tracker.stop();
                }
            }
        });
    });
})();