"use strict";
import * as draw from "./canvas.js";
import * as nodes from "./nodes.js";
import * as consts from "./consts.js";
import * as engine from "./engine.js";

let canvas = document.getElementById("canvas");

// colours
const colLabel          = "#eee";
const colBackground     = "#666";
const colNodeFill       = "#222";
const colNodeOutline    = "#222";
const colNodeHeader     = "#66a";
const colPointFill      = "#ccc";
const colPointStroke    = "#3b3";
const colWire           = "#3a3";
const colNodeHighlight  = "#aaa";

// setup modules
draw.setCanvas(canvas);

function resizeCanvas() {
    let canvasBox = document.getElementById("canvas-box");
    draw.setCanvasSize({
        w: canvasBox.clientWidth,
        h: window.innerHeight,
    });
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);
// utils
function drawNode(node) {
    let pos = node.pos;
    let size = node.size;
    // main fill
    draw.fillRect(pos, size, colNodeFill);
    // border
    draw.strokeRect(pos, size, colNodeOutline, 1);
    // header
    draw.fillRect(pos, { w: size.w, h: consts.headerHeight }, colNodeHeader);
    draw.fillText({ x: pos.x + 4, y: pos.y + 15 },  node.name, colLabel, "15px");

    // widgets
    for (const input of node.inputList) {
        if (input.widget !== undefined && input.widget.visible) {
            input.widget.draw();
        } else {
            // draw labels
            let pos = {
                x: input.pos.x + 5 + (consts.connectPointRadius * 2),
                y: input.pos.y + 12
            };
            draw.fillText(pos, input.label, colLabel, "10px");
        }
    }

    // output labels
    for (const output of node.outputList) {
        let pos = {
            x: node.pos.x + node.size.w - consts.connectPointRadius * 3,
            y: output.pos.y + 12,
        };
        draw.fillText(pos, output.label, colLabel, "10px", "right");
    }

    // connect points
    for (const input of node.inputList) {
        let pos = {
            x: node.pos.x + consts.connectPointRadius,
            y: input.pos.y + input.size.h / 2,
        };
        drawConnectPoint(pos);
        if (input.isPending()) {
            draw.strokeRect(pos, {h: 1, w: 1}, "#f00", 3);
        }
    }
    for (const output of node.outputList) {
        let pos = {
            x: node.pos.x + node.size.w - consts.connectPointRadius,
            y: output.pos.y + consts.normalSlotHeight / 2,
        };
        drawConnectPoint(pos);
    }
}

function drawWire(pos1, pos2) {
    let dist = Math.abs(pos1.x - pos2.x);
    let mag = Math.min(200, dist / 2);
    draw.strokeBezier(pos1, pos2, colWire, 2, mag);
}

function drawConnectPoint(pos) {
    draw.drawCircleWithOutline(
        pos,
        consts.connectPointRadius,
        colPointFill,
        colPointStroke,
        3
    );
}

function removeWire(wireToRemove) {
    let idx = wires.findIndex(wire => {
        return wireToRemove === wire;
    });
    wires[idx] = wires[wires.length - 1];
    wires.pop();
}

// test
let nodeList = [];

let wires = [];

let selectedNode = undefined;

// custom events

let focusNode       = undefined;
let focusWidget     = undefined;
let heldWidget      = undefined;
let isDraggingNode  = false;
let nodeDragOffset  = undefined;
let heldOutputWire  = undefined;
let inputCandidate  = undefined;
let heldInputWire   = undefined;
let outputCandidate = undefined;

