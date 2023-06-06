export class Logger {
    private counter = 0;
    constructor(private name = '@chat-e2ee/service', private childs: string[] = []) {

    }

    public createChild(name: string) {
        return new Logger(`${this.name}`, [...this.childs, name]);
    }

    public log(...args: any[]) {
        let logTitle = `\u001b[32m${this.name}`;
        if(this.childs.length) {
            const childStr = `\u001b[36m${this.childs.join(' -> ')}`
            logTitle = `${logTitle} ${childStr}`
        }
        if(this.counter) {
            console.log(`${logTitle}$${this.counter}`, ...args);
        }else {
            console.log(`${logTitle}`, ...args);
        }
    }

    public count() {
        this.counter ++;
        return { log: this.log.bind(this) }
    }
}