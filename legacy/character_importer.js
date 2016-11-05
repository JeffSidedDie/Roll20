var AddPCAttribute = AddPCAttribute || {};
var AddPCPower = AddPCPower || {};

on("chat:message", function(msg) {
    // Exit if not an api command
    if (msg.type != "api") return;
    
    // Get the API Chat Command
    msg.who = msg.who.replace(" (GM)", "");
    msg.content = msg.content.replace("(GM) ", "");
    var command = msg.content.split(" ", 1);


    if (command == "!build-character") {
        if (!msg.selected) return;
        var n = msg.content.split(" ", 2);
        var Token = getObj("graphic", n[1])
        if (Token.get("subtype") != "token") return;
        if (Token.get("gmnotes").indexOf("D20Character") == -1) return;
        
        // USER CONFIGURATION
        var USE_POWER_CARDS = true;
        
        // REPLACE SPECIAL CHARACTERS StatBlock = StatBlock.replace(//g, "");
        var StatBlock = Token.get("gmnotes");
        log(StatBlock);
        log(decodeURI(StatBlock));
            StatBlock = StatBlock.replace(/%20/g, " ");     // Replace %20 with a space
            StatBlock = StatBlock.replace(/%21/g, "!");     // Replace %21 with a !
            StatBlock = StatBlock.replace(/%22/g, "'");     // Replace %22 (quotation) with '
            StatBlock = StatBlock.replace(/%26amp/g, "&");  // Replace %26amp (ampersand) with &
            StatBlock = StatBlock.replace(/%26apos/g, "'"); // Replace %26apos with '
            StatBlock = StatBlock.replace(/%26lt/g, "<");   // Replace %26lt with <
            StatBlock = StatBlock.replace(/%26gt/g, ">");   // Replace %26gt with >
            StatBlock = StatBlock.replace(/%27/g, "'");     // Replace %27 with '
            StatBlock = StatBlock.replace(/%28/g, "(");     // Replace %28 with (
            StatBlock = StatBlock.replace(/%29/g, ")");     // Replace %29 with )
            StatBlock = StatBlock.replace(/%2C/g, ",");     // Replace %2C with ,
            StatBlock = StatBlock.replace(/%3A/g, ":");     // Replace %3A with :
            StatBlock = StatBlock.replace(/%3B/g, "");      // Remove %3B (semi-colon)
            StatBlock = StatBlock.replace(/%3Cbr/g, "");    // Remove carriage returns
            StatBlock = StatBlock.replace(/%3D/g, "=");     // Replace %3D with =
            StatBlock = StatBlock.replace(/%3E/g, "");      // Remove %3E (???)
            StatBlock = StatBlock.replace(/%3F/g, "?");     // Replace %3F with ?
            StatBlock = StatBlock.replace(/\s{2,}/g, " ");  // Replace multiple spaces with one space
            StatBlock = StatBlock.replace(/%u2013/g, "-");  // Replace %u2013 with -
            StatBlock = StatBlock.replace(/%u2019/g, "'");  // Replace %u2019 with '
        // END SPECIAL CHARACTER REPLACEMENT or REMOVAL
        
        // GET NAME OF CHARACTER
        var CharacterName = StatBlock.match(/<name>(.*?)<\/name>/g)[0].split(">")[1].split("<", 1)[0].trim();
        
        // CHECK FOR DUPLICATE CHARACTERS
        var CheckSheet = findObjs({
            _type: "character",
            name: CharacterName 
        });
        
        // DO NOT CREATE IF SHEET EXISTS
        if (CheckSheet.length > 0) {
            sendChat("ERROR", "This character already exists.");
            return;
        }
        
        // CREATE CHARACTER SHEET & LINK TOKEN TO SHEET
        var Character = createObj("character", {
            avatar: Token.get("imgsrc"),
            name: CharacterName,
            gmnotes: Token.get("gmnotes"),
            archived: false
        });
        
        
        // CHARACTER LEVEL
        var Level = parseInt(StatBlock.match(/<Level>(.*?)<\/Level>/g)[0].match(/\d+/g)[0]);
        
        // ABILITY SCORE MODS, SKILLS, HP, & MORE
        var Stats = StatBlock.match(/<Stat value=(.*?)\/>/g);
        
        var Skills = {};
        var SkillTraining = {};
        var s = 0;
        while (s < Stats.length) {
            // ABILITY SCORE MODS
            if (Stats[s].indexOf("'Strength modifier'") != -1) var STRMod = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Constitution modifier'") != -1) var CONMod = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Dexterity modifier'") != -1) var DEXMod = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Intelligence modifier'") != -1) var INTMod = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Wisdom modifier'") != -1) var WISMod = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Charisma modifier'") != -1) var CHAMod = parseInt(Stats[s].match(/\d+/g)[0]);
            
            // DEFENSES
            if (Stats[s].indexOf("'AC'") != -1) var ArmorClass = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Fortitude Defense'") != -1) var Fortitude = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Reflex Defense'") != -1) var Reflex = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Will Defense'") != -1) var Will = parseInt(Stats[s].match(/\d+/g)[0]);
            
            // HIT POINTS & SURGES
            if (Stats[s].indexOf("'Hit Points'") != -1) var HitPoints = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Healing Surges'") != -1) var HealingSurges = parseInt(Stats[s].match(/\d+/g)[0]);
            
            // SKILLS
            if (Stats[s].indexOf("'Acrobatics'") != -1) Skills["Acrobatics"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Arcana'") != -1) Skills["Arcana"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Athletics'") != -1) Skills["Athletics"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Bluff'") != -1) Skills["Bluff"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Diplomacy'") != -1) Skills["Diplomacy"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Dungeoneering'") != -1) Skills["Dungeoneering"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Endurance'") != -1) Skills["Endurance"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'History'") != -1) Skills["History"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Heal'") != -1) Skills["Heal"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Insight'") != -1) Skills["Insight"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Intimidate'") != -1) Skills["Intimidate"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Nature'") != -1) Skills["Nature"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Perception'") != -1) Skills["Perception"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Religion'") != -1) Skills["Religion"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Stealth'") != -1) Skills["Stealth"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Streetwise'") != -1) Skills["Streetwise"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Thievery'") != -1) Skills["Thievery"] = parseInt(Stats[s].match(/\d+/g)[0]);
            
            // SKILL TRAINING
            if (Stats[s].indexOf("'Acrobatics Trained'") != -1) SkillTraining["Acrobatics"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Arcana Trained'") != -1) SkillTraining["Arcana"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Athletics Trained'") != -1) SkillTraining["Athletics"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Bluff Trained'") != -1) SkillTraining["Bluff"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Diplomacy Trained'") != -1) SkillTraining["Diplomacy"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Dungeoneering Trained'") != -1) SkillTraining["Dungeoneering"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Endurance Trained'") != -1) SkillTraining["Endurance"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'History Trained'") != -1) SkillTraining["History"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Heal Trained'") != -1) SkillTraining["Heal"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Insight Trained'") != -1) SkillTraining["Insight"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Intimidate Trained'") != -1) SkillTraining["Intimidate"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Nature Trained'") != -1) SkillTraining["Nature"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Perception Trained'") != -1) SkillTraining["Perception"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Religion Trained'") != -1) SkillTraining["Religion"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Stealth Trained'") != -1) SkillTraining["Stealth"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Streetwise Trained'") != -1) SkillTraining["Streetwise"] = parseInt(Stats[s].match(/\d+/g)[0]);
            if (Stats[s].indexOf("'Thievery Trained'") != -1) SkillTraining["Thievery"] = parseInt(Stats[s].match(/\d+/g)[0]);
            
            // SPEED
            if (Stats[s].indexOf("'Speed'") != -1) var Speed = parseInt(Stats[s].match(/\d+/g)[0]);
            s++;
        }
        
        // ADD ATTRIBUTES TO SHEET
        AddPCAttribute("Level", Level, Character.id);
        var HitPointsID = AddPCAttribute("Hit Points", HitPoints, Character.id).id;
        var SurgesID = AddPCAttribute("Surges", HealingSurges, Character.id).id;
        AddPCAttribute("Surge Value", Math.floor(HitPoints/4), Character.id);
        AddPCAttribute("AC", ArmorClass, Character.id);
        AddPCAttribute("Fortitude", Fortitude, Character.id);
        AddPCAttribute("Reflex", Reflex, Character.id);
        AddPCAttribute("Will", Will, Character.id);
        AddPCAttribute("STR Mod", STRMod, Character.id);
        AddPCAttribute("CON Mod", CONMod, Character.id);
        AddPCAttribute("DEX Mod", DEXMod, Character.id);
        AddPCAttribute("INT Mod", INTMod, Character.id);
        AddPCAttribute("WIS Mod", WISMod, Character.id);
        AddPCAttribute("CHA Mod", CHAMod, Character.id);
        AddPCAttribute("Half Level Mod", Math.floor(Level/2), Character.id);
        AddPCAttribute("isPC", "true", Character.id);
        AddPCAttribute("Passive Perception", 10 + Skills.Perception, Character.id);
        AddPCAttribute("Passive Insight", 10 + Skills.Insight, Character.id);
        AddPCAttribute("Speed", Speed, Character.id);
        
        // ADD INITIATIVE & SAVING THROW TOKEN ACTIONS
        AddPCPower("Initiative", "Initiative [[1d20 [Base] + @{DEX Mod} [Dexterity Mod] + @{Half Level Mod} [Half Level Mod] &{tracker}]]", Character.id, true);
        AddPCPower("Saving Throw", "Saving Throw [[1d20 + ?{Saving Throw Modifier|0}]]", Character.id, true);
        
        // ADD SKILLS
        AddPCPower("█▓▒░SKILLS░▒▓█", "", Character.id, false);
        var SkillList = ["Acrobatics", "Arcana", "Athletics", "Bluff", "Diplomacy", "Dungeoneering", "Endurance", "Heal", "History", "Insight", "Intimidate", "Nature", "Perception", "Religion", "Stealth", "Streetwise", "Thievery"];
        var SkillMods = ["DEX Mod", "INT Mod", "STR Mod", "CHA Mod", "CHA Mod", "INT Mod", "CON Mod", "WIS Mod", "INT Mod", "WIS Mod", "CHA Mod", "WIS Mod", "WIS Mod", "INT Mod", "DEX Mod", "CHA Mod", "DEX Mod"];
        var MiscMod = 0;
        var Trained = 0;
        var ShowTrained = "";
        var k = 0;
        while (k < SkillList.length) {
            Trained = SkillTraining[SkillList[k]];
            ShowTrained = (Trained == 5) ? " (Trained)" : "";
            // REMOVE ABILITY SCORE MODIFIER & TRAINING MODIFIER TO GET MISCMOD
            switch (SkillMods[k]) {
                case "STR Mod": MiscMod = Skills[SkillList[k]] - STRMod - Trained; break;
                case "CON Mod": MiscMod = Skills[SkillList[k]] - CONMod - Trained; break;
                case "DEX Mod": MiscMod = Skills[SkillList[k]] - DEXMod - Trained; break;
                case "INT Mod": MiscMod = Skills[SkillList[k]] - INTMod - Trained; break;
                case "WIS Mod": MiscMod = Skills[SkillList[k]] - WISMod - Trained; break;
                case "CHA Mod": MiscMod = Skills[SkillList[k]] - CHAMod - Trained; break;
                default: MiscMod = 0;
            }
            AddPCPower(SkillList[k] + ShowTrained, SkillList[k] + " [[1d20 [Base] + @{" + SkillMods[k] + "} [" + SkillMods[k] + "] + " + Trained + " [Skill Training] + " + MiscMod + " [Misc Mods] ]]", Character.id, false);
            k++;
        }
        
        // ADD POWERS
        AddPCPower("█▓▒░POWERS░▒▓█", "", Character.id, true);
        var PowersBlock = StatBlock.match(/<Power name=(.*?)<\/Power>/g);
        var p = 0;
        while (p < PowersBlock.length) {
            // DEFINE VARIABLES
            var Power = {};
            var Key = "";
            var Content = "";
            var PowerName = PowersBlock[p].match(/<Power name='(.*?)' >/g)[0].split("='")[1].split("' ")[0];
            var AtkBonus = (PowersBlock[p].match(/<AttackBonus>(.*?)<\/AttackBonus>/g) != null) ? PowersBlock[p].match(/<AttackBonus>(.*?)<\/AttackBonus>/g)[0].match(/\d+/g)[0] : "0";
            var DmgRoll = (PowersBlock[p].match(/<Damage>(.*?)<\/Damage>/g) != null) ? PowersBlock[p].match(/<Damage>(.*?)<\/Damage>/g)[0].split(">")[1].split("</")[0] : "";
            var DmgType = (PowersBlock[p].match(/<DamageType>(.*?)<\/DamageType>/g) != null) ? PowersBlock[p].match(/<DamageType>(.*?)<\/DamageType>/g)[0].split(">")[1].split("</")[0] : "";
            
            // REMOVE EMPTY ENTRIES TO PREVENT ERRORS
            PowersBlock[p] = PowersBlock[p].replace("<specific name='Keywords' />", "");
            PowersBlock[p] = PowersBlock[p].replace("<specific name='Keywords'/>", "");
            PowersBlock[p] = PowersBlock[p].replace("<specific name='Level' />", "");
            PowersBlock[p] = PowersBlock[p].replace("<specific name='Level'/>", "");
            PowersBlock[p] = PowersBlock[p].replace("<specific name='Attack Type' />", "");
            PowersBlock[p] = PowersBlock[p].replace("<specific name='Attack Type'/>", "");
            PowersBlock[p] = PowersBlock[p].replace("<table>", "");
            PowersBlock[p] = PowersBlock[p].replace("</table>", "");
            
            // PARSE POWER INFORMATION
            var PowerInfo = PowersBlock[p].match(/<specific name=(.*?)<\/specific>/g);
            var i = 0;
            var HitCount = 1;
            while (i < PowerInfo.length) {
                Key = PowerInfo[i].match(/='(.*?)' >/g)[0].split("='")[1].split("' >")[0];
                Content = PowerInfo[i].split(" > ")[1].split(" </")[0].split("Level")[0];
                // CHECK FOR DUPLICATE HIT ENTRIES - MOST OFTEN FOUND ON POWERS
                // WITH SECONDARY/TERTIARY TARGETS &/OR ATTACKS
                if (Key == "Hit" && Power["Hit"] != undefined) {
                    HitCount++;
                    Key = "Hit" + HitCount;
                }
                Power[Key] = Content;
                i++;
            }
            
            // CHECK FOR MULTIPLE ATTACK POWERS
            var MultiAttack = "";
            if (Power["Target"] != undefined) {
                switch (Power["Target"]) {
                    case "One ally":
                    case "One creature": 
                    case "One enemy":
                    case "Same as primary target":
                    case "The triggering ally":
                    case "The triggering creature":
                    case "The triggering enemy":
                    case "The triggering ally in the burst":
                    case "The triggering creature in the burst":
                    case "The triggering enemy in the burst":
                    case "One ally adjacent to you":
                    case "One creature adjacent to you":
                    case "One enemy adjacent to you":
                        MultiAttack = "";
                        break;
                    default: MultiAttack = "?{Number of Targets|1}";
                }
            }
            
            // BUILD POWERSTRING
            PowerString = "!power --format|dnd4e --name|" + PowerName;
            PowerString += (Power["Display"] != undefined) ? " --title|" + Power["Display"] : "";
            PowerString += (Power["Power Usage"] != undefined) ? " --usage|" + Power["Power Usage"] : "";
            PowerString += (Power["Action Type"] != undefined) ? " --action|" + Power["Action Type"] : "";
            PowerString += (Power["Flavor"] != undefined) ? " --emote|" + Power["Flavor"] : "";
            PowerString += (Power["Attack Type"] != undefined) ? " --Range|" + Power["Attack Type"] : "";
            PowerString += (Power["Trigger"] != undefined) ? " --Trigger|" + Power["Trigger"] : "";
            PowerString += (Power["Requirement"] != undefined) ? " --Requirement|" + Power["Requirement"] : "";
            PowerString += (Power["Target"] != undefined) ? " --Target(s)|" + Power["Target"] : "";
            PowerString += (Power["Attack"] != undefined) ? " --attack" + MultiAttack + "|[[1d20 + " + AtkBonus + "]]" : "";
            PowerString += (Power["Attack"] != undefined) ? " --defense|" + Power["Attack"].split("vs.")[1] : "";
            PowerString += (Power["Primary Target"] != undefined) ? " --Primary Target|" + Power["Primary Target"] : "";
            PowerString += (Power["Primary Attack"] != undefined) ? " --Primary Attack|[[1d20 + " + AtkBonus + "]] vs " + Power["Primary Attack"].split("vs.")[1] : "";
            PowerString += (Power["Hit"] != undefined && isNaN(Power["Hit"].charAt(0)) == true) ? " --On Hit|" + Power["Hit"] : "";
            PowerString += (Power["Hit"] != undefined && isNaN(Power["Hit"].charAt(0)) == false) ? " --damage|[[" + DmgRoll + "]] " + DmgType.toLowerCase() + " " + Power["Hit"].substring(Power["Hit"].indexOf("damage")) : "";
            PowerString += (Power["Secondary Target"] != undefined) ? " --^Secondary Target|" + Power["Secondary Target"] : "";
            PowerString += (Power["Secondary Attack"] != undefined) ? " --^Secondary Attack|[[1d20 + " + AtkBonus + "]] vs " + Power["Secondary Attack"].split("vs.")[1] : "";
            PowerString += (Power["Hit2"] != undefined && isNaN(Power["Hit2"].charAt(0)) == true) ? " --^Secondary Hit|" + Power["Hit2"] : "";
            PowerString += (Power["Hit2"] != undefined && isNaN(Power["Hit2"].charAt(0)) == false) ? " --^Secondary Hit|[[" + DmgRoll + "]] " + DmgType.toLowerCase() + " " + Power["Hit2"].substring(Power["Hit2"].indexOf("damage")) : "";
            PowerString += (Power["Tertiary Target"] != undefined) ? " --^2Tertiary Target|" + Power["Tertiary Target"] : "";
            PowerString += (Power["Tertiary Attack"] != undefined) ? " --^2Tertiary Attack|[[1d20 + " + AtkBonus + "]] vs " + Power["Tertiary Attack"].split("vs.")[1] : "";
            PowerString += (Power["Hit3"] != undefined && isNaN(Power["Hit3"].charAt(0)) == true) ? " --^2Tertiary Hit|" + Power["Hit3"] : "";
            PowerString += (Power["Hit3"] != undefined && isNaN(Power["Hit3"].charAt(0)) == false) ? " --^2Tertiary Hit|[[" + DmgRoll + "]] " + DmgType.toLowerCase() + " " + Power["Hit3"].substring(Power["Hit3"].indexOf("damage")) : "";
            PowerString += (Power["Miss"] != undefined) ? " --Miss|" + Power["Miss"] : "";
            PowerString += (Power["Effect"] != undefined) ? " --Effect|" + Power["Effect"] : "";
            // PowerString += (Power[""] != undefined) ? " --Range|" + Power[""] : "";
            AddPCPower(PowerName, PowerString, Character.id, true);
            p++;
        }
        // SET TOKEN SETTINGS
        Token.set("represents", Character.id);
        Token.set("name", CharacterName);
        Token.set("showplayers_name", true);
        Token.set("bar2_link", SurgesID);
        Token.set("bar3_link", HitPointsID);
        Token.set("showplayers_bar3", true);
        Token.set("aura2_radius", "0");
        Token.set("aura2_color", "#14A70A");
        Token.set("aura2_square", true);
    }
});

function AddPCAttribute (attr, value, charid) {
    var attrid = "";
    if (attr === "Hit Points") {
        attrid = createObj("attribute", {
            name: attr,
            current: value,
            max: value,
            characterid: charid
        });
    } else {
        attrid = createObj("attribute", {
            name: attr,
            current: value,
            characterid: charid
        });        
    }
    return attrid;
}

function AddPCPower (powername, powerstring, charid, tokenaction) {
    createObj("ability", {
        name: powername,
        description: "",
        action: powerstring,
        istokenaction: tokenaction,
        characterid: charid
    });
}