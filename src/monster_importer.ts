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

	public parseGmNotesFromToken(token: Graphic): boolean {
		let gmnotes = token.get("gmnotes");
		if (!gmnotes) { return this.setError("Token must have GM notes.", gmnotes); }

		// clean gm notes
		gmnotes = unescape(gmnotes);
		gmnotes = _.unescape(gmnotes);
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
		this.AddAttribute("class", xml.valueWithPath("GroupRole.ReferencedObject.Name") + " " + xml.valueWithPath("Role.ReferencedObject.Name"), character.id);
		this.AddAttribute("xp", xml.valueWithPath("Experience@FinalValue"), character.id);
		this.AddAttribute("race", xml.valueWithPath("Origin.ReferencedObject.Name") + " " + xml.valueWithPath("Type.ReferencedObject.Name"), character.id);
		this.AddAttribute("size", xml.valueWithPath("Size.ReferencedObject.Name"), character.id);
		this.AddAttribute("alignment", xml.valueWithPath("Alignment.ReferencedObject.Name"), character.id);
		this.AddAttribute("initiative", xml.valueWithPath("Initiative@FinalValue"), character.id);

		// HP, save this for later
		const hp = xml.valueWithPath("HitPoints@FinalValue");
		this.AddAttribute("hp", hp, character.id, true);

		const attributeTypes = ["Defenses", "AbilityScores", "Skills"];
		const attributeMap: { [property: string]: string } = {
			AC: "ac",
			Fortitude: "fort",
			Reflex: "ref",
			Will: "will",
		};
		attributeTypes.forEach((attributeType) => {
			xml.descendantWithPath(attributeType + ".Values").eachChild((child) => {
				const name = child.valueWithPath("Name");
				this.AddAttribute(attributeMap[name] || name.toLowerCase(), child.attr.FinalValue, character.id);
			});
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

			if (child.name === "MonsterPower") {
				const usage = child.valueWithPath("Usage");
				appendTag("format", (usage || "").toLowerCase());

				const action = child.valueWithPath("Action");
				appendTag("leftsub", action ? action + " Action" : "");
				const usageDetails = child.valueWithPath("UsageDetails");
				appendTag("rightsub", usage + (usageDetails ? " " + usageDetails : ""));

				appendTag("Requirements", child.valueWithPath("Requirements"));
				appendTag("Trigger", child.valueWithPath("Trigger"));

				const attack = child.descendantWithPath("Attacks.MonsterAttack");
				if (attack) {
					const range = attack.valueWithPath("Range");
					appendTag("Range", range);
					appendTag("Target(s)", attack.valueWithPath("Targets"));

					const rangeLower = (range || "").toLowerCase();
					const multipleAttacks = rangeLower.indexOf("burst") !== -1 || rangeLower.indexOf("blast") !== -1;
					if (multipleAttacks) {
						let targetList = "";
						_.times(6, (n) => targetList += ((n > 0 ? " | " : "") + "@{target|Target" + (n + 1) + "|token_id}"));
						appendTag("target_list", targetList);
					}

					const attackBonusNode = attack.descendantWithPath("AttackBonuses.MonsterPowerAttackNumber");
					if (attackBonusNode) {
						const attackBonus = attackBonusNode.attr.FinalValue;
						const defense = attackBonusNode.valueWithPath("Defense.ReferencedObject.DefenseName");
						if (multipleAttacks) {
							appendTag("Attack#?{Number of targets|1}", "[[ 1d20+" + attackBonus + " ]] vs %%%" + attributeMap[defense] + "%% (%%character_name%%'s " + defense + ")");
						} else {
							appendTag("Attack", "[[ 1d20+" + attackBonus + " ]] vs [[ @{target|" + attributeMap[defense] + "} ]] (@{target|character_name}'s " + defense + ")");
						}

						const hitNode = attack.childNamed("Hit");
						const damage = hitNode.valueWithPath("Damage.Expression");
						const onHit = hitNode.valueWithPath("Description");

						let hitLine = "";
						if (damage) {
							hitLine += "[[ " + damage + " ]] ";
						}
						if (onHit) {
							hitLine += onHit;
						}
						appendTag("Hit", hitLine);
						appendTag("Miss", attack.valueWithPath("Miss.Description"));
					}

					appendTag("Effect", attack.valueWithPath("Effect.Description"));
				}
			} else {
				const details = child.valueWithPath("Details");
				appendTag("Effect", details);
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
		token.set("aura1_radius", 0);
		token.set("aura1_color", "#660000");
		token.set("aura1_square", true);
		token.set("showplayers_aura1", true);

		// clean up gm notes
		token.set("gmnotes", "");
		return true;
	}

	private AddAttribute(attr: string, value: any, charid: string, setMax?: boolean) {
		if (value) {
			const attribute: AttributeCreationProperties = {
				_characterid: charid,
				current: value,
				name: attr,
			};
			if (setMax) {
				attribute.max = value;
			}
			return createObj("attribute", attribute);
		} else {
			return false;
		}
	}

	private AddPower(name: string, action: string, charid: string) {
		createObj("ability", {
			action,
			_characterid: charid,
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

		const apiMsg = msg as ApiChatEventData;
		if (!apiMsg.selected || apiMsg.selected.length !== 1) { return handleError("Exactly one object must be selected.", apiMsg.selected); }

		const selected = apiMsg.selected[0];
		if (selected._type !== "graphic") { return handleError("Selected object must be a graphic.", selected); }

		const token = getObj(selected._type, selected._id);
		if (token.get("_subtype") !== "token") { return handleError("Selected graphic must be a token.", token); }

		const importer = new MonsterImporter();
		const success = importer.parseGmNotesFromToken(token);
		if (!success) {
			return handleError(importer.errorMessage, importer.errorObject);
		}

		function handleError(message: string, object: any) {
			sendChat("Monster Importer", "/w \"" + msg.who + "\" " + message);
			log(new Date().toLocaleString() + ": Monster Importer - " + message + " Value: " + JSON.stringify(object));
		}
	});
	log(new Date().toLocaleString() + ": Monster Importer - Loading complete.");
});
