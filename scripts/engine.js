"use strict";

export let audioCtx = new window.AudioContext;
let readyNodes = [];

export function connect(output, input) {
    // invalid pairs shouldn't be submitted to this function
    // is it a signal connection? run connect logic
    if (output.type === "signal") {
        let transmitter = output.parentNode.backend.node;
        let receiver = input.parentNode.backend.node;
        if (input.type === "param") {
            receiver = input.assocParam;
        }
        transmitter.connect(receiver);
        if (output.parentNode.backend.nodeOnConnect) {
            output.parentNode.backend.nodeOnConnect();
        }
        return;
    }
}

export function disconnect(output, input) {
    if (output.type === "signal") {
        let transmitter = output.parentNode.backend.node;
        let receiver = input.parentNode.backend.node;
        if (input.type === "param") {
            receiver = input.assocParam;
        }
        transmitter.disconnect(receiver);
        if (output.parentNode.backend.nodeOnDisconnect) {
            output.parentNode.backend.nodeOnDisconnect();
        }
        return;
    }
}

export function submitReadyNode(node) {
    readyNodes.push(node);
}

function executeTreeUntilPending(node) {
    if (!node.isReady()) {
        return;
    }
    node.execute();
    // go through all outputs
    for (const output of node.outputList) {
        if (output.type === "signal") {
            continue;
        }
        for (const wire of output.wires) {
            executeTreeUntilPending(wire.input.parentNode);
        }
    }
}

export function update() {
    for (const node of readyNodes) {
        executeTreeUntilPending(node);
    }
    readyNodes = [];
}

export class Oscillator {
    constructor() {
        this.node = undefined;
        this.freqController = audioCtx.createConstantSource();
        this.freqController.start();
        this.frequency = this.freqController.offset;
        this.frequency.value = 0;
        this.started = false;
        this.connectedReceivers = [];
    }

    start() {
        this.node = audioCtx.createOscillator();
        this.node.frequency.value = 0;
        for (const receiver of this.connectedReceivers) {
            this.node.connect(receiver);
        }
        // this.node.type = "square";
        this.freqController.connect(this.node.frequency);
        this.node.start();
        this.started = true;
    }

    stop() {
        this.node.stop();
        this.freqController.disconnect(this.node.frequency);
        for (const receiver of this.connectedReceivers) {
            this.node.disconnect(receiver);
        }
        this.node = undefined;
        this.started = false;
    }

    connect(receiver) {
        this.connectedReceivers.push(receiver);
        if (this.started) {
            this.node.connect(receiver);
        }
    }

    disconnect(receiver) {
        let recIdx = this.connectedReceivers.findIndex(aRec => aRec === receiver);
        this.connectedReceivers[recIdx] = this.connectedReceivers[this.connectedReceivers.length];
        this.connectedReceivers.pop();
        if (this.started) {
            this.node.disconnect(receiver);
        }
    }
}