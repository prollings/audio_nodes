"use strict";

export let audioCtx = new window.AudioContext;
let readyNodes = [];

export function connect(output, input) {
    // invalid pairs shouldn't be submitted to this function
    // is it a signal connection? run connect logic
    if (output.type === "signal") {
        let transmitter = output.parentNode.backend.node;
        let receiver = input.parentNode.backend.node;
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
        this.frequency = 0;
        this.started = false;
        this.connectedNodes = [];
    }

    start() {
        this.node = audioCtx.createOscillator();
        for (const node of this.connectedNodes) {
            this.node.connect(node);
        }
        this.node.start();
        this.setFrequency(this.frequency);
        this.started = true;
    }

    stop() {
        this.node.stop();
        for (const node of this.connectedNodes) {
            this.node.disconnect(node);
        }
        this.node = undefined;
        this.started = false;
    }

    connect(node) {
        this.connectedNodes.push(node);
        if (this.started) {
            this.node.connect(node);
        }
    }

    disconnect(node) {
        let nodeIdx = this.connectedNodes.findIndex(aNode => aNode === node);
        this.connectedNodes[nodeIdx] = this.connectedNodes[this.connectedNodes.length];
        this.connectedNodes.pop();
        if (this.started) {
            this.node.disconnect(node);
        }
    }

    setFrequency(value) {
        this.frequency = value;
        if (this.node !== undefined) {
            this.node.frequency.setValueAtTime(value, audioCtx.currentTime);
        }
    }

    setType(type) {
        
    }
}