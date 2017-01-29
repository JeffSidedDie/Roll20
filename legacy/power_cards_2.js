// VERSION INFO
var PowerCards_Author = "HoneyBadger";
var PowerCards_Version = "2.4.15";
var PowerCards_LastUpdated = "May 5th, 2015 ~ 5:30 am eastern";

// FUNCTION DECLARATIONS
var PowerCard = PowerCard || {};
var getPowerCardFormats = getPowerCardFormats || {};
var getCurrentTime = getCurrentTime || {};
var doInlineFormatting = doInlineFormatting || {};
var doTargetInfo = doTargetInfo || {};
var getBrightness = getBrightness || {};
var hexDec = hexDec || {};

// API COMMAND HANDLER
on("chat:message", function (msg) {
    if (msg.type !== "api") return;
	if (msg.content.split(" ", 1)[0] === "!power") {
		var player_obj = getObj("player", msg.playerid);
		msg.content = msg.content.replace(/<br\/>\n/g, ' ').replace(/({{(.*?)}})/g, " $2 ");
		PowerCard.Process(msg, player_obj);
	}
	if (msg.content.split(" ", 1)[0] === "!power_version") sendChat("HoneyBadger", "/w " + msg.who + " You are using version " + PowerCards_Version + " of PowerCards, authored by " + PowerCards_Author + ", which was last updated on: " + PowerCards_LastUpdated + ".");
});

// LOAD POWERCARD FORMATS
on("ready", function () {
	getPowerCardFormats();
	log("(" + getCurrentTime() + ") PowerCards version " + PowerCards_Version + " loaded. Last updated: " + PowerCards_LastUpdated);
});

on("change:handout", function () {
	getPowerCardFormats();
});

