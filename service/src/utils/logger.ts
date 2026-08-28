import { configContext } from "../configContext";

export class Logger {
    private invocationId = 0;
    private disableLog = false;
    
    constructor(private name = '@chat-e2ee/service', private childs: string[] = []) {
        this.disableLog = configContext().settings.disableLog
    }

    private get logTitle(): string {
        let logTitle = `\u001b[32m${this.name}`;
        if(this.childs.length) {
            const childStr = `\u001b[36m${this.childs.join(' -> ')}`
            logTitle = `${logTitle} ${childStr}`
        }

        return logTitle;
    }

    public createChild(name: string) {
        return new Logger(`${this.name}`, [...this.childs, name]);
    }

    public log(...args: any[]): void {
        if(this.disableLog) {
            // Logs are disabled and will not be printed
            // set disableLog: false in configContext to enable logs
            return;
        }
        if(this.invocationId) {
            console.log(`${this.logTitle}$${this.invocationId}`, ...args);
        }else {
            console.log(`${this.logTitle}`, ...args);
        }
    }

    /**
     * Returns a logger bound to the next invocation id, so repeated calls
     * from the same call site (e.g. per-event-emission logging) can be told
     * apart in the console output (`$1`, `$2`, ...).
     */
    public withInvocationId() {
        this.invocationId ++;
        return { log: this.log.bind(this) }
    }
}