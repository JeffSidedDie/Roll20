on("ready", () => {
    on("chat:message", (message) => {
        if (message.type !== "api") { return; }
        const apiMessage = message as ApiChatEventData;
        if (apiMessage && apiMessage.content === "!purple-fog" && apiMessage.selected && apiMessage.selected.length) {
            const graphic = getObj("graphic", apiMessage.selected[0]._id);
            if (graphic) {
                const lightRadius = graphic.get("light_radius");
                if (lightRadius === "200") {
                    graphic.set("light_radius", "10");
                    graphic.set("light_dimradius", "7");
                    graphic.set("light_hassight", true);
                } else {
                    graphic.set("light_radius", "200");
                    graphic.set("light_dimradius", "");
                    graphic.set("light_hassight", true);
                }
            }
        }
    });
});
