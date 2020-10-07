"use strict";

import * as widgets from "./widgets.js";
import * as consts from "./consts.js";
import * as engine from "./engine.js";

const status = {
    IDLE: 0,
    PENDING: 1,
    READY: 2,
};

export class WireFromOutput {
    constructor(output) {
        this.output = output;
        this.endPos = { x: 0, y: 0 };
    }

    setEndPos(pos) {
        this.endPos = pos;
    }
}

export class WireFromInput {
    constructor(input) {
        this.input = input;
    }

    setEndPos(pos) {
        this.endPos = pos;
    }
}

export class Wire {
    constructor(input, output) {
        this.input = input;
        this.output = output;
    }
}

export class Input {
    constructor(parentNode, label, type, def) {
        this.label = label;
        this.size = {
            h: consts.normalSlotHeight,
            w: parentNode.size.w,
        };
        switch (type) {
            case "bool":
                this.widget = new widgets.Checkbox(this);
                this.value = def ? def : false;
                break;
            case "number":
                this.widget = new widgets.Number(this);
                this.value = def ? def : 0;
                break;
            default:
                break;
        }
        if (this.widget !== undefined) {
            this.widget.setLabel(label);
            this.size.h = this.widget.size.h;
        }
        this.wire = undefined;
        this.parentNode = parentNode;
        this.pos = { x: 0, y: 0 };
        this.status = status.IDLE;
    }

    setWire(wire) {
        this.removeWire();
        this.wire = wire;
        this.widget?.setVisible(false);
    }

    removeWire() {
        if (this.wire !== undefined) {
            let output = this.wire.output;
            output.removeWire(this.wire);
            this.wire = undefined;
            this.widget?.setVisible(true);
        }
    }

    setWidth(width) {
        this.size.w = width;
        if (this.widget !== undefined) {
            this.widget.size.w = width - consts.connectPointRadius * 2 - 2;
        }
    }

    setPos(pos) {
        this.pos = pos;
        if (this.widget !== undefined) {
            this.widget.pos = {
                x: pos.x + consts.connectPointRadius * 2,
                y: pos.y,
            };
        }
    }

    receive(value) {
        this.value = value;
        this.onReceive(value);
    }

    propagatePendingStatus() {
        this.status = status.PENDING;
        this.parentNode.propagatePendingStatus();
    }

    isPending() {
        return this.status === status.PENDING;
    }

    setReady() {
        this.status = status.READY;
        this.parentNode.reportInputReady();
    }
}

export class Output {
    constructor(parentNode, label, type) {
        this.label = label;
        this.type = type;
        this.value = undefined;
        this.wires = [];
        this.parentNode = parentNode;
        this.pos = { x: 0, y: 0 };
        this.size = {
            h: consts.normalSlotHeight,
            w: parentNode.size.w,
        };
        this.status = status.IDLE;
    }

    addWire(wire) {
        this.wires.push(wire);
    }

    removeWire(wireToRemove) {
        let idx = this.wires.findIndex(wire => {
            return (
                wire.input  == wireToRemove.input  &&
                wire.output == wireToRemove.output
            );
        });
        this.wires[idx] = this.wires[this.wires.length - 1];
        this.wires.pop();
    }

    transmitToAllWires(value) {
        this.value = value;
        for (const wire of this.wires) {
            wire.input.receive(value);
        }
    }

    transmit(wire, value) {
        this.value = value;
        wire.input.receive(value);
    }

    propagatePendingStatus() {
        this.status = status.PENDING;
        for (const wire of this.wires) {
            wire.input.propagatePendingStatus();
        }
    }
}

export class Node {
    constructor() {
        this.size = { x: 0, y: 0 };
        this.pos = { x: 0, y: 0 };
        this.inputList = [];
        this.outputList = [];
    }

    setWidth(width) {
        this.size.w = width;
        // adjust widget widths
        for (let input of this.inputList) {
            input.setWidth(width);
        }
    }

    setPos(pos) {
        this.pos = pos;
        // layout
        // calculate slot Y positions
        let outputYVals = [];
        for (const idx in this.outputList) {
            outputYVals.push(
                ((consts.normalSlotHeight + consts.slotPadding * 2) * idx) + 22 + pos.y
            );
        }
        let inputY = pos.y + 22;
        if (outputYVals.length > 0) {
            inputY = outputYVals[outputYVals.length - 1] + consts.normalSlotHeight * 2;
        }
        let inputYVals = [];
        for (const input of this.inputList) {
            inputYVals.push(inputY);
            inputY += input.size.h + consts.slotPadding;
        }
        // apply them
        for (const idx in outputYVals) {
            let output = this.outputList[idx];
            output.pos = {
                x: pos.x,
                y: outputYVals[idx],
            };
        }
        for (const idx in inputYVals) {
            let input = this.inputList[idx];
            input.setPos({x: pos.x, y: inputYVals[idx]});
        }
    }