// POWERCARD FUNCTION
PowerCard.Process = function (msg, player_obj) {
	// USER CONFIGURATION
	var ALLOW_URLS = true;
	var ALLOW_HIDDEN_URLS = true;
	var CUSTOM_EMOTES = true;
	var SHOW_AVATAR = true; // Set to false to hide character sheet avatar in custom emotes
	var SUPPRESS_INLINE_CHARMS = false; // Set to false to show numerical attributes inline
	var USE_DEFAULT_FORMAT = false; // Set to true if you want powercards to default formatting
	var USE_PLAYER_COLOR = false; // Set to true to override all color formatting
	var USE_TIMESTAMPS = true; // Set to false to turn off time stamps in chat

	// DEFINE VARIABLES
	var n = msg.content.replace("%%who%%", player_obj.get("displayname")).split(" --");
	var PowerCard = {};
	var Character = "";
	var Token = "";
	var Avatar = "";
	var Tag = "";
	var Content = "";
	var Display = "";
	var MultiTag = 0;
	var Count = 0;

	// DEFAULT FORMATTING
	var PlayerBGColor = player_obj.get("color");
	var PlayerTXColor = (getBrightness(PlayerBGColor) < (255 / 2)) ? "#FFF" : "#000";
	PowerCard.titlefont = "Georgia";
	PowerCard.subtitlefont = "Tahoma";
	PowerCard.bodyfont = "Helvetica";
	PowerCard.titlefontsize = "16px";
	PowerCard.subtitlefontsize = "11px";
	PowerCard.bodyfontsize = "14px";
	PowerCard.txcolor = PlayerTXColor;
	PowerCard.bgcolor = PlayerBGColor;
	PowerCard.erowtx = "#000";
	PowerCard.erowbg = "#B6AB91"; // #B6AB91 - Default darker brown
	PowerCard.orowtx = "#000";
	PowerCard.orowbg = "#CEC7B6"; // #CEC7B6 - Default light brown
	PowerCard.corners = 3; // Set to 0 to remove rounded corners
	PowerCard.border = "1px solid #000"; // size style #color
	PowerCard.boxshadow = ""; // h-distance v-distance blur spread #color

	// RESERVED & IGNORED TAGS
	var IgnoredTags = ["charid", "tokenid", "emote", "leftsub", "rightsub", "name", "txcolor", "bgcolor", "erowbg", "erowtx", "orowbg", "orowtx", "whisper", "format", "title", "target_list", "titlefont", "subtitlefont", "bodyfont", "corners", "titlefontsize", "subtitlefontsize", "bodyfontsize", "border", "boxshadow"];

	// CREATE POWERCARD ARRAY
	n.shift();
	n.forEach(function (token) {
		Tag = token.substring(0, token.indexOf("|"));
		Content = token.substring(token.indexOf("|") + 1);
		if (Tag.charAt(0) !== "$") {
			if (Tag.indexOf("#") != -1) {
				MultiTag = parseInt(Tag.substring(Tag.indexOf("#") + 1));
				Count = 1;
				Tag = Tag.substring(0, Tag.indexOf("#"));
				while (Count <= MultiTag) {
					PowerCard[Tag + " #" + Count] = Content;
					Count += 1;
				}
			} else {
				PowerCard[Tag] = Content;
				PowerCard[Tag] = doInlineFormatting(Content, ALLOW_URLS, ALLOW_HIDDEN_URLS);
				// log (PowerCard[Tag]);
			}
		}
	});

	// GET CUSTOM STYLES & ADD THEM TO POWERCARD
	if (USE_DEFAULT_FORMAT && state.PowerCard_Formats["default"] !== undefined && PowerCard.format === undefined) PowerCard.format = "default";
	if (PowerCard.format !== undefined) {
		var PowerCard_Formats = (state.PowerCard_Formats && state.PowerCard_Formats[PowerCard.format] !== undefined) ? state.PowerCard_Formats[PowerCard.format].split("--") : ["txcolor|#FFF", "bgcolor|#040", "titlefont|Georgia", "subtitlefont|Tahoma"];
		PowerCard_Formats.forEach(function (f) {
			Tag = f.substring(0, f.indexOf("|")).trim();
			Content = f.substring(f.indexOf("|") + 1).trim();
			if (Tag !== "" && Content !== "") PowerCard[Tag] = Content;
		});
	}

	// Emote - Prevent empty emote error in Roll20 chat...
	if (PowerCard.emote === "") PowerCard.emote = undefined;

	// Replace an undefined title tag with msg.who...
	if (PowerCard.title === undefined) PowerCard.title = "PowerCard sent by:<br>" + msg.who;

	// CSS styled emote...
	if (CUSTOM_EMOTES && PowerCard.emote !== undefined && (PowerCard.charid !== undefined || PowerCard.tokenid !== undefined)) {
		if (PowerCard.charid !== undefined) {
			Character = getObj("character", PowerCard.charid);
			Avatar = (Character !== undefined && Character.get("avatar") !== "") ? "<img src=" + Character.get('avatar') + " style='height: 50px; width: 50px; float: left;'></img>" : "";
		}
		if (PowerCard.tokenid !== undefined) {
			Token = getObj("graphic", PowerCard.tokenid);
			Avatar = (Token !== undefined && Token.get("imgsrc") !== "") ? "<img src=" + Token.get('imgsrc') + " style='height: 50px; width: 50px; float: left;'></img>" : "";
		}
		if (PowerCard.emote.charAt(0) === "!") {
			PowerCard.emote = PowerCard.emote.substring(1);
			SHOW_AVATAR = false;
		}
		// Get text alignment for emotes only...
		var EmoteTextAlign = "center";
		if (PowerCard.emote.indexOf("~L") !== -1) {
			PowerCard.emote = PowerCard.emote.replace(/\~L/g, "");
			EmoteTextAlign = "left";
		}
		if (PowerCard.emote.indexOf("~R") !== -1) {
			PowerCard.emote = PowerCard.emote.replace(/\~R/g, "");
			EmoteTextAlign = "right";
		}
		if (PowerCard.emote.indexOf("~J") !== -1) {
			PowerCard.emote = PowerCard.emote.replace(/\~J/g, "");
			EmoteTextAlign = "justify";
		}
		if (SHOW_AVATAR) PowerCard.emote = "<div style='vertical-align: middle; font-size: 12px; padding-left: 0.5em; text-align: " + EmoteTextAlign + ";'>" + Avatar + doInlineFormatting(PowerCard.emote) + "</div>";
		else PowerCard.emote = "<div style='display: block; width: 100%; vertical-align: middle; font-size: 12px; text-align: " + EmoteTextAlign + ";'>" + doInlineFomatting(PowerCard.emote) + "</div>";
	}

	// POWERCARD TITLE BASE CSS
	var TitleStyle = ' font-family: ' + PowerCard.titlefont + '; font-size: ' + PowerCard.titlefontsize + '; font-weight: normal; letter-space: 0.25px; text-align: center; vertical-align: middle; padding: 2px 0px; margin: 0px; border: ' + PowerCard.border + '; border-radius: ' + PowerCard.corners + 'px ' + PowerCard.corners + 'px 0px 0px;';

	// BACKGROUND & TEXT COLORS
	if (USE_PLAYER_COLOR === true || PowerCard.format === "player") {
		TitleStyle += " color: " + PlayerTXColor + ";";
		TitleStyle += " background-color: " + PlayerBGColor + ";";
	} else {
		TitleStyle += " color: " + PowerCard.txcolor + ";";
		TitleStyle += " background-color: " + PowerCard.bgcolor + ";";
	}
	// if (PowerCard.title === undefined) var PowerCard.title = "";
	var Title = "<div style='clear: both; margin-left: -10px; box-shadow: " + PowerCard.boxshadow + "; border-radius: " + PowerCard.corners + "px;'><div style='" + TitleStyle + "' class='showtip tipsy' title='" + PowerCard.title + "'>" + PowerCard.name;

	// CREATE THE SUBTITLES
	var Diamond = " &" + "#x2666; ";
	var Subtitle = "<br><span style='font-family: " + PowerCard.subtitlefont + "; font-size: " + PowerCard.subtitlefontsize + "; font-weight: normal;'>";
	Subtitle += (PowerCard.leftsub !== undefined) ? PowerCard.leftsub : "";
	Subtitle += (PowerCard.leftsub !== undefined && PowerCard.rightsub !== undefined) ? Diamond : "";
	Subtitle += (PowerCard.rightsub !== undefined) ? PowerCard.rightsub : "";
	Display += doInlineFormatting(Title + Subtitle + "</span></div>", ALLOW_URLS, ALLOW_HIDDEN_URLS);

	// CREATE ROW STYLES & ROW INFO
	var RowStyle = " line-height: 1.1em; vertical-align: middle; font-size: " + PowerCard.bodyfontsize + "; font-family: " + PowerCard.bodyfont + "; margin: 0px; padding: 3px 5px; border-left: " + PowerCard.border + "; border-right: " + PowerCard.border + "; border-radius: 0px;";
	var LastRowStyle = " line-height: 1.1em; vertical-align: middle; font-size: " + PowerCard.bodyfontsize + "; font-family: " + PowerCard.bodyfont + "; margin: 0px; padding: 3px 5px; border-left: " + PowerCard.border + "; border-right: " + PowerCard.border + "; border-bottom: " + PowerCard.border + "; border-radius: 0px 0px " + PowerCard.corners + "px " + PowerCard.corners + "px;";
	var OddRow = " color: " + PowerCard.orowtx + "; background-color: " + PowerCard.orowbg + ";";
	var EvenRow = " color: " + PowerCard.erowtx + "; background-color: " + PowerCard.erowbg + ";";
	var RowBackground = OddRow;
	var RowNumber = 1;
	var Indent = "";

	// LOOP THROUGH IGNORED TAGS AND REMOVE THEM FROM KEYS
	var Keys = Object.keys(PowerCard);
	IgnoredTags.forEach(function (IgnoredTag) {
		if (Keys.indexOf(IgnoredTag) !== -1) Keys.splice(Keys.indexOf(IgnoredTag), 1);
	});

	// CREATE ARRAY OF TARGETS
	if (PowerCard.target_list !== undefined) PowerCard.target_list = PowerCard.target_list.split(" | ");

	// LOOPS THROUGH KEYS AND CREATES THE ROW DIV
	var KeyCount = 0;
	Keys.forEach(function (Tag) {
		KeyCount++;
		Content = doInlineFormatting(PowerCard[Tag], ALLOW_URLS, ALLOW_HIDDEN_URLS);
		if (PowerCard.target_list !== undefined && Content.indexOf("%%") !== -1) {
			Content = doTargetInfo(Content, PowerCard.target_list, SUPPRESS_INLINE_CHARMS);
			PowerCard.target_list.shift();
		}
		if (MultiTag) {
			for (var i = 1; i <= MultiTag; i++) {
				var numContent = replaceTargetCharms(Content, i);
				//log(numContent);
                Content=numContent;
			}
		}
        //log(Content);
		RowBackground = (RowNumber % 2 == 1) ? OddRow : EvenRow;
		RowBackground += (KeyCount === Keys.length) ? LastRowStyle : RowStyle;
		RowNumber += 1;
		Tag = Tag.replace(/( #[0-9]+)/g, ""); // Hides multitag numbers...
		Tag = Tag.replace(/( \*[0-9]+)/g, ""); // Hides same name tag numbers...
		// SHOW/HIDE THE TAG
		if (Tag.charAt(0) !== "!") {
			if (Tag.charAt(0) === "^") {
				Indent = (parseInt(Tag.charAt(1)) > 0) ? " padding-left: " + (Tag.charAt(1) * 1.5) + "em;" : "";
				Tag = (parseInt(Tag.charAt(1)) >= 0) ? Tag.substring(2) : Tag.substring(1);
				Display += "<div style='" + RowBackground + Indent + "'><b>" + Tag + "</b> " + Content + "</div>";
			} else {
				Display += "<div style='" + RowBackground + "'><b>" + Tag + "</b> " + Content + "</div>";
			}
		} else {
			if (Tag.charAt(1) === "^") {
				Indent = (parseInt(Tag.charAt(2)) > 0) ? " padding-left: " + (Tag.charAt(2) * 1.5) + "em;" : "";
				Display += "<div style='" + RowBackground + Indent + "'>" + Content + "</div>";
			} else {
				Display += "<div style='" + RowBackground + "'>" + Content + "</div>";
			}
		}
	});
	// CLOSE BOX-SHADOW DIV
	Display += "</div>";

	// SEND TO CHAT
	var TimeStamp = "";
	var ColonKiller = "/desc ";
	if (USE_TIMESTAMPS) {
		TimeStamp = "(" + getCurrentTime() + ") " + msg.who;
		ColonKiller = " ";
	}
	if (PowerCard.whisper === "") PowerCard.whisper = "GM"; // error catch for empty whisper tag
	if (msg.inlinerolls !== undefined) {
		// PROCESS INLINE ROLLS
		var RollExpression = "";
		var RollValue = 0;
		for (var i = 0; i < msg.inlinerolls.length; i++) {
			RollExpression = msg.inlinerolls[i].expression;
            try {
			    RollValue = buildInline(msg.inlinerolls[i]);
            }
            catch(e) {
                RollValue="ERROR";
                log(e);
            }
			Display = Display.replace("$[[" + i + "]]", RollValue);
		}

		// PROCESS MULTIROLLS
		var inlineMultiRolls = (Display.match(/\$\[\[[0-9]+\]\]/g) || []);
		var inlineMultiExps = "API: ";
		var g = 0;
		while (g < inlineMultiRolls.length) {
			inlineMultiExps += " [[" + msg.inlinerolls[inlineMultiRolls[g].match(/[0-9]+/)].expression + " ]] ";
			g++;
		}

		var multiRollsCallback = function (m) {
			for (var p = 1; p <= inlineMultiRolls.length; p++) {
				var inlineRollValue = buildInline(m[0].inlinerolls[p.toString()]);
				Display = Display.replace(/\$\[\[[0-9]+\]\]/, inlineRollValue);
			}

			var inlineRollsCallback = function (x) {
				try {
					for (var p = 1; p <= _.keys(x[0].inlinerolls).length; p++) {
						var inlineRollValue = (SUPPRESS_INLINE_CHARMS) ? x[0].inlinerolls[p.toString()].results.total : buildInline(x[0].inlinerolls[p.toString()]);
						x[0].content = x[0].content.replace(/\$\[\[[0-9]+\]\]/, inlineRollValue);
					}
					Display = x[0].content;
					if (PowerCard.whisper !== undefined) {
						// WHISPER
						if (PowerCard.emote !== undefined) {
							// WHISPER WITH EMOTE
							if (PowerCard.charid !== undefined || PowerCard.tokenid !== undefined) {
								sendChat(TimeStamp, ColonKiller);
								sendChat(TimeStamp, "/direct " + PowerCard.emote);
							} else {
								sendChat(TimeStamp, "/emas " + PowerCard.emote);
							}
						}
						sendChat(msg.who, "/w " + PowerCard.whisper + " " + Display);
					} else {
						if (PowerCard.emote !== undefined) {
							if (PowerCard.charid !== undefined || PowerCard.tokenid !== undefined) {
								// CUSTOM EMOTE
								sendChat(TimeStamp, ColonKiller);
								sendChat(TimeStamp, "/direct " + PowerCard.emote + Display);
							} else {
								// STANDARD EMOTE
								sendChat(TimeStamp, "/emas " + PowerCard.emote);
								sendChat(TimeStamp, "/direct " + Display);
							}
						} else {
							sendChat(TimeStamp, ColonKiller);
							sendChat(TimeStamp, "/direct " + Display);
						}
					}
				}
				catch (e) {
					sendChat("SyntaxError", e.message);
					log(e);
				}
			};

			try {
				sendChat("", Display, inlineRollsCallback);
			}
			catch (e) {
				sendChat("SyntaxError", e.message);
				log(e);
			}
		};

		// SEND MODIFIED CARD TO CHAT
		try {
			sendChat("", inlineMultiExps, multiRollsCallback);
		}
		catch (e) {
			sendChat("SyntaxError", e.message);
			log(e);
		}
	} else {
		var noInlineRollsCallback = function (x) {
			try {
				for (var p = 1; p <= _.keys(x[0].inlinerolls).length; p++) {
					var inlineRollValue = (SUPPRESS_INLINE_CHARMS) ? x[0].inlinerolls[p.toString()].results.total : buildInline(x[0].inlinerolls[p.toString()]);
					x[0].content = x[0].content.replace(/\$\[\[[0-9]+\]\]/, inlineRollValue);
				}
				Display = x[0].content;
				if (PowerCard.whisper !== undefined) {
					if (PowerCard.emote !== undefined) {
						if (PowerCard.charid !== undefined || PowerCard.tokenid !== undefined) {
							sendChat(TimeStamp, ColonKiller);
							sendChat(TimeStamp, "/direct " + PowerCard.emote);
						} else sendChat(TimeStamp, "/emas " + PowerCard.emote);
					}
					sendChat(msg.who, "/w " + PowerCard.whisper + " " + Display);
				} else {
					if (PowerCard.emote !== undefined) {
						if (PowerCard.charid !== undefined || PowerCard.tokenid !== undefined) {
							sendChat(TimeStamp, ColonKiller);
							sendChat(TimeStamp, "/direct " + PowerCard.emote + Display);
						} else {
							sendChat(TimeStamp, "/emas " + PowerCard.emote);
							sendChat(TimeStamp, "/direct " + Display);
						}
					} else {
						sendChat(TimeStamp, ColonKiller);
						sendChat(TimeStamp, "/direct " + Display);
					}
				}
			}
			catch (e) {
				sendChat("SyntaxError", e.message);
				log(e);
			}
		};
		try {
			sendChat("", Display, noInlineRollsCallback);
		}
		catch (e) {
			sendChat("SyntaxError", e.message);
			log(e);
		}
	}
};

// FUNCTIONS
function getPowerCardFormats() {
	var PowerCard_FormatHandout = findObjs({
		_type: "handout",
		name: "PowerCard Formats"
	})[0];
	if (PowerCard_FormatHandout !== undefined) {
		var PowerCard_Formats = {};
		var FormatName = "";
		var FormatContent = "";
		PowerCard_FormatHandout.get("notes", function (notes) {
			notes = notes.split("<br>");
			notes.forEach(function (notes) {
				FormatName = notes.substring(0, notes.indexOf(":"));
				FormatContent = notes.substring(notes.indexOf(":") + 1).trim();
				if (FormatName !== "" || FormatContent !== "") PowerCard_Formats[FormatName] = " " + FormatContent;
			});
			state.PowerCard_Formats = PowerCard_Formats;
		});
	}
}

function doInlineFormatting(content, ALLOW_URLS, ALLOW_HIDDEN_URLS) {
	// PARSE FOR INLINE FORMATTING
	var urls = [],
		str,
		formatter = function (s) {
			return s
				.replace(/__(.*?)__/g, "<u>$1</u>")
				.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
				.replace(/\/\/(.*?)\/\//g, "<i>$1</i>")
				.replace(/\^\^/g, "<br>")
				.replace(/\^\*/g, "<span style='margin-left: 1em;'></span>")
				.replace(/\$\$(#([a-fA-F0-9]{3}|[a-fA-F0-9]{6}))\|(.*?)\$\$/g, "<span style='color: $1;'>$3</span>")
				.replace(/\~\~\~/g, "<hr style='border: 0; height: 0; border-top: 1px solid rgba(0, 0, 0, 0.1); border-bottom: 1px solid rgba(255, 255, 255, 0.3); margin-bottom: 3px; margin-top: 3px;'/>")
                .replace(/\~\J(.*?)\~\J/g, "<span style='text-align: justify;'>$1</span>")
				.replace(/\~\L(.*?)\~\L/g, "<span style='text-align: left;'>$1</span>")
				.replace(/\~\C(.*?)\~\C/g, "<span style='text-align: center; display: block;'>$1</span>")
				.replace(/\~\R(.*?)\~\R/g, "<div style='float: right; margin: -2px 0px;'>$1</div><div style='clear: both;'></div>");
		};
	str = _.reduce(
		content.match(/@@.*?@@/g),
		function (m, s, i) {
			var parts = s.replace(/@@(.*)@@/, '$1').split(/\|\|/),
				url = parts.shift().replace(/^\s*(http(s)?:\/\/|\/\/()|())/, 'http$2://'),
				text = formatter(parts.join('||'));
			if (ALLOW_URLS) {
				if (ALLOW_HIDDEN_URLS) {
					urls[i] = '<a href="' + url + '">' + (text || url) + '</a>';
				} else {
					urls[i] = '<a href="' + url + '">' + text + ' [' + url + ']</a>';
				}
			} else {
				urls[i] = s;
			}
			return m.replace(s, '@@' + i + '@@');
		},
		content
	);
	str = formatter(str);
	return _.reduce(
		urls,
		function (m, s, i) {
			return m.replace('@@' + i + '@@', s);
		},
		str
	);
}

function replaceTargetCharms(content, targetNum) {
	return content.replace(/%%(.*?)%%/g, function (m, charm) {
		return "[[@{target|" + targetNum + "|" + charm + "}]]";
	});
}

function doTargetInfo(content, TargetList) {
	// PARSE FOR TARGET INFO REPLACEMENT CHARMS
	var Token = getObj("graphic", TargetList[0]);
	if (Token === undefined) return content;
	var Character = getObj("character", Token.get("represents"));

	// TOKEN CHARMS
	return content.replace(/%%(.*?)%%/g, function (m, charm) {
		var attr;
		switch (charm) {
			case 'token_name':
				return Token.get('name');
			case 'bar1':
			case 'bar2':
			case 'bar3':
				return Token.get(charm + '_value');
			case 'bar1_max':
			case 'bar2_max':
			case 'bar3_max':
				return Token.get(charm);
			default:
				return (Character && (attr = getAttrByName(Character.id, charm)) && '[[' + attr + ']]') || 'ERROR';
		}
	});
}

function getBrightness(hex) {
	hex = hex.replace('#', '');
	var c_r = hexDec(hex.substr(0, 2));
	var c_g = hexDec(hex.substr(2, 2));
	var c_b = hexDec(hex.substr(4, 2));
	return ((c_r * 299) + (c_g * 587) + (c_b * 114)) / 1000;
}

function hexDec(hex_string) {
	hex_string = (hex_string + '').replace(/[^a-f0-9]/gi, '');
	return parseInt(hex_string, 16);
}

function buildInline(inlineroll) {
	var InlineColorOverride = "";
	var values = [];
	var critRoll = false;
	var failRoll = false;
	var critCheck = false;
	var failCheck = false;
	var expandedCheck = false;
	var highRoll = false;
	var lowRoll = false;
	var noHighlight = false;
	var expandedRoll = false;

	inlineroll.results.rolls.forEach(function (roll) {
		var result = processRoll(roll, critRoll, failRoll, noHighlight, expandedRoll);
		if (result["critRoll"]) critCheck = true;
		if (result["failRoll"]) failCheck = true;
		if (result["expandedRoll"]) expandedCheck = true;
		values.push(result.value.replace(/ \[.*/, ""));
		critRoll = result.critRoll;
		failRoll = result.failRoll;
		noHighlight = result.noHighlight;
		expandedRoll = result.expandedRoll;
	});

	// Overrides the default coloring of the inline rolls...
	if (critCheck && failCheck) {
		InlineColorOverride = " background-color: #8FA4D4; border-color: #061539; color: #061539;";
	} else if (critCheck && !failCheck) {
		InlineColorOverride = " background-color: #88CC88; border-color: #004400; color: #004400;";
	} else if (!critCheck && failCheck) {
		InlineColorOverride = " background-color: #FFAAAA; border-color: #660000; color: #660000;";
	} else {
		InlineColorOverride = " background-color: #FFFEA2; border-color: #87850A; color: #000000;";
	}

	// PARSE TABLE RESULTS
	inlineroll.results.tableentries = _.chain(inlineroll.results.rolls)
		.filter(function (r) {
			return _.has(r, 'table');
		})
		.reduce(function (memo, r) {
			_.each(r.results, function (i) {
				i = i.tableItem;
				if (!/^[+\-]?(0|[1-9][0-9]*)([.]+[0-9]*)?([eE][+\-]?[0-9]+)?$/.test(i.name)) {
					memo.push({
						name: i.name,
						weight: i.weight,
						table: r.table
					});
				}
			});
			return memo;
		}, [])
	.value();

	var rollOut = "";
	var InlineRollStyle = "text-align: center; font-size: 100%; font-weight: bold; display: inline-block; min-width: 1.75em; border-radius: 3px; padding: 2px 2px 1px 2px; border: 1px solid;" + InlineColorOverride;
	if (expandedCheck) {
		rollOut = '<span style="' + InlineRollStyle + '" title="Roll: ' + inlineroll.expression.replace("<", "<") + '<br>Results: ' + values.join("") + ' = ' + inlineroll.results.total;
		rollOut += '" class="inlinerollresult showtip tipsy';
		rollOut += (critCheck && failCheck ? ' importantroll' : (critCheck ? ' fullcrit' : (failCheck ? ' fullfail' : ''))) + '">' + values.join("") + ' = ' + inlineroll.results.total + '</span>';
	} else {
		rollOut = '<span style="' + InlineRollStyle + '" title="Roll: ' + inlineroll.expression.replace("<", "<") + '<br>Results: ' + values.join("") + ' = ' + inlineroll.results.total;
		rollOut += '" class="inlinerollresult showtip tipsy';
		rollOut += (critCheck && failCheck ? ' importantroll' : (critCheck ? ' fullcrit' : (failCheck ? ' fullfail' : ''))) + '">' + inlineroll.results.total + '</span>';
	}
	rollOut = (inlineroll.results.total === 0 && inlineroll.results.tableentries.length) ? '' : rollOut;
	rollOut += _.map(inlineroll.results.tableentries, function (l) {
		return '<span style="' + InlineRollStyle + '" title="Table: ' + l.table + ' ' + 'Weight: ' + l.weight + '" class="inlinerollresult showtip tipsy">' + l.name + '</span>';
	}).join('');
	return rollOut;
}

function processRoll(roll, critRoll, failRoll, noHighlight, expandedRoll) {
	if (roll.type === "C") {
		return {
			value: " " + roll.text + " "
		};
	} else if (roll.type === "L") {
		if (roll.text.match(/NH/i) !== null) noHighlight = true;
		if (roll.text.match(/XPND/i) !== null) expandedRoll = true;
		roll.text = roll.text.replace(/NH/i, "");
		roll.text = roll.text.replace(/XPND/i, "");
		if (roll.text !== "") roll.text = " [" + roll.text + "] ";
		return {
			value: roll.text,
			noHighlight: noHighlight,
			expandedRoll: expandedRoll
		};
	} else if (roll.type === "M") {
		// log(roll.expr);
		if (expandedRoll && (roll.expr != "+" && roll.expr != "-" && roll.expr != "*" && roll.expr != "/")) {
			roll.expr = roll.expr.replace(/floor\(/g, "Math.floor(");
			roll.expr = roll.expr.replace(/ceil\(/g, "Math.ceil(");
			roll.expr = eval(roll.expr);
			roll.expr = (roll.expr >= 0) ? " + " + roll.expr.toString() : " - " + abs(roll.expr.toString());
		} else {
			roll.expr = roll.expr.toString().replace(/\+/g, " + ");
			roll.expr = roll.expr.toString().replace(/\-/g, " - ");
			roll.expr = roll.expr.toString().replace(/\*/g, " * ");
			roll.expr = roll.expr.toString().replace(/\//g, " / ");
		}
		return {
			value: roll.expr
		};
	} else if (roll.type === "R") {
		var rollValues = [];
		_.each(roll.results, function (result) {
			if (result.tableItem !== undefined) {
				rollValues.push(result.tableItem.name);
			} else {
				critRoll = false;
				failRoll = false;
				if (noHighlight) {
					critRoll = false;
					failRoll = false;
				} else {
					if ("mods" in roll) {
						_.each(roll.mods, function () {
							if (roll.mods["customCrit"]) {
								var p = 0;
								_.each(roll.mods["customCrit"], function () {
									if (roll.mods["customCrit"][p]["comp"] === "==") critRoll = (result.v == roll.mods["customCrit"][p]["point"]) ? true : critRoll;
									if (roll.mods["customCrit"][p]["comp"] === ">=") critRoll = (result.v >= roll.mods["customCrit"][p]["point"]) ? true : critRoll;
									p++;
								});
							}
							if (roll.mods["customFumble"]) {
								var p = 0;
								_.each(roll.mods["customFumble"], function () {
									if (roll.mods["customFumble"][p]["comp"] === "==") failRoll = (result.v == roll.mods["customFumble"][p]["point"]) ? true : failRoll;
									if (roll.mods["customFumble"][p]["comp"] === "<=") failRoll = (result.v <= roll.mods["customFumble"][p]["point"]) ? true : failRoll;
									p++;
								});
							}
							if (roll.mods["reroll"]) {
								var p = 0;
								_.each(roll.mods["reroll"], function () {
									if (result.v === roll.sides) critRoll = true;
									if (result.v === 1) failRoll = true;
								});
							}
						});
					} else {
						if (result.v === roll.sides) critRoll = true;
						if (result.v === 1) failRoll = true;
					}
				}
				if (expandedRoll) result.v = "<span style='" + (critRoll ? ' color: #040;' : (failRoll ? ' color: #600;' : '')) + "'>" + result.v + "</span>";
				else result.v = "<span style='" + (critRoll ? ' color: #0F0; font-size: 1.25em;' : (failRoll ? ' color: #F00; font-size: 1.25em;' : '')) + "'>" + result.v + "</span>";
				rollValues.push(result.v);
			}
		});
		return {
			value: "(" + rollValues.join(" + ") + ")",
			critRoll: critRoll,
			failRoll: failRoll,
			noHighlight: noHighlight,
			expandedRoll: expandedRoll
		};
	} else if (roll.type === "G") {
		var grollVal = [];
		_.each(roll.rolls, function (groll) {
			_.each(groll, function (groll2) {
				var result = processRoll(groll2, noHighlight);
				grollVal.push(result.value);
				critRoll = critRoll || result.critRoll;
				failRoll = failRoll || result.failRoll;
				noHighlight = noHighlight || result.noHighlight;
				expandedRoll = expandedRoll || result.expandedRoll;
			});
		});
		return {
			value: "{" + grollVal.join(" ") + "}",
			critRoll: critRoll,
			failRoll: failRoll,
			noHighlight: noHighlight,
			expandedRoll: expandedRoll
		};
	}
}

function getCurrentTime() {
	var d = new Date();
	var h = ((d.getHours() + 1) < 10 ? "0" : "") + (d.getHours() + 1);
	var m = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
	var currentTime = h + ":" + m;
	return currentTime;
}