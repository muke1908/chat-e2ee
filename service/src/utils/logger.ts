export class Logger {
    constructor(public name = '@chat-e2ee/service') {

    }

    public createChild(name: string) {
        return new Logger(`${this.name} -> ${name}`);
    }

    public log(...args: any[]) {
        console.log(`\u001b[32m${this.name}`, ...args);
    }
}