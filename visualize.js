var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var goButton = document.getElementById("goButton");
var personIcon = new Image();
personIcon.src = "images/person-icon.png";
var IMAGE_WIDTH = 25;
var IMAGE_HEIGHT = 25;
var SELLER_WIDTH = 22;
var SCANNER_WIDTH = 10;
// Events always take place in this order
var EventTypeWeight = {
    BUS_ARRIVAL: 0,
    WALK_TO_SELLER: 1,
    WAIT_IN_SELLER_LINE: 2,
    BUY_TICKETS: 3,
    WALK_TO_SCANNER: 4,
    WAIT_IN_SCANNER_LINE: 5,
    SCAN_TICKETS: 6,
};
var SortAndInjectSequentialIDs = function (events) {
    events = events.sort(function (a, b) { return (a.time === b.time ? EventTypeWeight[a.event] - EventTypeWeight[b.event] : a.time - b.time); });
    var id = 0;
    return events.map(function (e) { return Object.assign({ id: id++ }, e); });
};
// -------------------------
//  CANVAS OBJECTS
// -------------------------
var Queue = /** @class */ (function () {
    function Queue(queueType, num, xy, width) {
        this.queueType = queueType;
        this.num = num;
        this.xy = xy;
        this.width = width;
        this.waiting = {};
    }
    Queue.prototype.draw = function (ctx, now) {
        ctx.fillText(this.queueType + " #" + this.num, this.xy.x, this.xy.y);
    };
    Queue.prototype.registerPeople = function (people, peopleInLine) {
        this.waiting[people.sort().join(",")] = peopleInLine;
    };
    Queue.prototype.removePeople = function (people) {
        delete this.waiting[people.sort().join(",")];
    };
    Queue.prototype.peopleWaiting = function (now) {
        var _this = this;
        return Object.keys(this.waiting).filter(function (k) { return _this.waiting[k].end < now; });
    };
    Queue.prototype.positionFromFrontOfLine = function (now, people) {
        var _this = this;
        var keys = Object.keys(this.waiting).filter(function (k) { return _this.waiting[k].end < now; });
        var ordered = keys.sort(function (a, b) { return _this.waiting[b].end - _this.waiting[a].end; });
        return ordered.length - ordered.indexOf(people.sort().join(","));
    };
    Queue.prototype.queueBegin = function (now) {
        var _this = this;
        var keys = Object.keys(this.waiting).filter(function (k) { return _this.waiting[k].end < now; });
        return { x: this.xy.x - 5 - keys.length * this.width - this.width, y: this.xy.y + 15 };
    };
    Object.defineProperty(Queue.prototype, "queueTerminus", {
        get: function () {
            return { x: this.xy.x - 5, y: this.xy.y + 15 };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Queue.prototype, "serviceLocation", {
        get: function () {
            return { x: this.xy.x + 5, y: this.xy.y + 15 };
        },
        enumerable: true,
        configurable: true
    });
    Queue.DISTANCE = 20;
    return Queue;
}());
var Person = /** @class */ (function () {
    function Person(id, sellerQueues, scannerQueues) {
        this.id = id;
        this.sellerQueues = sellerQueues;
        this.scannerQueues = scannerQueues;
        this.events = [];
        this.positionInGroup = 0;
        this.lastWalkingStart = { x: Person.START_AT.x, y: Person.START_AT.y };
    }
    Person.prototype.registerEvent = function (event) {
        this.events.push(event);
        if (event.people) {
            this.positionInGroup = event.people.indexOf(this.id);
        }
    };
    Person.prototype.draw = function (ctx, now) {
        var _this = this;
        var topEvent = this.events[this.events.length - 1];
        if (!topEvent || topEvent.event === "BUS_ARRIVAL") {
            ctx.drawImage(personIcon, this.lastWalkingStart.x, this.lastWalkingStart.y, IMAGE_WIDTH, IMAGE_HEIGHT);
            return;
        }
        var wabble = Math.random() * 3;
        var queue = (function () {
            if (topEvent.scannerLine) {
                return _this.scannerQueues[topEvent.scannerLine - 1];
            }
            else if (topEvent.sellerLine) {
                return _this.sellerQueues[topEvent.sellerLine - 1];
            }
            else {
                console.error("No queue found");
                throw new Error("Invalid state of affairs.");
            }
        })();
        switch (topEvent.event) {
            case "WALK_TO_SELLER":
                queue.registerPeople(topEvent.people, { begin: topEvent.time, end: topEvent.time + topEvent.duration });
                {
                    var durationElapsed = now - topEvent.time;
                    var durationRatio = durationElapsed / topEvent.duration;
                    var start = this.lastWalkingStart;
                    var destination = queue.queueBegin(now);
                    var x = start.x + (destination.x - start.x) * durationRatio + this.positionInGroup * Person.GROUP_SPACING + wabble;
                    var y = start.y + (destination.y - start.y) * durationRatio + wabble;
                    ctx.drawImage(personIcon, x, y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "WAIT_IN_SELLER_LINE":
                {
                    var pos = queue.positionFromFrontOfLine(now, topEvent.people);
                    var terminus = queue.queueTerminus;
                    var x = terminus.x - pos * SELLER_WIDTH + this.positionInGroup * Person.GROUP_SPACING;
                    var y = terminus.y;
                    ctx.drawImage(personIcon, x, y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "BUY_TICKETS":
                queue.removePeople(topEvent.people);
                {
                    var seqNo = topEvent.people.indexOf(this.id);
                    var serviceLocation = queue.serviceLocation;
                    this.lastWalkingStart = serviceLocation;
                    ctx.drawImage(personIcon, serviceLocation.x + seqNo * Person.GROUP_SPACING, serviceLocation.y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "WALK_TO_SCANNER":
                queue.registerPeople([topEvent.person], { begin: topEvent.time, end: topEvent.time + topEvent.duration });
                {
                    var durationElapsed = now - topEvent.time;
                    var durationRatio = durationElapsed / topEvent.duration;
                    var start = this.lastWalkingStart;
                    var destination = queue.queueBegin(now);
                    var x = start.x + (destination.x - start.x) * durationRatio + wabble + this.positionInGroup * Person.GROUP_SPACING;
                    var y = start.y + (destination.y - start.y) * durationRatio + wabble;
                    ctx.drawImage(personIcon, x, y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "WAIT_IN_SCANNER_LINE":
                {
                    var pos = queue.positionFromFrontOfLine(now, [topEvent.person]);
                    var terminus = queue.queueTerminus;
                    var x = terminus.x - pos * SCANNER_WIDTH;
                    var y = terminus.y;
                    ctx.drawImage(personIcon, x, y, IMAGE_WIDTH, IMAGE_HEIGHT);
                }
                break;
            case "SCAN_TICKETS":
                queue.removePeople([topEvent.person]);
                {
                    if (now < topEvent.time + topEvent.duration) {
                        var serviceLocation = queue.serviceLocation;
                        ctx.drawImage(personIcon, serviceLocation.x, serviceLocation.y, IMAGE_WIDTH, IMAGE_HEIGHT);
                    }
                    else {
                        // TODO: Self destruct
                    }
                }
                break;
            default:
                console.warn("Unknown event: " + topEvent.event);
        }
    };
    Person.START_AT = { x: 100, y: 700 };
    Person.GROUP_SPACING = 6;
    return Person;
}());
// -------------------------
//  CANVAS LOGIC
// -------------------------
var stopTriggered = false;
var Run = function (sourceFile, speed) { return __awaiter(_this, void 0, void 0, function () {
    var canvas, ctx, data, events, sellerQueues, scannerQueues, personMap, begin, Draw;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                canvas = document.getElementById("animate");
                ctx = canvas.getContext("2d");
                if (!ctx) {
                    console.error("no context?");
                    return [2 /*return*/];
                }
                return [4 /*yield*/, fetch(sourceFile)];
            case 1: return [4 /*yield*/, (_a.sent()).json()];
            case 2:
                data = (_a.sent());
                events = SortAndInjectSequentialIDs(data.events);
                sellerQueues = Array.from(Array(data.sellerLines).keys()).map(function (i) { return new Queue("Seller", i + 1, { x: 500, y: 75 + i * 75 }, SELLER_WIDTH); });
                scannerQueues = Array.from(Array(data.scannerLines).keys()).map(function (i) { return new Queue("Scanner", i + 1, { x: 999, y: 75 + i * 75 }, SCANNER_WIDTH); });
                personMap = {};
                begin = new Date().getTime();
                Draw = function () {
                    var now = (new Date().getTime() - begin) / 1000 / speed;
                    // Parse events until we run out or until we find an event from the future
                    var e = null;
                    while (true) {
                        e = events.shift();
                        if (!e) {
                            break;
                        }
                        else if (e.time > now) {
                            events.unshift(e);
                            break;
                        }
                        if (e.event === "BUS_ARRIVAL") {
                            (e.peopleCreated || []).forEach(function (id) { return (personMap[id] = new Person(id, sellerQueues, scannerQueues)); });
                        }
                        else if (e.people !== undefined) {
                            e.people.forEach(function (id) { return personMap[id].registerEvent(e); });
                        }
                        else if (e.person !== undefined) {
                            personMap[e.person].registerEvent(e);
                        }
                        else {
                            console.warn("Invalid event received", e);
                        }
                    }
                    ctx.globalCompositeOperation = "destination-over";
                    ctx.clearRect(0, 0, 1100, 800);
                    sellerQueues.forEach(function (q) { return q.draw(ctx, now); });
                    scannerQueues.forEach(function (q) { return q.draw(ctx, now); });
                    Object.keys(personMap).forEach(function (id) { return personMap[id].draw(ctx, now); });
                    ctx.fillText("T = " + now.toFixed(2) + " minutes", 5, 15);
                    if (now < 30 && !stopTriggered) {
                        window.requestAnimationFrame(Draw);
                    }
                    else {
                        goButton.textContent = "Start";
                        stopTriggered = false;
                    }
                };
                window.requestAnimationFrame(Draw);
                return [2 /*return*/];
        }
    });
}); };
goButton.addEventListener("click", function () {
    if (this.textContent === "Start") {
        this.textContent = "Stop";
        var file = document.getElementById("file").value;
        var speed = parseInt(document.getElementById("speed").value, 10);
        Run(file, speed);
    }
    else {
        this.textContent = "Start";
        stopTriggered = true;
    }
});
//# sourceMappingURL=visualize.js.map