canvas.addEventListener("mousemove", ev => {
    let x = ev.offsetX;
    let y = ev.offsetY;
    // dragging nodes
    if (isDraggingNode) {
        focusNode.setPos({
            x: x - nodeDragOffset.x,
            y: y - nodeDragOffset.y
        });
        return;
    }
    // finding node in focus
    focusNode = undefined;
    for (const node of nodeList) {
        let tl = {
            x: node.pos.x,
            y: node.pos.y
        };
        let br = {
            x: tl.x + node.size.w,
            y: tl.y + node.size.h
        };
        if (tl.x <= x && x <= br.x && tl.y <= y && y <= br.y) {
            focusNode = node;
            break;
        }
    }
    // control new output wire
    if (heldOutputWire !== undefined) {
        heldOutputWire.setEndPos({ x: x, y: y });
        inputCandidate = undefined;
        if (focusNode !== undefined) {
            // check if the mouse is near an input
            let node = focusNode;
            for (const input of node.inputList) {
                let tl = {
                    x: input.pos.x,
                    y: input.pos.y,
                };
                let br = {
                    x: tl.x + consts.connectPointRadius * 2,
                    y: tl.y + input.size.h,
                };
                if (tl.x <= x && x <= br.x && tl.y <= y && y <= br.y) {
                    inputCandidate = input;
                    break;
                }
            }
        }
        return;
    }
    // control new input wire
    if (heldInputWire !== undefined) {
        heldInputWire.setEndPos({ x: x, y: y });
        outputCandidate = undefined;
        if (focusNode !== undefined) {
            let node = focusNode;
            for (const output of node.outputList) {
                let tl = {
                    x: node.pos.x + node.size.w - (consts.connectPointRadius * 2),
                    y: output.pos.y,
                };
                let br = {
                    x: node.pos.x + node.size.w,
                    y: output.pos.y + consts.normalSlotHeight,
                };
                if (tl.x <= x && x <= br.x && tl.y <= y && y <= br.y) {
                    outputCandidate = output;
                    break;
                }
            }
        }
    }
    // widgets
    let oldFocusWidget = focusWidget;
    focusWidget = undefined;
    if (focusNode === undefined) {
        oldFocusWidget?.onLeave();
        return;
    }
    for (const input of focusNode.inputList) {
        if (input.widget === undefined || !input.widget.visible) {
            continue;
        }
        let widget = input.widget;
        let tl = {
            x: widget.pos.x,
            y: widget.pos.y,
        };
        let br = {
            x: tl.x + widget.size.w,
            y: tl.y + widget.size.h,
        };
        if (tl.x <= x && x <= br.x && tl.y <= y && y <= br.y) {
            focusWidget = widget;
            break;
        }
    }
    if (focusWidget !== oldFocusWidget) {
        oldFocusWidget?.onLeave();
        focusWidget?.onEnter();
    }
    if (heldWidget !== undefined) {
        heldWidget.onMouseDrag({ x: ev.movementX, y: ev.movementY, shift: ev.shiftKey });
    }
});

canvas.addEventListener("mousedown", ev => {
    if (focusNode === undefined) {
        selectedNode = undefined;
        return;
    }
    selectedNode = focusNode;
    let x = ev.offsetX;
    let y = ev.offsetY;
    let node = focusNode;
    // check header
    let tl = node.pos;
    let br = {
        x: tl.x + node.size.w,
        y: tl.y + consts.headerHeight
    };
    if (tl.x <= x && x <= br.x && tl.y <= y && y <= br.y) {
        isDraggingNode = node;
        nodeDragOffset = {
            x: x - tl.x,
            y: y - tl.y
        };
        return;
    }
    // check input widget
    if (focusWidget !== undefined) {
        heldWidget = focusWidget;
        heldWidget.onMouseDown();
    }
    let cpDiameter = (consts.connectPointRadius * 2);
    // check input points
    for (const input of node.inputList) {
        let tl = {
            x: node.pos.x,
            y: input.pos.y,
        };
        let br = {
            x: tl.x + cpDiameter,
            y: tl.y + input.size.h,
        };
        if (tl.x <= x && x <= br.x && tl.y <= y && y <= br.y) {
            if (input.wire !== undefined) {
                engine.disconnect(input.wire.output, input);
                removeWire(input.wire);
            }
            input.removeWire();
            heldInputWire = new nodes.WireFromInput(input);
            heldInputWire.setEndPos({ x: x, y: y });
            break;
        }
    }
    // check output points
    for (const output of node.outputList) {
        let yPos = output.pos.y;
        let tl = {
            x: node.pos.x + node.size.w - cpDiameter,
            y: yPos,
        };
        let br = {
            x: tl.x + cpDiameter,
            y: tl.y + consts.normalSlotHeight,
        };
        if (tl.x <= x && x <= br.x && tl.y <= y && y <= br.y) {
            heldOutputWire = new nodes.WireFromOutput(output);
            heldOutputWire.setEndPos({ x: x, y: y });
            break;
        }
    }
});

