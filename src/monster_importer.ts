import { AllHtmlEntities } from "html-entities";
import { XmlDocument } from "xmldoc";

class MonsterImporter {
	private _errorMessage: string;
	private _errorObject: any;

	public get errorMessage() {
		return this._errorMessage;
	}

	public get errorObject() {
		return this._errorObject;
	}

	public parseGmNotesFromToken(token: Roll20Object): boolean {
		if (token.get("type") !== "graphic" && token.get("subtype") !== "token") { return this.setError("Object to parse from must be a token.", token); }

		let gmnotes = <string>token.get("gmnotes");
		if (!gmnotes) { return this.setError("Token must have GM notes.", gmnotes); }

		// clean gm notes
		const entities = new AllHtmlEntities();
		gmnotes = decodeURIComponent(gmnotes);
		gmnotes = entities.decode(gmnotes);
		gmnotes = gmnotes.replace(/<br>/g, ""); // Roll20 seems to replace newlines with break tags

		let xml: XmlDocument;
		try {
			xml = new XmlDocument(gmnotes);
		} catch (e) {
			return this.setError("Could not parse XML from GM notes.", gmnotes);
		}
		if (xml.name !== "Monster") { return this.setError("XML is not proper 4E monster file.", xml.name); }

		// check if monster already exists
		const monsterName = xml.childNamed("Name").val;
		const charactersWithSameName = findObjs({
			_type: "character",
			name: monsterName,
		});
		if (charactersWithSameName.length > 0) { return this.setError("Monster with the same name already exists.", charactersWithSameName[0]); }

		// CREATE CHARACTER SHEET & LINK TOKEN TO SHEET
		const character = createObj("character", {
			archived: false,
			avatar: token.get("imgsrc"),
			name: monsterName,
		});

		// Stats
		this.AddAttribute("level", xml.valueWithPath("Level"), character.id);
		this.AddAttribute("class", xml.valueWithPath("Role.ReferencedObject.Name"), character.id);
		this.AddAttribute("xp", xml.valueWithPath("Experience@FinalValue"), character.id);
		this.AddAttribute("race", xml.valueWithPath("Type.ReferencedObject.Name"), character.id);
		this.AddAttribute("size", xml.valueWithPath("Size.ReferencedObject.Name"), character.id);
		this.AddAttribute("initiative", xml.valueWithPath("Initiative@FinalValue"), character.id);

		// HP, save this for later
		const hp = xml.valueWithPath("HitPoints@FinalValue");
		this.AddAttribute("hp", hp, character.id, true);

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
			this.AddAttribute(defenseAttributes[name], value, character.id);
		});

		// Ability Scores
		xml.descendantWithPath("AbilityScores.Values").eachChild((child) => {
			const value = child.attr.FinalValue;
			const name = child.valueWithPath("Name");
			this.AddAttribute(name, value, character.id);
		});

		// Skills
		xml.descendantWithPath("Skills.Values").eachChild((child) => {
			const value = child.attr.FinalValue;
			const name = child.valueWithPath("Name");
			this.AddAttribute(name, value, character.id);
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

			this.AddPower(name, power, character.id);
		});

		// SET TOKEN VALUES
		token.set("represents", character.id);
		token.set("name", monsterName);
		token.set("showname", true);
		token.set("showplayers_name", true);
		token.set("bar3_value", hp);
		token.set("bar3_max", hp);
		// red aura
		token.set("aura1_radius", "0");
		token.set("aura1_color", "#660000");
		token.set("aura1_square", true);
		token.set("showplayers_aura1", true);

		//clean up gm notes
		token.set("gmnotes", "");
		return true;
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

	private setError(message: string, object: any): boolean {
		this._errorMessage = message;
		this._errorObject = object;
		return false;
	}
}

on("ready", () => {
	on("chat:message", (msg) => {
		// silently ignore if message isn't for this
		if (msg.type !== "api") { return; }
		if (msg.content !== "!import-monster") { return; }

		const apiMsg = <ApiChatEventData>msg;
		if (!apiMsg.selected || apiMsg.selected.length !== 1) { return handleError("Exactly one object must be selected.", apiMsg.selected); }

		const selected = apiMsg.selected[0];
		if (selected._type !== "graphic") { return handleError("Selected object must be a graphic.", selected); }

		const token = getObj(selected._type, selected._id);
		if (token.get("subtype") !== "token") { return handleError("Selected graphic must be a token.", token); }

		const importer = new MonsterImporter();
		const success = importer.parseGmNotesFromToken(token);
		if (!success) {
			return handleError(importer.errorMessage, importer.errorObject);
		}

		function handleError(message: string, object: any) {
			sendChat("Monster Importer", "/w gm " + message);
			log(new Date().toLocaleString() + ": Monster Importer - " + message + " Value: " + JSON.stringify(object));
		}
	});
	log(new Date().toLocaleString() + ": Monster Importer - Loading complete.");
});
