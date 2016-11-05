import { XmlDocument } from "xmldoc";

(() => {
	log("Monster Importer loaded.");

	on("chat:message", (msg) => {
		// Exit if not an api command
		if (msg.type !== "api") { return; }

		// Get the API Chat Command
		const content = msg.content.replace("(GM) ", "");
		const command = content.split(" ", 1);

		if (command[0] === "!build-monster") {
			if (!(<ApiChatEventData>msg).selected.length) { return; }
			const n = content.split(" ", 2);
			const token = getObj("graphic", n[1]);
			if (token.get("subtype") !== "token") { return; }
			if (token.get("gmnotes").indexOf("xml") === -1) { return; }

			// REPLACE SPECIAL CHARACTERS
			const StatBlock = token.get("gmnotes");
			const monster = new XmlDocument(decodeURIComponent(StatBlock).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<br>/g, ""));

			// END SPECIAL CHARACTER REPLACEMENT or REMOVAL

			// GET NAME OF MONSTER
			const MonsterName = monster.childNamed("Name").val;

			// CHECK FOR DUPLICATE CHARACTERS
			const charactersWithSameName = findObjs({
				_type: "character",
				name: MonsterName,
			});

			// DO NOT CREATE IF SHEET EXISTS
			if (charactersWithSameName.length > 0) {
				sendChat("ERROR", "This monster already exists.");
				return;
			}

			// CREATE CHARACTER SHEET & LINK TOKEN TO SHEET
			const Character = createObj("character", {
				archived: false,
				avatar: token.get("imgsrc"),
				name: MonsterName,
			});

			// Stats
			AddAttribute("level", monster.valueWithPath("Level"), Character.id);
			AddAttribute("class", monster.valueWithPath("Role.ReferencedObject.Name"), Character.id);
			AddAttribute("xp", monster.valueWithPath("Experience@FinalValue"), Character.id);
			AddAttribute("race", monster.valueWithPath("Type.ReferencedObject.Name"), Character.id);
			AddAttribute("size", monster.valueWithPath("Size.ReferencedObject.Name"), Character.id);
			AddAttribute("initiative", monster.valueWithPath("Initiative@FinalValue"), Character.id);

			// HP, save this for later
			const hp = monster.valueWithPath("HitPoints@FinalValue");
			AddAttribute("hp", hp, Character.id, true);

			// Defenses
			const defenseAttributes: any = {
				AC: "ac",
				Fortitude: "fort",
				Reflex: "ref",
				Will: "will",
			};
			monster.descendantWithPath("Defenses.Values").eachChild((child) => {
				const value = child.attr.FinalValue;
				const name = child.valueWithPath("Name");
				AddAttribute(defenseAttributes[name], value, Character.id);
			});

			// Ability Scores
			monster.descendantWithPath("AbilityScores.Values").eachChild((child) => {
				const value = child.attr.FinalValue;
				const name = child.valueWithPath("Name");
				AddAttribute(name, value, Character.id);
			});

			// Skills
			monster.descendantWithPath("Skills.Values").eachChild((child) => {
				const value = child.attr.FinalValue;
				const name = child.valueWithPath("Name");
				AddAttribute(name, value, Character.id);
			});

			// Powers
			monster.descendantWithPath("Powers").eachChild((child) => {

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

				AddPower(name, power, Character.id);
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

		function AddAttribute(attr: string, value: any, charid: string, setMax?: boolean) {
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

		function AddPower(name: string, action: string, charid: string) {
			createObj("ability", {
				action,
				characterid: charid,
				description: "",
				istokenaction: true,
				name,
			});
		}
	});
})();
