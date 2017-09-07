import { Roll20ApiScript } from "./roll20ApiScript";

class TorchToggler extends Roll20ApiScript {

	constructor() {
		super("Torch Toggler", "torch-toggle");
	}

	protected apiChatMessageHandler(message: ApiChatEventData): void {
		if (!message.selected) {
			this.handleError("No token selected.", message);
			return;
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
					this.handleError("Could not create has-torch attribute.", newTorchAttrProps);
					return;
				}
				torchAttr = newAttr;
			}
			const hasTorch = torchAttr.get("current");
			if (hasTorch === "1") {
				graphic.set("light_radius", "5");
				graphic.set("light_dimradius", "0");
				graphic.set("light_hassight", true);
				graphic.set("light_otherplayers", false);
				torchAttr.set("current", "0");
			} else {
				graphic.set("light_radius", "30");
				graphic.set("light_dimradius", "15");
				graphic.set("light_hassight", true);
				graphic.set("light_otherplayers", true);
				torchAttr.set("current", "1");
			}
		}
	}
}

new TorchToggler().register();
