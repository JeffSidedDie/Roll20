/**
 * Represents a class that responds to api chat commands.
 */
export abstract class Roll20ApiScript {
	/**
	 * The name of the script.
	 */
	protected readonly scriptName: string;
	/**
	 * The api command the script responds to.
	 */
	protected readonly apiCommand: string;

	private _isRegistered = false;

	constructor(scriptName: string, apiCommand: string) {
		this.scriptName = scriptName;
		this.apiCommand = apiCommand;
	}

	public register(): void {
		if (!this._isRegistered) {
			on("ready", () => {
				on("chat:message", (message) => {
					if (message.type !== "api") { return; }
					const apiMessage = message as ApiChatEventData;
					if (apiMessage.content.indexOf("!" + this.apiCommand) !== 0) { return; }
					this.apiChatMessageHandler(apiMessage);
				});

				log(new Date().toLocaleString() + ": " + this.scriptName + " loaded.");
			});
			this._isRegistered = true;
		}
	}

	protected sendChatFromScript(message: string, callback?: (operations: ChatEventData[]) => void, options?: ChatMessageHandlingOptions): void {
		sendChat(this.scriptName, message, callback, options);
	}

	/**
	 * The api message handling event for the script.
	 */
	protected abstract apiChatMessageHandler(message: ApiChatEventData): void;
}