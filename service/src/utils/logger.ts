import { configContext } from "../configContext";

export class Logger {
    private counter = 0;
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

    public log(...args: any[]) {
        if(this.disableLog) {
            // Logs are disabled and will not be printed
            // set disableLog: false in configContext to enable logs
            return;
        }
        if(this.counter) {
            console.log(`${this.logTitle}$${this.counter}`, ...args);
        }else {
            console.log(`${this.logTitle}`, ...args);
        }
    }

    public count() {
        this.counter ++;
        return { log: this.log.bind(this) }
    }
}