canvas.addEventListener("mouseup", ev => {
    // moving nodes
    isDraggingNode = false;
    // widgets
    if (heldWidget !== undefined && heldWidget === focusWidget) {
        heldWidget.onClick();
        heldWidget.onMouseUp();
    }
    heldWidget = undefined;

    // wires from outputs
    if (inputCandidate !== undefined) {
        let newWire = new nodes.Wire(inputCandidate, heldOutputWire.output);
        if (newWire.input.wire !== undefined) {
            let oldWire = newWire.input.wire;
            engine.disconnect(oldWire.output, oldWire.input);
            removeWire(oldWire);
        }
        wires.push(newWire);
        newWire.input.setWire(newWire);
        newWire.output.addWire(newWire);
        engine.connect(newWire.output, newWire.input);
        inputCandidate = undefined;
    }
    heldOutputWire = undefined;

    // wires from inputs
    if (outputCandidate !== undefined) {
        let newWire = new nodes.Wire(heldInputWire.input, outputCandidate);
        engine.connect(newWire.output, newWire.input);
        wires.push(newWire);
        newWire.input.setWire(newWire);
        newWire.output.addWire(newWire);
        outputCandidate = undefined;
    }
    heldInputWire = undefined;
});

// create nodes
export function createNode(type) {
    switch (type) {
        case "osc":
            nodeList.push(new nodes.Osc({ x: 0, y: 0 }));
            break;
        case "envelope":
            nodeList.push(new nodes.Envelope({ x: 0, y: 0 }));
            break;
        case "dest":
            nodeList.push(new nodes.Dest({ x: 0, y: 0 }));
            break;
        case "number":
            nodeList.push(new nodes.Number({ x: 0, y: 0 }));
            break;
        case "add":
            nodeList.push(new nodes.Add({ x: 0, y: 0 }));
            break;
        case "biquad filter":
            nodeList.push(new nodes.BiquadFilter({x: 0, y: 0}));
            break;
        case "gain":
            nodeList.push(new nodes.Gain({x: 0, y: 0}));
            break;
        case "test":
            nodeList.push(new nodes.Test({ x: 0, y: 0 }));
    }
}

// frame
function drawFrame(dt) {
    engine.update();
    draw.fillBackground(colBackground);
    // draw wires
    if (heldOutputWire !== undefined) {
        let sender = heldOutputWire.output.parentNode;
        let outPoint = {
            x: sender.pos.x + sender.size.w,
            y: heldOutputWire.output.pos.y + (consts.normalSlotHeight / 2),
        };
        drawWire(outPoint, heldOutputWire.endPos);
    }
    if (heldInputWire !== undefined) {
        let receiver = heldInputWire.input.parentNode;
        let inPoint = {
            x: receiver.pos.x,
            y: heldInputWire.input.pos.y + (consts.normalSlotHeight / 2),
        };
        drawWire(heldInputWire.endPos, inPoint);
    }
    for (const wire of wires) {
        draw.strokePath(wire.path, colWire, 2);
    }

    // highlight selected node
    if (selectedNode !== undefined) {
        let pos = selectedNode.pos;
        let size = selectedNode.size;
        draw.strokeRect(pos, size, colNodeHighlight, 4);
    }

    // draw nodes
    for (const node of nodeList) {
        drawNode(node);
    }

    window.requestAnimationFrame(drawFrame);
}

window.requestAnimationFrame(drawFrame);