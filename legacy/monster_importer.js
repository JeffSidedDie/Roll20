// VARIABLE & FUNCTION DECLARATIONS
var AddAttribute = AddAttribute || {};
var AddSkill = AddSkill || {};
var AddPower = AddPower || {};

on("chat:message", function (msg) {
    // Exit if not an api command
    if (msg.type != "api") return;

	// Get the API Chat Command
	msg.who = msg.who.replace(" (GM)", "");
	msg.content = msg.content.replace("(GM) ", "");
	var command = msg.content.split(" ", 1);

	if (command == "!build-monster") {
		if (!msg.selected) return;
		var n = msg.content.split(" ", 2);
		var Token = getObj("graphic", n[1])
		if (Token.get("subtype") != "token") return;
		if (Token.get("gmnotes").indexOf("xml") == -1) return;
        
        // USER CONFIGURATION
        var USE_POWER_CARDS = true; // Uses power cards instead of text only macros
        var SHOW_DEFENSES = true;   // Adds monster defenses as token actions
        
		// REPLACE SPECIAL CHARACTERS StatBlock = StatBlock.replace(//g, "");
		var StatBlock = Token.get("gmnotes");
		    StatBlock = StatBlock.replace(/%20/g, " "); // Replace %20 with a space
		    StatBlock = StatBlock.replace(/%22/g, "'"); // Replace %22 (quotation) with '
		    StatBlock = StatBlock.replace(/%26lt/g, "<"); // Replace %26lt with <
		    StatBlock = StatBlock.replace(/%26gt/g, ">"); // Replace %26gt with >
		    StatBlock = StatBlock.replace(/%27/g, "'"); // Replace %27 with '
		    StatBlock = StatBlock.replace(/%28/g, "("); // Replace %28 with (
		    StatBlock = StatBlock.replace(/%29/g, ")"); // Replace %29 with )
		    StatBlock = StatBlock.replace(/%2C/g, ","); // Replace %2C with ,
		    StatBlock = StatBlock.replace(/%3A/g, ":"); // Replace %3A with :
		    StatBlock = StatBlock.replace(/%3B/g, ""); // Remove %3B (semi-colon)
		    StatBlock = StatBlock.replace(/%3Cbr/g, ""); // Remove carriage returns
		    StatBlock = StatBlock.replace(/%3D/g, "="); // Replace %3D with =
		    StatBlock = StatBlock.replace(/%3E/g, ""); // Remove %3E (???)
		    StatBlock = StatBlock.replace(/%3F/g, "?"); // Replace %3F with ?
		    StatBlock = StatBlock.replace(/\s{2,}/g, " "); // Replace multiple spaces with one space
		    StatBlock = StatBlock.replace(/%u2019/g, "'"); // Replace %u2019 with '
		// END SPECIAL CHARACTER REPLACEMENT or REMOVAL
        
		// GET NAME OF MONSTER
		var MonsterName = StatBlock.match(/<Name>(.*?)<\/Name>/g).pop().split(">")[1].split("<", 1)[0];
        
		// CHECK FOR DUPLICATE CHARACTERS
		var CheckSheet = findObjs({
			_type: "character",
			name: MonsterName
		});
        
		// DO NOT CREATE IF SHEET EXISTS
		if (CheckSheet.length > 0) {
			sendChat("ERROR", "This monster already exists.");
			return;
		}
        
		// CREATE CHARACTER SHEET & LINK TOKEN TO SHEET
		var Character = createObj("character", {
			avatar: Token.get("imgsrc"),
			name: MonsterName,
			gmnotes: Token.get("gmnotes"),
			archived: false
		});
        
		// GET LEVEL, ROLE, & XP
		var Level = parseInt(StatBlock.match(/<Level>(.*?)<\/Level>/g)[0].match(/\d+/g)[0]);
		var Role = StatBlock.match(/<Role(.*?)<\/Role>/g)[0].match(/<Name>(.*?)<\/Name>/g)[0].split(">")[1].split("<")[0];
		var XP = parseInt(StatBlock.match(/<Experience FinalValue(.*?)'>/g)[0].match(/\d+/g)[0]);
		AddAttribute("Level", Level, Character.id);
		AddAttribute("Role", Role, Character.id);
		AddAttribute("XP", XP, Character.id);
        
		// GET INITIATIVE & HIT POINTS
		var Initiative = parseInt(StatBlock.match(/<Initiative FinalValue(.*?)'>/g)[0].match(/\d+/g)[0]);
		var HitPoints = parseInt(StatBlock.match(/<HitPoints FinalValue(.*?)'>/g)[0].match(/\d+/g)[0]);
		AddAttribute("Initiative", Initiative, Character.id);
		AddAttribute("Hit Points", HitPoints, Character.id);
        
		// GET DEFENSES
		var Defenses = StatBlock.match(/<Defenses>(.*?)<\/Defenses>/g)[0].match(/\d+/g);
        var DEF_AC   = parseInt(Defenses[0]);
        var DEF_FORT = parseInt(Defenses[3]);
        var DEF_REF  = parseInt(Defenses[6]);
        var DEF_WILL = parseInt(Defenses[9]);
		AddAttribute("AC", DEF_AC, Character.id);
		AddAttribute("Fortitude", DEF_FORT, Character.id);
		AddAttribute("Reflex", DEF_REF, Character.id);
		AddAttribute("Will", DEF_WILL, Character.id);
        
		// GET ABILITY SCORE MODIFIERS
		var AbilityScores = StatBlock.match(/<AbilityScoreNumber(.*?)'>/g);
		var STRMod = Math.floor((parseInt(AbilityScores[0].match(/\d+/g)) - 10) / 2);
		var CONMod = Math.floor((parseInt(AbilityScores[1].match(/\d+/g)) - 10) / 2);
		var DEXMod = Math.floor((parseInt(AbilityScores[2].match(/\d+/g)) - 10) / 2);
		var INTMod = Math.floor((parseInt(AbilityScores[3].match(/\d+/g)) - 10) / 2);
		var WISMod = Math.floor((parseInt(AbilityScores[4].match(/\d+/g)) - 10) / 2);
		var CHAMod = Math.floor((parseInt(AbilityScores[5].match(/\d+/g)) - 10) / 2);
		AddAttribute("STR Mod", STRMod, Character.id);
		AddAttribute("CON Mod", CONMod, Character.id);
		AddAttribute("DEX Mod", DEXMod, Character.id);
		AddAttribute("INT Mod", INTMod, Character.id);
		AddAttribute("WIS Mod", WISMod, Character.id);
		AddAttribute("CHA Mod", CHAMod, Character.id);
        
		// ADD ATTACK POWERS
		createObj("ability", {
			name: "█▓▒░POWERS░▒▓█",
			description: "",
			action: "",
			istokenaction: false,
			characterid: Character.id
		});
		var Powers = StatBlock.match(/<MonsterPower(.*?)<\/MonsterPower>/g);
		var p = 0;
		var PowerString = "";
		var MPName;
		var MPAction;
		var MPUsage;
		var MPUsageDetails;
		var MPRange;
		var MPRequire;
		var MPTrigger;
		var MPTarget;
		var MPAttackBonus;
		var MPDefense;
		var MPDamage;
		var MPOnHit;
		var MPOnMiss;
		var MPEffect;
		var MultiAttack;
		while (p < Powers.length) {
			MPName = Powers[p].match(/<\/Attacks>(.*?)<\/Type>/g)[0].match(/<Name>(.*?)<\/Name>/g);
			MPAction = Powers[p].match(/<Action>(.*?)<\/Action>/g);
			MPUsage = Powers[p].match(/<Usage>(.*?)<\/Usage>/g);
			MPUsageDetails = Powers[p].match(/<UsageDetails>(.*?)<\/UsageDetails>/g);
			MPRange = Powers[p].match(/<Range>(.*?)<\/Range>/g);
			MPRequire = Powers[p].match(/<Requirements>(.*?)<\/Requirements>/g);
			MPTrigger = Powers[p].match(/<Trigger>(.*?)<\/Trigger>/g);
			MPTarget = Powers[p].match(/<Targets>(.*?)<\/Targets>/g);
			MPAttackBonus = Powers[p].match(/<MonsterPowerAttackNumber FinalValue(.*?)'>/g);
			MPDefense = Powers[p].match(/<DefenseName>(.*?)<\/DefenseName>/g);
			MPDamage = Powers[p].match(/<Expression>(.*?)<\/Expression>/g);
			MPOnHit = Powers[p].match(/<Hit>(.*?)<\/Hit>/g)[0].match(/<Description>(.*?)<\/Description>/g);
			MPOnMiss = Powers[p].match(/<Miss>(.*?)<\/Miss>/g)[0].match(/<Description>(.*?)<\/Description>/g);
			MPEffect = Powers[p].match(/<Effect>(.*?)<\/Effect>/g)[0].match(/<Description>(.*?)<\/Description>/g);
			MPName = MPName[0].split(">")[1].split("<")[0];
			MPAction = (MPAction != null) ? MPAction[0].split(">")[1].split("<")[0] : "";
				// Add the word 'Action' if it does not have it already...
				MPAction += (MPAction != "" && MPAction.indexOf("Action") == -1) ? " Action" : "";
			MPUsage = (MPUsage != null) ? MPUsage[0].split(">")[1].split("<")[0] : "";
			MPUsageDetails = (MPUsageDetails != null) ? MPUsageDetails[0].split(">")[1].split("<")[0] : "";
				// If MPUsageDetails is longer than one character, don't add to MPUsage
				MPUsage += (MPUsageDetails.length === 1) ? " " + MPUsageDetails + "+" : "";
			MPRange = (MPRange != null) ? MPRange[0].split(">")[1].split("<")[0] : "";
			MPRequire = (MPRequire != null) ? MPRequire[0].split(">")[1].split("<")[0] : "";
			MPTrigger = (MPTrigger != null) ? MPTrigger[0].split(">")[1].split("<")[0] : "";
			MPTarget = (MPTarget != null) ? MPTarget[0].split(">")[1].split("<")[0] : "";
			MPAttackBonus = (MPAttackBonus != null) ? parseInt(MPAttackBonus[0].match(/\d+/g)[0]) : "";
			MPDefense = (MPDefense != null) ? MPDefense[0].split(">")[1].split("<")[0] : "";
			MPDamage = (MPDamage != null) ? MPDamage[0].split(">")[1].split("<")[0] : "";
			MPOnHit = (MPOnHit != null) ? MPOnHit[0].split(">")[1].split("<")[0] : "";
			MPOnMiss = (MPOnMiss != null) ? MPOnMiss[0].split(">")[1].split("<")[0] : "";
			MPEffect = (MPEffect != null) ? MPEffect[0].split(">")[1].split("<")[0] : "";
			MultiAttack = (MPTarget.toLowerCase().indexOf("close burst") != -1 && MPTarget.toLowerCase().indexOf("area burst") != -1) ? "?{Number of Attacks|1}" : "";
            
			// CREATE POWERSTRING
            PowerString = "";
            if (USE_POWER_CARDS) {
                // USE POWER CARD FORMAT
                PowerString += "!power --format|dnd4e --emote|" + MonsterName.toUpperCase() + " --name|" + MPName;
                PowerString += " --usage|" + MPUsage + " --action|" + MPAction;
                PowerString += (MPRequire != "") ? " --Requirement|" + MPRequire : "";
                PowerString += (MPTrigger != "") ? " --Trigger|" + MPTrigger : "";
                PowerString += (MPRange != "") ? " --Range|" + MPRange : "";
                PowerString += (MPTarget != "") ? " --Target(s)|" + MPTarget : "";
                PowerString += (MPAttackBonus != "") ? " --attack" + MultiAttack + "|[[1d20 + " + MPAttackBonus + "]]" : "";
                PowerString += (MPDefense != "") ? " --defense|" + MPDefense : "";
                PowerString += (MPDamage != "") ? " --damage|[[" + MPDamage + "]] " + MPOnHit : "";
                PowerString += (MPOnMiss != "") ? " --On Miss|" + MPOnMiss : "";
                PowerString += (MPEffect != "") ? " --Effect|" + MPEffect : "";
                PowerString += (MPUsageDetails.length > 1) ? " --Recharge|" + MPUsageDetails : "";
            } else {
                // NO POWER CARD FORMAT
                PowerString += '/emas ' + MonsterName.toUpperCase() + '\n';
                PowerString += '/as "Power" ' + MPName + '\n';
                PowerString += (MPRequire != "") ? '/as "Require" ' + MPRequire + '\n' : '';
                PowerString += (MPTrigger != "") ? '/as "Trigger" ' + MPTrigger + '\n' : '';
                PowerString += (MPRange != "") ? '/as "Range" ' + MPRange + '\n' : '';
                PowerString += (MPTarget != "") ? '/as "Target" ' + MPTarget + '\n' : '';
                PowerString += (MPAttackBonus != "") ? '/as "Attack" ' + MPAction + ' \n' : '';
                PowerString += (MPAttackBonus != "") ? '/as "Attack" [[1d20 + ' + MPAttackBonus + ']] vs ' + MPDefense + '\n' : '';
                PowerString += (MPDamage != "") ? '/as "Attack" [[' + MPDamage + ']] ' + MPOnHit + '\n' : '';
                PowerString += (MPOnMiss != "") ? '/as "On Miss" ' + MPOnMiss + '\n' : '';
                PowerString += (MPEffect != "") ? '/as "Effect" ' + MPEffect + '\n' : '';
                PowerString += (MPUsageDetails.length > 1) ? '/as "Recharge" ' + MPUsageDetails : '';
                // Remove last newline...
                PowerString = PowerString.substring(0, PowerString.length-2);
            }
            
			// ADD POWER TO CHARACTER SHEET
			AddPower(MPName, PowerString, Character.id);
			p++;
		}
        
		// GET TRAINED SKILL NAMES
		var TrainedSkillsBlock = StatBlock.match(/<Skills>(.*?)<\/Skills>/g)[0];
		var NumOfSkills = TrainedSkillsBlock.match(/FinalValue='(.*?)'/g).length;
		var SkillTraining = TrainedSkillsBlock.match(/<Trained>(.*?)<\/Trained>/g);
		var SkillNames = TrainedSkillsBlock.match(/<Name>(.*?)<\/Name>/g);
		var MonsterTraining = [];
		var MonsterSkills = [];
		var Trained;
		var k = 0;
		while (k < NumOfSkills) {
			MonsterTraining.push(SkillTraining[k].split(">")[1].split("<")[0]);
			MonsterSkills.push(SkillNames[k * 2].split(">")[1].split("<")[0]);
			k++;
		}
        
		// ADD SKILLCHECK MACROS
		createObj("ability", {
			name: "█▓▒░SKILLS░▒▓█",
			description: "",
			action: "",
			istokenaction: false,
			characterid: Character.id
		});
		var SkillList = ["Acrobatics", "Arcana", "Athletics", "Bluff", "Diplomacy", "Dungeoneering", "Endurance", "Heal", "History", "Insight", "Intimidate", "Nature", "Perception", "Religion", "Stealth", "Streetwise", "Thievery"];
		var SkillMods = [DEXMod, INTMod, STRMod, CHAMod, CHAMod, INTMod, CONMod, WISMod, INTMod, WISMod, CHAMod, WISMod, WISMod, INTMod, DEXMod, CHAMod, DEXMod];
		var Trained = 0;
		var ShowTrained = "";
		var j = 0;
		while (j < SkillList.length) {
			Trained = (MonsterTraining[MonsterSkills.indexOf(SkillList[j])] == "true") ? 5 : 0;
			ShowTrained = (Trained != 0) ? " (Trained)" : "";
			AddSkill(MonsterName, SkillList[j], SkillMods[j] + Trained, Character.id, ShowTrained);
			// ADDS PASSIVE INSIGHT/PERCEPTION ATTRIBUTES
			if (SkillList[j] == "Insight") AddAttribute("Passive Insight", 10 + SkillMods[j] + Trained, Character.id);
			if (SkillList[j] == "Perception") AddAttribute("Passive Perception", 10 + SkillMods[j] + Trained, Character.id);
			j++;
		}
        
        // Add defenses as token actions...
        if (SHOW_DEFENSES) {
            AddPower("█▓▒░DEFENSES░▒▓█", "", Character.id);
            AddPower("AC " + DEF_AC, "", Character.id);
            AddPower("Fortitude " + DEF_FORT, "", Character.id);
            AddPower("Reflex " + DEF_REF, "", Character.id);
            AddPower("Will " + DEF_WILL, "", Character.id);
        }
        
		// SET TOKEN VALUES
		Token.set("represents", Character.id);
		Token.set("name", MonsterName);
		Token.set("showplayers_name", true);
		Token.set("bar3_max", HitPoints);
		Token.set("bar3_value", HitPoints);
		Token.set("showplayers_bar3", true);
        Token.set("aura1_radius", "0");
		Token.set("aura1_color", "#660000");
		Token.set("aura1_square", true);
        Token.set("aura2_radius", "0");
		Token.set("aura2_color", "#660000");
		Token.set("aura2_square", true);
        Token.set("gmnotes", "");
	}
});

function AddAttribute(attr, value, charid) {
	if (attr === "Hit Points") {
		createObj("attribute", {
			name: attr,
			current: value,
			max: value,
			characterid: charid
		});
	} else {
		createObj("attribute", {
			name: attr,
			current: value,
			characterid: charid
		});
	}
	return;
}

function AddSkill(monstername, skill, value, charid, showtrained) {
	createObj("ability", {
		name: skill + showtrained,
		description: "",
		action: '/as "' + monstername + '" ' + skill + ' [[1d20 + ' + value + ']]',
		istokenaction: false,
		characterid: charid
	});
}

function AddPower(mpname, powerstring, charid) {
	createObj("ability", {
		name: mpname,
		description: "",
		action: powerstring,
		istokenaction: true,
		characterid: charid
	});
}