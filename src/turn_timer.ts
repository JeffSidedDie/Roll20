on("ready", () => {
	on("chat:message", (msg) => {
		// silently ignore if message isn't for this
		if (msg.type !== "api") { return; }
		if (msg.content !== "!timer") { return; }

		sendChat("Timer", "/w gm Timer started.");

		const textObjects = findObjs({
			_type: "text",
		});
		_.each(textObjects, (obj) => {
			log("Deleting: " + obj);
			obj.remove();
		});

		const currentPageId = Campaign().get("playerpageid");

		let time = 10;
		const timerText = createObj("text", {
			_pageid: currentPageId,
			color: "rgb(255,0,0)",
			font_family: "Candal",
			font_size: 100,
			height: 100,
			layer: "objects",
			left: 100,
			text: time.toString(),
			top: 100,
			width: 100,
		});

		if (!timerText) {
			sendChat("Timer", "/w gm Could not create timer text.");
		} else {
			log("Timer text created");
		}

		const timerInterval = setInterval(() => {
			time--;
			timerText.set("text", time.toString());

			if (time === 0) {
				clearInterval(timerInterval);
				sendChat("Timer", "/w gm Timer stopped.");
			}
		}, 1000);
	});
	log(new Date().toLocaleString() + ": Timer - Loading complete.");
});
