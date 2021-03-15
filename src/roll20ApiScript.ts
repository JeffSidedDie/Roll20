/**
 * Represents a class that responds to api chat commands.
 */
export abstract class Roll20ApiScript {
    /**
     * The api command the script responds to.
     */
    protected readonly apiCommand: string;
    /**
     * The name of the script.
     */
    protected readonly scriptName: string;

    private _isRegistered = false;

    protected constructor(scriptName: string, apiCommand: string) {
        this.scriptName = scriptName;
        this.apiCommand = apiCommand;
    }

    public register() {
        if (!this._isRegistered) {
            on("ready", () => {
                on("chat:message", (message) => {
                    if (message.type !== "api") { return; }
                    const apiMessage = message as ApiChatEventData;
                    if (apiMessage.content.indexOf(`!${this.apiCommand}`) !== 0) { return; }
                    this.apiChatMessageHandler(apiMessage);
                });

                log(`${new Date().toLocaleString()}: ${this.scriptName} loaded.`);
            });
            this._isRegistered = true;
        }
    }

    /**
     * The api message handling event for the script.
     */
    protected abstract apiChatMessageHandler(message: ApiChatEventData): void;

    protected handleError<T>(message: string, object: T) {
        sendChat(this.scriptName, message);
        log(`${new Date().toLocaleString()}: ${this.scriptName} - ${message} Value: ${JSON.stringify(object)}`);
    }

    protected sendChatFromScript(message: string, callback?: (operations: ChatEventData[]) => void, options?: ChatMessageHandlingOptions) {
        sendChat(this.scriptName, message, callback, options);
    }

    protected sendDescFromScript(message: string, callback?: (operations: ChatEventData[]) => void, options?: ChatMessageHandlingOptions) {
        sendChat("", `/desc ${message}`, callback, options);
    }

    protected sendGmOnlyFromScript(message: string, callback?: (operations: ChatEventData[]) => void, options?: ChatMessageHandlingOptions) {
        sendChat("", `/w gm ${message}`, callback, options);
    }

    protected log(message: string) {
        log(`${new Date().toLocaleString()}: ${this.scriptName} - ${message}`);
    }
}
