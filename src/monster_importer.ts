import { XmlDocument, XmlElement } from "xmldoc";
import { Roll20ApiScript } from "./roll20ApiScript";

class MonsterImporter extends Roll20ApiScript {
	private _errorMessage: string;
	private _errorObject: any;

	constructor() {
		super("Monster Importer", "import-monster");
	}

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
		if (!character) {
			return this.setError("Could not create character.", character);
		}

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
		xml.descendantWithPath("Powers").eachChild((powerNode) => {

			let powerString = "!power {{\n";

			function appendTag(tagName: string, value: string, appendColon: boolean = true) {
				if (value) {
					powerString += "--" + tagName + (appendColon ? ":" : "") + "|" + value + "\n";
				}
			}

			function appendFailedSaveAftereffectSustainNodes(attackEntryNode: XmlElement) {
				attackEntryNode.childNamed("FailedSavingThrows").eachChild((failedSaveNode) => {
					appendTag(failedSaveNode.valueWithPath("Name"), failedSaveNode.valueWithPath("Description"));
				});

				appendTag("Aftereffect", attackEntryNode.valueWithPath("Aftereffects.MonsterAttackEntry.Description"));

				const sustainNode = attackEntryNode.descendantWithPath("Sustains.MonsterSustainEffect");
				if (sustainNode) {
					appendTag("Sustain " + sustainNode.valueWithPath("Action"), sustainNode.valueWithPath("Description"));
				}
			}

			function appendAttackNodes(attackNode: XmlElement) {
				// const description = attackNode.valueWithPath("Description");

				const range = attackNode.valueWithPath("Range");
				appendTag("Range", range);
				appendTag("Targets", attackNode.valueWithPath("Targets"));

				const rangeLower = (range || "").toLowerCase();
				const multipleAttacks = rangeLower.indexOf("burst") !== -1 || rangeLower.indexOf("blast") !== -1;
				if (multipleAttacks) {
					let targetList = "";
					_.times(6, (n) => targetList += ((n > 0 ? " | " : "") + "@{target|Target" + (n + 1) + "|token_id}"));
					appendTag("target_list", targetList);
				}

				const attackBonusNode = attackNode.descendantWithPath("AttackBonuses.MonsterPowerAttackNumber");
				if (attackBonusNode) {
					const attackBonus = attackBonusNode.attr.FinalValue;
					const defense = attackBonusNode.valueWithPath("Defense.ReferencedObject.DefenseName");
					if (multipleAttacks) {
						appendTag("Attack#?{Number of targets|1}", "[[ 1d20+" + attackBonus + " ]] vs %%%" + attributeMap[defense] + "%% (%%character_name%%'s " + defense + ")");
					} else {
						appendTag("Attack", "[[ 1d20+" + attackBonus + " ]] vs [[ @{target|" + attributeMap[defense] + "} ]] (@{target|character_name}'s " + defense + ")");
					}

					const hitNode = attackNode.childNamed("Hit");
					const damage = hitNode.valueWithPath("Damage.Expression");
					const onHit = hitNode.valueWithPath("Description");

					let hitLine = "";
					if (damage) {
						hitLine += "[[ " + damage + " ]] ";
					}
					if (onHit) {
						hitLine += onHit.replace(/([0-9]+)d([0-9]{1,2})\s*([+|-]\s*[0-9]+)?/g, (str) => "[[ " + str + " ]] ");;
					}

					appendTag("Hit", hitLine);
					appendFailedSaveAftereffectSustainNodes(hitNode);
					appendTag("Miss", attackNode.valueWithPath("Miss.Description"));
				}

				const effectNode = attackNode.childNamed("Effect");
				appendTag("Effect", effectNode.valueWithPath("Description"));
				appendFailedSaveAftereffectSustainNodes(effectNode);
				effectNode.descendantWithPath("Attacks").eachChild(appendAttackNodes);
			}

			const name = powerNode.valueWithPath("Name");
			appendTag("name", name, false);

			if (powerNode.name === "MonsterPower") {
				const usage = powerNode.valueWithPath("Usage");
				appendTag("format", (usage || "").toLowerCase(), false);

				const action = powerNode.valueWithPath("Action");
				appendTag("leftsub", action ? (action.indexOf("Immediate") > -1 || action.indexOf("Action") > -1 ? action : action + " Action") : "", false);
				const usageDetails = powerNode.valueWithPath("UsageDetails");
				appendTag("rightsub", usage + (usageDetails ? " " + usageDetails : ""), false);

				appendTag("Requirements", powerNode.valueWithPath("Requirements"));
				appendTag("Trigger", powerNode.valueWithPath("Trigger"));

				powerNode.descendantWithPath("Attacks").eachChild(appendAttackNodes);
			} else if (powerNode.name === "MonsterTrait") {
				const auraSize = powerNode.valueWithPath("Range@FinalValue");
				if (auraSize !== "0") {
					const auraDetails = powerNode.valueWithPath("Range.Details");
					appendTag("leftsub", "Aura " + auraSize + (auraDetails ? " " + auraDetails : ""));
				}
				appendTag("Effect", powerNode.valueWithPath("Details"));
			}

			powerString += "}}";

			this.AddPower(name, powerString, character.id);
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

		// clean up gm notes
		token.set("gmnotes", "");
		return true;
	}

	protected apiChatMessageHandler(message: ApiChatEventData) {
		if (!message.selected || message.selected.length !== 1) { return this.handleError("Exactly one object must be selected.", message.selected); }

		const selected = message.selected[0];
		if (selected._type !== "graphic") { return this.handleError("Selected object must be a graphic.", selected); }

		const token = getObj(selected._type, selected._id);
		if (!token || token.get("_subtype") !== "token") { return this.handleError("Selected graphic must be a token.", token); }

		const success = this.parseGmNotesFromToken(token);
		if (!success) {
			return this.handleError(this.errorMessage, this.errorObject);
		}
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

new MonsterImporter().register();
