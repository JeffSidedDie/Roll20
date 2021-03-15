import { Roll20ApiScript } from "./roll20ApiScript";

class TorchToggler extends Roll20ApiScript {

    public constructor() {
        super("Torch Toggler", "torch-toggle");
    }

    protected apiChatMessageHandler(message: ApiChatEventData): void {
        if (!message.selected) {
            return this.handleError("No token selected.", message);
        }
        const graphic = getObj("graphic", message.selected[0]._id);
        if (graphic) {
            const charId = graphic.get("represents");
            const torchAttrName = "has-torch";
            const torchAttrs = findObjs({ _type: "attribute", _characterid: charId, name: torchAttrName });

            let torchAttr: Attribute;
            if (torchAttrs.length) {
                torchAttr = torchAttrs[0] as Attribute;
            } else {
                const newTorchAttrProps: AttributeCreationProperties = { _characterid: charId, name: torchAttrName };
                const newAttr = createObj("attribute", newTorchAttrProps);
                if (newAttr === undefined) {
                    return this.handleError("Could not create has-torch attribute.", newTorchAttrProps);
                }
                torchAttr = newAttr;
            }
            const hasTorch = torchAttr.get("current");
            if (hasTorch === "1") {
                graphic.set("emits_bright_light", false);
                graphic.set("bright_light_distance", 0);
                graphic.set("emits_low_light", true);
                graphic.set("low_light_distance", 5);
                torchAttr.set("current", "0");
            } else {
                graphic.set("emits_bright_light", true);
                graphic.set("bright_light_distance", 15);
                graphic.set("emits_low_light", true);
                graphic.set("low_light_distance", 30);
                torchAttr.set("current", "1");
            }
        }
    }
}

new TorchToggler().register();
