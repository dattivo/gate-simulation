const goButton = document.getElementById("goButton") as HTMLButtonElement;

const personIcon = new Image();
personIcon.src = "images/person-icon.png";
const IMAGE_WIDTH = 25;
const IMAGE_HEIGHT = 25;

const SELLER_WIDTH = 22;
const SCANNER_WIDTH = 10;

// -------------------------
//  DEFINITIONS
// -------------------------

type Coords = { x: number; y: number };

// Format of the JSON event data
interface ReplayData {
    sellerLines: number;
    scannerLines: number;
    events: Array<SimEvent>;
}

interface SimEvent {
    event: "BUS_ARRIVAL" | "WALK_TO_SELLER" | "WAIT_IN_SELLER_LINE" | "BUY_TICKETS" | "WALK_TO_SCANNER" | "WAIT_IN_SCANNER_LINE" | "SCAN_TICKETS";
    time: number;

    // BUS_ARRIVAL
    busId?: number;
    peopleCreated?: Array<number>;

    // All of the following seller and scanner events specify a duration
    duration?: number;

    // WALK_TO_SELLER, WAIT_IN_SELLER_LINE, BUY_TICKETS
    people?: Array<number>;
    sellerLine?: number;

    // WALK_TO_SCANNER, WAIT_IN_SCANNER_LINE, SCAN_TICKETS
    person?: number;
    scannerLine?: number;
}

interface SimEventWithId extends SimEvent {
    id: number;
}

// Events always take place in this order
const EventTypeWeight = {
    BUS_ARRIVAL: 0,
    WALK_TO_SELLER: 1,
    WAIT_IN_SELLER_LINE: 2,
    BUY_TICKETS: 3,
    WALK_TO_SCANNER: 4,
    WAIT_IN_SCANNER_LINE: 5,
    SCAN_TICKETS: 6,
};

const SortAndInjectSequentialIDs = (events: Array<SimEvent>): Array<SimEventWithId> => {
    events = events.sort((a, b) => (a.time === b.time ? EventTypeWeight[a.event] - EventTypeWeight[b.event] : a.time - b.time));
    let id = 0;
    return events.map((e) => Object.assign({ id: id++ }, e) as SimEventWithId);
};

type PeopleInLine = {
    begin: number;
    end: number;
};

// -------------------------
//  CANVAS OBJECTS
// -------------------------

class Queue {
    static DISTANCE: number = 20;

    private waiting: { [key: string]: PeopleInLine } = {};

    constructor(private queueType: string, private num: number, private xy: Coords, private width: number) {}

    draw(ctx: CanvasRenderingContext2D, now: number) {
        ctx.fillText(`${this.queueType} #${this.num}`, this.xy.x, this.xy.y);
    }

    registerPeople(people: Array<number>, peopleInLine: PeopleInLine) {
        this.waiting[people.sort().join(",")] = peopleInLine;
    }

    removePeople(people: Array<number>) {
        delete this.waiting[people.sort().join(",")];
    }

    peopleWaiting(now: number): Array<string> {
        return Object.keys(this.waiting).filter((k) => this.waiting[k].end < now);
    }

    positionFromFrontOfLine(now: number, people: Array<number>): number {
        const keys = Object.keys(this.waiting).filter((k) => this.waiting[k].end < now);
        const ordered = keys.sort((a, b) => this.waiting[b].end - this.waiting[a].end);
        return ordered.length - ordered.indexOf(people.sort().join(","));
    }

    queueBegin(now: number): Coords {
        const keys = Object.keys(this.waiting).filter((k) => this.waiting[k].end < now);
        return { x: this.xy.x - 5 - keys.length * this.width - this.width, y: this.xy.y + 15 };
    }

    get queueTerminus(): Coords {
        return { x: this.xy.x - 5, y: this.xy.y + 15 };
    }

    get serviceLocation(): Coords {
        return { x: this.xy.x + 5, y: this.xy.y + 15 };
    }
}

class Person {
    static START_AT: Coords = { x: 100, y: 700 };
    static GROUP_SPACING = 6;

    private events: Array<SimEvent> = [];
    private positionInGroup: number = 0;
    private lastWalkingStart: Coords = { x: Person.START_AT.x, y: Person.START_AT.y };

    constructor(private id: number, private sellerQueues: Array<Queue>, private scannerQueues: Array<Queue>) {}

    registerEvent(event: SimEvent) {
        this.events.push(event);
        if (event.people) {
            this.positionInGroup = event.people!.indexOf(this.id);
        }
    }

