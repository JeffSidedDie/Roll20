import { AllHtmlEntities } from "html-entities";
import { XmlDocument } from "xmldoc";

class MonsterImporter {
	public handleChatMessage(msg: ApiChatEventData) {
		if (!msg.selected || msg.selected.length !== 1) {
			this.handleError("Exactly one object must be selected.", msg.selected);
			return;
		}

		const selected = msg.selected[0];
		if (selected._type !== "graphic") {
			this.handleError("Selected object must be a graphic.", selected);
			return;
		}

		const token = getObj(selected._type, selected._id);
		if (token.get("subtype") !== "token") {
			this.handleError("Selected graphic must be a token.", token);
			return;
		}

		let gmnotes = <string>token.get("gmnotes");
		if (!gmnotes) {
			this.handleError("Selected token must have GM notes.", gmnotes);
			return;
		}

		// clean gm notes
		const entities = new AllHtmlEntities();
		gmnotes = decodeURIComponent(gmnotes);
		gmnotes = entities.decode(gmnotes);
		gmnotes = gmnotes.replace(/<br>/g, ""); // Roll20 seems to replace newlines with break tags

		let xml: XmlDocument;
		try {
			xml = new XmlDocument(gmnotes);
		} catch (e) {
			this.handleError("Could not parse XML from GM notes.", gmnotes);
			return;
		}
		if (xml.name !== "Monster") {
			this.handleError("XML is not proper 4E monster file.", xml.name);
			return;
		}

		// check if monster already exists
		const MonsterName = xml.childNamed("Name").val;
		const charactersWithSameName = findObjs({
			_type: "character",
			name: MonsterName,
		});
		if (charactersWithSameName.length > 0) {
			this.handleError("Monster with the same name already exists.", charactersWithSameName[0]);
			return;
		}

		// CREATE CHARACTER SHEET & LINK TOKEN TO SHEET
		const Character = createObj("character", {
			archived: false,
			avatar: token.get("imgsrc"),
			name: MonsterName,
		});

		// Stats
		this.AddAttribute("level", xml.valueWithPath("Level"), Character.id);
		this.AddAttribute("class", xml.valueWithPath("Role.ReferencedObject.Name"), Character.id);
		this.AddAttribute("xp", xml.valueWithPath("Experience@FinalValue"), Character.id);
		this.AddAttribute("race", xml.valueWithPath("Type.ReferencedObject.Name"), Character.id);
		this.AddAttribute("size", xml.valueWithPath("Size.ReferencedObject.Name"), Character.id);
		this.AddAttribute("initiative", xml.valueWithPath("Initiative@FinalValue"), Character.id);

		// HP, save this for later
		const hp = xml.valueWithPath("HitPoints@FinalValue");
		this.AddAttribute("hp", hp, Character.id, true);

		// Defenses
		const defenseAttributes: any = {
			AC: "ac",
			Fortitude: "fort",
			Reflex: "ref",
			Will: "will",
		};
		xml.descendantWithPath("Defenses.Values").eachChild((child) => {
			const value = child.attr.FinalValue;
			const name = child.valueWithPath("Name");
			this.AddAttribute(defenseAttributes[name], value, Character.id);
		});

		// Ability Scores
		xml.descendantWithPath("AbilityScores.Values").eachChild((child) => {
			const value = child.attr.FinalValue;
			const name = child.valueWithPath("Name");
			this.AddAttribute(name, value, Character.id);
		});

		// Skills
		xml.descendantWithPath("Skills.Values").eachChild((child) => {
			const value = child.attr.FinalValue;
			const name = child.valueWithPath("Name");
			this.AddAttribute(name, value, Character.id);
		});

		// Powers
		xml.descendantWithPath("Powers").eachChild((child) => {

			let power = "!power {{\n";

			function appendTag(tagName: string, value: string) {
				if (value) {
					power += "--" + tagName + "|" + value + "\n";
				}
			}

			const name = child.valueWithPath("Name");
			appendTag("name", name);

			const usage = child.valueWithPath("Usage");
			appendTag("format", usage);
			appendTag("leftsub", usage);
			appendTag("rightsub", child.valueWithPath("Action"));

			// TODO: Recharge roll?
			// const MPUsageDetails = child.valueWithPath("UsageDetails");

			appendTag("Requirements", child.valueWithPath("Requirements"));
			appendTag("Trigger", child.valueWithPath("Trigger"));

			const attack = child.descendantWithPath("Attacks.MonsterAttack");
			if (attack) {

				// const MPRange = attack.valueWithPath("Range");
				// const MPTarget = attack.valueWithPath("Targets");

				// const attackBonus = attack.descendantWithPath("AttackBonuses.MonsterPowerAttackNumber");
				// const MPAttackBonus = attackBonus.attr.FinalValue;
				// const MPDefense = attackBonus.valueWithPath("Defense.ReferencedObject.DefenseName");

				// const hit = attack.childNamed("Hit");
				// const MPDamage = hit.valueWithPath("Damage.Expression");
				// const MPOnHit = hit.valueWithPath("Description");

				// const MPOnMiss = attack.valueWithPath("Miss.Description");
				// const MPEffect = attack.valueWithPath("Effect.Description");

				// const MultiAttack = MPTarget ? ((MPTarget.toLowerCase().indexOf("close burst") != -1 && MPTarget.toLowerCase().indexOf("area burst") != -1) ? "?{Number of Attacks|1}" : "") : "";
			}

			power += "}}";

			this.AddPower(name, power, Character.id);
		});

		// SET TOKEN VALUES
		token.set("represents", Character.id);
		token.set("name", MonsterName);
		token.set("showname", true);
		token.set("showplayers_name", true);
		token.set("bar1_value", hp);
		token.set("bar1_max", hp);
		// token.set("gmnotes", "");
	}

	private AddAttribute(attr: string, value: any, charid: string, setMax?: boolean) {
		let attribute: any = {
			characterid: charid,
			current: value,
			name: attr,
		};
		if (setMax) {
			attribute.max = value;
		}
		return createObj("attribute", attribute);
	}

	private AddPower(name: string, action: string, charid: string) {
		createObj("ability", {
			action,
			characterid: charid,
			description: "",
			istokenaction: true,
			name,
		});
	}

	private handleError(message: string, logObject: any) {
		sendChat("Monster Importer", "/w gm " + message);
		log(new Date().toLocaleString() + ": Monster Importer - " + message + " Value: " + JSON.stringify(logObject));
	}
}

on("ready", () => {
	on("chat:message", (msg) => {
		if (msg.type !== "api") { return; }
		if (msg.content !== "!import-monster") { return; }

		const importer = new MonsterImporter();
		importer.handleChatMessage(msg);
	});
	log(new Date().toLocaleString() + ": Monster Importer - Loading complete.");
});
