/// <reference path="../node_modules/@types/underscore/index.d.ts" />

declare var _: _.UnderscoreStatic;

/**
 * Properties of the state object will persist between game sessions.
 */
declare var state: any;

type ReadyEventType = "ready";
type ChatEventType = "chat:message";
type ChatEventDataType = "general" | "rollresult" | "gmrollresult" | "emote" | "whisper" | "desc" | "api";
type ObjectType = "graphic" | "text" | "path" | "character" | "ability" | "attribute" | "handout" | "rollabletable" | "tableitem" | "macro";
type RollType = "V" | "G" | "M" | "R" | "C";
type RollResultType = "sum" | "success";
type Roll20ObjectAsynchronousGetPropertyType = "notes" | "gmnotes" | "bio";

/**
 * Roll20 objects are a special kind of JavaScript object. They represent something in your campaign, such as a token on the tabletop or a character in the journal, and there is some special consideration for using them. 
 */
interface Roll20Object {

	/**
	 * This field is shorthand for obj.get('id'). All Roll20 objects have a _id property which uniquely identifies them within a campaign, but their properties are not directly accessible. Normally you have to call get in order to get the value of a property, but because _id is needed on such a frequent basis, this shim field is provided for convenience.
	 */
	readonly id: string;

	/**
	 * Gets the value of a specified property.
	 * 
	 * @param property The name of the property to get. If you are getting the value of a read-only property (one which starts with an underscore, like _id or _type), the leading underscore is not required.
	 */
	get(property: string): any;

	/**
	 * Gets the value of "notes", "gmnotes", or "bio" properties of a character or handout Roll20 object.
	 * 
	 * @param property The name of the property to get. If you are getting the value of a read-only property (one which starts with an underscore, like _id or _type), the leading underscore is not required.
	 * @param callback A callback function which will receive the value of the property as a parameter.
	 */
	get(property: Roll20ObjectAsynchronousGetPropertyType, callback: (value: string) => void): void;

	/**
	 * Deletes the Roll20 object.
	 */
	remove(): void;

	/**
	 * Sets one specified property value.
	 * 
	 * @param property The name of the property to set.
	 * @param value The value to set for the specified property.
	 */
	set(property: string, value: any): void;

	/**
	 * Sets one specified property value and runs the character sheet workers related to that attribute (if any).
	 * 
	 * @param property The name of the property to set.
	 * @param value The value to set for the specified property.
	 */
	setWithWorker(property: string, value: any): void;

	/**
	 * Sets one or more specified property values.
	 * 
	 * @param attributes The properties of the attributes object will be mapped to the properties of the Roll20 object.
	 */
	set(attributes: { [property: string]: any }): void;

	/**
	 * Sets one or more specified property values and runs the character sheet workers related to that attribute (if any).
	 * 
	 * @param attributes The properties of the attributes object will be mapped to the properties of the Roll20 object.
	 */
	setWithWorker(attributes: { [property: string]: any }): void;
}

interface ChatEventData {
	readonly who: string;
	readonly playerid: string;
	readonly type: ChatEventDataType;
	readonly content: string;
	readonly inlinerolls?: InlineRollSummary[];
	readonly rolltemplate?: string;
}

interface RollResultChatEventData extends ChatEventData {
	readonly origRoll: string;
	readonly signature: string;
}

interface WhisperChatEventData extends ChatEventData {
	readonly target: string;
	readonly target_name: string;
}

interface ApiChatEventData extends ChatEventData {
	readonly selected?: ApiChatEventDataSelectObjectInfo[];
}

interface ApiChatEventDataSelectObjectInfo {
	readonly _id: string;
	readonly _type: ObjectType;
}

interface InlineRollSummary {
	readonly expression: string;
	readonly results: RollSummary;
	readonly rollid: string;
	readonly signature: string;
}

interface RollSummary {
	readonly type: RollType;
	readonly rolls: RollInfo[];
	readonly resultType: RollResultType;
	readonly total: number;
}

interface RollInfo {
	readonly type: RollType;
}

interface GroupRoll extends RollInfo {
	readonly rolls: RollInfo[];
	readonly mods: RollModification;
	readonly resultType: RollResultType;
	readonly results: RollResult[];
}

interface BasicRoll extends RollInfo {
	readonly dice: number;
	readonly sides: number;
	readonly mods: RollModification;
	readonly results: RollResult[];
	readonly table?: string;
}