    draw(ctx: CanvasRenderingContext2D, now: number) {
        const topEvent = this.events[this.events.length - 1];
        if (!topEvent || topEvent.event === "BUS_ARRIVAL") {
            ctx.drawImage(personIcon, this.lastWalkingStart.x, this.lastWalkingStart.y, IMAGE_WIDTH, IMAGE_HEIGHT);
            return;
        }

        const wabble = Math.random() * 3;
        const queue = (() => {
            if (topEvent.scannerLine) {
                return this.scannerQueues[topEvent.scannerLine - 1];
            } else if (topEvent.sellerLine) {
                return this.sellerQueues[topEvent.sellerLine - 1];
            } else {
                console.error("No queue found");
                throw new Error("Invalid state of affairs.");
            }
        })();
        switch (topEvent.event) {
            case "WALK_TO_SELLER":
                queue.registerPeople(topEvent.people!, { begin: topEvent.time, end: topEvent.time + topEvent.duration! });
                {
                    const durationElapsed = now - topEvent.time;
                    const durationRatio = durationElapsed / topEvent.duration!;

                    const start = this.lastWalkingStart;
                    const destination = queue.queueBegin(now);

                    const x = start.x + (destination.x - start.x) * durationRatio + this.positionInGroup * Person.GROUP_SPACING + wabble;
                    const y = start.y + (destination.y - start.y) * durationRatio + wabble;
                    ctx.drawImage(personIcon, x, y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "WAIT_IN_SELLER_LINE":
                {
                    const pos = queue.positionFromFrontOfLine(now, topEvent.people!);
                    const terminus = queue.queueTerminus;

                    const x = terminus.x - pos * SELLER_WIDTH + this.positionInGroup * Person.GROUP_SPACING;
                    const y = terminus.y;
                    ctx.drawImage(personIcon, x, y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "BUY_TICKETS":
                queue.removePeople(topEvent.people!);
                {
                    const seqNo = topEvent.people!.indexOf(this.id);
                    const serviceLocation = queue.serviceLocation;
                    this.lastWalkingStart = serviceLocation;
                    ctx.drawImage(personIcon, serviceLocation.x + seqNo * Person.GROUP_SPACING, serviceLocation.y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "WALK_TO_SCANNER":
                queue.registerPeople([topEvent.person!], { begin: topEvent.time, end: topEvent.time + topEvent.duration! });
                {
                    const durationElapsed = now - topEvent.time;
                    const durationRatio = durationElapsed / topEvent.duration!;

                    const start = this.lastWalkingStart;
                    const destination = queue.queueBegin(now);

                    const x = start.x + (destination.x - start.x) * durationRatio + wabble + this.positionInGroup * Person.GROUP_SPACING;
                    const y = start.y + (destination.y - start.y) * durationRatio + wabble;
                    ctx.drawImage(personIcon, x, y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "WAIT_IN_SCANNER_LINE":
                {
                    const pos = queue.positionFromFrontOfLine(now, [topEvent.person!]);
                    const terminus = queue.queueTerminus;

                    const x = terminus.x - pos * SCANNER_WIDTH;
                    const y = terminus.y;
                    ctx.drawImage(personIcon, x, y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "SCAN_TICKETS":
                queue.removePeople([topEvent.person!]);
                {
                    if (now < topEvent.time + topEvent.duration!) {
                        const serviceLocation = queue.serviceLocation;
                        ctx.drawImage(personIcon, serviceLocation.x, serviceLocation.y, IMAGE_WIDTH, IMAGE_HEIGHT);
                    } else {
                        // TODO: Self destruct
                    }
                }
                break;
            default:
                console.warn("Unknown event: " + topEvent.event);
        }
    }
}

// -------------------------
//  CANVAS LOGIC
// -------------------------

let stopTriggered = false;
const Run = async (sourceFile: string, speed: number) => {
    const canvas = document.getElementById("animate") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.error("no context?");
        return;
    }

    const data = (await (await fetch(sourceFile)).json()) as ReplayData;
    const events = SortAndInjectSequentialIDs(data.events);

    const sellerQueues = Array.from(Array(data.sellerLines).keys()).map((i) => new Queue("Seller", i + 1, { x: 500, y: 75 + i * 75 }, SELLER_WIDTH));
    const scannerQueues = Array.from(Array(data.scannerLines).keys()).map(
        (i) => new Queue("Scanner", i + 1, { x: 999, y: 75 + i * 75 }, SCANNER_WIDTH)
    );
    const personMap: { [personId: number]: Person } = {};

    const begin = new Date().getTime();

    const Draw = () => {
        const now = (new Date().getTime() - begin) / 1000 / speed;

        // Parse events until we run out or until we find an event from the future
        let e: SimEventWithId | null | undefined = null;
        while (true) {
            e = events.shift();
            if (!e) {
                break;
            } else if (e.time > now) {
                events.unshift(e);
                break;
            }

            if (e.event === "BUS_ARRIVAL") {
                (e.peopleCreated || []).forEach((id) => (personMap[id] = new Person(id, sellerQueues, scannerQueues)));
            } else if (e.people !== undefined) {
                e.people.forEach((id) => personMap[id].registerEvent(e as SimEvent));
            } else if (e.person !== undefined) {
                personMap[e.person].registerEvent(e);
            } else {
                console.warn("Invalid event received", e);
            }
        }

        ctx.globalCompositeOperation = "destination-over";
        ctx.clearRect(0, 0, 1100, 800);

        sellerQueues.forEach((q) => q.draw(ctx, now));
        scannerQueues.forEach((q) => q.draw(ctx, now));
        Object.keys(personMap).forEach((id) => personMap[id].draw(ctx, now));

        ctx.fillText(`T = ${now.toFixed(2)} minutes`, 5, 15);

        if (now < 30 && !stopTriggered) {
            window.requestAnimationFrame(Draw);
        } else {
            goButton.textContent = "Start";
            stopTriggered = false;
        }
    };

    window.requestAnimationFrame(Draw);
};

goButton.addEventListener("click", function() {
    if (this.textContent === "Start") {
        this.textContent = "Stop";
        const file = (document.getElementById("file") as HTMLSelectElement).value;
        const speed = parseInt((document.getElementById("speed") as HTMLInputElement).value, 10);
        Run(file, speed);
    } else {
        this.textContent = "Start";
        stopTriggered = true;
    }
});