    initHeight() {
        let lastItem = this.outputList[this.outputList.length - 1];
        if (this.inputList.length > 0) {
            lastItem = this.inputList[this.inputList.length - 1];
        }
        let bottom = lastItem.pos.y + lastItem.size.h;
        this.size.h = bottom - this.pos.y + 2;
    }

    propagatePendingStatus() {
        this.status = status.PENDING;
        for (const output of this.outputList) {
            if (output.type !== "signal" && output.status === status.IDLE) {
                output.propagatePendingStatus();
            }
        }
    }

    isReady() {
        let ready = true;
        for (const input in this.inputList) {
            if (input.status === status.PENDING) {
                ready = false;
                break;
            }
        }
        return ready;
    }

    reportInputReady() {
        // could do it with a counter of pending inputs that we +/- to
        let ready = true;
        for (const input in this.inputList) {
            if (input.status === status.PENDING) {
                ready = false;
                break;
            }
        }
        if (ready) {
            this.status = status.READY;
            engine.submitReadyNode(this);
        }
    }

    execute() {
        for (let input of this.inputList) {
            input.status = status.IDLE;
        }
        this.onExecute();
    }

    onExecute() {
        // overridden in subclass
    }
}

export class Test extends Node {
    constructor(pos) {
        super();
        this.name = "test";
        this.inputList = [
            new Input(this, "CB 1",  "bool"),
            new Input(this, "Num 1", "number"),
            new Input(this, "CB 2",  "bool"),
            new Input(this, "test",  "signal"),
        ];
        this.outputList = [
            new Output(this, "Val 1", "bool"),
            new Output(this, "Val 2", "number"),
        ];
        this.setPos(pos);
        this.setWidth(100);
        this.initHeight();
    }
}

export class Osc extends Node {
    constructor(pos) {
        super();
        this.name = "Osc";
        this.outputList = [
            new Output(this, "Signal", "signal"),
        ];
        this.inputList = [
            new Input(this, "Enabled", "bool"),
            new Input(this, "Freq", "number"),
        ];
        this.setPos(pos);
        this.setWidth(100);
        this.initHeight();
        this.backend = {
            node: new engine.Oscillator(),
        };
        this.inputList[0].onReceive = enabled => {
            if (enabled) {
                this.backend.node.start();
            } else {
                this.backend.node.stop();
            }
        };
        this.inputList[1].onReceive = value => {
            this.backend.node.setFrequency(value);
        };
    }
}

export class Dest extends Node {
    constructor(pos) {
        super();
        this.name = "Dest";
        this.inputList = [
            new Input(this, "Signal", "signal"),
        ];
        this.outputList = [];
        this.setPos(pos);
        this.setWidth(100);
        this.initHeight();
        this.backend = {
            node: engine.audioCtx.destination,
        };
    }
}

export class Number extends Node {
    constructor(pos) {
        super();
        this.name = "Number";
        this.inputList = [
            new Input(this, "Input", "number"),
        ];
        this.outputList = [
            new Output(this, "Output", "number"),
        ];
        this.setPos(pos);
        this.setWidth(100);
        this.initHeight();
        this.inputList[0].onReceive = value => {
            this.outputList[0].transmitToAllWires(value);
        };
    }
}

export class Add extends Node {
    constructor(pos) {
        super();
        this.name = "Add";
        this.inputList = [
            new Input(this, "A", "number"),
            new Input(this, "B", "number"),
        ];
        this.outputList = [
            new Output(this, "Result", "number"),
        ];
        this.setPos(pos);
        this.setWidth(100);
        this.initHeight();
    }

    execute() {
        let a = this.inputList[0].value;
        let b = this.inputList[1].value;
        this.outputList[0].transmitToAllWires(a + b);
    }
}

export class Select extends Node {
    /*
    A input with a selector (combo box) type, could be its own
    unique type, maybe a hash of the sum of its options.
    Upon attaching a blank selector type output to a typed
    selector input, the output could adopt its options and type.
    */
}