interface MathExpression extends RollInfo {
	readonly expr: string;
}

interface RollComment extends RollInfo {
	readonly text: string;
}

interface RollModification {
	//should this be inheritance?
	readonly compounding?: RollModificationComparison;
	readonly success?: RollModificationComparison;
}

interface RollModificationComparison {
	readonly comp: string;
	readonly point: number;
}

interface RollResult {
	readonly v: number;
}

interface TableRollResult extends RollResult {
	readonly tableidx: number;
	readonly tableItem: TableItem;
}

interface TableItem {
	readonly name: string;
	readonly avatar: string;
	readonly weight: number;
	readonly id: string;
}

interface FindObjectOptions {
	readonly caseInsensitive: boolean;
}

interface ChatMessageHandlingOptions {
	readonly noarchive?: boolean;
	readonly use3d?: boolean;
}

/**
 * Creates a new Roll20 object.
 * 
 * @param type The type of Roll20 object to create. Only 'graphic', 'text', 'path', 'character', 'ability', 'attribute', 'handout', 'rollabletable', 'tableitem', and 'macro' may be created.
 * @param attributes The initial values to use for the Roll20 object's properties.
 */
declare function createObj(type: ObjectType, attributes: { [attributeName: string]: any }): Roll20Object;

/**
 * Gets all Roll20 objects with properties that match a given set of attributes.
 * 
 * @param attributes A collection of key:value pairs to match with Roll20 objects in the campaign.
 * @param options If options.caseInsensitive is true, string comparisons between Roll20 objects and attributes will be case-insensitive.
 */
declare function findObjs(attributes: { [attributeName: string]: any }, options?: FindObjectOptions): Roll20Object[];

/**
 * Gets a specific Roll20 object.
 * 
 * @param type The type of Roll20 object to get.
 * @param id The unique id for the Roll20 object to get.
 */
declare function getObj(type: ObjectType, id: string): Roll20Object;

/**
 * Logs a message to the API console.
 * 
 * @param message The message to post to the API console. The message parameter will be transformed into a String with JSON.stringify.
 */
declare function log(message: any): void;

/**
 * Registers an event handler.
 * 
 * @param event There are five types of event:
 * 
 * * ready
 * * change
 * * add
 * * destroy
 * * chat
 * 
 * With the exception of ready, all event types must also be paired with an object type. For chat, this is always message. For everything else, this is the type property of a Roll20 object. In addition to the object type, change events can also optionally specify a property of the specified Roll20 object to watch.
 * 
 * The 2-3 parts of the event (type, object, and optionally property) are separated by colons. So, valid event strings include but are not limited to "ready", "chat:message", "change:graphic", "change:campaign:playerpageid", "add:character", and "destroy:handout".
 * @param callback The function that will be called when the specified event fires. The parameters passed depend on the event type:
 * 
 * * ready events have no callback parameters.
 * * change events have an obj parameter, which is a reference to the Roll20 object as it exists after the change, and a prev parameter, which is a plain old JavaScript object with properties matching the Roll20 object prior to the change event.
 * * add events have an obj parameter, which is a reference to the new Roll20 object.
 * * destroy events have an obj parameter, which is a reference to the no-longer existing Roll20 object.
 * * chat events have a msg parameter, which contains the details of the message that was sent to the chat.
 */
declare function on(event: ChatEventType, callback: (msg: ChatEventData) => void): void;
declare function on(event: ReadyEventType, callback: () => void): void;

/**
 * Sends a chat message.
 * 
 * @param speakingAs The name to attach to the message being sent. If speakingAs is in the format player|player_id or character|character_id, the message will be sent as that player or character. Otherwise, the message will use the given name as though a GM had used the /as command.
 * @param message The message to send to the chat.
 * @param callback If callback is specified, the result of the chat message will be passed to it instead of appearing in the chat. The parameter of the callback method is an array of message objects.
 * @param options If options.noarchive is true, the message will not be added to the chat archive. If options.use3d is true, dice rolls in the message will use the 3D dice feature. Options are not applicable if callback is specified.
 */
declare function sendChat(speakingAs: string, message: string, callback?: (operations: ChatEventData[]) => void, options?: ChatMessageHandlingOptions): void;

/**
 * Decodes an encoded string.
 * 
 * @param str The string to be decoded.
 */
declare function unescape(str: string): string;