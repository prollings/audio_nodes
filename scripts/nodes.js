"use strict";

import * as widgets from "./widgets.js";
import * as consts from "./consts.js";
import * as engine from "./engine.js";

const status = {
    IDLE: 0,
    PENDING: 1,
    READY: 2,
};

class WireBase {
    constructor() {
        this.path;
    }

    rebuildPath(x1, y1, x2, y2) {
        let xMag = 10;
        let path = new Path2D();
        path.moveTo(x1, y1);
        path.bezierCurveTo(x1 + xMag, y1, x2 - xMag, y2, x2, y2);
        this.path = path;
    }
}

export class WireFromOutput extends WireBase {
    constructor(output) {
        super();
        this.output = output;
        this.endPos = { x: 0, y: 0 };
        this.reconstructPath();
    }

    setEndPos(pos) {
        this.endPos = pos;
        this.reconstructPath();
    }

    reconstructPath() {
        let x1 = this.output.pos.x;
        x1 += this.output.size.w;
        let y1 = this.output.pos.y;
        y1 += this.output.size.h / 2;
        let x2 = this.endPos.x;
        let y2 = this.endPos.y;
        this.rebuildPath(x1, y1, x2, y2);
    }
}

export class WireFromInput extends WireBase {
    constructor(input) {
        super();
        this.input = input;
        this.endPos = { x: 0, y: 0 };
        this.reconstructPath();
    }

    setEndPos(pos) {
        this.endPos = pos;
        this.reconstructPath();
    }

    reconstructPath() {
        let x1 = this.endPos.x;
        let y1 = this.endPos.y;
        let x2 = this.input.pos.x;
        let y2 = this.input.pos.y;
        y2 += this.input.size.h / 2;
        this.rebuildPath(x1, y1, x2, y2);
    }
}

export class Wire extends WireBase {
    constructor(input, output) {
        super();
        this.output = output;
        this.input = input;
        this.reconstructPath();
    }

    reconstructPath() {
        let x1 = this.output.pos.x;
        x1 += this.output.size.w;
        let y1 = this.output.pos.y;
        y1 += this.output.size.h / 2;
        let x2 = this.input.pos.x;
        let y2 = this.input.pos.y;
        y2 += this.input.size.h / 2;
        this.rebuildPath(x1, y1, x2, y2);
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
            case "param":
                this.widget = new widgets.Number(this);
                this.value = def ? def : 0;
                break;
            case "trigger":
                this.widget = new widgets.Button(this);
            default:
                break;
        }
        if (this.widget !== undefined) {
            this.widget.setLabel(label);
            this.size.h = this.widget.size.h;
        }
        this.type = type;
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
        this.setReady();
        this.onReceive(value);
    }

    onReceive() {
        // defined by parent node
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
        for (let output of this.outputList) {
            output.size.w = width;
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
            inputY = outputYVals[outputYVals.length - 1] + consts.normalSlotHeight;
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
        // this probably shouldn't be here
        for (let input of this.inputList) {
            input.wire?.reconstructPath();
        }
        for (let output of this.outputList) {
            for (let wire of output.wires) {
                wire.reconstructPath();
            }
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
            new Input(this, "test",  "signal"),
            new Input(this, "Checkbox",  "bool"),
            new Input(this, "Number", "number"),
            new Input(this, "Button", "trigger"),
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
            new Input(this, "Freq", "param"),
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
            this.backend.node.frequency.value = value;
        };
        this.inputList[1].assocParam = this.backend.node.frequency;
    }
}

export class BiquadFilter extends Node {
    constructor(pos) {
        super();
        this.name = "Biquad Filter";
        this.inputList = [
            new Input(this, "Signal", "signal"),
            new Input(this, "Type", "number"),
            new Input(this, "Frequency", "number"),
            new Input(this, "Q", "number"),
            new Input(this, "Gain", "number"),
        ];
        this.outputList = [
            new Output(this, "Signal", "signal"),
        ];
        this.backend = {
            node: engine.audioCtx.createBiquadFilter(),
        }
        this.backend.node.type = "lowpass";
        
        this.inputList[1].onReceive = type => { /* switch for types */ };
        this.inputList[2].onReceive = freq => {
            this.backend.node.frequency.value = freq;
        };
        this.inputList[3].onReceive = qval => {
            this.backend.node.Q.value = qval;
        };
        this.inputList[4].onReceive = gain => {
            this.backend.node.gain.value = gain;
        };

        this.setPos(pos);
        this.setWidth(120);
        this.initHeight();
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

    onExecute() {
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

export class Gain extends Node {
    constructor(pos) {
        super();
        this.name = "Gain";
        this.inputList = [
            new Input(this, "Signal", "signal"),
            new Input(this, "Gain", "param"),
        ];
        this.outputList = [
            new Output(this, "Signal", "signal"),
        ];
        this.backend = {
            node: engine.audioCtx.createGain(),
        };
        this.inputList[1].onReceive = value => {
            this.backend.node.gain.value = value;
        };
        this.inputList[1].assocParam = this.backend.node.gain;
        this.setPos(pos);
        this.setWidth(100);
        this.initHeight();
    }
}

export class Envelope extends Node {
    constructor(pos) {
        super();
        this.name = "Envelope";
        this.inputList = [
            new Input(this, "Trigger", "trigger"),
        ];
        this.outputList = [
            new Output(this, "Signal", "signal"),
        ];
        this.backend = {
            node: engine.audioCtx.createConstantSource(),
        };
        this.backend.node.offset.value = 0;
        this.backend.node.start();
        this.inputList[0].onReceive = () => {
            let node = this.backend.node;
            let time = engine.audioCtx.currentTime;
            node.offset.setValueAtTime(0, time);
            node.offset.linearRampToValueAtTime(1, time + 0.016);
            node.offset.linearRampToValueAtTime(0.5, time + 0.06);
            node.offset.linearRampToValueAtTime(0, time + 0.400);
        }
        this.setPos(pos);
        this.setWidth(100);
        this.initHeight();
    }
}